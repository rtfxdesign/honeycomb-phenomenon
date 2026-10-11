'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { REMOVAL_EMAIL } from '../lib/contact';
import { Field, Choice, SignatureBlock, Confirmation, useSubmit } from '../components/ConsentForm';

export const LISTING_CONSENT_VERSION = '2026-10-11';

const ANSWERS = [
  ['yes', 'Yes — list me exactly as shown'],
  ['corrected', 'Yes, with the corrections below'],
  ['no', 'No — do not list me'],
];

export default function ListingConsentForm() {
  const params = useSearchParams();
  const kind = params.get('kind') === 'team' ? 'team' : 'advisor';
  const [f, setF] = useState({
    fullName: params.get('name') || '',
    roleAsListed: params.get('role') || '',
    answer: '',
    correctedRole: '',
    correctedBio: '',
    institutionApproval: false,
    linkOk: false,
    photoOk: false,
    email: '',
    signature: '', esign: false,
  });
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const [state, submit] = useSubmit('listing-consent');
  const signedAt = new Date().toISOString();
  const declined = f.answer === 'no';

  const onSubmit = (e) => {
    e.preventDefault();
    if (f.signature.trim().toLowerCase() !== f.fullName.trim().toLowerCase()) return;
    submit({
      kind, fullName: f.fullName.trim(), roleAsListed: f.roleAsListed.trim(), answer: f.answer,
      correctedRole: f.correctedRole.trim(), correctedBio: f.correctedBio.trim(),
      institutionApproval: f.institutionApproval ? 'required' : 'not required',
      linkOk: f.linkOk ? 'yes' : 'no', photoOk: f.photoOk ? 'yes' : 'no',
      email: f.email.trim(), signature: f.signature.trim(), esign: f.esign ? 'yes' : 'no',
      signedAt, consentVersion: LISTING_CONSENT_VERSION,
      site: typeof window !== 'undefined' ? window.location.origin : '',
    });
  };

  return (
    <main className="dh">
      <header className="dh-head">
        <Link className="dh-back" href="/">← Honeycomb</Link>
        <p className="dh-eyebrow">Project Honeycomb · {kind === 'team' ? 'Team listing' : 'Advisor listing'}</p>
        <h1>How you are named on the site</h1>
        <p className="dh-lede">
          The Project Honeycomb website has an About page that names {kind === 'team' ? 'the team' : 'the people who advise the project'}.
          We will not show your listing beyond the password gate until you have answered here, and you can withdraw at any
          time by emailing <a href={`mailto:${REMOVAL_EMAIL}`}>{REMOVAL_EMAIL}</a>.
        </p>
      </header>

      {state.done ? (
        <Confirmation
          title="Thank you — your answer is recorded."
          rows={[
            ['Name', f.fullName], ['Listing', f.roleAsListed], ['Answer', (ANSWERS.find(([k]) => k === f.answer) || [])[1]],
            ['Corrected title', f.correctedRole], ['Institution approval', f.institutionApproval ? 'Required before publishing' : ''],
            ['Signed', `${f.signature} · ${new Date(signedAt).toLocaleString()}`], ['Version', LISTING_CONSENT_VERSION],
          ]}
          note={declined ? 'Your name will not appear on the site.' : 'We will apply any corrections before the listing is shown.'}
        />
      ) : (
        <form className="cf-form" onSubmit={onSubmit}>
          <section aria-labelledby="listing">
            <p className="dh-num">01</p>
            <h2 id="listing">The listing as we would show it</h2>
            <Field label="Your name" required>
              <input className="cf-input" value={f.fullName} onChange={(e) => set({ fullName: e.target.value })} autoComplete="name" required />
            </Field>
            <Field label="Title or role as listed" required>
              <input className="cf-input" value={f.roleAsListed} onChange={(e) => set({ roleAsListed: e.target.value })} required />
            </Field>
          </section>

          <section aria-labelledby="answer">
            <p className="dh-num">02</p>
            <h2 id="answer">Your answer</h2>
            <fieldset className="cf-group">
              <legend className="cf-label">May we list you? *</legend>
              {ANSWERS.map(([v, t]) => (
                <Choice key={v} name="answer" value={v} checked={f.answer === v} onChange={() => set({ answer: v })} required>{t}</Choice>
              ))}
            </fieldset>
            {f.answer === 'corrected' && (
              <>
                <Field label="Corrected title or role">
                  <input className="cf-input" value={f.correctedRole} onChange={(e) => set({ correctedRole: e.target.value })} />
                </Field>
                <Field label={kind === 'team' ? 'Your bio, as you want it to read' : 'Anything else to change'}>
                  <textarea className="cf-textarea" value={f.correctedBio} onChange={(e) => set({ correctedBio: e.target.value })} />
                </Field>
              </>
            )}
          </section>

          {!declined && (
            <section aria-labelledby="details">
              <p className="dh-num">03</p>
              <h2 id="details">Details</h2>
              <div className="cf-group">
                {kind === 'advisor' && (
                  <>
                    <Choice type="checkbox" name="institutionApproval" value="required" checked={f.institutionApproval} onChange={(e) => set({ institutionApproval: e.target.checked })}>
                      My employer or institution must approve the use of its name before you publish. Hold the listing until I confirm.
                    </Choice>
                    <Choice type="checkbox" name="linkOk" value="yes" checked={f.linkOk} onChange={(e) => set({ linkOk: e.target.checked })}>
                      You may link my name to my public professional profile page.
                    </Choice>
                  </>
                )}
                {kind === 'team' && (
                  <Choice type="checkbox" name="photoOk" value="yes" checked={f.photoOk} onChange={(e) => set({ photoOk: e.target.checked })}>
                    You may show the photograph of me that I have supplied or approved.
                  </Choice>
                )}
              </div>
            </section>
          )}

          <section aria-labelledby="sign">
            <p className="dh-num">{declined ? '03' : '04'}</p>
            <h2 id="sign">Sign</h2>
            <Field label="Email" required hint="So we can confirm it was you, and reach you if the listing changes.">
              <input className="cf-input" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" required />
            </Field>
            <SignatureBlock signature={f.signature} esign={f.esign} expectedName={f.fullName} onChange={set} />
            <div className="cf-actions">
              <button className="cf-submit" type="submit" disabled={state.sending}>{state.sending ? 'Sending…' : 'Sign and send'}</button>
              <span className="cf-hint">Wording version {LISTING_CONSENT_VERSION}.</span>
            </div>
            {state.error && <p className="cf-error" role="alert">{state.error}</p>}
          </section>
        </form>
      )}

      <footer className="dh-foot">
        <Link className="dh-back" href="/">← Back to Honeycomb</Link>
      </footer>
    </main>
  );
}
