'use client';
import { useEffect, useState } from 'react';
import { isDemoMode } from '@/lib/demo/mode';
import { readDemoActions } from '@/lib/demo/browser-store';
import { ActionForm, Field } from './forms';

export type ProfileDefaults = {
  name: string;
  phone: string;
  locality: string;
  fullAddress: string;
  landmark: string;
  accessContact: string;
  floorLift: string;
  utilities: string;
};

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [saved, setSaved] = useState(defaults);
  useEffect(() => { queueMicrotask(() => { if(isDemoMode()) { try { const profile = readDemoActions().find(action=>action.action==='profile'); if(profile)setSaved(profile.data as ProfileDefaults); } catch {} } }); }, []);
  return <ActionForm key={JSON.stringify(saved)} action="profile" label="Save profile" success="Profile updated." build={f => ({
    name: f.get('name'),
    phone: f.get('phone'),
    locality: f.get('locality'),
    fullAddress: f.get('fullAddress'),
    landmark: f.get('landmark'),
    accessContact: f.get('accessContact'),
    floorLift: f.get('floorLift'),
    utilities: f.get('utilities'),
  })}>
    <Field label="Full name"><input name="name" defaultValue={saved.name} required maxLength={100} autoComplete="name" /></Field>
    <Field label="Mobile number"><input name="phone" type="tel" defaultValue={saved.phone} maxLength={20} autoComplete="tel" placeholder="+91 90000 00000" /></Field>
    <Field label="Locality"><input name="locality" defaultValue={saved.locality} maxLength={100} placeholder="e.g. Nadakkavu" /></Field>
    <Field label="Full service address"><textarea name="fullAddress" defaultValue={saved.fullAddress} maxLength={2000} placeholder="House / flat, street, area, landmark" /></Field>
    <Field label="Landmark (optional)"><input name="landmark" defaultValue={saved.landmark} maxLength={2000} /></Field>
    <Field label="Access contact (who lets us in)"><input name="accessContact" defaultValue={saved.accessContact} maxLength={150} /></Field>
    <Field label="Floor &amp; lift"><input name="floorLift" defaultValue={saved.floorLift} maxLength={200} placeholder="e.g. 3rd floor, lift available" /></Field>
    <Field label="Water &amp; electricity"><input name="utilities" defaultValue={saved.utilities} maxLength={200} placeholder="e.g. Water and power available" /></Field>
    <p className="muted">{isDemoMode() ? 'Fictional profile for testing. Changes are stored only in this browser.' : 'Your verified email, sign-in method and account role are managed for security and cannot be changed here.'}</p>
  </ActionForm>;
}
