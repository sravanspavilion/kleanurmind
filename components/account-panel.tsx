'use client';

import { useEffect, useState } from 'react';
import { Field } from './forms';

type Account = { id: string; name: string; email: string };

// The public-demo client account panel. It only talks to the server routes
// (/api/demo/accounts/*), which hash the password and write the account to the
// Google Sheet. No secret and no password hash ever reach the browser.
export function DemoAccountPanel() {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [register, setRegister] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/demo/accounts/session')
      .then((response) => response.json())
      .then((result) => { if (active) setAccount(result?.account ?? null); })
      .catch(() => { if (active) setAccount(null); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  async function post(path: string, body: unknown) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Something went wrong. Please retry.');
    return result;
  }

  if (!ready) return <p role="status" className="muted">Checking for a signed-in account…</p>;

  if (account) {
    return <div className="stack">
      <div className="card">
        <span className="badge yellow">Demo account</span>
        <h2>Hello, {account.name.trim().split(/\s+/)[0] || 'there'}!</h2>
        <p className="muted">Signed in as <strong>{account.email}</strong></p>
        <p className="muted">Your account is stored in the demo Google Sheet under account ID <span className="request-id">{account.id}</span>. Only a hashed password is saved — never the password itself.</p>
      </div>
      <button className="btn secondary" disabled={busy} onClick={async () => {
        setBusy(true); setError('');
        try { await post('/api/demo/accounts/logout', {}); setAccount(null); setMessage('You have signed out of the demo account.'); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not sign out.'); }
        finally { setBusy(false); }
      }}>{busy ? 'Signing out…' : 'Sign out'}</button>
    </div>;
  }

  return <div className="stack">
    <div className="actions" aria-label="Account options">
      <button type="button" className={`btn ${register ? 'ghost' : ''}`} aria-pressed={!register} disabled={busy} onClick={() => { setRegister(false); setError(''); setMessage(''); }}>Sign in</button>
      <button type="button" className={`btn ${register ? '' : 'ghost'}`} aria-pressed={register} disabled={busy} onClick={() => { setRegister(true); setError(''); setMessage(''); }}>Create account</button>
    </div>

    <form key={register ? 'register' : 'login'} onSubmit={async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = String(form.get('email') ?? '').trim().toLowerCase();
      const password = String(form.get('password') ?? '');
      setError(''); setMessage('');
      if (register && password !== form.get('confirmPassword')) { setError('Passwords do not match.'); return; }
      setBusy(true);
      try {
        const result = register
          ? await post('/api/demo/accounts/register', { name: form.get('name'), email, phone: form.get('phone'), password })
          : await post('/api/demo/accounts/login', { email, password });
        setAccount(result.account as Account);
        setMessage(register ? 'Account created and saved to the demo Google Sheet.' : 'Signed in.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setBusy(false);
      }
    }}>
      {register && <Field label="Your name"><input name="name" autoComplete="name" maxLength={100} required disabled={busy} /></Field>}
      <Field label="Email address"><input name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy} /></Field>
      {register && <Field label="Mobile number (optional)"><input name="phone" type="tel" autoComplete="tel" maxLength={20} disabled={busy} /></Field>}
      <Field label="Password"><input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} maxLength={72} required disabled={busy} /></Field>
      {register && <><p className="muted">Use at least 8 characters. It is hashed before saving, so no one can read it.</p><Field label="Confirm password"><input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required disabled={busy} /></Field></>}
      <button className="btn" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
    </form>

    {message && <p className="success" role="status">{message}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <p className="muted">Demonstration only. Use fictional details. The email, optional phone number and a bcrypt password hash are stored in a Google Sheet; the password itself is never saved or shown.</p>
  </div>;
}
