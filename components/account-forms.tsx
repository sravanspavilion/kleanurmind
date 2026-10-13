'use client';
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
  return <ActionForm action="profile" label="Save profile" success="Profile updated." build={f => ({
    name: f.get('name'),
    phone: f.get('phone'),
    locality: f.get('locality'),
    fullAddress: f.get('fullAddress'),
    landmark: f.get('landmark'),
    accessContact: f.get('accessContact'),
    floorLift: f.get('floorLift'),
    utilities: f.get('utilities'),
  })}>
    <Field label="Full name"><input name="name" defaultValue={defaults.name} required maxLength={100} autoComplete="name" /></Field>
    <Field label="Mobile number"><input name="phone" type="tel" defaultValue={defaults.phone} maxLength={20} autoComplete="tel" placeholder="+91 90000 00000" /></Field>
    <Field label="Locality"><input name="locality" defaultValue={defaults.locality} maxLength={100} placeholder="e.g. Nadakkavu" /></Field>
    <Field label="Full service address"><textarea name="fullAddress" defaultValue={defaults.fullAddress} maxLength={2000} placeholder="House / flat, street, area, landmark" /></Field>
    <Field label="Landmark (optional)"><input name="landmark" defaultValue={defaults.landmark} maxLength={2000} /></Field>
    <Field label="Access contact (who lets us in)"><input name="accessContact" defaultValue={defaults.accessContact} maxLength={150} /></Field>
    <Field label="Floor &amp; lift"><input name="floorLift" defaultValue={defaults.floorLift} maxLength={200} placeholder="e.g. 3rd floor, lift available" /></Field>
    <Field label="Water &amp; electricity"><input name="utilities" defaultValue={defaults.utilities} maxLength={200} placeholder="e.g. Water and power available" /></Field>
    <p className="muted">Your verified email, sign-in method and account role are managed for security and cannot be changed here.</p>
  </ActionForm>;
}
