import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { THEME_KEY } from './data.js';
import { loadTheme, saveTheme } from './storage.js';
import { AUTH_REDIRECT_URL, getAuthRedirectUrl, supabase, supabaseConfigError } from './supabase.js';
import { AUTH_PATH_MODES, isPublicSitePath, authModeFromLocation, navigateTo, useLocationKey } from './routing.js';

const AuthContext = createContext(null);

function getInitialTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return ['dark', 'light', 'system'].includes(saved) ? saved : 'dark';
  } catch { return 'dark'; }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}

function authErrorMessage(error, action) {
  const code = error?.code || '';
  const message = String(error?.message || '');
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return 'That email or password is incorrect. Try again or reset your password.';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return 'Please verify your email address using the link we sent you.';
  if (code === 'over_request_rate_limit' || error?.status === 429) return 'Too many attempts. Wait a little while, then try again.';
  if (/password.*(weak|short)|weak password/i.test(message)) return 'Choose a stronger password and try again.';
  if (/network|fetch/i.test(message)) return 'Could not reach Supabase. Check your connection and project URL.';
  if (action === 'signup') return 'We could not create that account. Check the details, then sign in or reset your password if you already registered.';
  return message || 'Authentication could not be completed. Please try again.';
}

function SunMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>;
}

function MoonMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M20.6 14.2A8.7 8.7 0 0 1 9.8 3.4 8.9 8.9 0 1 0 20.6 14.2Z" /></svg>;
}

function ShieldMark() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

function EyeMark({ crossed = false }) {
  return crossed
    ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.1 3.9M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7c1.1 0 2.1-.2 3-.5" /></svg>
    : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>;
}

function PasswordField({ label, value, onChange, autoComplete, minLength = 8 }) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const toggleLabel = visible ? 'Hide password' : 'Show password';
  return <div className="auth-field password-field">
    <label htmlFor={inputId}>{label}</label>
    <div className="auth-password-control">
      <input id={inputId} type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} minLength={minLength} required />
      <button className="auth-password-toggle" type="button" onClick={() => setVisible(current => !current)} aria-label={toggleLabel} aria-pressed={visible} title={toggleLabel}>
        <EyeMark crossed={visible} />
      </button>
    </div>
  </div>;
}

function AuthPage({ mode, setMode, resolvedTheme, onThemeToggle, error, clearError, onRecoveryComplete }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryComplete, setRecoveryComplete] = useState(false);

  useEffect(() => {
    setFormError(error || '');
  }, [error, mode]);

  const changeMode = next => {
    if (mode === 'recovery' && next === 'login') {
      clearError();
      setFormError('');
      setNotice('');
      setPassword('');
      setConfirmPassword('');
      onRecoveryComplete();
      return;
    }
    clearError();
    setFormError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
    setRecoveryComplete(false);
    setMode(next);
  };

  const submit = async event => {
    event.preventDefault();
    setFormError('');
    setNotice('');
    clearError();

    if (mode === 'signup') {
      if (!fullName.trim()) { setFormError('Enter your full name.'); return; }
      if (password.length < 8) { setFormError('Use a password with at least 8 characters.'); return; }
      if (password !== confirmPassword) { setFormError('The passwords do not match.'); return; }
    }
    if (mode === 'recovery') {
      if (password.length < 8) { setFormError('Use a password with at least 8 characters.'); return; }
      if (password !== confirmPassword) { setFormError('The passwords do not match.'); return; }
    }
    if (!email.trim() && (mode === 'login' || mode === 'signup' || mode === 'forgot')) {
      setFormError('Enter your email address.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: getAuthRedirectUrl()
          }
        });
        if (signupError) throw signupError;
        if (!data.session) {
          setNotice('If this address can be registered, a verification link is on its way. Open the link on this device to finish creating your account.');
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (loginError) throw loginError;
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: getAuthRedirectUrl('recovery') });
        if (resetError) throw resetError;
        setNotice('If an account uses this email, you will receive a password reset link shortly.');
      } else if (mode === 'recovery') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setRecoveryComplete(true);
        setNotice('Your password has been updated. Continue to your finance dashboard when you are ready.');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (submitError) {
      setFormError(authErrorMessage(submitError, mode));
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    login: ['Welcome back', 'Sign in to your private finance space.'],
    signup: ['Create your account', 'Your records are saved under your own account.'],
    forgot: ['Reset your password', 'We will send a secure reset link to your email.'],
    recovery: ['Choose a new password', 'Use a new password to secure your account.']
  };
  const [title, subtitle] = titles[mode] || titles.login;
  const showEmail = mode !== 'recovery';
  const brandLockup = <div className="brand-lockup"><img className="brand-logo" src={resolvedTheme === 'dark' ? '/brand/my-finance-light.svg' : '/brand/my-finance-dark.svg'} alt="My Finance" width="190" height="42" /></div>;
  const websiteBrand = Capacitor.isNativePlatform() ? brandLockup : <a className="auth-brand-home" href="/" onClick={event => { event.preventDefault(); navigateTo('/'); }}>{brandLockup}</a>;

  return <div className="auth-shell">
    <header className="auth-topbar">
      {websiteBrand}
      <div className="auth-topbar-actions">{!Capacitor.isNativePlatform() && <a className="auth-home-link" href="/" onClick={event => { event.preventDefault(); navigateTo('/'); }}>Website</a>}<button className="icon-button theme-toggle" onClick={onThemeToggle} aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}>{resolvedTheme === 'dark' ? <SunMark /> : <MoonMark />}</button></div>
    </header>

    <main className="auth-layout">
      <section className="auth-story">
        <span className="auth-kicker">A clearer view of your money</span>
        <h1>Thoughtful money habits start with a clearer picture.</h1>
        <p>Keep your income, spending, and goals together in one private finance space.</p>
        <div className="auth-trust"><span className="auth-shield"><ShieldMark /></span><span><strong>Private to your account</strong><small>Your transactions are protected by your signed-in account.</small></span></div>
      </section>

      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-card-heading"><span className="eyebrow">MY FINANCE ACCOUNT</span><h2 id="auth-heading">{title}</h2><p>{subtitle}</p></div>

        {supabaseConfigError ? <div className="auth-config-alert" role="alert"><strong>Supabase setup needed</strong><p>{supabaseConfigError}</p><small>Copy <code>.env.example</code> to <code>.env.local</code>, enter your own project URL and public key, then restart Vite.</small></div> : <>
          {formError && <div className="auth-message auth-error" role="alert">{formError}</div>}
          {notice && <div className="auth-message auth-notice" role="status">{notice}</div>}

          {mode === 'recovery' && recoveryComplete ? <button className="button button-primary auth-submit" onClick={onRecoveryComplete}>Continue to My Finance</button> : <form className="auth-form" onSubmit={submit} noValidate>
            {mode === 'signup' && <label className="auth-field"><span>Full name</span><input autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Your name" maxLength={100} required /></label>}
            {showEmail && <label className="auth-field"><span>Email address</span><input type="email" autoComplete="email" inputMode="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label>}
            {(mode === 'login' || mode === 'signup' || mode === 'recovery') && <PasswordField label={`Password${mode === 'signup' || mode === 'recovery' ? ' · at least 8 characters' : ''}`} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} />}
            {(mode === 'signup' || mode === 'recovery') && <PasswordField label="Confirm password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />}
            {mode === 'login' && <button className="auth-inline-link forgot-link" type="button" onClick={() => changeMode('forgot')}>Forgot password?</button>}
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'}</button>
          </form>}

          <div className="auth-switch">
            {mode === 'login' && <>New to My Finance? <button className="auth-inline-link" onClick={() => changeMode('signup')}>Create an account</button></>}
            {mode === 'signup' && <>Already have an account? <button className="auth-inline-link" onClick={() => changeMode('login')}>Sign in</button></>}
            {mode === 'forgot' && <button className="auth-inline-link" onClick={() => changeMode('login')}>Back to sign in</button>}
            {mode === 'recovery' && !recoveryComplete && <button className="auth-inline-link" onClick={() => changeMode('login')}>Back to sign in</button>}
          </div>
        </>}

        <div className="auth-card-footer"><span className="auth-footer-shield"><ShieldMark /></span><span>Passwords are handled by Supabase Auth. My Finance never stores your password.</span></div>
      </section>
    </main>
    <footer className="auth-footer">MY FINANCE <span>·</span> PRIVATE PERSONAL FINANCE</footer>
  </div>;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const location = useLocationKey();
  const currentUrl = new URL(location, window.location.origin);
  const recoveryRequested = currentUrl.searchParams.get('flow') === 'recovery';
  const [mode, setMode] = useState(() => authModeFromLocation(currentUrl.pathname, currentUrl.search));
  const [authError, setAuthError] = useState('');
  const [theme, setTheme] = useState(getInitialTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    let alive = true;
    loadTheme().then(saved => {
      if (alive) {
        setTheme(['dark', 'light', 'system'].includes(saved) ? saved : 'dark');
        setThemeReady(true);
      }
    });
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const update = event => setSystemDark(event.matches);
    media?.addEventListener?.('change', update);
    return () => { alive = false; media?.removeEventListener?.('change', update); };
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#090b0a' : '#f5f5f2');
  }, [resolvedTheme, themeReady]);

  useEffect(() => {
    setMode(authModeFromLocation(currentUrl.pathname, currentUrl.search));
  }, [location]);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return undefined; }
    let alive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
      if (event === 'SIGNED_OUT') { setMode('login'); setAuthError(''); }
    });
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      setSession(data.session);
      if (sessionError) setAuthError(authErrorMessage(sessionError, 'login'));
      setAuthReady(true);
    }).catch(error => {
      if (!alive) return;
      setAuthError(authErrorMessage(error, 'login'));
      setAuthReady(true);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !Capacitor.isNativePlatform()) return undefined;
    let active = true;
    const callback = new URL(AUTH_REDIRECT_URL);
    const handleAuthUrl = async url => {
      try {
        const incoming = new URL(url);
        if (incoming.protocol !== callback.protocol || incoming.hostname !== callback.hostname || incoming.pathname !== callback.pathname) return;
        if (incoming.searchParams.get('flow') === 'recovery') setMode('recovery');
        const code = incoming.searchParams.get('code');
        if (!code) throw new Error('The email link is missing its one-time code. Request a fresh link and try again.');
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } catch (error) {
        if (active) setAuthError(authErrorMessage(error, 'login'));
      }
    };
    const listener = NativeApp.addListener('appUrlOpen', event => { void handleAuthUrl(event.url); });
    NativeApp.getLaunchUrl().then(launch => { if (launch?.url) void handleAuthUrl(launch.url); }).catch(() => {});
    return () => {
      active = false;
      listener.then(handle => handle.remove()).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || !session || recoveryRequested || !AUTH_PATH_MODES[normalizePathname(currentUrl.pathname)]) return;
    navigateTo('/app', { replace: true });
  }, [session, location]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }, []);

  const finishRecovery = useCallback(() => {
    setMode('login');
    if (Capacitor.isNativePlatform()) {
      const url = new URL(window.location.href);
      url.searchParams.delete('flow');
      window.history.replaceState({}, '', url.toString());
    } else {
      navigateTo(session ? '/app' : '/login', { replace: true });
    }
  }, [session]);

  const changeAuthTheme = useCallback(async next => {
    setTheme(next);
    try { await saveTheme(next); } catch { setAuthError('The theme preference could not be saved.'); }
  }, []);

  const value = useMemo(() => ({
    client: supabase, user: session?.user || null, session, signOut,
    theme, setTheme: changeAuthTheme
  }), [session, signOut, theme, changeAuthTheme]);
  if (!authReady || !themeReady) return <div className="loading-screen"><div className="brand-mark">₨</div><strong>My Finance</strong><span>{themeReady ? 'Checking your secure session…' : 'Preparing your preferred theme…'}</span></div>;

  const publicSitePage = !Capacitor.isNativePlatform()
    && isPublicSitePath(currentUrl.pathname)
    && !recoveryRequested;
  const showAuthentication = recoveryRequested || (!publicSitePage && (supabaseConfigError || !session));

  return <AuthContext.Provider value={value}>
    {showAuthentication ? <AuthPage
      mode={mode}
      setMode={next => {
        setMode(next);
        setAuthError('');
        if (!Capacitor.isNativePlatform()) {
          const path = next === 'recovery' ? '/?flow=recovery' : ({ login: '/login', signup: '/signup', forgot: '/forgot-password' }[next] || '/login');
          navigateTo(path);
        }
      }}
      resolvedTheme={resolvedTheme}
      onThemeToggle={() => { void changeAuthTheme(resolvedTheme === 'dark' ? 'light' : 'dark'); }}
      error={authError}
      clearError={() => setAuthError('')}
      onRecoveryComplete={finishRecovery}
    /> : children}
  </AuthContext.Provider>;
}
