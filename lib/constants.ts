/** Slugs that cannot be used as FBO subdomains */
export const RESERVED_SLUGS = [
  'admin',
  'api',
  'www',
  'static',
  'app',
  'auth',
  'super-admin',
  'superadmin',
  'dashboard',
  'login',
  'signup',
  'health',
  'metrics',
  'status',
] as const

/** Order status state machine — valid forward transitions */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['received', 'cancelled'],
  received: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
}

/** Valid payment statuses */
export const PAYMENT_STATUSES = ['unpaid', 'paid', 'failed', 'refunded'] as const

/** Max duration before an open table session is auto-flagged (ms) */
export const TABLE_SESSION_MAX_OPEN_MS = 3 * 60 * 60 * 1000 // 3 hours

/** Token format for counter orders */
export const COUNTER_TOKEN_PREFIX = 'T-'
export const COUNTER_TOKEN_DIGITS = 3

/** Image validation */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_IMAGE_MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'image/gif': [0x47, 0x49, 0x46],
}

/** Rate limiting */
export const ORDER_RATE_LIMIT_PER_IP = 10 // per minute
export const PAYMENT_RATE_LIMIT_PER_IP = 5 // per minute

export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000'

/** Helper to build multi-tenant subdomain or fallback URL for an FBO slug */
export function getTenantBaseUrl(slug: string, hostHeader?: string | null): string {
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'mellod.in').toLowerCase()

  let currentHost = hostHeader ? hostHeader.split(':')[0].toLowerCase() : ''
  if (!currentHost && typeof window !== 'undefined') {
    currentHost = window.location.host.split(':')[0].toLowerCase()
  }

  const isLocal =
    !currentHost ||
    currentHost === 'localhost' ||
    currentHost === '127.0.0.1' ||
    currentHost.endsWith('.localhost')

  if (isLocal) {
    const port = typeof window !== 'undefined' ? window.location.port || '3000' : '3000'
    return `http://localhost:${port}/qr/${slug}`
  }

  // Live / Production Vercel Wildcard URL: https://<slug>.<rootDomain>
  return `https://${slug}.${rootDomain}`
}

