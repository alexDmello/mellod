import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { KDSBoard } from '@/components/kds/kds-board'

export default async function FboKdsPage() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch FBO for calling user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fbo } = await (supabase as any)
    .from('fbos')
    .select('id, business_name, merchant_upi_id, qr_enabled_by_admin, qr_opted_in_by_fbo')
    .eq('profile_id', user.id)
    .single()

  if (!fbo) redirect('/fbo')

  if (!fbo.qr_enabled_by_admin || !fbo.qr_opted_in_by_fbo) {
    redirect('/fbo/qr-ordering')
  }

  return <KDSBoard fboId={fbo.id} fboName={fbo.business_name} merchantUpiId={fbo.merchant_upi_id} />
}
