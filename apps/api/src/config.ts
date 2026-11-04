import 'dotenv/config';
/* Central environment configuration. Values that can be changed at runtime by
 * the Super Admin (default locale, reCAPTCHA keys) are read through helpers so
 * the settings table stays authoritative. */
import * as fs from 'fs';
import * as path from 'path';

const bool = (v: string | undefined, fallback = false) =>
  v === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());

const int = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const LOCALES = ['en-US', 'pt-BR', 'es-MX', 'fr-FR', 'zh-CN', 'hi-IN', 'ar-SA'] as const;
export type Locale = (typeof LOCALES)[number];
export const RTL_LOCALES = ['ar-SA'];
export const FALLBACK_LOCALE: Locale = 'en-US';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  appUrl: (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  port: int(process.env.API_PORT, 3001),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  refreshDays: int(process.env.REFRESH_TOKEN_DAYS, 30),

  authMethod: (process.env.AUTH_METHOD || 'account').toLowerCase() as 'none' | 'account' | 'keycloak',
  accountLogin: process.env.ACCOUNT_LOGIN || 'admin@example.com',
  accountPassword: process.env.ACCOUNT_PASSWORD || 'admin123',

  keycloakBaseUrl: (process.env.KEYCLOAK_BASE_URL || '').replace(/\/$/, ''),
  keycloakRealm: process.env.KEYCLOAK_REALM || '',
  keycloakClientId: process.env.KEYCLOAK_CLIENT_ID || '',
  keycloakClientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
  keycloakRedirectUri: process.env.KEYCLOAK_REDIRECT_URI || '',
  keycloakPostLogoutRedirectUri: process.env.KEYCLOAK_POST_LOGOUT_REDIRECT_URI || '',
  keycloakAccounts: process.env.KEYCLOAK_ACCOUNTS || '',

  defaultLocale: (process.env.DEFAULT_LOCALE || FALLBACK_LOCALE) as Locale,

  storageDriver: (process.env.STORAGE_DRIVER || 'local').toLowerCase() as 'local' | 's3',
  storageLocalRoot: process.env.STORAGE_LOCAL_ROOT || path.resolve(process.cwd(), '../../storage/app'),
  storageMaxFileMb: int(process.env.STORAGE_MAX_FILE_MB, 50),
  s3: {
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'grc',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, true),
  },

  redisUrl: process.env.REDIS_URL || '',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: int(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'GRC Platform <no-reply@grc.local>',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  localesDir: process.env.LOCALES_DIR || path.resolve(process.cwd(), '../../locales'),
  envFile: process.env.ENV_FILE || path.resolve(process.cwd(), '.env'),
  seedDemo: bool(process.env.SEED_DEMO, true),
};

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return FALLBACK_LOCALE;
  const exact = LOCALES.find((l) => l.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const lang = value.split('-')[0].toLowerCase();
  const byLang = LOCALES.find((l) => l.toLowerCase().startsWith(lang + '-'));
  return byLang || FALLBACK_LOCALE;
}

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale);
}

export function keycloakUrls() {
  const issuer = `${env.keycloakBaseUrl}/realms/${env.keycloakRealm}`;
  return {
    issuer,
    authorizationEndpoint: `${issuer}/protocol/openid-connect/auth`,
    tokenEndpoint: `${issuer}/protocol/openid-connect/token`,
    jwksUri: `${issuer}/protocol/openid-connect/certs`,
    endSessionEndpoint: `${issuer}/protocol/openid-connect/logout`,
    redirectUri: env.keycloakRedirectUri || `${env.appUrl}/api/auth/callback`,
    postLogoutRedirectUri: env.keycloakPostLogoutRedirectUri || `${env.appUrl}/login`,
    clientId: env.keycloakClientId,
    clientSecret: env.keycloakClientSecret,
  };
}

/** Best-effort persistence of a runtime global setting into the .env file. */
export function persistEnv(key: string, value: string) {
  try {
    if (!fs.existsSync(env.envFile)) return false;
    const content = fs.readFileSync(env.envFile, 'utf8');
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    const next = re.test(content)
      ? content.replace(re, line)
      : `${content.trimEnd()}\n${line}\n`;
    fs.writeFileSync(env.envFile, next, 'utf8');
    return true;
  } catch {
    return false;
  }
}
