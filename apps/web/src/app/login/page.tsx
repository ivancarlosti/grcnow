import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server';
import { LoginForm } from '@/components/login-form';
import { getAppI18n } from '@/i18n/request';

async function publicConfig() {
  const base = process.env.API_INTERNAL_URL || 'http://localhost:3001';
  try {
    const response = await fetch(`${base}/api/public/config`, { cache: 'no-store' });
    if (response.ok) return await response.json();
  } catch {
    /* API offline */
  }
  return { authMethod: 'account', defaultLocale: 'en-US', recaptchaSiteKey: null, appName: 'GRC Platform' };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect('/dashboard');
  const config = await publicConfig();
  const { error } = await searchParams;
  await getAppI18n();
  return <LoginForm config={config} initialError={error} />;
}
