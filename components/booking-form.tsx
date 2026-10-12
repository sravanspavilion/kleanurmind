'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Brush, WashingMachine, Sparkles, ArrowRight } from 'lucide-react';
import { bookingSchema } from '@/lib/validation';
import { localToISO, human } from '@/lib/domain';
import { Field, mutate } from './forms';

const initial = {
  service: 'CLEANING',
  name: '',
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

export function BookingForm({ contact, repeat }: { contact: string | null; repeat?: Record<string, unknown> }) {
  const search = useSearchParams();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const key = useRef('');
  const section = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    key.current = crypto.randomUUID();
    let saved = {};
    try {
      saved = JSON.parse(sessionStorage.getItem('kum-booking-draft') ?? '{}');
    } catch {}
    const chosen = search.get('service');
    const valid = ['CLEANING', 'LAUNDRY', 'BOTH'].includes(chosen ?? '');
    const merged = { ...initial, ...saved, ...repeat, ...(valid ? { service: chosen } : {}) };
    setDraft({
      ...merged,
      cleaning: { ...initial.cleaning, ...(merged.cleaning as object) },
      laundry: { ...initial.laundry, ...(merged.laundry as object) },
    } as Draft);
    setReady(true);
  }, [repeat, search]);

  useEffect(() => {
    if (ready) sessionStorage.setItem('kum-booking-draft', JSON.stringify(draft));
  }, [draft, ready]);

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
      pickupStart: washing && draft.pickupTime ? localToISO(draft.pickupTime) : undefined,
    };
  }

  function move(next: number) {
    setError('');
    setStep(next);
    section.current?.focus();
  }

  async function handleNext() {
    setError('');
    if (step === 1) {
      const required = [draft.name, draft.locality, draft.fullAddress, draft.accessContact, draft.floorLift, draft.utilities];
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
    if (!contact) {
      setError('Sign in with a verified contact before submitting. Your draft is saved in this browser tab.');
      return;
    }
    setBusy(true);
    try {
      const result = await mutate('book', payload());
      for (const file of photos) {
        const f = new FormData();
        f.set('orderId', result.id);
        f.set('file', file);
        const r = await fetch('/api/uploads', { method: 'POST', body: f });
        if (!r.ok) {
          sessionStorage.removeItem('kum-booking-draft');
          router.push(`/bookings/${result.id}?upload=retry`);
          return;
        }
      }
      sessionStorage.removeItem('kum-booking-draft');
      router.push(`/bookings/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit. Retry your request.');
    } finally {
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
            onClick={() => i < step && move(i)}
            disabled={i > step}
          >
            <span>{i + 1}</span>{label}
          </button>
        ))}
      </nav>
      <div className="split">
        <div>
          <div className="card" tabIndex={-1} ref={section}>
            <form onSubmit={(e) => { e.preventDefault(); void handleNext(); }}>
              {step === 0 && (
                <>
                  <h2>Choose Required Care</h2>
                  <p className="muted">Select a service. We'll tailor the next steps to your needs.</p>
                  <div className="grid3">
                    {[
                      { id: 'CLEANING', name: 'Home Cleaning', icon: Brush, text: 'Care for your home, with a tailored scope.', price: 'From \u20b95,000' },
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
                  <p className="notice">{contact ? `Account contact: ${contact}` : 'Sign in before submitting to verify your contact. Your draft stays in this tab.'}</p>
                  <div className="grid2">
                    {([
                      ['name', 'Full name'],
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
                  <small>Photos upload privately after your booking is created. File selections must be reattached after a page reload.</small>
                </>
              )}
              {step === 2 && (
                <>
                  <h2>Request Your Appointments</h2>
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
                    <button type="button" className="btn ghost small" onClick={() => move(0)}>Edit service</button>
                  </div>
                  <div className="soft">
                    {cleaning && <p>{draft.cleaning.propertyType} \u00b7 {draft.cleaning.bedrooms} bedrooms \u00b7 {draft.cleaning.bathrooms} bathrooms \u00b7 {draft.cleaning.area}</p>}
                    {washing && <p>{draft.laundry.bags} laundry bag(s) \u00b7 {human(draft.laundry.type)}</p>}
                    <p>{draft.name}<br />{draft.fullAddress}<br />{draft.locality}, Kozhikode</p>
                    <button type="button" className="btn ghost small" onClick={() => move(1)}>Edit details</button>
                  </div>
                  <div className="divider" />
                  <h3>Requested times \u00b7 IST</h3>
                  {cleaning && <p>Cleaning: {draft.cleaningTime.replace('T', ' ')}</p>}
                  {washing && (
                    <p>
                      Pickup: {draft.service === 'BOTH' && draft.collectDuringCleaning ? 'During cleaning' : draft.pickupTime.replace('T', ' ')}<br />
                      Return: {draft.returnPreference || 'Team to propose an estimate'}
                    </p>
                  )}
                  <button type="button" className="btn ghost small" onClick={() => move(2)}>Edit schedule</button>
                  <div className="divider" />
                  <div className="notice">Final price: awaiting itemised quote. You will approve the exact scope, charges and proposed appointments before confirmation.</div>
                  {!contact && <p style={{ marginTop: 20 }}><Link className="btn secondary" href="/sign-in">Sign in to verify contact</Link></p>}
                </>
              )}
              {error && <p className="error" role="alert" style={{ marginTop: 20 }}>{error}</p>}
              <div className="form-footer">
                {step > 0 ? <button type="button" className="btn ghost" onClick={() => move(step - 1)}>Back</button> : <span />}
                <button className="btn" disabled={busy || !ready}>
                  {busy ? 'Submitting request\u2026' : step === 3 ? 'Submit booking request' : `Continue to ${['Details', 'Schedule', 'Review'][step]}`}
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
              <p className="row"><span>Home cleaning</span><strong>{cleaning ? 'From \u20b95,000' : 'Not selected'}</strong></p>
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