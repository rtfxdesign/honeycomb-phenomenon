'use client';

// The recording stage at the top of the recorder's last step.
//
// A contributor sees themselves before and while they record (Paul, team
// meeting 2026-10-21: "I want to see myself when I'm being recorded"), can
// pause and carry on, and watches the take back before deciding to keep it.
// Nothing reaches the form — and so nothing can be submitted — until they
// press "Keep this recording".
//
//   idle → live (camera on, not recording) → recording ⇄ paused → review
//   review → "Keep" hands the take to the form; "Record again" goes back to live
//
// iPhone notes: the live preview needs muted + playsInline + autoPlay or
// Safari will not show it in the page; Safari records MP4, not WebM; and
// MediaRecorder.pause is missing on older iOS, so the Pause button only
// appears where it exists.

import React, { useEffect, useMemo, useRef, useState } from 'react';

const canPause = (r) => typeof r?.pause === 'function' && typeof r?.resume === 'function';
const clock = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
// resolves once a recorder has delivered its last chunk
const stopped = (recorder) => new Promise((resolve) => recorder.addEventListener('stop', () => resolve(), { once: true }));

/** File extension for a recording's MIME type: an iPhone's MP4 is not a .webm. */
export function extFor(type, fallback = 'webm') {
  const t = String(type || '');
  if (t.includes('mp4')) return t.startsWith('audio/') ? 'm4a' : 'mp4';
  if (t.includes('webm')) return 'webm';
  if (t.includes('ogg')) return 'ogg';
  if (t.includes('wav')) return 'wav';
  return fallback;
}

export default function RecordingStage({ mode, mediaFile, onKeep, onDiscard, onPendingChange, setStatus }) {
  const [phase, setPhase] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState(null); // { media, audio, url } while in review
  const [pausable, setPausable] = useState(false);
  const liveRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const audioRecorderRef = useRef(null);
  // time already recorded before the current stretch, and when it began
  const bankedRef = useRef(0);
  const sinceRef = useRef(0);
  const video = mode === 'video';

  const keptUrl = useMemo(() => (mediaFile ? URL.createObjectURL(mediaFile) : null), [mediaFile]);
  useEffect(() => () => { if (keptUrl) URL.revokeObjectURL(keptUrl); }, [keptUrl]);
  useEffect(() => () => { if (take?.url) URL.revokeObjectURL(take.url); }, [take]);

  // the form must not be submitted with a take still open
  useEffect(() => { onPendingChange?.(phase !== 'idle'); }, [phase, onPendingChange]);

  // the camera stream is attached once the preview element exists
  useEffect(() => {
    if (liveRef.current && streamRef.current && liveRef.current.srcObject !== streamRef.current) {
      liveRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'recording') return undefined;
    const tick = setInterval(() => setElapsed(bankedRef.current + Date.now() - sinceRef.current), 250);
    return () => clearInterval(tick);
  }, [phase]);

  const releaseCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // leaving the step or closing the recorder turns the camera off
  useEffect(() => () => {
    for (const r of [recorderRef.current, audioRecorderRef.current]) {
      if (r && r.state !== 'inactive') r.stop();
    }
    releaseCamera();
  }, []);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      streamRef.current = stream;
      return true;
    } catch {
      setStatus(`${video ? 'Camera' : 'Microphone'} access was not available. You can upload a file or continue with text.`);
      return false;
    }
  };

  const showCamera = async () => {
    if (await openCamera()) {
      setPhase('live');
      setStatus('This is what the camera sees. Start when you are ready.');
    }
  };

  const start = async () => {
    if (!streamRef.current && !(await openCamera())) return;
    const stream = streamRef.current;
    const media = [];
    const audio = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) media.push(event.data); };
    const finished = [stopped(recorder)];

    // For video we also record the audio track on its own. Transcription
    // takes audio, not a video container, and extracting a track server-side
    // would mean running ffmpeg somewhere — this gets the same result for the
    // cost of a second MediaRecorder over the microphone track we already have.
    let audioRecorder = null;
    if (video) {
      try {
        audioRecorder = new MediaRecorder(new MediaStream(stream.getAudioTracks()));
        audioRecorder.ondataavailable = (event) => { if (event.data.size) audio.push(event.data); };
        finished.push(stopped(audioRecorder));
      } catch {
        // Not fatal: the video still records, it just cannot be
        // auto-transcribed, and the dashboard says so.
        audioRecorder = null;
      }
    }
    audioRecorderRef.current = audioRecorder;

    // both recorders have handed over every chunk before the take is built
    Promise.all(finished).then(() => {
      const mediaBlob = new Blob(media, { type: recorder.mimeType || (video ? 'video/webm' : 'audio/webm') });
      const audioBlob = audio.length ? new Blob(audio, { type: audioRecorder?.mimeType || 'audio/webm' }) : null;
      releaseCamera();
      setTake({ media: mediaBlob, audio: audioBlob, url: URL.createObjectURL(mediaBlob) });
      setPhase('review');
      setStatus('Watch it back. Keep it, or record again.');
    });

    recorder.start();
    audioRecorder?.start();
    setPausable(canPause(recorder));
    bankedRef.current = 0;
    sinceRef.current = Date.now();
    setElapsed(0);
    setPhase('recording');
    setStatus('Recording now — take your time.');
  };

  const pause = () => {
    recorderRef.current?.pause();
    if (audioRecorderRef.current?.state === 'recording') audioRecorderRef.current.pause();
    bankedRef.current += Date.now() - sinceRef.current;
    setElapsed(bankedRef.current);
    setPhase('paused');
    setStatus('Paused. Resume when you are ready.');
  };

  const resume = () => {
    recorderRef.current?.resume();
    if (audioRecorderRef.current?.state === 'paused') audioRecorderRef.current.resume();
    sinceRef.current = Date.now();
    setPhase('recording');
    setStatus('Recording now — take your time.');
  };

  const stop = () => {
    for (const r of [recorderRef.current, audioRecorderRef.current]) {
      if (r && r.state !== 'inactive') r.stop();
    }
    if (phase === 'recording') bankedRef.current += Date.now() - sinceRef.current;
    setElapsed(bankedRef.current);
  };

  const cancelLive = () => {
    releaseCamera();
    setPhase('idle');
    setStatus('');
  };

  const keep = () => {
    onKeep(take.media, take.audio);
    setTake(null);
    setPhase('idle');
    setStatus('Recording kept. Add a title and anything else you would like, then save.');
  };

  const again = async () => {
    setTake(null);
    if (await openCamera()) {
      setPhase(video ? 'live' : 'idle');
      if (!video) await start();
    } else {
      setPhase('idle');
    }
  };

  const live = phase === 'live' || phase === 'recording' || phase === 'paused';

  return (
    <div className={`rec-stage rec-stage--${mode}`} data-phase={phase}>
      {video && live && (
        <div className="rec-frame">
          <video ref={liveRef} className="rec-live" autoPlay muted playsInline aria-label="Camera preview" />
          {phase !== 'live' && (
            <span className={`rec-badge${phase === 'paused' ? ' is-paused' : ''}`}>
              <i aria-hidden="true" />{phase === 'paused' ? 'Paused' : 'Recording'} · {clock(elapsed)}
            </span>
          )}
        </div>
      )}
      {!video && (phase === 'recording' || phase === 'paused') && (
        <p className="rec-audio-live">
          <span className={`rec-badge${phase === 'paused' ? ' is-paused' : ''}`}>
            <i aria-hidden="true" />{phase === 'paused' ? 'Paused' : 'Recording'} · {clock(elapsed)}
          </span>
        </p>
      )}

      {phase === 'review' && take && (
        <div className="rec-review">
          <span className="rec-label">Your recording · {clock(elapsed)}</span>
          {video
            ? <video className="rec-playback" src={take.url} controls playsInline preload="metadata" />
            : <audio className="rec-playback" src={take.url} controls preload="metadata" />}
          <p className="rec-hint">This is exactly what will be sent. Nothing leaves your device until you save the form.</p>
        </div>
      )}

      {phase === 'idle' && mediaFile && keptUrl && (
        <div className="rec-review rec-review--kept">
          <span className="rec-label">✓ {video ? 'Video' : 'Audio'} ready to send</span>
          {video
            ? <video className="rec-playback" src={keptUrl} controls playsInline preload="metadata" />
            : <audio className="rec-playback" src={keptUrl} controls preload="metadata" />}
        </div>
      )}

      <div className="rec-controls">
        {phase === 'idle' && !mediaFile && (
          video
            ? <button type="button" className="rec-primary" onClick={showCamera}>◉ Turn on camera</button>
            : <button type="button" className="rec-primary" onClick={start}>● Start recording</button>
        )}
        {phase === 'idle' && mediaFile && (
          <button type="button" onClick={onDiscard}>Remove and record again</button>
        )}
        {phase === 'live' && (
          <>
            <button type="button" className="rec-primary is-live" onClick={start}>● Start recording</button>
            <button type="button" onClick={cancelLive}>Turn camera off</button>
          </>
        )}
        {phase === 'recording' && (
          <>
            {pausable && <button type="button" onClick={pause}>❚❚ Pause</button>}
            <button type="button" className="rec-primary is-live" onClick={stop}>■ Stop</button>
          </>
        )}
        {phase === 'paused' && (
          <>
            <button type="button" onClick={resume}>● Resume</button>
            <button type="button" className="rec-primary is-live" onClick={stop}>■ Stop</button>
          </>
        )}
        {phase === 'review' && (
          <>
            <button type="button" className="rec-primary" onClick={keep}>✓ Keep this recording</button>
            <button type="button" onClick={again}>↺ Record again</button>
          </>
        )}
      </div>
    </div>
  );
}
