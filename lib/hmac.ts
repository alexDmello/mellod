/**
 * HMAC-SHA256 signed token utilities for QR code table tokens.
 * Each tenant has its own signing salt — a single compromised salt
 * cannot affect other tenants.
 */

export interface TableTokenPayload {
  fbo_id: string
  table_id: string
  table_number: string
  issued_at: number // Unix ms
}

/**
 * Creates an HMAC-SHA256 signed token for a table QR code.
 * Uses Web Crypto API (available in both Node 18+ and Edge runtime).
 */
export async function signTableToken(
  payload: TableTokenPayload,
  tenantSalt: string
): Promise<string> {
  const encoder = new TextEncoder()
  const data = JSON.stringify(payload)

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(tenantSalt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const sigHex = Buffer.from(signature).toString('hex')

  // token = base64url(payload) + '.' + sigHex
  const payloadB64 = Buffer.from(data).toString('base64url')
  return `${payloadB64}.${sigHex}`
}

/**
 * Verifies and decodes an HMAC-SHA256 signed table token.
 * Returns null if signature is invalid or token is malformed.
 */
export async function verifyTableToken(
  token: string,
  tenantSalt: string,
  maxAgeMs = 365 * 24 * 60 * 60 * 1000 // 1 year default for QR codes
): Promise<TableTokenPayload | null> {
  try {
    const [payloadB64, sigHex] = token.split('.')
    if (!payloadB64 || !sigHex) return null

    const data = Buffer.from(payloadB64, 'base64url').toString('utf-8')
    const encoder = new TextEncoder()

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(tenantSalt),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const sigBytes = Buffer.from(sigHex, 'hex')
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(data)
    )

    if (!valid) return null

    const payload = JSON.parse(data) as TableTokenPayload

    // Check token age
    if (Date.now() - payload.issued_at > maxAgeMs) return null

    return payload
  } catch {
    return null
  }
}

/**
 * Generates a cryptographically random per-tenant signing salt (32 bytes hex).
 */
export function generateTenantSalt(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('hex')
}
