
import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

const SESSION_KEY = 'promptnest_session_v2';

/**
 * Lightweight Ping to keep database awake
 */
export const pingDatabase = async () => {
  try {
    // Query paling ringan yang mungkin dilakukan
    await supabase.from('profiles').select('id').limit(1);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Optimized Connection Check - faster timeout
 */
export const checkConnection = async (): Promise<{ connected: boolean; status: 'online' | 'connecting' | 'offline' }> => {
  const controller = new AbortController();
  // Reduced timeout from 15s to 5s for faster UX
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    // Quick ping to database - minimal query
    const { error: dbError } = await supabase
      .from('licenses')
      .select('code')
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (dbError) {
      // JWT or auth errors still mean DB is reachable
      if (dbError.code === 'PGRST301' || dbError.message.includes('JWT')) {
        return { connected: true, status: 'online' };
      }
      return { connected: false, status: 'connecting' };
    }

    return { connected: true, status: 'online' };
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') return { connected: false, status: 'connecting' };
    return { connected: false, status: 'offline' };
  }
};

export const mapSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    const displayName = profile?.display_name || supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0] || 'User';
    const photoUrl = profile?.photo_url || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=111&color=fff`;
    const joinedAt = profile?.created_at ? new Date(profile.created_at).getTime() : Date.now();
    const redeemedAt = profile?.redeemed_at ? new Date(profile.redeemed_at).getTime() : undefined;

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: displayName,
      photoUrl: photoUrl,
      licenseCode: profile?.license_code || 'ACTIVE-USER',
      username: profile?.username || displayName,
      joinedAt: joinedAt,
      redeemedAt: redeemedAt,
    };
  } catch (e) {
    return null;
  }
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const clearAllBrowserStorage = () => {
  // Clear localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.startsWith('sb-') || key.includes('promptnest')) {
      localStorage.removeItem(key);
    }
  });
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('promptnest_user_prompts');

  // Clear sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('supabase') || key.startsWith('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const logout = async () => {
  // Clear storage first (before signOut which might hang)
  clearAllBrowserStorage();

  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch (err) {
    console.error("Logout signOut error:", err);
  }
};

export const signInWithLicense = async (username: string, licenseCode: string): Promise<{ success: boolean; message?: string; user?: User; isNewUser: boolean }> => {
  const cleanLicense = licenseCode.trim();
  const cleanUsername = username.trim();
  const email = `${cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@promptnest.local`;

  try {
    const { data: licenseData, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('code', cleanLicense)
      .maybeSingle();

    if (licenseError) throw new Error("Syncing security protocols. Please retry in a few seconds.");
    if (!licenseData) return { success: false, message: "Invalid license code.", isNewUser: false };

    let authUser: SupabaseUser | null = null;
    let isNewUser = false;

    if (licenseData.is_used) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: cleanLicense
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login')) {
          return { success: false, message: "Username does not match this license.", isNewUser: false };
        }
        throw signInError;
      }
      authUser = signInData.user;
    } else {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: cleanLicense,
        options: { data: { display_name: cleanUsername, username: cleanUsername } }
      });

      if (signUpError) throw signUpError;
      authUser = signUpData.user;
      isNewUser = true;

      // Background updates (non-blocking) - user can proceed immediately
      if (authUser?.id) {
        const userId = authUser.id;
        setTimeout(async () => {
          try {
            // Update licenses table
            await supabase
              .from('licenses')
              .update({ is_used: true, used_by: userId, activated_at: new Date().toISOString() })
              .eq('code', cleanLicense);

            // Update profiles table (delay to let trigger create profile first)
            await supabase
              .from('profiles')
              .update({
                license_code: cleanLicense,
                username: cleanUsername,
                redeemed_at: new Date().toISOString()
              })
              .eq('id', userId);
          } catch (e) {
            console.warn('Background DB update:', e);
          }
        }, 500);
      }
    }

    if (authUser) {
      // For new users, skip profile query (trigger may not have created it yet)
      // Create user object directly from signUp data
      if (isNewUser) {
        const newUser: User = {
          id: authUser.id,
          email: authUser.email || '',
          displayName: cleanUsername,
          photoUrl: `https://ui-avatars.com/api/?name=${cleanUsername.charAt(0)}&background=111&color=fff`,
          licenseCode: cleanLicense,
          username: cleanUsername,
          joinedAt: Date.now(),
          redeemedAt: Date.now(),
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
        return { success: true, user: newUser, isNewUser };
      }

      // For existing users, fetch profile normally
      const user = await mapSupabaseUser(authUser);
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return { success: true, user, isNewUser };
      }
    }

    return { success: false, message: "Vault synchronization failed.", isNewUser: false };
  } catch (err: any) {
    return { success: false, message: err.message || "Security handshake failed.", isNewUser: false };
  }
};

export const updateProfile = async (updatedUser: User): Promise<{ success: boolean; user?: User; message?: string }> => {
  try {
    const { data, error } = await supabase.from('profiles').update({
      display_name: updatedUser.displayName,
      photo_url: updatedUser.photoUrl
    }).eq('id', updatedUser.id).select().single();

    if (error) return { success: false, message: error.message };
    if (data) {
      const u = {
        ...updatedUser,
        displayName: data.display_name,
        photoUrl: data.photo_url,
        licenseCode: data.license_code || updatedUser.licenseCode,
        redeemedAt: data.redeemed_at ? new Date(data.redeemed_at).getTime() : updatedUser.redeemedAt
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      return { success: true, user: u };
    }
    return { success: false, message: "Failed to update profile." };
  } catch (e: any) {
    return { success: false, message: e.message || "Error" };
  }
};
