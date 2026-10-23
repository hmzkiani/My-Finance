import { useEffect, useState } from 'react';

export const PUBLIC_SITE_PATHS = new Set([
  '/',
  '/about',
  '/contact',
  '/blog',
  '/privacy-policy',
  '/terms-and-conditions'
]);

export function isPublicSitePath(pathname) {
  const path = normalizePathname(pathname);
  return PUBLIC_SITE_PATHS.has(path) || path.startsWith('/blog/');
}

export const AUTH_PATH_MODES = {
  '/login': 'login',
  '/signup': 'signup',
  '/forgot-password': 'forgot'
};

export function normalizePathname(pathname) {
  const clean = String(pathname || '/').replace(/\/+$/, '');
  return clean || '/';
}

const SCREEN_PATHS = {
  home: '/app',
  transactions: '/transactions',
  reports: '/reports',
  settings: '/settings'
};

const SCREEN_BY_PATH = Object.fromEntries(Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen]));

export function screenPath(screen) {
  return SCREEN_PATHS[screen] || '/app';
}

export function screenFromPath(pathname) {
  const path = normalizePathname(pathname);
  if (path === '/' || path === '/app') return 'home';
  return SCREEN_BY_PATH[path] || 'home';
}

export function authModeFromLocation(pathname, search = '') {
  if (new URLSearchParams(search).get('flow') === 'recovery') return 'recovery';
  return AUTH_PATH_MODES[normalizePathname(pathname)] || 'login';
}

export function locationKey() {
  return `${window.location.pathname}${window.location.search}`;
}

export function useLocationKey() {
  const [key, setKey] = useState(locationKey);
  useEffect(() => {
    const update = () => setKey(locationKey());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return key;
}

export function navigateTo(path, { replace = false } = {}) {
  const target = new URL(path, window.location.origin);
  if (target.origin !== window.location.origin) {
    window.location.assign(target.toString());
    return;
  }
  const relative = `${target.pathname}${target.search}${target.hash}`;
  if (replace) window.history.replaceState({}, '', relative);
  else window.history.pushState({}, '', relative);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
