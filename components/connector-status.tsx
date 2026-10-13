'use client';
import { useCallback, useEffect, useState } from 'react';

type Failure = { id: string; kind: string; entityId: string; status: string; attempts: number; lastError: string | null; createdAt: string };
type Status = {
  configured: boolean;
  health: { configured: boolean; reachable: boolean; actionSupported: boolean; version?: string; error?: string };
  failedCount: number;
  failures: Failure[];
};

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'Connector status is unavailable.';
}

export function ConnectorStatus() {
  const [state, setState] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchStatus = useCallback(async (): Promise<Status> => {
    const response = await fetch('/api/integrations/google-sheet', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Connector status is unavailable.');
    return data as Status;
  }, []);

  // Initial load runs after mount; state is only set once the request settles.
  useEffect(() => {
    let active = true;
    fetchStatus()
      .then(data => { if (active) setState(data); })
      .catch(e => { if (active) setError(describe(e)); });
    return () => { active = false; };
  }, [fetchStatus]);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setState(await fetchStatus());
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }, [fetchStatus]);

  const retry = async (id: string) => {
    setError('');
    try {
      const response = await fetch('/api/integrations/google-sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not queue the retry.');
      await load();
    } catch (e) {
      setError(describe(e));
    }
  };

  if (!state) return <p className="muted">{busy ? 'Checking connector…' : 'Loading connector status…'}</p>;

  const { health } = state;
  const label = !state.configured ? 'Not configured' : health.reachable ? (health.actionSupported ? 'Connected' : 'Connected — health action pending') : 'Unreachable';

  return <div className="stack">
    <div className="soft">
      <div className="row"><strong>Google Sheets connector</strong><span className={`badge ${health.reachable ? 'green' : 'red'}`}>{label}</span></div>
      <p className="muted">
        {!state.configured
          ? 'Set GOOGLE_SCRIPT_URL and GOOGLE_SCRIPT_SECRET on the server, then run a check. The shared secret is never shown here.'
          : health.error ? `Last check: ${health.error}` : health.version ? `Connector version ${health.version}.` : 'Signed connection is available.'}
      </p>
      <button className="btn secondary" onClick={() => void load()} disabled={busy}>{busy ? 'Checking…' : 'Run a live check'}</button>
    </div>

    <div className="soft">
      <div className="row"><strong>Sheet sync queue</strong><span className="badge">{state.failedCount}</span></div>
      {state.failures.length === 0
        ? <p className="muted">No pending or failed Sheet syncs.</p>
        : state.failures.map(failure => <div className="row" key={failure.id} style={{ marginTop: 12 }}>
            <span>{failure.kind.replace('SHEET_', '').toLowerCase()} · {failure.entityId}<br /><small>{failure.lastError ?? 'Queued for the next run'}</small></span>
            <button className="btn secondary small" onClick={() => void retry(failure.id)}>Retry now</button>
          </div>)}
    </div>

    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
