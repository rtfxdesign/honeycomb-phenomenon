'use client';

// Three-step recorder flow from the projecthoneycomb.site deploy, wired to
// this repo's backend: media goes straight to R2 via presigned URL
// (bypassing Netlify's payload limits) and the submission lands in the
// private review queue via /api/submit-experience.
//
// What the contributor is told before and after they commit is part of the
// record, not decoration: the link to how their story is handled, the
// removal instructions, and the submission ID they can quote to have it
// taken down. Those three appear on every path — text, audio and video.

import React, { useState, useRef, useEffect } from 'react';
import { uploadToR2 } from '../lib/upload';
import { REMOVAL_EMAIL, PRIVACY_PATH } from '../lib/contact';
import { NAME_DISPLAY_OPTIONS, formatDisplayName } from '../lib/name';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][i]}`;
}

function HandlingLink({ children }) {
  return (
    <a href={PRIVACY_PATH} target="_blank" rel="noopener">
      {children || 'How we handle your story and files'} <span aria-hidden="true">↗</span>
    </a>
  );
}

// The same removal text on the privacy step and on the confirmation screen.
function RemovalNote({ id }) {
  const subject = id ? `?subject=${encodeURIComponent(`Remove ${id}`)}` : '';
  return (
    <p className="removal-note">
      To remove your submission, email <a href={`mailto:${REMOVAL_EMAIL}${subject}`}>{REMOVAL_EMAIL}</a> with
      the name you submitted under. If you stayed anonymous, include the date, the approximate time and a
      short description so we can find it.
    </p>
  );
}

export default function RecorderModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('video');
  const [privacy, setPrivacy] = useState('public');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameDisplay, setNameDisplay] = useState('full');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [storyText, setStoryText] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  // Audio-only copy of a video recording, so it can be machine-transcribed.
  const [audioFile, setAudioFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [consent, setConsent] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [copied, setCopied] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioChunksRef = useRef([]);
  const audioRecorderRef = useRef(null);
  const speechRef = useRef(null);
  const idRef = useRef(null);

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    if (audioRecorderRef.current?.state === 'recording') audioRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    speechRef.current?.stop();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' });
      streamRef.current = stream;
      chunksRef.current = [];
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };

      // For video we also record the audio track on its own. Transcription
      // takes audio, not a video container, and extracting a track server-side
      // would mean running ffmpeg somewhere — this gets the same result for
      // the cost of a second MediaRecorder over the microphone track we
      // already have.
      let audioRecorder = null;
      if (mode === 'video') {
        try {
          const audioOnly = new MediaStream(stream.getAudioTracks());
          audioRecorder = new MediaRecorder(audioOnly);
          audioRecorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
          audioRecorderRef.current = audioRecorder;
        } catch {
          // Not fatal: the video still records, it just cannot be
          // auto-transcribed, and the dashboard says so.
          audioRecorderRef.current = null;
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (mode === 'video' ? 'video/webm' : 'audio/webm') });
        setMediaFile(blob);
        if (audioChunksRef.current.length) {
          setAudioFile(new Blob(audioChunksRef.current, { type: audioRecorderRef.current?.mimeType || 'audio/webm' }));
        }
        stream.getTracks().forEach((track) => track.stop());
        setStatus('Recording ready. You can add notes or continue.');
      };
      recorder.start();
      audioRecorder?.start();
      setRecording(true);
      setStatus('Recording now — take your time.');
    } catch {
      setStatus('Camera or microphone access was not available. You can upload a file or continue with text.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    if (audioRecorderRef.current?.state === 'recording') audioRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  };

  const toggleDictation = () => {
    if (dictating) {
      speechRef.current?.stop();
      setDictating(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus('Live dictation is not supported in this browser. You can still type or upload a recording.');
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1]?.[0]?.transcript ?? '';
      setStoryText((current) => `${current}${current ? ' ' : ''}${latest}`);
    };
    recognition.onend = () => setDictating(false);
    recognition.onerror = () => {
      setDictating(false);
      setStatus('Dictation paused. Your existing text is safe.');
    };
    speechRef.current = recognition;
    recognition.start();
    setDictating(true);
  };

  const close = () => {
    if (recording) stopRecording();
    speechRef.current?.stop();
    onClose();
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '').replace(/,/g, '');
    if (tag && !tags.includes(tag)) setTags((t) => [...t, tag]);
    setTagInput('');
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(submissionId);
    } catch {
      // clipboard blocked: select the text so a long-press or ctrl+c works
      const range = document.createRange();
      range.selectNodeContents(idRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const submitExperience = async (event) => {
    event.preventDefault();
    // A recording is an account in itself. Asking someone to also type it out
    // before they may submit is the work machine transcription removes.
    if (!title.trim() || (!storyText.trim() && !mediaFile)) {
      setStatus('Please add a title, and either a few words or a recording.');
      return;
    }
    if (!consent) {
      setStatus('Please confirm the account is yours to share.');
      return;
    }
    setSubmitting(true);
    setProgress(0);

    let mediaKey = '';
    if (mediaFile) {
      const name = mediaFile instanceof File ? mediaFile.name : `experience-${Date.now()}.webm`;
      try {
        setStatus(`Uploading ${formatBytes(mediaFile.size)}…`);
        const result = await uploadToR2(mediaFile, name, (p) => {
          setProgress(p.percent);
          setStatus(`Uploading… ${p.percent}% (${formatBytes(p.loaded)} / ${formatBytes(p.total)})`);
        });
        mediaKey = result.key;
        setStatus('Upload complete. Saving your experience…');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Media upload failed. Please try again or continue without media.');
        setSubmitting(false);
        return;
      }
    } else {
      setStatus('Preserving your experience securely…');
    }

    // The audio-only copy of a video, uploaded so the record can be
    // transcribed later. Never worth failing a submission over: if it does not
    // upload, the video is still safely stored and the moderator can type the
    // transcript as before.
    let audioKey = '';
    if (audioFile) {
      try {
        setStatus('Storing the audio track…');
        audioKey = (await uploadToR2(audioFile, `experience-audio-${Date.now()}.webm`, () => {})).key;
      } catch (error) {
        console.warn('Audio track upload failed', error);
      }
    }

    let photoKey = '';
    if (photoFile) {
      try {
        photoKey = (await uploadToR2(photoFile, photoFile.name, () => {})).key;
      } catch (error) {
        console.warn('Photo upload failed', error);
      }
    }

    const payload = {
      title: title.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nameDisplay,
      location: location.trim(),
      experienceYear: year.trim(),
      experienceType: 'Other',
      transcript: storyText.trim(),
      privacy,
      recordingMode: mode,
      mediaKey: mediaKey || undefined,
      // For an audio submission the recording is already the audio track.
      audioKey: audioKey || (mode === 'audio' ? mediaKey : '') || undefined,
      photoKey: photoKey || undefined,
      hashtags: tags,
      consent: true,
    };

    try {
      const response = await fetch('/api/submit-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Unable to preserve this experience right now.');
      const result = await response.json();
      setSubmissionId(result.id || '');
      setStep(4);
      setStatus('Your experience has been preserved privately and added to the review queue. Nothing is published automatically.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Something went wrong while saving. Please try again.');
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  const namePreview = formatDisplayName(firstName, lastName, nameDisplay);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="recorder-modal" role="dialog" aria-modal="true" aria-labelledby="recorder-title">
        <button className="modal-close" type="button" onClick={close} aria-label="Close recorder">×</button>
        <div className="modal-progress" aria-label={`Step ${Math.min(step, 3)} of 3`}>
          <i className={step >= 1 ? 'active' : ''} />
          <i className={step >= 2 ? 'active' : ''} />
          <i className={step >= 3 ? 'active' : ''} />
        </div>

        {step === 1 && (
          <>
            <p className="eyebrow"><span /> Step 1 of 3</p>
            <h2 id="recorder-title">How would you like to tell it?</h2>
            <p className="modal-lede">Choose what feels most natural. You can change your mind before saving.</p>
            <div className="choice-grid">
              {[
                ['video', '◉', 'Video', 'Tell your story face to face'],
                ['audio', '〰', 'Audio', 'Share your voice without video'],
                ['text', 'Aa', 'Text', 'Write or dictate your experience'],
              ].map(([value, symbol, label, detail]) => (
                <button key={value} type="button" className={mode === value ? 'selected' : ''} onClick={() => setMode(value)}>
                  <span>{symbol}</span><b>{label}</b><small>{detail}</small>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="primary-action" onClick={() => setStep(2)}>Continue <span>→</span></button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="eyebrow"><span /> Step 2 of 3</p>
            <h2 id="recorder-title">You decide who can see it</h2>
            <p className="modal-lede">Your privacy setting is attached to the experience—not buried in account settings.</p>
            <div className="privacy-list">
              {[
                ['public', 'Public archive', 'Searchable and viewable by anyone'],
                ['community', 'Community only', 'Visible to approved Honeycomb members'],
                ['archive', 'Strictly archived', 'Preserved, but never displayed publicly'],
              ].map(([value, label, detail]) => (
                <button key={value} type="button" className={privacy === value ? 'selected' : ''} onClick={() => setPrivacy(value)}>
                  <i>{privacy === value ? '●' : '○'}</i>
                  <span><b>{label}</b><small>{detail}</small></span>
                </button>
              ))}
            </div>
            <div className="privacy-note">
              <p className="privacy-note-link"><HandlingLink /></p>
              <RemovalNote />
            </div>
            <div className="modal-actions">
              <button type="button" className="back-action" onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="primary-action" onClick={() => setStep(3)}>Continue <span>→</span></button>
            </div>
          </>
        )}

        {step === 3 && (
          <form onSubmit={submitExperience}>
            <p className="eyebrow"><span /> Step 3 of 3</p>
            <h2 id="recorder-title">Tell us what happened</h2>
            <div className="form-grid">
              <label className="field"><span>First name</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" placeholder="Jane" /></label>
              <label className="field"><span>Last name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" placeholder="Doe" /></label>
              <div className="field field-wide name-display">
                <span>Show my name as</span>
                <div className="display-options" role="radiogroup" aria-label="How your name appears">
                  {NAME_DISPLAY_OPTIONS.map(([value, label]) => (
                    <button
                      key={value} type="button" role="radio" aria-checked={nameDisplay === value}
                      className={nameDisplay === value ? 'selected' : ''} onClick={() => setNameDisplay(value)}
                    >
                      <b>{formatDisplayName(firstName || 'Jane', lastName || 'Doe', value)}</b>
                      <small>{label}</small>
                    </button>
                  ))}
                </div>
                <small className="field-hint">
                  {namePreview
                    ? <>Your cell will read <strong>{namePreview}</strong> — you can change this later by writing to us.</>
                    : <>Leave both blank to stay anonymous — your cell will show your place, or your title, instead.</>}
                </small>
              </div>
              <label className="field field-wide"><span>A short title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The light above the pines" required /></label>
              <label className="field"><span>Place</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Hudson Valley, NY" /></label>
              <label className="field"><span>Year</span><input value={year} onChange={(event) => setYear(event.target.value)} inputMode="numeric" placeholder="1986" /></label>
              <label className="field field-wide"><span>Your experience</span><textarea value={storyText} onChange={(event) => setStoryText(event.target.value)} placeholder="Begin wherever feels right…" rows={6} required /></label>
              <div className="field field-wide tags-container">
                <span>Tags &amp; Keywords</span>
                <div className="tag-list">
                  {tags.map((tag) => (
                    <span className="tag-chip" key={tag}>
                      #{tag}
                      <button type="button" onClick={() => setTags((t) => t.filter((x) => x !== tag))} aria-label={`Remove tag ${tag}`}>×</button>
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTag(); } }}
                  placeholder="Type a custom tag and press Enter"
                />
              </div>
            </div>
            <div className="capture-tools">
              <button type="button" onClick={toggleDictation} className={dictating ? 'is-live' : ''}>{dictating ? '■ Stop dictation' : '◌ Dictate'}</button>
              {mode !== 'text' && <button type="button" onClick={recording ? stopRecording : startRecording} className={recording ? 'is-live' : ''}>{recording ? '■ Stop recording' : `● Record ${mode}`}</button>}
              {mode !== 'text' && (
                <label className="upload-button">↑ Upload {mode}
                  <input type="file" accept={mode === 'video' ? 'video/*' : 'audio/*'} onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} />
                </label>
              )}
              {mediaFile && <span className="media-ready">✓ Media ready ({formatBytes(mediaFile.size)})</span>}
              <label className="upload-button">↑ Attach a photo
                <input type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
              </label>
              {photoFile && <span className="media-ready">✓ Photo ready ({formatBytes(photoFile.size)})</span>}
              {submitting && progress > 0 && progress < 100 && (
                <div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
                  <span>{progress}%</span>
                </div>
              )}
            </div>
            <label className="consent-row">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
              <span>
                This account is mine to share. I authorize Honeycomb to keep it under the privacy setting I chose,
                and I have read <HandlingLink>how my story and files are handled</HandlingLink>.
              </span>
            </label>
            {status && <p className="form-status" role="status">{status}</p>}
            <div className="modal-actions">
              <button type="button" className="back-action" onClick={() => setStep(2)}>← Back</button>
              <button className="primary-action" disabled={submitting || !consent}>{submitting ? 'Saving…' : 'Add to the archive'} <span>↗</span></button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="success-state">
            <div className="success-cell">✓</div>
            <p className="eyebrow"><span /> Experience received</p>
            <h2>Thank you for trusting the archive</h2>
            <p>{status}</p>
            {submissionId && (
              <div className="submission-id-block">
                <span className="submission-id-label">Your submission ID</span>
                <div className="submission-id-row">
                  <code className="submission-id" ref={idRef}>{submissionId}</code>
                  <button type="button" className="copy-id" onClick={copyId} aria-live="polite">{copied ? 'Copied ✓' : 'Copy'}</button>
                </div>
                <p>
                  Email <a href={`mailto:${REMOVAL_EMAIL}?subject=${encodeURIComponent(`Remove ${submissionId}`)}`}>{REMOVAL_EMAIL}</a> with
                  this ID in the subject line and we will remove it. Without the ID we can still find it from whatever
                  details you have.
                </p>
                <RemovalNote id={submissionId} />
              </div>
            )}
            <button type="button" className="primary-action" onClick={close}>Return to Honeycomb <span>→</span></button>
          </div>
        )}
      </section>
    </div>
  );
}
