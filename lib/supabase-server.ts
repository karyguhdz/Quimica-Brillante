import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseClient(key: string) {
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function hasValidBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!accessToken) {
    return false;
  }

  const authClient = createSupabaseClient(anonKey);
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken);

  return !error && Boolean(user);
}

export async function getSupabaseServerClient(request?: NextRequest) {
  if (!serviceRoleKey || !request) {
    return createSupabaseClient(anonKey);
  }

  const canUsePrivilegedClient = await hasValidBearerToken(request);

  return createSupabaseClient(canUsePrivilegedClient ? serviceRoleKey : anonKey);
}
