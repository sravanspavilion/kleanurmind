'use client';

import { ActionForm, Field } from './forms';
import { cleaningSteps, laundrySteps, human } from '@/lib/domain';

type Track = 'cleaning' | 'laundry';
type Props = {
  orderId: string;
  cleaningStatus?: string;
  laundryStatus?: string;
  bags: { id: string; label: string }[];
  allowedTracks: Track[];
  canPickup?: boolean;
  canReturn?: boolean;
};

export function StaffJobControls({ orderId, cleaningStatus, laundryStatus, bags, allowedTracks, canPickup = false, canReturn = false }: Props) {
  return <div className="stack">
    {allowedTracks.map(track => {
      const status = track === 'cleaning' ? cleaningStatus : laundryStatus;
      if (!status) return null;
      const steps: readonly string[] = track === 'cleaning' ? cleaningSteps : laundrySteps;
      const next = steps[steps.indexOf(status) + 1];
      const closed = ['COMPLETED', 'DELIVERED', 'CANCELLED', 'ISSUE'].includes(status);
      const options = closed ? [] : [next, 'ISSUE'].filter(value => value && !['CONFIRMED', 'ASSIGNED', 'PICKUP_SCHEDULED', 'AWAITING_PRICE_APPROVAL'].includes(value) &&
        (track !== 'laundry' || (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(value) ? canReturn : canPickup)));
      return <section key={track}>
        <h3>{human(track)} · {human(status)}</h3>
        {options.length > 0 && <ActionForm key={`${track}-${status}`} action="status" label="Update service status" build={form => ({ orderId, track, status: form.get('status'), note: form.get('note'), checklist: form.getAll('checklist') })}>
          <Field label="Next status"><select name="status">{options.map(value => <option key={value} value={value}>{human(value)}</option>)}</select></Field>
          {track === 'cleaning' && status === 'IN_PROGRESS' && <fieldset>
            <legend>Completion checklist</legend>
            {[['scope', 'Agreed scope completed'], ['surfaces', 'Surfaces checked'], ['inspection', 'Final inspection completed']].map(([value, label]) => <label className="checkbox" key={value}><input type="checkbox" name="checklist" value={value}/>{label}</label>)}
          </fieldset>}
          <Field label="Notes (required when reporting an issue)"><textarea name="note" maxLength={1000}/></Field>
        </ActionForm>}
        {status === 'ISSUE' && <p className="notice">An administrator must resolve the issue before work continues.</p>}
      </section>;
    })}
    {allowedTracks.includes('laundry') && canPickup && ['COLLECTED', 'AWAITING_PRICE_APPROVAL'].includes(laundryStatus ?? '') && <ActionForm action="weight" label="Record actual weight" build={form => ({ orderId, grams: Number(form.get('grams')) })}>
      <Field label="Actual laundry weight (grams)"><input name="grams" type="number" min={1} max={1000000} step={1} required/></Field>
      <p className="muted">The customer must approve a quote matching this weight before processing.</p>
    </ActionForm>}
    {allowedTracks.includes('laundry') && (canPickup || canReturn) && bags.length > 0 && <ActionForm action="handover" label="Record bag handover" build={form => ({ orderId, bagId: form.get('bagId'), note: form.get('note') })}>
      <Field label="Laundry bag"><select name="bagId">{bags.map(bag => <option key={bag.id} value={bag.id}>{bag.label}</option>)}</select></Field>
      <Field label="Handover details"><textarea name="note" required minLength={3} maxLength={500}/></Field>
    </ActionForm>}
  </div>;
}
