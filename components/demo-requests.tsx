'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { dateTime, human } from '@/lib/domain';
import { syncDemoRequest, readDemoRequests, resetDemoData, readDemoActions, type DemoAction, type DemoRequest } from '@/lib/demo/browser-store';

export function DemoBanner({ sheetSync = false }: { sheetSync?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  return <div className="topline demo-banner">
    <span>Demo — sample data · No real bookings, messages or payments. Use fictional details.{sheetSync && ' Requests are copied to Google Sheets as demo data. Reset clears this browser only.'}</span>
    <button type="button" onClick={() => { try { resetDemoData(); router.push(`/book?reset=${Date.now()}`); } catch { setError('Browser storage is unavailable. Allow site storage to reset the demo.'); } }}>Reset demo data</button>
    {error && <span role="alert">{error}</span>}
  </div>;
}

function useRequests() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    function load() {
      try { setRequests(readDemoRequests()); setError(''); }
      catch { setError('Unable to read saved demo requests. Allow browser storage or use Reset demo data.'); }
      setReady(true);
    }
    load(); window.addEventListener('storage', load); window.addEventListener('demo-data-changed', load);
    return () => { window.removeEventListener('storage', load); window.removeEventListener('demo-data-changed', load); };
  }, []);
  return { requests, ready, error };
}

export function DemoRequestList() {
  const { requests, ready, error } = useRequests();
  return <section className="stack" aria-label="Your simulated requests">
    <h2>Your simulated requests</h2>
    {error && <p role="alert" className="error">{error}</p>}
    {!ready ? <p>Loading saved requests…</p> : !requests.length ? <p className="notice">No requests placed in this browser yet. Complete a service request to try the full demo.</p> : requests.map(request => <Link key={request.id} href={`/bookings/${request.id}`} className="card">
      <span className="badge yellow">Simulated · Requested</span>
      <h3>{serviceName(request.data.service)}</h3>
      <p>{request.data.name} · {request.data.locality}</p>
      <p>Placed {dateTime(request.createdAt)} IST</p><small className="request-id">{request.id}</small>
      <p>View request →</p>
    </Link>)}
  </section>;
}

export function serviceName(service: string) {
  return service === 'BOTH' ? 'Home Cleaning + Laundry' : service === 'CLEANING' ? 'Home Cleaning' : 'Laundry Pickup & Return';
}

export function DemoRequestDetail({ id, sheetSync = false }: { id: string; sheetSync?: boolean }) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const { requests, ready, error } = useRequests();
  const request = requests.find(r => r.id === id);
  if (!ready) return <div className="container page"><p role="status">Loading demo request…</p></div>;
  if (!request) return <div className="container page"><h1>Demo request not found</h1><p>{error || 'This request may have been reset or created in another browser. Demo requests are saved only on this device.'}</p><Link className="btn" href="/book">Start a demo request</Link></div>;
  const d = request.data;
  return <div className="container page stack">
    <Link href="/bookings">← My Bookings</Link>
    <div className="page-title"><div className="eyebrow">Simulated submission</div><h1>Service request placed</h1><p role="status">Your demo request is saved in this browser. No real service has been booked and no one will contact you.</p><strong className="request-id">{request.id}</strong></div>
    {(sheetSync || request.sheet) && <section className="card" aria-label="Google Sheets sync"><h2>Google Sheets</h2><p role="status">{request.sheet?.message || 'This request is saved in this browser and has not been sent to Google Sheets.'}</p>{sheetSync && request.sheet?.status !== 'synced' && <button className="btn secondary" disabled={syncing} onClick={async () => { setSyncing(true); setSyncError(''); try { await syncDemoRequest(request); } catch { setSyncError('Unable to update browser storage. Allow site storage and retry.'); } finally { setSyncing(false); } }}>{syncing ? 'Sending…' : 'Retry Google Sheets sync'}</button>}{syncError && <p role="alert">{syncError}</p>}</section>}
    <div className="split"><section className="card stack">
      <h2>{serviceName(d.service)}</h2><span className="badge yellow">Requested · Pending quote</span>
      <h3>Request summary</h3><p>{d.name}<br/>{d.phone}<br/>{d.fullAddress}<br/>{d.locality}</p>
      <p>Access: {d.accessContact}<br/>{d.floorLift}<br/>{d.utilities}{d.landmark && <><br/>Landmark: {d.landmark}</>}</p>
      {d.cleaning && <div className="soft"><h3>Home cleaning</h3><p>{d.cleaning.propertyType} · {d.cleaning.bedrooms} bedrooms · {d.cleaning.bathrooms} bathrooms<br/>{human(d.cleaning.furnishing)} · {d.cleaning.area}<br/>{d.cleaning.cleaningType}</p>{d.cleaning.tasks && <p>Tasks: {d.cleaning.tasks}</p>}{d.cleaning.notes && <p>Notes: {d.cleaning.notes}</p>}</div>}
      {d.laundry && <div className="soft"><h3>Laundry care</h3><p>{human(d.laundry.type)} · {d.laundry.bags} bag(s)<br/>Estimated weight: {d.laundry.weightGrams ? `${d.laundry.weightGrams / 1000} kg` : 'Not provided'}</p>{d.laundry.instructions && <p>{d.laundry.instructions}</p>}</div>}
    </section><aside className="stack">
      <section className="card"><h2>Requested times · IST</h2>{d.cleaningStart && <p>Cleaning: {dateTime(d.cleaningStart)} IST</p>}{d.service !== 'CLEANING' && <p>Pickup: {d.collectDuringCleaning ? `During cleaning — ${dateTime(d.cleaningStart!)} IST` : `${dateTime(d.pickupStart!)} IST`}<br/>Return: {d.returnPreference || 'Team to propose an estimate'}</p>}<p className="notice">Requested appointments are not confirmed. No staff or capacity is reserved in this demo.</p></section>
      <section className="card"><h3>Estimated price</h3><p>{d.service !== 'LAUNDRY' ? 'Home cleaning from ₹5,000. ' : ''}{d.service !== 'CLEANING' ? 'Laundry quote required.' : ''}</p><strong>Final total pending itemised quote</strong><p>No payment collected.</p></section>
    </aside></div>
    <div className="actions"><Link className="btn" href="/bookings">View all requests</Link><Link className="btn secondary" href={`/book?again=${id}`}>Book again with these details</Link><Link className="btn ghost" href="/book?new=1">New service request</Link></div>
  </div>;
}


export function DemoActivity() {
  const [actions, setActions] = useState<DemoAction[]>([]);
  useEffect(() => {
    const load = () => { try { setActions(readDemoActions()); } catch { setActions([]); } };
    load(); window.addEventListener('demo-data-changed', load); window.addEventListener('storage', load);
    return () => { window.removeEventListener('demo-data-changed', load); window.removeEventListener('storage', load); };
  }, []);
  if (!actions.length) return null;
  return <section className="container page" aria-label="Demo activity"><details className="card"><summary>Demo activity ({actions.length} saved simulations)</summary><p>Form actions are recorded here for testing. Operations and staff screens use fixed sample records; these simulations do not change real accounts, appointments or payments.</p>{actions.map(action => <div className="soft" key={action.id}><strong>{human(action.action)} · Simulated</strong><p>{dateTime(action.createdAt)} IST</p><dl>{Object.entries(action.data).map(([key, value]) => <div key={key}><dt>{human(key)}</dt><dd className="request-id">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}</dd></div>)}</dl></div>)}</details></section>;
}
