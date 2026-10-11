'use client';

// Shared plumbing for the two consent forms (/release, /listing-consent):
// a Netlify Forms post, a typed-name signature, and a printable confirmation.
// Netlify records the submission time; the form also stamps `signedAt` and the
// wording version so the record says which text was on screen.
//
// Typing a full name plus the "this is my signature" box is an electronic
// signature under the US E-SIGN Act; a lawyer may want more (a drawn
// signature, a second factor). The fields are here so that upgrade is a
// swap, not a rewrite.

import React, { useState } from 'react';
import '../privacy/privacy.css';
import './consent-form.css';

export async function postNetlifyForm(formName, fields) {
  const body = new URLSearchParams({ 'form-name': formName, 'bot-field': '', ...fields });
  const res = await fetch('/__forms.html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Form post failed (${res.status})`);
}

export function Field({ label, hint, children, required }) {
  return (
    <label className="cf-field">
      <span className="cf-label">{label}{required && <span className="cf-req" aria-hidden="true"> *</span>}</span>
      {children}
      {hint && <span className="cf-hint">{hint}</span>}
    </label>
  );
}

export function Choice({ name, value, checked, onChange, children, type = 'radio', required }) {
  return (
    <label className="cf-choice">
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} required={required} />
      <span>{children}</span>
    </label>
  );
}

/** Typed signature + e-sign acknowledgement; returns the two values via onChange. */
export function SignatureBlock({ signature, esign, onChange, expectedName }) {
  const mismatch = expectedName && signature && signature.trim().toLowerCase() !== expectedName.trim().toLowerCase();
  return (
    <div className="cf-sign">
      <Field label="Type your full name as your signature" required
             hint={mismatch ? 'This does not match the name above. Type it exactly the same way.' : 'Exactly as you entered it above.'}>
        <input className="cf-input cf-input--sig" value={signature} onChange={(e) => onChange({ signature: e.target.value })}
               autoComplete="off" required aria-invalid={mismatch ? 'true' : undefined} />
      </Field>
      <Choice type="checkbox" name="esign" value="yes" checked={esign} onChange={(e) => onChange({ esign: e.target.checked })} required>
        I understand that typing my name here is my electronic signature, and that this form has the same effect as a signed paper.
      </Choice>
    </div>
  );
}

export function Confirmation({ title, rows, note }) {
  return (
    <section className="cf-done" aria-live="polite">
      <h2>{title}</h2>
      <dl className="cf-summary">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      {note && <p>{note}</p>}
      <p className="cf-print-hint">Keep a copy: <button type="button" className="cf-link" onClick={() => window.print()}>print or save this page as a PDF</button>.</p>
    </section>
  );
}

export function useSubmit(formName) {
  const [state, setState] = useState({ sending: false, done: false, error: '' });
  const submit = async (fields) => {
    setState({ sending: true, done: false, error: '' });
    try {
      await postNetlifyForm(formName, fields);
      setState({ sending: false, done: true, error: '' });
    } catch (err) {
      setState({ sending: false, done: false, error: 'The form did not send. Check your connection and try again, or email contact@projecthoneycomb.site.' });
      console.error(err);
    }
  };
  return [state, submit];
}
