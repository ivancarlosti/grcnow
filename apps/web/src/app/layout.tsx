import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getAppI18n } from '@/i18n/request';
import './globals.css';

export const metadata: Metadata = {
  title: 'GRC Platform',
  description: 'Governance, risk and compliance in one multi-tenant platform.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir, messages } = await getAppI18n();
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
