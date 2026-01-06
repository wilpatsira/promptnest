import { createClient } from '@supabase/supabase-js';

// Use environment variables for serverless functions
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Create a Supabase client with service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Assign an available license to a buyer atomically
 * Uses FOR UPDATE SKIP LOCKED to prevent race conditions
 */
export async function assignLicenseToBuyer(buyerEmail: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin.rpc('assign_license_to_buyer', {
        input_email: buyerEmail
    });

    if (error) {
        console.error('Error assigning license:', error);
        throw new Error(`Failed to assign license: ${error.message}`);
    }

    return data as string | null;
}
