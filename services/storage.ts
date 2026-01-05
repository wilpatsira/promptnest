
import { Prompt, PLATFORMS, Platform } from '../types';
import { supabase } from './auth';

const CACHE_KEY = 'promptnest_user_prompts';

const setLocalCache = (prompts: Prompt[]) => {
  if (!prompts) return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(prompts));
};

export const getCachedPrompts = (): Prompt[] => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export const clearPromptCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
};

const mapDbToPrompt = (p: any): Prompt => ({
  id: p.id,
  userId: p.user_id,
  title: p.title,
  description: p.description || '',
  content: p.content,
  tags: p.tags || [],
  platform: p.platform,
  createdAt: new Date(p.created_at).getTime(),
  updatedAt: new Date(p.updated_at).getTime(),
  history: p.history || [],
  isFavorite: p.is_favorite || false,
});

const mapPromptToDb = (p: Prompt) => ({
  id: p.id,
  user_id: p.userId,
  title: p.title,
  description: p.description,
  content: p.content,
  tags: p.tags,
  platform: p.platform,
  is_favorite: p.isFavorite,
  history: p.history || [],
  updated_at: new Date(p.updatedAt).toISOString(),
  created_at: new Date(p.createdAt).toISOString(),
});

export const fetchPrompts = async (userId: string, retries = 3): Promise<{ data: Prompt[], error: boolean }> => {
  if (!userId || userId.startsWith('offline_')) return { data: [], error: false };
  
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
      
    if (error) throw error;
    
    const prompts = (data || []).map(mapDbToPrompt);
    setLocalCache(prompts);
    return { data: prompts, error: false };
  } catch (error: any) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, 2000));
      return fetchPrompts(userId, retries - 1);
    }
    return { data: getCachedPrompts(), error: true };
  }
};

/**
 * Queue untuk pending syncs
 */
let syncQueue: Map<string, { prompt: Prompt; userId: string; attempts: number }> = new Map();
let isSyncRunning = false;

/**
 * Process sync queue in background
 */
const processSyncQueue = async () => {
  if (isSyncRunning || syncQueue.size === 0) return;
  isSyncRunning = true;
  
  for (const [id, item] of syncQueue) {
    try {
      const dbData = mapPromptToDb({ ...item.prompt, userId: item.userId });
      const { error } = await supabase.from('prompts').upsert(dbData, { onConflict: 'id' });
      
      if (!error) {
        syncQueue.delete(id);
        console.log(`✓ Synced: ${item.prompt.title}`);
      } else {
        throw error;
      }
    } catch (error: any) {
      item.attempts++;
      if (item.attempts >= 3) {
        console.error(`✗ Failed after 3 attempts: ${item.prompt.title}`);
        syncQueue.delete(id);
      } else {
        console.warn(`↻ Retry ${item.attempts}/3: ${item.prompt.title}`);
      }
    }
  }
  
  isSyncRunning = false;
  
  // Jika masih ada yang pending, coba lagi setelah 5 detik
  if (syncQueue.size > 0) {
    setTimeout(processSyncQueue, 5000);
  }
};

/**
 * Optimistic Save - Update local cache immediately, sync to cloud in background
 * Returns true immediately after local cache update
 */
export const savePrompt = async (prompt: Prompt, userId: string): Promise<boolean> => {
  if (!userId || userId.startsWith('offline_')) return false;
  
  // 1. Update cache lokal SEGERA (optimistic)
  const current = getCachedPrompts();
  const updatedCache = current.some(p => p.id === prompt.id)
    ? current.map(p => p.id === prompt.id ? prompt : p)
    : [prompt, ...current];
  setLocalCache(updatedCache);
  
  // 2. Queue untuk background sync
  syncQueue.set(prompt.id, { prompt, userId, attempts: 0 });
  
  // 3. Proses queue di background (non-blocking)
  setTimeout(processSyncQueue, 100);
  
  return true; // Return immediately
};

/**
 * Force sync all pending items (call this on app focus/visibility change)
 */
export const forceSyncPending = () => {
  if (syncQueue.size > 0) {
    processSyncQueue();
  }
};

/**
 * Check if there are pending syncs
 */
export const hasPendingSync = (): boolean => syncQueue.size > 0;

export const deletePrompt = async (promptId: string, userId: string): Promise<boolean> => {
  if (!userId || userId.startsWith('offline_')) return false;
  try {
    const { error } = await supabase.from('prompts').delete().eq('id', promptId).eq('user_id', userId);
    if (error) throw error;
    const filtered = getCachedPrompts().filter(p => p.id !== promptId);
    setLocalCache(filtered);
    return true;
  } catch (error: any) {
    return false;
  }
};

export const seedInitialData = async (userId: string): Promise<Prompt[]> => {
  try {
    const { count, error } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!error && count && count > 0) {
        const result = await fetchPrompts(userId);
        return result.data;
    }

    const now = Date.now();
    const demoPrompts: Prompt[] = [
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Creative Story Architect',
        description: 'Build complex narrative worlds with planet variables.',
        content: 'Act as a world-building consultant. Create a sci-fi setting on the planet {{planet_name}} which features an ecosystem based on {{natural_element}}.',
        tags: ['Creative', 'Writing'],
        platform: 'ChatGPT',
        createdAt: now,
        updatedAt: now,
        history: [],
        isFavorite: true
      }
    ];

    const dbPayload = demoPrompts.map(mapPromptToDb);
    await supabase.from('prompts').upsert(dbPayload, { onConflict: 'id' });
    setLocalCache(demoPrompts);
    return demoPrompts;
  } catch {
    return getCachedPrompts();
  }
};
