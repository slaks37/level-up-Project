export const PUBLIC_HOST = 'levelup.sociopreneur.online';
export const ADMIN_HOST = 'go-levelup.sociopreneur.online';
export const PUBLIC_URL = `https://${PUBLIC_HOST}/`;
export const ADMIN_URL = `https://${ADMIN_HOST}/`;

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}
