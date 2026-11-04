'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, ChevronDown, LogOut, Menu, Search, User as UserIcon, X } from 'lucide-react';
import { NAV_GROUPS, canSee } from '@/lib/nav';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';
import type { SessionUser } from '@/lib/server';
import { api, apiPatch, apiPost } from '@/lib/api';
import { cn } from './ui';

interface Notification {
  id: string;
  titleKey: string;
  params?: Record<string, any>;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export function AppShell({
  session,
  appName,
  children,
}: {
  session: SessionUser;
  appName: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [term, setTerm] = React.useState('');

  React.useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  const switchLocale = async (locale: string) => {
    document.cookie = `grc_locale=${locale}; path=/; max-age=${365 * 24 * 3600}`;
    try {
      await apiPatch('/api/auth/me', { locale });
    } catch {
      /* the cookie still applies for guests */
    }
    router.refresh();
  };

  const logout = async () => {
    try {
      const result = await apiPost<{ redirectUrl?: string | null }>('/api/auth/logout', {});
      window.location.href = result?.redirectUrl || '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const openNotifications = async () => {
    setNotifOpen((value) => !value);
    if (notifOpen) return;
    try {
      const data = await api<{ items: Notification[] }>('/api/notifications');
      setNotifications(data.items || []);
    } catch {
      setNotifications([]);
    }
  };

  const markAll = async () => {
    await apiPost('/api/notifications/read-all', {}).catch(() => undefined);
    setNotifications((items) => items.map((item) => ({ ...item, readAt: new Date().toISOString() })));
    router.refresh();
  };

  const titleOf = (item: Notification) => {
    try {
      return t(item.titleKey, item.params || {});
    } catch {
      return item.titleKey;
    }
  };

  const unread = notifications.filter((n) => !n.readAt).length || session.unreadNotifications;

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSee(item, session.permissions, session.isSuperAdmin)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          'sidebar-panel fixed inset-y-0 start-0 z-40 w-64 bg-sidebar text-sidebar-foreground transition-transform',
          mobileOpen && 'sidebar-open',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            {appName.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{session.tenant?.name || appName}</p>
            <p className="truncate text-[11px] text-slate-400">{t('app.tagline')}</p>
          </div>
          <button className="ms-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="h-[calc(100vh-3.5rem)] space-y-5 overflow-y-auto px-2 py-4">
          {groups.map((group, index) => (
            <div key={`${group.labelKey}-${index}`}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {t(group.labelKey)}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors',
                        active
                          ? 'bg-primary/15 font-medium text-white'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary-300' : 'text-slate-400')} />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}

      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-white/95 px-4 backdrop-blur">
          <button
            className="rounded-md p-1.5 hover:bg-muted lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <form
            className="relative hidden max-w-md flex-1 sm:block"
            onSubmit={(event) => {
              event.preventDefault();
              if (term.trim()) router.push(`/search?q=${encodeURIComponent(term.trim())}`);
            }}
          >
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t('search.globalPlaceholder')}
              className="h-9 w-full rounded-lg border border-border bg-muted/50 ps-9 pe-3 text-sm outline-none focus:border-primary focus:bg-white"
            />
          </form>

          <div className="ms-auto flex items-center gap-1.5">
            <select
              aria-label={t('common.language')}
              value={session.locale || 'en-US'}
              onChange={(event) => switchLocale(event.target.value)}
              className="h-8 rounded-md border border-border bg-white px-1.5 text-xs text-slate-600"
            >
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {LOCALE_LABELS[locale]}
                </option>
              ))}
            </select>

            <div className="relative">
              <button
                onClick={openNotifications}
                className="relative rounded-md p-2 hover:bg-muted"
                aria-label={t('nav.notifications')}
              >
                <Bell className="h-4 w-4 text-slate-600" />
                {unread > 0 ? (
                  <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </button>
              {notifOpen ? (
                <div className="absolute end-0 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <p className="text-xs font-semibold text-slate-700">{t('nav.notifications')}</p>
                    <button className="text-[11px] text-primary hover:underline" onClick={markAll}>
                      {t('notifications.markAll')}
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t('notifications.empty')}</p>
                    ) : (
                      notifications.map((item) => (
                        <Link
                          key={item.id}
                          href={item.link || '/dashboard'}
                          className={cn(
                            'block border-b border-border/60 px-3 py-2.5 text-xs hover:bg-muted/60',
                            !item.readAt && 'bg-accent/40',
                          )}
                        >
                          <p className="font-medium text-slate-800">{titleOf(item)}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((value) => !value)}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {session.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden text-xs font-medium text-slate-700 sm:block">{session.name}</span>
                <ChevronDown className="hidden h-3 w-3 text-slate-400 sm:block" />
              </button>
              {menuOpen ? (
                <div className="absolute end-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="truncate text-xs font-semibold text-slate-800">{session.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
                  </div>
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted">
                    <UserIcon className="h-3.5 w-3.5" /> {t('common.profile')}
                  </Link>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5" /> {t('common.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {session.tenant?.status && session.tenant.status !== 'active' ? (
          <div className="bg-red-600 px-4 py-1.5 text-center text-xs font-medium text-white">
            {t('errors.tenantSuspended')}
          </div>
        ) : null}
        {session.mustChangePassword ? (
          <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">
            <Link href="/profile" className="underline">
              {t('settings.adminPassword')}
            </Link>
          </div>
        ) : null}

        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">{children}</main>

      </div>
    </div>
  );
}
