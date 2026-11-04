import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env, keycloakUrls } from '../../config';

export interface OidcState {
  state: string;
  verifier: string;
  challenge: string;
  nonce: string;
  redirectUri: string;
}

const base64url = (buffer: Buffer) =>
  buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function createPkcePair() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function createOidcState(redirectUri: string): OidcState {
  const { verifier, challenge } = createPkcePair();
  return {
    state: base64url(randomBytes(16)),
    verifier,
    challenge,
    nonce: base64url(randomBytes(16)),
    redirectUri,
  };
}

export function buildAuthorizationUrl(state: OidcState, challenge: string): string {
  const urls = keycloakUrls();
  const params = new URLSearchParams({
    client_id: urls.clientId,
    redirect_uri: state.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: state.state,
    nonce: state.nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${urls.authorizationEndpoint}?${params.toString()}`;
}

export function buildLogoutUrl(idTokenHint?: string): string {
  const urls = keycloakUrls();
  const params = new URLSearchParams({
    client_id: urls.clientId,
    post_logout_redirect_uri: urls.postLogoutRedirectUri,
  });
  if (idTokenHint) params.set('id_token_hint', idTokenHint);
  return `${urls.endSessionEndpoint}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<TokenResponse> {
  const urls = keycloakUrls();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: urls.clientId,
    code_verifier: codeVerifier,
  });
  if (urls.clientSecret) body.set('client_secret', urls.clientSecret);
  const response = await fetch(urls.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return (await response.json()) as TokenResponse;
}

export async function verifyIdToken(idToken: string, nonce?: string): Promise<Record<string, any>> {
  const urls = keycloakUrls();
  const jwks = createRemoteJWKSet(new URL(urls.jwksUri));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: urls.issuer,
    audience: urls.clientId,
  });
  if (nonce && payload.nonce !== nonce) throw new Error('nonce mismatch');
  return payload as Record<string, any>;
}

/**
 * Allow list check used after the identity provider answers.
 * Entries may be exact e-mail addresses or domains (@company.com / company.com).
 * An empty list accepts every authenticated identity (documented behaviour).
 */
export function isEmailAllowed(email: string, allowList = env.keycloakAccounts): boolean {
  const entries = String(allowList || '')
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!entries.length) return true;
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized.includes('@')) return false;
  const domain = normalized.split('@')[1];
  return entries.some((entry) => {
    if (entry.startsWith('@')) return domain === entry.slice(1);
    if (entry.includes('@')) return entry === normalized;
    return domain === entry;
  });
}

export function keycloakConfigured(): boolean {
  return Boolean(env.keycloakBaseUrl && env.keycloakRealm && env.keycloakClientId);
}
