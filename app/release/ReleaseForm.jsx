'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { REMOVAL_EMAIL, PRIVACY_PATH } from '../lib/contact';
import { Field, Choice, SignatureBlock, Confirmation, useSubmit } from '../components/ConsentForm';

// Bump when the wording below changes; it is stamped on every submission.
export const RELEASE_VERSION = '2026-10-11';

const VISIBILITY = [
  ['public', 'Public', 'anyone with access to the site, and Honeycomb exhibitions'],
  ['community', 'Community only', 'signed-in members only; not in exhibitions'],
  ['archive', 'Archived', 'kept, shown to no one'],
];
const NAME = [
  ['full', 'My full name'],
  ['first-initial', 'First name and last initial'],
  ['initials', 'Initials only'],
  ['none', 'No name'],
];
const DOWNLOAD = [
  ['yes', 'Yes — visitors may download my recording and transcript for their own viewing'],
  ['no', 'No download'],
];

export default function ReleaseForm() {
  const params = useSearchParams();
  const [f, setF] = useState({
    personKey: params.get('key') || '',
    fullName: params.get('name') || '',
    contact: '',
    ownAccount: false,
    adult: false,
    visibility: '',
    nameDisplay: '',
    download: '',
    advertising: false,
    readPrivacy: false,
    recordedBy: '', recordedWhere: '', recordedOn: '',
    signature: '', esign: false,
  });
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const [state, submit] = useSubmit('contributor-release');
  const signedAt = new Date().toISOString();

  const onSubmit = (e) => {
    e.preventDefault();
    if (f.signature.trim().toLowerCase() !== f.fullName.trim().toLowerCase()) return;
    submit({
      personKey: f.personKey, fullName: f.fullName.trim(), contact: f.contact.trim(),
      ownAccount: f.ownAccount ? 'yes' : 'no', adult: f.adult ? 'yes' : 'no',
      visibility: f.visibility, nameDisplay: f.nameDisplay, download: f.download,
      advertising: f.advertising ? 'yes' : 'no', readPrivacy: f.readPrivacy ? 'yes' : 'no',
      recordedBy: f.recordedBy.trim(), recordedWhere: f.recordedWhere.trim(), recordedOn: f.recordedOn,
      signature: f.signature.trim(), esign: f.esign ? 'yes' : 'no',
      signedAt, releaseVersion: RELEASE_VERSION,
      site: typeof window !== 'undefined' ? window.location.origin : '',
    });
  };

  const label = (list, v) => (list.find(([k]) => k === v) || [])[1] || '';

  return (
    <main className="dh">
      <header className="dh-head">
        <Link className="dh-back" href="/">← Honeycomb</Link>
        <p className="dh-eyebrow">Project Honeycomb · Contributor release</p>
        <h1>Your story, on your terms</h1>
        <p className="dh-lede">
          This form gives Project Honeycomb your permission to keep and show the story, photograph and/or recording you
          have given us — and lets you say exactly how. You keep your copyright. You can withdraw at any time.
        </p>
      </header>

      {state.done ? (
        <Confirmation
          title="Thank you — your release is recorded."
          rows={[
            ['Name', f.fullName], ['Reference', f.personKey], ['Visibility', label(VISIBILITY, f.visibility)],
            ['Name shown', label(NAME, f.nameDisplay)], ['Download', label(DOWNLOAD, f.download)],
            ['Promotion', f.advertising ? 'Allowed' : 'Not allowed'], ['Signed', `${f.signature} · ${new Date(signedAt).toLocaleString()}`],
            ['Version', RELEASE_VERSION],
          ]}
          note={`To change any of this, or to withdraw, email ${REMOVAL_EMAIL} with your name.`}
        />
      ) : (
        <form className="cf-form" onSubmit={onSubmit}>
          <section aria-labelledby="who">
            <p className="dh-num">01</p>
            <h2 id="who">Who you are</h2>
            <Field label="Your full name" required>
              <input className="cf-input" value={f.fullName} onChange={(e) => set({ fullName: e.target.value })} autoComplete="name" required />
            </Field>
            <Field label="Email or phone" hint="Used only to confirm a withdrawal request. Never shown, never used to write to you.">
              <input className="cf-input" value={f.contact} onChange={(e) => set({ contact: e.target.value })} autoComplete="email" />
            </Field>
            {f.personKey && <p className="cf-ro">Reference: {f.personKey}</p>}
          </section>

          <section aria-labelledby="confirm">
            <p className="dh-num">02</p>
            <h2 id="confirm">What you confirm</h2>
            <div className="cf-group">
              <Choice type="checkbox" name="ownAccount" value="yes" checked={f.ownAccount} onChange={(e) => set({ ownAccount: e.target.checked })} required>
                The story is my own account, and the photograph and recording are of me. It is mine to give.
              </Choice>
              <Choice type="checkbox" name="adult" value="yes" checked={f.adult} onChange={(e) => set({ adult: e.target.checked })} required>
                I am 18 or older.
              </Choice>
            </div>
          </section>

          <section aria-labelledby="permission">
            <p className="dh-num">03</p>
            <h2 id="permission">What Honeycomb may do</h2>
            <p>
              I give Project Honeycomb a <strong>non-exclusive, royalty-free permission</strong> to keep my story; to transcribe it;
              to show my photograph as the face of my cell; and to display and play my story <strong>on the Honeycomb website</strong>{' '}
              and <strong>in Honeycomb exhibitions</strong>, including museum installations — at the visibility I choose below.
              This is a permission, not a transfer: <strong>I keep my copyright.</strong>
            </p>
            <p>
              <strong>I can withdraw at any time</strong> by emailing <a href={`mailto:${REMOVAL_EMAIL}`}>{REMOVAL_EMAIL}</a>. My story is
              then removed from the website and from the files Honeycomb controls within the time stated on the{' '}
              <Link href={PRIVACY_PATH}>data-handling page</Link>; a copy already in an exhibition comes down at the next practicable change-over.
            </p>
          </section>

          <section aria-labelledby="choices">
            <p className="dh-num">04</p>
            <h2 id="choices">Your choices</h2>
            <fieldset className="cf-group">
              <legend className="cf-label">Visibility *</legend>
              {VISIBILITY.map(([v, t, d]) => (
                <Choice key={v} name="visibility" value={v} checked={f.visibility === v} onChange={() => set({ visibility: v })} required>
                  <strong>{t}</strong> — {d}
                </Choice>
              ))}
            </fieldset>
            <fieldset className="cf-group">
              <legend className="cf-label">How your name appears *</legend>
              {NAME.map(([v, t]) => (
                <Choice key={v} name="nameDisplay" value={v} checked={f.nameDisplay === v} onChange={() => set({ nameDisplay: v })} required>{t}</Choice>
              ))}
            </fieldset>
            <fieldset className="cf-group">
              <legend className="cf-label">Download *</legend>
              {DOWNLOAD.map(([v, t]) => (
                <Choice key={v} name="download" value={v} checked={f.download === v} onChange={() => set({ download: v })} required>{t}</Choice>
              ))}
            </fieldset>
            <fieldset className="cf-group">
              <legend className="cf-label">Promotion (optional)</legend>
              <Choice type="checkbox" name="advertising" value="yes" checked={f.advertising} onChange={(e) => set({ advertising: e.target.checked })}>
                Honeycomb may use my photograph and/or a short excerpt of my story in material that promotes Honeycomb. Leave this unticked for no.
              </Choice>
            </fieldset>
          </section>

          <section aria-labelledby="recorded">
            <p className="dh-num">05</p>
            <h2 id="recorded">If Honeycomb recorded you</h2>
            <p className="cf-hint">Leave blank if you recorded yourself.</p>
            <Field label="Recorded by"><input className="cf-input" value={f.recordedBy} onChange={(e) => set({ recordedBy: e.target.value })} /></Field>
            <Field label="Where"><input className="cf-input" value={f.recordedWhere} onChange={(e) => set({ recordedWhere: e.target.value })} /></Field>
            <Field label="On (date)"><input className="cf-input" type="date" value={f.recordedOn} onChange={(e) => set({ recordedOn: e.target.value })} /></Field>
          </section>

          <section aria-labelledby="sign">
            <p className="dh-num">06</p>
            <h2 id="sign">Sign</h2>
            <div className="cf-group">
              <Choice type="checkbox" name="readPrivacy" value="yes" checked={f.readPrivacy} onChange={(e) => set({ readPrivacy: e.target.checked })} required>
                I have read <Link href={PRIVACY_PATH} target="_blank">how my story and files are handled</Link>, and I understand that stories in the archive are personal testimony and are not verified.
              </Choice>
            </div>
            <SignatureBlock signature={f.signature} esign={f.esign} expectedName={f.fullName} onChange={set} />
            <div className="cf-actions">
              <button className="cf-submit" type="submit" disabled={state.sending}>{state.sending ? 'Sending…' : 'Sign and send'}</button>
              <span className="cf-hint">Release wording version {RELEASE_VERSION}.</span>
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
