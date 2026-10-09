import type { User, UserRole, VendorStatus } from '../types/domain';

/**
 * Demo-only signed token utilities.
 *
 * SECURITY NOTE (documented per PRD §4.2): frontend guards and mock tokens are a
 * user-experience layer, not real security. A production backend would sign JWTs
 * server-side with a secret the client never sees. Here the "signature" is an
 * FNV-1a digest over the claims plus a demo key, which is enough to stop casual
 * tampering (e.g. editing localStorage to escalate from customer to admin) and
 * to mirror the shape of a real JWT (header.payload.signature), but it is NOT
 * cryptographically secure.
 *
 * Token format:  vd2.<base64url(claims)>.<hex-signature>
 */

export interface TokenClaims {
  /** Subject: user id */
  sub: string;
  email: string;
  name: string;
  roles: UserRole[];
  vendorStatus: VendorStatus;
  vendorId?: string;
  /** Issued-at (epoch ms) */
  iat: number;
  /** Expiry (epoch ms) */
  exp: number;
}

const DEMO_SIGNING_KEY = 'vendora-demo-signing-key-v2';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const TOKEN_PREFIX = 'vd2.';

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** FNV-1a 32-bit digest, rendered as zero-padded hex. Demo-grade signature. */
function sign(payloadB64: string): string {
  const input = `${payloadB64}:${DEMO_SIGNING_KEY}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Issues a signed demo token embedding the user's roles as verifiable claims. */
export function createSignedToken(user: User, ttlMs: number = TOKEN_TTL_MS): string {
  const now = Date.now();
  const claims: TokenClaims = {
    sub: user.id,
    email: user.email,
    name: user.name,
    roles: [...user.roles],
    vendorStatus: user.vendorStatus,
    vendorId: user.vendorId,
    iat: now,
    exp: now + ttlMs,
  };
  const payload = base64UrlEncode(JSON.stringify(claims));
  return `${TOKEN_PREFIX}${payload}.${sign(payload)}`;
}

/**
 * Verifies signature and expiry, returning the trusted claims or null.
 * Never trusts raw substrings of the token: tampered payloads fail the digest check.
 */
export function verifyToken(token: string | null | undefined, now: number = Date.now()): TokenClaims | null {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
  const body = token.slice(TOKEN_PREFIX.length);
  const dotIndex = body.lastIndexOf('.');
  if (dotIndex <= 0) return null;

  const payload = body.slice(0, dotIndex);
  const signature = body.slice(dotIndex + 1);
  if (!timingSafeEqual(signature, sign(payload))) return null;

  const json = base64UrlDecode(payload);
  if (!json) return null;

  let claims: TokenClaims;
  try {
    claims = JSON.parse(json) as TokenClaims;
  } catch {
    return null;
  }

  if (typeof claims.sub !== 'string' || !Array.isArray(claims.roles)) return null;
  if (typeof claims.exp !== 'number' || claims.exp <= now) return null;
  return claims;
}

export function isTokenExpired(token: string | null | undefined): boolean {
  return verifyToken(token) === null;
}
