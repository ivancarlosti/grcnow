import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getSession, getSettings } from '@/lib/server';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.unassigned) redirect('/no-company');
  const settings = await getSettings();
  return (
    <AppShell session={session} appName={settings?.app?.name || 'GRC Platform'}>
      {children}
    </AppShell>
  );
}
