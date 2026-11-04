'use client';

export class ApiError extends Error {
  status: number;
  messageKey: string;
  issues?: { path: string; message: string }[];

  constructor(status: number, messageKey: string, message?: string, issues?: any[]) {
    super(message || messageKey);
    this.status = status;
    this.messageKey = messageKey;
    this.issues = issues;
  }
}

/** Browser-side API helper (same-origin via Next rewrites). */
export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any; formData?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path.startsWith('/') ? path : `/${path}`, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.formData ? options.formData : options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.messageKey || 'errors.generic',
      data?.message,
      data?.issues,
    );
  }
  return data as T;
}

export const apiGet = <T = any>(path: string) => api<T>(path);
export const apiPost = <T = any>(path: string, body?: any) => api<T>(path, { body: body ?? {} });
export const apiPatch = <T = any>(path: string, body: any) => api<T>(path, { method: 'PATCH', body });
export const apiPut = <T = any>(path: string, body: any) => api<T>(path, { method: 'PUT', body });
export const apiDelete = <T = any>(path: string) => api<T>(path, { method: 'DELETE' });

export function downloadUrl(path: string) {
  window.open(path, '_blank');
}

export async function downloadCsv(moduleKey: string, query: Record<string, any> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const response = await fetch(`/api/${moduleKey}/export?${params.toString()}`, { credentials: 'include' });
  if (!response.ok) throw new ApiError(response.status, 'errors.exportFailed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${moduleKey}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
