import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const config = import.meta.env || {};
const supabaseUrl = (config.VITE_SUPABASE_URL || '').trim();
const supabasePublicKey = (
  config.VITE_SUPABASE_PUBLISHABLE_KEY || config.VITE_SUPABASE_ANON_KEY || ''
).trim();

function isServiceRoleKey(key) {
  if (!key) return false;
  if (/service[_-]?role/i.test(key) || key.startsWith('sb_secret_')) return true;
  try {
    const payload = key.split('.')[1];
    if (!payload || typeof atob !== 'function') return false;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    return JSON.parse(decoded).role === 'service_role';
  } catch {
    return false;
  }
}

export const supabaseConfigError = !supabaseUrl || !supabasePublicKey
  ? 'Add your Supabase project URL and publishable key to .env.local, then restart the app.'
  : isServiceRoleKey(supabasePublicKey)
    ? 'A service-role secret was supplied to the app. Remove it and use the project publishable key (or legacy anon key) instead.'
    : '';

const isNative = Capacitor.isNativePlatform();
const nativeStorageReady = isNative
  ? SecureStorage.setKeyPrefix('my-finance-auth-')
  : Promise.resolve();

export const secureAuthStorage = {
  async getItem(key) {
    if (isNative) {
      await nativeStorageReady;
      return SecureStorage.getItem(key);
    }
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (isNative) {
      await nativeStorageReady;
      await SecureStorage.setItem(key, value);
      return;
    }
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (isNative) {
      await nativeStorageReady;
      await SecureStorage.removeItem(key);
      return;
    }
    window.localStorage.removeItem(key);
  }
};

export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabasePublicKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    persistSession: true,
    storage: secureAuthStorage,
    storageKey: 'my-finance-auth-v1'
  }
});

export const AUTH_REDIRECT_URL = 'com.hmzkiani.myfinance://auth/callback';

export function getAuthRedirectUrl(flow = '') {
  const url = new URL(isNative ? AUTH_REDIRECT_URL : `${window.location.origin}/`);
  if (flow) url.searchParams.set('flow', flow);
  return url.toString();
}
