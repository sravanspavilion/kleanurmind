'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Brush, WashingMachine, Sparkles, ArrowRight } from 'lucide-react';
import { bookingSchema } from '@/lib/validation';
import { localToISO, human, dateTime } from '@/lib/domain';
import { isDemoMode } from '@/lib/demo/mode';
import { DEMO_DRAFT_KEY, syncDemoRequest, placeDemoRequest, readDemoRequests, sampleContact, sampleSchedule } from '@/lib/demo/browser-store';
import { Field, mutate } from './forms';

const initial = {
  service: 'CLEANING',
  name: '',
  phone: '',
  locality: '',
  fullAddress: '',
  landmark: '',
  accessContact: '',
  floorLift: '',
  utilities: '',
  cleaning: {
    propertyType: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    area: 'Not sure',
    furnishing: 'FURNISHED',
    cleaningType: 'Deep cleaning',
    tasks: '',
    notes: '',
  },
  laundry: {
    type: 'WASH_FOLD',
    bags: 1,
    weightGrams: undefined as number | undefined,
    instructions: '',
  },
  cleaningTime: '',
  pickupTime: '',
  collectDuringCleaning: false,
  returnPreference: '',
};

type Draft = typeof initial;

export function BookingForm({ contact, defaultName='', defaultPhone='', repeat, sheetSync = false }: { sheetSync?: boolean; contact: string | null; defaultName?: string; defaultPhone?: string; repeat?: Record<string, unknown> }) {
  const search = useSearchParams();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const demo = isDemoMode();
  const [demoDone, setDemoDone] = useState(false);
  const [storageError, setStorageError] = useState('');
  const key = useRef('');
  const hydratedIntent = useRef<string | null>(null);
  const submitting = useRef(false);
  const section = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    hydratedIntent.current = search.toString();
    if (demo) {
      try {
        const saved = JSON.parse(localStorage.getItem(DEMO_DRAFT_KEY) || 'null');
        const again = search.get('again');
        const prior = again ? readDemoRequests().find(r => r.id === again) : null;
        const chosen = search.get('service');
        const valid = ['CLEANING', 'LAUNDRY', 'BOTH'].includes(chosen ?? '');
        const explicitStart = search.has('new') || search.has('reset') || !!again || (valid && saved?.intent !== search.toString());
        const fresh = explicitStart && (saved?.intent !== search.toString() || !!saved?.completedId);
        const defaults = { ...initial, ...sampleContact, cleaningTime: sampleSchedule(), pickupTime: sampleSchedule(2, '11:00') };
        const source = prior && fresh ? { ...prior.data, cleaningTime: sampleSchedule(), pickupTime: sampleSchedule(2, '11:00') } : repeat || (!fresh && saved?.draft) || {};
        const merged = { ...defaults, ...source, ...(valid && (!saved || fresh) ? { service: chosen } : {}) };
        key.current = !fresh && saved?.key ? saved.key : crypto.randomUUID();
        setDraft({ ...merged, cleaning: { ...initial.cleaning, ...merged.cleaning }, laundry: { ...initial.laundry, ...merged.laundry } } as Draft);
        setStep(!fresh && saved ? Math.min(3, Math.max(0, Number(saved.step) || 0)) : 0);
        if (!fresh && saved?.completedId) {
          setDemoDone(true);
          router.replace(`/bookings/${saved.completedId}`);
        }
      } catch { setStorageError('Demo storage is unavailable or unreadable. Allow browser storage or use Reset demo data before submitting.'); }
      setReady(true);
      return;
    }
    try {key.current=sessionStorage.getItem('kum-booking-key')||crypto.randomUUID();sessionStorage.setItem('kum-booking-key',key.current);}catch{key.current=crypto.randomUUID();}
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem('kum-booking-draft') ?? '{}'); } catch {}
    const chosen = search.get('service');
    const valid = ['CLEANING', 'LAUNDRY', 'BOTH'].includes(chosen ?? '');
    const merged = { ...initial, name:defaultName, phone:defaultPhone, ...saved, ...repeat, ...(valid ? { service: chosen } : {}) };
    setDraft({ ...merged, cleaning: { ...initial.cleaning, ...(merged.cleaning as object) }, laundry: { ...initial.laundry, ...(merged.laundry as object) } } as Draft);
    try {setStep(Math.min(3,Math.max(0,Number(sessionStorage.getItem('kum-booking-step'))||0)));}catch{}
    setReady(true);
    });
    return () => { active = false; };
  }, [repeat, search, defaultName, defaultPhone, demo, router]);

  useEffect(() => {
    if (!ready || demoDone || hydratedIntent.current !== search.toString()) return;
    try {
      if (demo) localStorage.setItem(DEMO_DRAFT_KEY, JSON.stringify({ draft, step, key: key.current, intent: search.toString() }));
      else { sessionStorage.setItem('kum-booking-draft', JSON.stringify(draft)); sessionStorage.setItem('kum-booking-step', String(step)); }
    } catch { queueMicrotask(() => setStorageError('Browser storage is unavailable. Allow site storage to save demo progress and requests.')); }
  }, [draft, ready, step, demo, demoDone, search]);

  useEffect(() => { if (ready) section.current?.focus(); }, [step, ready]);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function clean(k: string, v: string | number) {
    setDraft((d) => ({ ...d, cleaning: { ...d.cleaning, [k]: v } }));
  }

  function laundry(k: string, v: string | number | undefined) {
    setDraft((d) => ({ ...d, laundry: { ...d.laundry, [k]: v } }));
  }

  const cleaning = draft.service !== 'LAUNDRY';
  const washing = draft.service !== 'CLEANING';

  function payload() {
    return {
      ...draft,
      requestKey: key.current,
      cleaning: cleaning ? draft.cleaning : undefined,
      laundry: washing ? draft.laundry : undefined,
      collectDuringCleaning: draft.service === 'BOTH' && draft.collectDuringCleaning,
      cleaningStart: cleaning && draft.cleaningTime ? localToISO(draft.cleaningTime) : undefined,
      pickupStart: washing && !(draft.service==='BOTH'&&draft.collectDuringCleaning) && draft.pickupTime ? localToISO(draft.pickupTime) : undefined,
    };
  }

  function move(next: number) {
    setError('');
    setStep(next);
    section.current?.focus();
  }

  async function handleNext() {
    if(submitting.current || demoDone || !ready)return;
    setError('');
    if (step === 1) {
      const required = [draft.name, draft.phone, draft.locality, draft.fullAddress, draft.accessContact, draft.floorLift, draft.utilities];
      if (required.some((x) => !x.trim())) {
        setError('Complete all required contact and address fields.');
        return;
      }
    }
    if (step === 2 || step === 3) {
      try {
        const parsed = bookingSchema.safeParse(payload());
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => i.message).join(' '));
          return;
        }
      } catch {
        setError('Choose valid requested dates and times.');
        return;
      }
    }
    if (step < 3) {
      move(step + 1);
      return;
    }
    if (demo) {
      submitting.current = true;
      setBusy(true);
      try {
        // Yield a frame so the saving state is announced before navigation.
        await new Promise(resolve => setTimeout(resolve, 200));
        const request = placeDemoRequest(payload());
        if (sheetSync) await syncDemoRequest(request);
        localStorage.setItem(DEMO_DRAFT_KEY, JSON.stringify({ draft, step, key: key.current, intent: search.toString(), completedId: request.id }));
        setDemoDone(true);
        router.push(`/bookings/${request.id}`);
      } catch {
        setError('Unable to save the demo request. Allow browser storage and retry; your entered details are still here.');
        submitting.current = false;
      } finally { setBusy(false); }
      return;
    }
    if (!contact) {
      setError('Sign in before submitting. Your draft is saved in this browser tab.');
      return;
    }
    submitting.current=true;
    setBusy(true);
    try {
      const result = await mutate('book', payload());
      for (const file of photos) {
        const f = new FormData();
        f.set('orderId', result.id);
        f.set('file', file);
        const r = await fetch('/api/uploads', { method: 'POST', body: f });
        if (!r.ok) {
          sessionStorage.removeItem('kum-booking-draft');sessionStorage.removeItem('kum-booking-key');sessionStorage.removeItem('kum-booking-step');
          router.push(`/bookings/${result.id}?placed=1&upload=retry`);
          return;
        }
      }
      sessionStorage.removeItem('kum-booking-draft');sessionStorage.removeItem('kum-booking-key');sessionStorage.removeItem('kum-booking-step');
      router.push(`/bookings/${result.id}?placed=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit. Retry your request.');
    } finally {
      submitting.current=false;
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="steps" aria-label="Booking steps">
        {['Service', 'Details', 'Schedule', 'Review'].map((label, i) => (
          <button
            key={label}
            className={i === step ? 'current' : ''}
            aria-current={i === step ? 'step' : undefined}
            type="button" onClick={() => i < step && move(i)}
            disabled={i > step || busy || demoDone || !ready}
          >
            <span>{i + 1}</span>{label}
          </button>
        ))}
      </nav>
      <div className="split">
        <div>
          <div className="card" tabIndex={-1} ref={section}>
            <form aria-busy={busy} onSubmit={(e) => { e.preventDefault(); void handleNext(); }}>
              {step === 0 && (
                <>
                  <h2>Choose Required Care</h2>
                  {demo && <p className="notice">Try a service request using editable fictional details. {sheetSync ? 'Submitting also copies these details to Google Sheets, labeled as demo data.' : 'Your progress is saved only in this browser.'}</p>}
                  <p className="muted">Select a service. We’ll tailor the next steps to your needs.</p>
                  <div className="grid3">
                    {[
                      { id: 'CLEANING', name: 'Home Cleaning', icon: Brush, text: 'Care for your home, with a tailored scope.', price: 'From ₹5,000' },
                      { id: 'LAUNDRY', name: 'Laundry Pickup', icon: WashingMachine, text: 'Wash & Fold or Wash & Iron, collected from your door.', price: 'Quote on request' },
                      { id: 'BOTH', name: 'Both Services', icon: Sparkles, text: 'Coordinate home cleaning and your laundry pickup.', price: 'Cleaning + laundry quote' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`choice ${draft.service === s.id ? 'selected' : ''}`}
                        aria-pressed={draft.service === s.id}
                        onClick={() => set('service', s.id)}
                      >
                        <span className="icon-box"><s.icon /></span>
                        <h3>{s.name}</h3>
                        <p>{s.text}</p>
                        <small>{s.price}</small>
                      </button>
                    ))}
                  </div>
                  <div className="notice" style={{ marginTop: 24 }}>This is a quote request. No appointment or final price is confirmed yet.</div>
                </>
              )}
              {step === 1 && (
                <>
                  <h2>A Little About Your Needs</h2>
                  {cleaning && (
                    <>
                      <h3>Home cleaning</h3>
                      <div className="grid2">
                        <Field label="Property type">
                          <select value={draft.cleaning.propertyType} onChange={(e) => clean('propertyType', e.target.value)}>
                            {['Apartment', 'Independent house', 'Villa', 'Other'].map((v) => <option key={v}>{v}</option>)}
                          </select>
                        </Field>
                        <Field label="Furnished or empty">
                          <select value={draft.cleaning.furnishing} onChange={(e) => clean('furnishing', e.target.value)}>
                            <option value="FURNISHED">Furnished</option>
                            <option value="EMPTY">Empty</option>
                          </select>
                        </Field>
                        <Field label="Bedrooms">
                          <input type="number" min={0} max={100} required value={draft.cleaning.bedrooms} onChange={(e) => clean('bedrooms', Number(e.target.value))} />
                        </Field>
                        <Field label="Bathrooms">
                          <input type="number" min={0} max={100} required value={draft.cleaning.bathrooms} onChange={(e) => clean('bathrooms', Number(e.target.value))} />
                        </Field>
                        <Field label="Approximate area (sq ft, or Not sure)">
                          <input value={draft.cleaning.area} maxLength={100} onChange={(e) => clean('area', e.target.value)} />
                        </Field>
                        <Field label="Requested cleaning type">
                          <select value={draft.cleaning.cleaningType} onChange={(e) => clean('cleaningType', e.target.value)}>
                            {['Deep cleaning', 'Regular cleaning', 'Move-in / move-out', 'Discuss with team'].map((v) => <option key={v}>{v}</option>)}
                          </select>
                        </Field>
                      </div>
                      <Field label="Additional tasks">
                        <textarea value={draft.cleaning.tasks} maxLength={2000} onChange={(e) => clean('tasks', e.target.value)} placeholder="Tell us what you would like included in your quote." />
                      </Field>
                      <Field label="Condition and other notes">
                        <textarea value={draft.cleaning.notes} maxLength={2000} onChange={(e) => clean('notes', e.target.value)} />
                      </Field>
                      <div className="divider" />
                    </>
                  )}
                  {washing && (
                    <>
                      <h3>Laundry care</h3>
                      <div className="grid2">
                        <Field label="Laundry service">
                          <select value={draft.laundry.type} onChange={(e) => laundry('type', e.target.value)}>
                            <option value="WASH_FOLD">Wash & Fold</option>
                            <option value="WASH_IRON">Wash & Iron</option>
                          </select>
                        </Field>
                        <Field label="Estimated bags">
                          <input type="number" required min={1} max={100} value={draft.laundry.bags} onChange={(e) => laundry('bags', Number(e.target.value))} />
                        </Field>
                        <Field label="Estimated weight in kg (optional)">
                          <input
                            type="number"
                            min={0.001}
                            step={0.001}
                            max={1000}
                            value={draft.laundry.weightGrams === undefined ? '' : draft.laundry.weightGrams / 1000}
                            onChange={(e) => laundry('weightGrams', e.target.value ? Math.round(Number(e.target.value) * 1000) : undefined)}
                          />
                        </Field>
                      </div>
                      <Field label="Special handling instructions">
                        <textarea value={draft.laundry.instructions} maxLength={2000} onChange={(e) => laundry('instructions', e.target.value)} />
                      </Field>
                      <div className="divider" />
                    </>
                  )}
                  <h3>Your contact & service address</h3>
                  <p className="notice">{isDemoMode() ? 'Fictional sample details are provided. Edit them to test the form; no real personal information is needed.' : (contact ? `Account email: ${contact}` : 'Sign in before submitting. Your draft stays in this tab.')}</p>
                  <div className="grid2">
                    {([
                      ['name', 'Full name'],
                      ['phone', 'Mobile number'],
                      ['locality', 'Locality in Kozhikode'],
                      ['accessContact', 'Access contact name and phone'],
                      ['floorLift', 'Floor and lift information'],
                      ['utilities', 'Water and electricity availability'],
                      ['landmark', 'Landmark (optional)'],
                    ] as const).map(([k, label]) => (
                      <Field key={k} label={label}>
                        <input required={k !== 'landmark'} maxLength={k === 'name' || k === 'locality' ? 100 : 150} value={draft[k]} onChange={(e) => set(k, e.target.value)} />
                      </Field>
                    ))}
                  </div>
                  <Field label="Full service address">
                    <textarea required maxLength={2000} value={draft.fullAddress} onChange={(e) => set('fullAddress', e.target.value)} />
                  </Field>
                  <Field label="Optional reference photos (up to 5 MB each, maximum 5)">
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length > 5 || files.some((f) => f.size > 5 * 1024 * 1024)) {
                          setError('Choose at most 5 photos, each up to 5 MB.');
                          e.target.value = '';
                          setPhotos([]);
                        } else {
                          setError('');
                          setPhotos(files);
                        }
                      }}
                    />
                  </Field>
                  <small>{demo ? 'Demo photos are not uploaded or saved. Use a sample image only; reselect after refresh.' : 'Photos upload privately after your booking is created. File selections must be reattached after a page reload.'}</small>
                </>
              )}
              {step === 2 && (
                <>
                  <h2>Request Your Appointments</h2>
                  {demo && <p className="soft">Sample availability: cleaning at 10:00 AM or 2:00 PM; laundry pickup at 11:00 AM or 4:00 PM IST. These are fictional preferences, not reserved slots.</p>}
                  <p className="notice">All times are Asia/Kolkata (IST). Preferred times are not confirmed appointments. Duration and availability are reviewed by operations.</p>
                  {cleaning && (
                    <Field label="Requested cleaning appointment">
                      <input type="datetime-local" required value={draft.cleaningTime} onChange={(e) => set('cleaningTime', e.target.value)} />
                    </Field>
                  )}
                  {draft.service === 'BOTH' && (
                    <label className="checkbox">
                      <input type="checkbox" checked={draft.collectDuringCleaning} onChange={(e) => set('collectDuringCleaning', e.target.checked)} />
                      Request laundry collection during cleaning
                    </label>
                  )}
                  {washing && !(draft.service === 'BOTH' && draft.collectDuringCleaning) && (
                    <Field label="Requested laundry pickup window starts">
                      <input type="datetime-local" required value={draft.pickupTime} onChange={(e) => set('pickupTime', e.target.value)} />
                    </Field>
                  )}
                  {washing && (
                    <>
                      <Field label="Preferred return timing (optional)">
                        <textarea value={draft.returnPreference} maxLength={2000} onChange={(e) => set('returnPreference', e.target.value)} placeholder="Tell us any return preferences. The team will propose an estimated return appointment." />
                      </Field>
                      <p className="muted">Pickup requests use a one-hour preference window. Estimated return timing will be proposed in your quote; it is not a turnaround promise.</p>
                    </>
                  )}
                </>
              )}
              {step === 3 && (
                <>
                  <h2>Review Your Request</h2>
                  <div className="row">
                    <h3>{human(draft.service)} service</h3>
                    <button type="button" className="btn ghost small" disabled={busy || demoDone} onClick={() => move(0)}>Edit service</button>
                  </div>
                  <div className="soft">
                    {cleaning && <p>{draft.cleaning.propertyType} · {draft.cleaning.bedrooms} bedrooms · {draft.cleaning.bathrooms} bathrooms · {draft.cleaning.area}</p>}
                    {washing && <p>{draft.laundry.bags} laundry bag(s) · {human(draft.laundry.type)}</p>}
                    <p>{draft.name}<br />{draft.fullAddress}<br />{draft.locality}, Kozhikode</p>
                    <button type="button" className="btn ghost small" disabled={busy || demoDone} onClick={() => move(1)}>Edit details</button>
                  </div>
                  <div className="divider" />
                  <h3>Requested times · IST</h3>
                  {cleaning && <p>Cleaning: {draft.cleaningTime ? `${dateTime(localToISO(draft.cleaningTime))} IST` : 'Not selected'}</p>}
                  {washing && (
                    <p>
                      Pickup: {draft.service === 'BOTH' && draft.collectDuringCleaning ? 'During cleaning' : draft.pickupTime ? `${dateTime(localToISO(draft.pickupTime))} IST` : 'Not selected'}<br />
                      Return: {draft.returnPreference || 'Team to propose an estimate'}
                    </p>
                  )}
                  <button type="button" className="btn ghost small" disabled={busy || demoDone} onClick={() => move(2)}>Edit schedule</button>
                  <div className="divider" />
                  <div className="notice">Final price: awaiting itemised quote. You will approve the exact scope, charges and proposed appointments before confirmation.</div>
                  {!isDemoMode() && !contact && <p style={{ marginTop: 20 }}><Link className="btn secondary" href="/sign-in?callbackUrl=%2Fbook">Sign in to submit request</Link></p>}

                </>
              )}
              {storageError && <p className="error" role="alert">{storageError}</p>}
              {error && <p className="error" role="alert" style={{ marginTop: 20 }}>{error}</p>}
              <div className="form-footer">
                {step > 0 && demo ? <button type="button" className="btn ghost" disabled={busy || demoDone} onClick={() => move(step - 1)}>Previous step</button> : <span />}
                <button type="submit" className="btn" disabled={busy || !ready || demoDone || (demo && !!storageError)}>
                  {busy ? 'Saving request…' : step === 3 ? 'Place service request' : `Continue to ${['Details', 'Schedule', 'Review'][step]}`}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
        <aside className="stack">
          <div className="card">
            <div className="row">
              <h3>Booking Summary</h3>
              <span className="badge yellow">Live preview</span>
            </div>
            <div className="soft">
              <div className="eyebrow">Service selection</div>
              <strong>{draft.service === 'BOTH' ? 'Both (Cleaning + Laundry)' : draft.service === 'CLEANING' ? 'Home Cleaning' : 'Laundry Pickup'}</strong>
            </div>
            <div style={{ padding: '22px 0' }}>
              {cleaning && <p>{draft.cleaning.bedrooms} bedroom {draft.cleaning.propertyType.toLowerCase()}<br /><small>{draft.cleaning.cleaningType}</small></p>}
              {washing && <p>{draft.laundry.bags} laundry bag(s)<br /><small>{human(draft.laundry.type)}</small></p>}
              <p><small>SERVICE LOCATION</small><br />{draft.locality || 'Add your locality'}</p>
            </div>
            <div className="soft">
              <p className="row"><span>Home cleaning</span><strong>{cleaning ? 'From ₹5,000' : 'Not selected'}</strong></p>
              <p className="row"><span>Laundry</span><strong>{washing ? 'Quote required' : 'Not selected'}</strong></p>
              <div className="divider" />
              <strong>Final total pending quote</strong>
              <p className="muted" style={{ margin: '8px 0 0' }}>No payment is collected in this request.</p>
            </div>
            <div className="notice">Appointments stay requested until the team checks individual staff availability and confirms your approved scope.</div>
          </div>
        </aside>
      </div>
    </>
  );
}