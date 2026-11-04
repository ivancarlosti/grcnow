import { getSession } from '@/lib/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function NoCompanyPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const t = await getTranslations();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="surface max-w-md p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          !
        </div>
        <h1 className="text-base font-semibold text-slate-900">{t('errors.tenantNotFound')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('auth.notAllowed')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{session.email}</p>
        <Link href="/login" className="link mt-4 inline-block text-xs">
          {t('common.login')}
        </Link>
      </div>
    </div>
  );
}
