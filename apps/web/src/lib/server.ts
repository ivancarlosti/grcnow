import { cookies } from 'next/headers';
import { cache } from 'react';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  jobTitle?: string | null;
  locale?: string | null;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  unassigned?: boolean;
  mustChangePassword?: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    defaultLocale?: string | null;
    status?: string;
  } | null;
  roles: { id: string; key: string; name: string; permissions: string[] }[];
  permissions: string[];
  tenants: { id: string; name: string; slug: string; status: string }[];
  unreadNotifications: number;
  authMethod: string;
}

/** Server-side fetch to the API forwarding the browser session cookies. */
export async function serverFetch<T = any>(path: string, init: RequestInit = {}): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  try {
    const response = await fetch(`${API_INTERNAL_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        cookie: cookieHeader,
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (null as T);
  } catch {
    return null;
  }
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  return serverFetch<SessionUser>('/api/auth/me');
});

export const getSettings = cache(async () => {
  return serverFetch<{
    app: { name: string; defaultLocale: string; authMethod: string; storageDriver: string; recaptchaEnabled: boolean; locales: string[] };
    tenant: any;
    isSuperAdmin: boolean;
  }>('/api/settings');
});
