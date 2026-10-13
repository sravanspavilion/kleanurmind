'use client';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Field } from './forms';

function friendlyError(code?: string | null): string {
  if (!code) return '';
  if (code === 'OAuthAccountNotLinked') return 'That email is already registered with a different sign-in method. Please use the original method or contact us.';
  if (code === 'AccessDenied') return 'Sign-in was declined. Please use a Google account with a verified email address.';
  if (code === 'Configuration') return 'Sign-in is temporarily unavailable. Please try again in a few minutes.';
  if (code === 'Verification') return 'That sign-in link has expired. Please try again.';
  return 'We could not sign you in. Please try again.';
}

export function SignIn({ demo, google, signedIn, callbackUrl, authError }: { demo: boolean; google: boolean; signedIn: boolean; callbackUrl: string; authError?: string }) {
  const [error, setError] = useState(friendlyError(authError));
  const [busy, setBusy] = useState(false);
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState('');

  if (signedIn) {
    return <div className="stack"><p className="muted">You are signed in on this device.</p><Link href="/account" className="btn">Go to your account portal</Link><button className="btn secondary" onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button></div>;
  }

  return <div className="stack">
    <div className="actions" aria-label="Account options">
      <button type="button" className={`btn ${register ? 'ghost' : ''}`} disabled={busy} aria-pressed={!register} onClick={() => { setRegister(false); setError(''); setMessage(''); }}>Sign in</button>
      <button type="button" className={`btn ${register ? '' : 'ghost'}`} disabled={busy} aria-pressed={register} onClick={() => { setRegister(true); setError(''); setMessage(''); }}>Create account</button>
    </div>
    <form key={register ? 'register' : 'login'} onSubmit={async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = String(form.get('email') ?? '').trim().toLowerCase();
      const password = String(form.get('password') ?? '');
      setError(''); setMessage('');
      if (register && password !== form.get('confirmPassword')) { setError('Passwords do not match.'); return; }
      setBusy(true);
      try {
        if (register) {
          const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email, password }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Unable to create account.');
          setRegister(false);
          setMessage('Account created. You can now sign in with your email and password.');
          return;
        }
        const result = await signIn('email-password', { email, password, redirect: false, callbackUrl });
        if (!result || result.error) throw new Error('Unable to sign in. Check your email and password, or try again shortly.');
        window.location.assign(callbackUrl);
      } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); }
      finally { setBusy(false); }
    }}>
      {register && <Field label="Your name"><input name="name" autoComplete="name" maxLength={100} required disabled={busy}/></Field>}
      <Field label="Email address"><input name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy}/></Field>
      <Field label="Password"><input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} maxLength={72} required disabled={busy}/></Field>
      {register && <><p className="muted">Use at least 8 characters for your password.</p><Field label="Confirm password"><input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required disabled={busy}/></Field></>}
      <button className="btn" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
    </form>
    {message && <p className="success" role="status">{message}</p>}
    {google && <button className="btn" disabled={busy} onClick={() => { setBusy(true); void signIn('google', { callbackUrl }); }}>{busy ? 'Taking you to Google…' : 'Continue with Google'}</button>}
    {error && <p className="error" role="alert">{error}</p>}

    {demo && <form onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      setError('');
      const f = new FormData(e.currentTarget);
      try {
        const r = await signIn('credentials', { email: f.get('email'), key: f.get('key'), redirect: false });
        if (r?.error) setError('Unable to sign in. Check the development key, seeded user and database.');
        else window.location.assign(callbackUrl || '/bookings');
      } catch {
        setError('Sign-in is unavailable right now. Please retry.');
      } finally {
        setBusy(false);
      }
    }}>
      <div className="notice">Local development sign-in is enabled. This uses seeded fictional accounts only.</div>
      <Field label="Fictional email"><input name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Development key"><input name="key" type="password" autoComplete="current-password" required /></Field>
      <button className="btn secondary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in for development'}</button>
    </form>}
  </div>;
}
