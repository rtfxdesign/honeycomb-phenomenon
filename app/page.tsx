"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { uploadToR2, formatBytes } from "@/app/lib/upload";

type Story = {
  id: string;
  title: string;
  location: string;
  year: string;
  type: "Light" | "Craft" | "Presence" | "Dream" | "Other";
  excerpt: string;
  initials: string;
  color: string;
  privacy?: string;
};

type RecordingMode = "video" | "audio" | "text";
type PrivacyMode = "public" | "community" | "archive";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const seedStories: Story[] = [
  { id: "s1", title: "A silent light above the pines", location: "Hudson Valley, NY", year: "1986", type: "Light", excerpt: "It held perfectly still, then moved without crossing the space between.", initials: "MR", color: "ochre" },
  { id: "s2", title: "Three points over the water", location: "Lake Erie, OH", year: "2004", type: "Craft", excerpt: "The lights formed a triangle, but the stars disappeared behind it.", initials: "JL", color: "clay" },
  { id: "s3", title: "The morning after", location: "Sedona, AZ", year: "2018", type: "Dream", excerpt: "I woke with a memory that felt more like a place I had visited.", initials: "A", color: "sage" },
  { id: "s4", title: "No sound on the county road", location: "Taos, NM", year: "1997", type: "Craft", excerpt: "My radio cut out before the glow appeared over the ridge.", initials: "DE", color: "blue" },
  { id: "s5", title: "A shape inside the cloud", location: "Portland, OR", year: "2021", type: "Other", excerpt: "The cloud changed around something that never became fully visible.", initials: "KS", color: "moss" },
  { id: "s6", title: "My grandmother saw it too", location: "Marfa, TX", year: "1973", type: "Light", excerpt: "We never spoke about it until thirty years later. Our details matched.", initials: "RC", color: "amber" },
  { id: "s7", title: "Eleven minutes missing", location: "Allagash, ME", year: "1992", type: "Presence", excerpt: "The clock was the first thing that told us the evening had changed.", initials: "P", color: "plum" },
  { id: "s8", title: "Over the schoolyard", location: "Ariel, Zimbabwe", year: "1994", type: "Presence", excerpt: "What stayed with me was not fear. It was the feeling of being seen.", initials: "TN", color: "forest" },
  { id: "s9", title: "The object that became two", location: "Chicago, IL", year: "2015", type: "Light", excerpt: "It divided cleanly and the two lights left in opposite directions.", initials: "VC", color: "rust" },
  { id: "s10", title: "Red glow beyond the orchard", location: "Yakima, WA", year: "1969", type: "Craft", excerpt: "My father told me not to look. He watched until it was gone.", initials: "B", color: "red" },
  { id: "s11", title: "A pressure in the room", location: "Kansas City, MO", year: "2026", type: "Presence", excerpt: "I could hear the house, but every familiar sound seemed far away.", initials: "LW", color: "violet" },
  { id: "s12", title: "Daylight over the interstate", location: "Tampa, FL", year: "2023", type: "Other", excerpt: "Hundreds of cars kept moving. I still wonder who else looked up.", initials: "G", color: "sun" },
];

const heroCells = [
  [8, 19], [23, 9], [39, 16], [54, 7], [70, 17], [84, 8],
  [1, 38], [16, 31], [31, 40], [47, 30], [62, 39], [77, 31], [92, 40],
  [8, 58], [23, 51], [39, 60], [54, 50], [70, 59], [84, 51],
  [16, 78], [31, 70], [47, 80], [62, 69], [77, 78], [39, 96], [54, 90],
];

const heroLabels = ["1986", "LIGHT", "NM", "A", "1994", "OH", "DREAM", "1973", "YOU", "ME", "2023", "VOICE"];

function Logo() {
  return (
    <a className="brand" href="#top" aria-label="Honeycomb home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>HONEYCOMB</span>
    </a>
  );
}

function StoryOrbit({ stories, query, onSelect }: { stories: Story[]; query: string; onSelect: (story: Story) => void }) {
  const normalized = query.trim().toLowerCase();
  const matches = useMemo(() => stories.filter((story) => {
    if (!normalized) return true;
    return `${story.title} ${story.location} ${story.year} ${story.type} ${story.excerpt}`.toLowerCase().includes(normalized);
  }), [stories, normalized]);

  return (
    <div className="orbit-wrap">
      <div className="orbit-rings" aria-hidden="true"><i /><i /><i /></div>
      <div className="orbit-center">
        <strong>{matches.length}</strong>
        <span>{normalized ? "matching voices" : "voices nearby"}</span>
      </div>
      <div className="story-orbit" aria-live="polite">
        {stories.map((story, index) => {
          const matchIndex = matches.findIndex((match) => match.id === story.id);
          const isMatch = matchIndex >= 0;
          const ring = matchIndex < 6 ? 0 : matchIndex < 12 ? 1 : 2;
          const ringCounts = [Math.min(matches.length, 6), Math.min(Math.max(matches.length - 6, 0), 6), Math.max(matches.length - 12, 1)];
          const angle = ((matchIndex % 6) / Math.max(ringCounts[ring], 1)) * Math.PI * 2 - Math.PI / 2 + ring * 0.36;
          const radius = [142, 250, 330][ring];
          const fallbackAngle = (index / stories.length) * Math.PI * 2;
          const x = Math.cos(isMatch ? angle : fallbackAngle) * (isMatch ? radius : 355);
          const y = Math.sin(isMatch ? angle : fallbackAngle) * (isMatch ? radius : 355);
          return (
            <button
              className={`story-node ${isMatch ? "is-match" : "is-dimmed"} tone-${story.color}`}
              key={story.id}
              onClick={() => onSelect(story)}
              style={{ "--x": `${x}px`, "--y": `${y}px`, "--delay": `${index * 22}ms` } as React.CSSProperties}
              aria-label={`Open ${story.title}, ${story.location}, ${story.year}`}
            >
              <span>{story.initials}</span>
              <small>{story.year}</small>
            </button>
          );
        })}
      </div>
      <p className="orbit-caption">Results gather around your search. Select a voice to listen more closely.</p>
    </div>
  );
}

export default function Home() {
  const [stories, setStories] = useState<Story[]>(seedStories);
  const [query, setQuery] = useState("");
  const [selectedStory, setSelectedStory] = useState<Story | null>(seedStories[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<RecordingMode>("video");
  const [privacy, setPrivacy] = useState<PrivacyMode>("public");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [storyText, setStoryText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | Blob | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [honeycombImages, setHoneycombImages] = useState<string[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    fetch("/api/experiences?limit=40")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { experiences?: Array<Record<string, unknown>> }) => {
        const saved = (data.experiences ?? []).map((row): Story => ({
          id: `db-${String(row.id)}`,
          title: String(row.title ?? "Untitled experience"),
          location: String(row.location ?? "Location withheld"),
          year: String(row.experienceYear ?? row.experience_year ?? "—"),
          type: (String(row.experienceType ?? row.experience_type ?? "Other") as Story["type"]),
          excerpt: String(row.transcript ?? "Shared with the archive."),
          initials: String(row.displayName ?? row.display_name ?? "A").slice(0, 2).toUpperCase(),
          color: "honey",
          privacy: String(row.privacy ?? "public"),
        }));
        if (saved.length) setStories([...saved, ...seedStories]);
      })
      .catch(() => undefined);

    fetch("/api/honeycomb-images")
      .then((res) => res.json())
      .then((data) => {
        if (data.images && data.images.length > 0) {
          setHoneycombImages(data.images.map((img: any) => img.url));
        }
      })
      .catch(console.error);
  }, []);

  const openRecorder = () => {
    setModalOpen(true);
    setStep(1);
    setStatus("");
  };

  const closeRecorder = () => {
    if (recording) stopRecording();
    speechRef.current?.stop();
    setModalOpen(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (mode === "video" ? "video/webm" : "audio/webm") });
        setMediaFile(blob);
        stream.getTracks().forEach((track) => track.stop());
        setStatus("Recording ready. You can add notes or continue.");
      };
      recorder.start();
      setRecording(true);
      setStatus("Recording now — take your time.");
    } catch {
      setStatus("Camera or microphone access was not available. You can upload a file or continue with text.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
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
      setStatus("Live dictation is not supported in this browser. You can still type or upload a recording.");
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1]?.[0]?.transcript ?? "";
      setStoryText((current) => `${current}${current ? " " : ""}${latest}`);
    };
    recognition.onend = () => setDictating(false);
    recognition.onerror = () => {
      setDictating(false);
      setStatus("Dictation paused. Your existing text is safe.");
    };
    speechRef.current = recognition;
    recognition.start();
    setDictating(true);
  };

  const submitExperience = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !storyText.trim()) {
      setStatus("Please add a title and a few words about what happened.");
      return;
    }
    setSubmitting(true);
    setUploadPercent(0);

    let mediaKey = "";

    // Step 1: If there's a media file, upload it directly to R2
    if (mediaFile) {
      const filename = mediaFile instanceof File ? mediaFile.name : `experience-${Date.now()}.webm`;
      try {
        setStatus(`Uploading ${formatBytes(mediaFile.size)}…`);
        const result = await uploadToR2(mediaFile, filename, (progress) => {
          setUploadPercent(progress.percent);
          setStatus(`Uploading… ${progress.percent}% (${formatBytes(progress.loaded)} / ${formatBytes(progress.total)})`);
        });
        mediaKey = result.key;
        setStatus("Upload complete. Saving your experience…");
      } catch (error) {
        // R2 not configured or upload failed — fall back to Netlify Forms for small files
        if (mediaFile.size > 7 * 1024 * 1024) {
          setStatus(error instanceof Error ? error.message : "Media upload failed. Please try again or continue without media.");
          setSubmitting(false);
          return;
        }
        // Small file: fall through to Netlify Forms with the file attached
        setStatus("Preserving your experience securely…");
      }
    } else {
      setStatus("Preserving your experience securely…");
    }

    let photoKey = "";
    if (photoFile) {
      try {
        const result = await uploadToR2(photoFile, photoFile.name, () => {});
        photoKey = result.key;
      } catch (error) {
        console.warn("Photo upload to R2 failed", error);
      }
    }

    // Step 2: Submit metadata (+ small media fallback) via Netlify Forms
    const payload = new FormData();
    payload.append("form-name", "honeycomb-experience");
    payload.append("title", title.trim());
    payload.append("location", location.trim());
    payload.append("experienceYear", year.trim());
    payload.append("experienceType", "Other");
    payload.append("transcript", storyText.trim());
    payload.append("privacy", privacy);
    payload.append("recordingMode", mode);
    if (mediaKey) {
      // R2 upload succeeded — store the object key, not the file
      payload.append("mediaKey", mediaKey);
    } else if (mediaFile && mediaFile.size <= 7 * 1024 * 1024) {
      // Small file fallback via Netlify Forms
      payload.append("media", mediaFile, mediaFile instanceof File ? mediaFile.name : `experience.webm`);
    }

    if (photoKey) {
      payload.append("photoKey", photoKey);
    } else if (photoFile && photoFile.size <= 7 * 1024 * 1024) {
      payload.append("photo", photoFile, photoFile.name);
    }

    try {
      const response = await fetch("/__forms.html", { method: "POST", body: payload });
      if (!response.ok) throw new Error("Unable to preserve this experience right now.");
      setStep(4);
      setStatus("Your experience has been preserved privately and added to the review queue. Nothing is published automatically.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadPercent(0);
    }
  };

  return (
    <main id="top">
      <header className="site-header">
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#archive">Explore</a>
          <a href="#how">How it works</a>
          <a href="#about">About</a>
        </nav>
        <button className="header-cta" onClick={openRecorder}>Share your experience</button>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span /> A living archive of anomalous experience</p>
          <h1 id="hero-title">Your experience.<br /><em>Our collective history.</em></h1>
          <p className="hero-lede">A safe place to record what happened, find resonant stories, and help build a history no one can classify or hide.</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={openRecorder}>Record your story <span>↗</span></button>
            <a className="text-action" href="#archive">Explore the archive <span>↓</span></a>
          </div>
          <p className="privacy-note"><span aria-hidden="true">◉</span> You choose what is public, shared with the community, or kept strictly archived.</p>
        </div>

        <div className="hero-visual" aria-label="An organic constellation of archived voices">
          <div className="hero-halo" />
          {heroCells.map(([left, top], index) => {
            const bgUrl = honeycombImages.length > 0 ? honeycombImages[index % honeycombImages.length] : null;
            return (
              <div
                key={`${left}-${top}`}
                className={`hero-cell ${index === 8 ? "hero-cell-focus" : ""} ${index % 5 === 0 ? "hero-cell-ink" : ""}`}
                style={{ 
                  left: `${left}%`, 
                  top: `${top}%`, 
                  animationDelay: `${index * -0.19}s`,
                  backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: bgUrl ? "none" : undefined
                }}
              >
                {!bgUrl && <span>{heroLabels[index % heroLabels.length]}</span>}
              </div>
            );
          })}
          <div className="hero-caption"><b>02:14</b><span>Every cell is a voice.<br />Every voice changes the whole.</span></div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Archive principles">
        <p><b>Built with experiencers,</b> not around them.</p>
        <ul>
          <li><span>01</span> You own your story</li>
          <li><span>02</span> Privacy by choice</li>
          <li><span>03</span> Human-centered archive</li>
        </ul>
      </section>

      <section className="archive-section" id="archive" aria-labelledby="archive-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> Explore the archive</p>
            <h2 id="archive-title">Find the stories<br />that <em>find you.</em></h2>
          </div>
          <p>Search by place, year, encounter type, or a detail you remember. Related voices gather into a living constellation.</p>
        </div>

        <div className="archive-search">
          <label htmlFor="archive-query">Search the archive</label>
          <div className="search-box">
            <span aria-hidden="true">⌕</span>
            <input id="archive-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “Hudson Valley”, “1994”, or “silent light”" />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </div>
          <div className="search-suggestions" aria-label="Suggested searches">
            {["Light", "1994", "New Mexico", "Presence"].map((item) => <button key={item} onClick={() => setQuery(item)}>{item}</button>)}
          </div>
        </div>

        <div className="archive-stage">
          <StoryOrbit stories={stories} query={query} onSelect={setSelectedStory} />
          <aside className="story-detail" aria-live="polite">
            {selectedStory && (
              <>
                <div className={`detail-portrait tone-${selectedStory.color}`}><span>{selectedStory.initials}</span></div>
                <p className="detail-meta">{selectedStory.type} · {selectedStory.year}</p>
                <h3>{selectedStory.title}</h3>
                <p className="detail-location">⌖ {selectedStory.location}</p>
                <blockquote>“{selectedStory.excerpt}”</blockquote>
                <div className="audio-line"><button aria-label="Play excerpt">▶</button><i /><span>02:14</span></div>
                <p className="prototype-label">Prototype story · identities are illustrative</p>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="how-section" id="how" aria-labelledby="how-title">
        <div className="section-heading light-heading">
          <div>
            <p className="eyebrow"><span /> A guided conversation</p>
            <h2 id="how-title">Tell it in your<br /><em>own way.</em></h2>
          </div>
          <p>You do not need the perfect words. Honeycomb gently guides you through what you remember and keeps you in control at every step.</p>
        </div>
        <div className="steps-grid">
          <article><span>01</span><div className="step-symbol">◌</div><h3>Choose your format</h3><p>Record video, share audio, or begin with text. Pause, return, and edit before anything is saved.</p></article>
          <article><span>02</span><div className="step-symbol">〰</div><h3>Speak naturally</h3><p>Prompts feel like a patient interview. Speech-to-text creates a searchable transcript as you tell your story.</p></article>
          <article><span>03</span><div className="step-symbol">◉</div><h3>Set your boundaries</h3><p>Share publicly, with the community, or keep your experience in the private archive. The choice remains yours.</p></article>
        </div>
        <button className="outline-action" onClick={openRecorder}>Begin your experience <span>↗</span></button>
      </section>

      <section className="museum-section" aria-labelledby="museum-title">
        <div className="museum-art" aria-hidden="true">
          <div className="museum-door"><i /><i /><i /><i /><i /><i /><span>ENTER</span></div>
          <div className="projection-wash" />
        </div>
        <div className="museum-copy">
          <p className="eyebrow"><span /> From archive to encounter</p>
          <h2 id="museum-title">A room that<br /><em>listens back.</em></h2>
          <p>Honeycomb is being shaped for immersive museum environments—an intimate final room where visitors can explore the archive, sit at a recording kiosk, and add their own experience to the story.</p>
          <dl>
            <div><dt>01</dt><dd><b>Explore</b><span>Search the living archive</span></dd></div>
            <div><dt>02</dt><dd><b>Reflect</b><span>Find connection, not conclusions</span></dd></div>
            <div><dt>03</dt><dd><b>Contribute</b><span>Leave your own record</span></dd></div>
          </dl>
        </div>
      </section>

      <section className="about-section" id="about" aria-labelledby="about-title">
        <div className="about-copy">
          <p className="eyebrow"><span /> The people behind the archive</p>
          <h2 id="about-title">Built one person.<br />One experience.<br /><em>One connection at a time.</em></h2>
          <p>Honeycomb supports and empowers people who have witnessed a UFO, UAP, or anything related to the Phenomenon—building community while preserving a shared history with care.</p>
          <a href="mailto:hello@honeycomb-phenomenon.com" className="text-action">Meet the collaborators <span>→</span></a>
        </div>
        <figure className="team-art">
          <img src="/current-team-honeycomb.png" alt="Honeycomb collaborators arranged in an early honeycomb concept" />
          <figcaption><span>From the current Honeycomb site</span><b>The original collaborators and visual foundation</b></figcaption>
        </figure>
      </section>

      <section className="final-cta">
        <div className="cta-cells" aria-hidden="true">{Array.from({ length: 17 }).map((_, index) => <i key={index} style={{ "--i": index } as React.CSSProperties} />)}</div>
        <p className="eyebrow"><span /> The archive begins with you</p>
        <h2>You are not alone.</h2>
        <p>Your experience might be the detail that helps someone else understand their own.</p>
        <button className="primary-action light-button" onClick={openRecorder}>Record your story <span>↗</span></button>
      </section>

      <footer>
        <Logo />
        <p>A living archive for anomalous human experience.</p>
        <nav><a href="#archive">Explore</a><a href="#how">How it works</a><a href="#about">About</a><a href="mailto:hello@honeycomb-phenomenon.com">Contact</a></nav>
        <small>© {new Date().getFullYear()} Honeycomb Phenomenon · Prototype</small>
      </footer>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRecorder(); }}>
          <section className="recorder-modal" role="dialog" aria-modal="true" aria-labelledby="recorder-title">
            <button className="modal-close" onClick={closeRecorder} aria-label="Close recorder">×</button>
            <div className="modal-progress" aria-label={`Step ${Math.min(step, 3)} of 3`}><i className={step >= 1 ? "active" : ""} /><i className={step >= 2 ? "active" : ""} /><i className={step >= 3 ? "active" : ""} /></div>

            {step === 1 && (
              <>
                <p className="eyebrow"><span /> Step 1 of 3</p>
                <h2 id="recorder-title">How would you like to tell it?</h2>
                <p className="modal-lede">Choose what feels most natural. You can change your mind before saving.</p>
                <div className="choice-grid">
                  {([
                    ["video", "◉", "Video", "Tell your story face to face"],
                    ["audio", "〰", "Audio", "Share your voice without video"],
                    ["text", "Aa", "Text", "Write or dictate your experience"],
                  ] as Array<[RecordingMode, string, string, string]>).map(([value, symbol, label, detail]) => (
                    <button key={value} className={mode === value ? "selected" : ""} onClick={() => setMode(value)}><span>{symbol}</span><b>{label}</b><small>{detail}</small></button>
                  ))}
                </div>
                <div className="modal-actions"><button className="primary-action" onClick={() => setStep(2)}>Continue <span>→</span></button></div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="eyebrow"><span /> Step 2 of 3</p>
                <h2 id="recorder-title">You decide who can see it.</h2>
                <p className="modal-lede">Your privacy setting is attached to the experience—not buried in account settings.</p>
                <div className="privacy-list">
                  {([
                    ["public", "Public archive", "Searchable and viewable by anyone"],
                    ["community", "Community only", "Visible to approved Honeycomb members"],
                    ["archive", "Strictly archived", "Preserved, but never displayed publicly"],
                  ] as Array<[PrivacyMode, string, string]>).map(([value, label, detail]) => (
                    <button key={value} className={privacy === value ? "selected" : ""} onClick={() => setPrivacy(value)}><i>{privacy === value ? "●" : "○"}</i><span><b>{label}</b><small>{detail}</small></span></button>
                  ))}
                </div>
                <div className="modal-actions"><button className="back-action" onClick={() => setStep(1)}>← Back</button><button className="primary-action" onClick={() => setStep(3)}>Continue <span>→</span></button></div>
              </>
            )}

            {step === 3 && (
              <form name="honeycomb-experience" method="POST" encType="multipart/form-data" data-netlify="true" onSubmit={submitExperience}>
                <input type="hidden" name="form-name" value="honeycomb-experience" />
                <p className="eyebrow"><span /> Step 3 of 3</p>
                <h2 id="recorder-title">Tell us what happened.</h2>
                <div className="form-grid">
                  <label className="field field-wide"><span>A short title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The light above the pines" required /></label>
                  <label className="field"><span>Place</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Hudson Valley, NY" /></label>
                  <label className="field"><span>Year</span><input value={year} onChange={(event) => setYear(event.target.value)} inputMode="numeric" placeholder="1986" /></label>
                  <label className="field field-wide"><span>Your experience</span><textarea value={storyText} onChange={(event) => setStoryText(event.target.value)} placeholder="Begin wherever feels right…" rows={6} required /></label>
                </div>
                <div className="capture-tools">
                  <button type="button" onClick={toggleDictation} className={dictating ? "is-live" : ""}>{dictating ? "■ Stop dictation" : "◌ Dictate"}</button>
                  {mode !== "text" && <button type="button" onClick={recording ? stopRecording : startRecording} className={recording ? "is-live" : ""}>{recording ? "■ Stop recording" : `● Record ${mode}`}</button>}
                  {mode !== "text" && <label className="upload-button">↑ Upload {mode}<input type="file" accept={mode === "video" ? "video/*" : "audio/*"} onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} /></label>}
                  {mediaFile && <span className="media-ready">✓ Media ready ({formatBytes(mediaFile.size)})</span>}
                  
                  <label className="upload-button">↑ Attach a photo<input type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} /></label>
                  {photoFile && <span className="media-ready">✓ Photo ready ({formatBytes(photoFile.size)})</span>}
                  {submitting && uploadPercent > 0 && uploadPercent < 100 && (
                    <div className="upload-progress" role="progressbar" aria-valuenow={uploadPercent} aria-valuemin={0} aria-valuemax={100}>
                      <div className="upload-progress-bar" style={{ width: `${uploadPercent}%` }} />
                      <span>{uploadPercent}%</span>
                    </div>
                  )}
                </div>
                {status && <p className="form-status" role="status">{status}</p>}
                <div className="modal-actions"><button type="button" className="back-action" onClick={() => setStep(2)}>← Back</button><button className="primary-action" disabled={submitting}>{submitting ? "Saving…" : "Add to the archive"} <span>↗</span></button></div>
              </form>
            )}

            {step === 4 && (
              <div className="success-state">
                <div className="success-cell">✓</div>
                <p className="eyebrow"><span /> Experience received</p>
                <h2>Thank you for trusting the archive.</h2>
                <p>{status}</p>
                <button className="primary-action" onClick={closeRecorder}>Return to Honeycomb <span>→</span></button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
