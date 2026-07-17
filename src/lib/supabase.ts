import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kjxytepdstmxgbznzwhi.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_eRjFxUuP1XQQwtsY-Um_4A_gpm4-ln4';

export const supabase = createClient(supabaseUrl, supabaseKey);

let lastSyncError: string | null = null;
let lastSyncTime: string | null = null;
let totalSyncSuccess = 0;
let totalSyncAttempts = 0;

export function getSupabaseSyncStats() {
  return {
    lastSyncError,
    lastSyncTime,
    totalSyncSuccess,
    totalSyncAttempts,
    supabaseUrl,
  };
}

/**
 * Syncs user data to Supabase.
 * Gracefully logs errors if the table does not exist or if permissions are missing,
 * ensuring the app's main login flow is never blocked.
 */
export async function syncUserToSupabase(user: {
  uid: string;
  email: string;
  name: string | null;
  role: string;
  balance: number;
  status: string;
}) {
  totalSyncAttempts++;
  lastSyncTime = new Date().toISOString();
  try {
    console.log(`[Supabase Sync] Attempting to sync user ${user.email} (${user.uid})`);
    
    // Attempt upsert into a 'users' or 'profiles' table
    // If the table 'users' does not exist, we'll try 'profiles', or catch the error.
    // We try to upsert based on the 'uid' or 'email'.
    const { data, error } = await supabase
      .from('users')
      .upsert({
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        balance: user.balance,
        status: user.status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'uid' });

    if (error) {
      console.warn('[Supabase Sync] Error syncing to "users" table, trying fallback "profiles" table:', error.message);
      lastSyncError = `users table: ${error.message}`;
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          balance: user.balance,
          status: user.status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'uid' });

      if (profileError) {
        console.error('[Supabase Sync Fail] Both "users" and "profiles" table sync failed:', profileError.message);
        lastSyncError = `Both users & profiles tables missing or inaccessible. Error: ${profileError.message}`;
      } else {
        console.log('[Supabase Sync Success] Successfully synced user to "profiles" table:', profileData);
        lastSyncError = null;
        totalSyncSuccess++;
      }
    } else {
      console.log('[Supabase Sync Success] Successfully synced user to "users" table:', data);
      lastSyncError = null;
      totalSyncSuccess++;
    }
  } catch (err: any) {
    console.error('[Supabase Sync Exception] Unexpected error during sync:', err);
    lastSyncError = err?.message || String(err);
  }
}

