/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unified auth helper bridging QR Ordering Platform & Mellod PWA tables.
 * Accepts admins from either `user_profiles` (QR platform) or `profiles` (PWA).
 */
export async function getUserProfile(supabase: any, userId: string) {
  // 1. Check QR Ordering Platform user_profiles
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (profile) {
    return {
      role: profile.role as string,
      tenant_id: profile.tenant_id as string | null,
      full_name: profile.full_name as string | null,
    }
  }

  // 2. Check Mellod PWA profiles table (fallback for shared database)
  const { data: pwaProfile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (pwaProfile) {
    const isPwaAdmin = pwaProfile.role === 'admin' || pwaProfile.role === 'super_admin'
    return {
      role: isPwaAdmin ? 'super_admin' : pwaProfile.role,
      tenant_id: null,
      full_name: pwaProfile.full_name,
    }
  }

  return null
}
