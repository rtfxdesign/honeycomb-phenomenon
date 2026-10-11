"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDisplayName, NAME_DISPLAY_OPTIONS } from "../lib/name";
import "./review.css";

/**
 * The moderator dashboard, as a master–detail queue.
 *
 * Tabs for what is waiting, what is live, the community faces and the
 * members; a dense list on the left and one record open on the right; filters,
 * search, j/k to move, Enter to edit, Esc to stop. The data shapes and the
 * routes are the ones the old one-column dashboard used; only the layout and
 * the look changed (design handoff, 2026-10-10).
 */

interface SubmissionData {
  id: string;
  title: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  nameDisplay?: string;
  consentAt?: string;
  adsOk?: boolean;
  location: string;
  experienceYear: string;
  experienceType?: string;
  transcript: string;
  privacy?: string;
  hashtags?: string[];
  status?: string;
  // the file the archive plays; after approval the encoder swaps in a
  // streaming copy (<name>-web.mp4) and keeps the original's key beside it
  mediaKey?: string;
  originalMediaKey?: string;
  mediaEncodedAt?: string;
  // machine transcription
  audioKey?: string;
  recordingMode?: string;
  machineTranscript?: string;
  transcriptStatus?: "none" | "awaiting" | "ready" | "confirmed" | "failed";
  transcriptSource?: string;
  transcriptModel?: string;
  transcriptWarnings?: string[];
  transcriptError?: string;
  transcribedAt?: string;
}

interface Submission {
  submissionKey: string;
  data: SubmissionData;
  mediaUrl: string | null;
  mediaType: "image" | "video" | "audio" | "unknown" | null;
  photoUrl: string | null;
  lastModified: string;
}

interface EditState {
  title: string;
  displayName: string;
  firstName: string;
  lastName: string;
  nameDisplay: string;
  location: string;
  experienceYear: string;
  privacy: string;
  transcript: string;
  hashtags: string;
}

interface Person {
  key: string;
  name: string;
  about: string[];
  video: string | null;
}

interface PersonEditState {
  name: string;
  about: string;
  video: string;
}

interface MemberRecord {
  id: string;
  name: string;
  email?: string;
  note?: string;
  createdAt: string;
  disabledAt?: string | null;
  lastSeenAt?: string | null;
}

type Tab = "queue" | "live" | "faces" | "members";
type Filter = "all" | "public" | "community" | "archive" | "media" | "transcript";

const TABS: Array<[Tab, string]> = [["queue", "Queue"], ["live", "Live"], ["faces", "Faces"], ["members", "Members"]];
const FILTERS: Array<[Filter, string]> = [
  ["all", "All"], ["public", "Public"], ["community", "Community"], ["archive", "Archived"], ["media", "Has media"], ["transcript", "Needs transcript"],
];
const PRIV: Record<string, [string, string]> = {
  public: ["Public", "rv-priv-public"],
  community: ["Community", "rv-priv-community"],
  archive: ["Archived", "rv-priv-archive"],
};
const TAB_KEY = "hc-review-tab";

const isLive = (s: Submission) => s.submissionKey.startsWith("approved/");
const hasMedia = (s: Submission) => Boolean(s.mediaUrl || s.photoUrl);
const whoOf = (d: SubmissionData) => d.displayName || formatDisplayName(d.firstName, d.lastName, d.nameDisplay) || "";
const privOf = (d: SubmissionData) => PRIV[d.privacy || "public"] || PRIV.public;
const hay = (s: Submission) =>
  [s.data.title, whoOf(s.data), s.data.location, s.data.experienceYear, s.data.id, ...(s.data.hashtags || [])].join(" ").toLowerCase();
const paragraphs = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Field({ label, hint, className, children }: { label: string; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <label className={`rv-field${className ? ` ${className}` : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/** One community face, open for editing. Keyed by the person so it starts fresh on each selection. */
function FaceEditor({ person, saving, onSave }: { person: Person; saving: boolean; onSave: (key: string, edit: PersonEditState) => void }) {
  const [edit, setEdit] = useState<PersonEditState>({ name: person.name, about: person.about.join("\n\n"), video: person.video || "" });
  return (
    <aside className="rv-aside rv-thin">
      <span className="rv-ui">Community face · <code>{person.key}.webp</code></span>
      <Field label="Name">
        <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
      </Field>
      <Field label="About (blank line between paragraphs)">
        <textarea rows={9} value={edit.about} onChange={(e) => setEdit({ ...edit, about: e.target.value })} />
      </Field>
      <Field label="Video path" hint="A path under /videos, or a URL. Blank for none.">
        <input value={edit.video} onChange={(e) => setEdit({ ...edit, video: e.target.value })} placeholder="/videos/<file>.mp4" />
      </Field>
      <div>
        <button type="button" className="rv-cta" disabled={saving} onClick={() => onSave(person.key, edit)}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </aside>
  );
}

export default function ReviewDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMedia, setActiveMedia] = useState<{ url: string; type: Submission["mediaType"] } | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [authRequired, setAuthRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [newMember, setNewMember] = useState({ name: "", email: "", note: "" });
  // which submission is being transcribed right now, and anything it came back with
  const [transcribingKey, setTranscribingKey] = useState<string | null>(null);
  const [transcribeNote, setTranscribeNote] = useState<Record<string, string>>({});
  const [hiddenDrafts, setHiddenDrafts] = useState<Record<string, boolean>>({});
  const [issuedCode, setIssuedCode] = useState<{ name: string; code: string; email?: string } | null>(null);
  const [memberBusy, setMemberBusy] = useState(false);

  // the shell
  const [tab, setTab] = useState<Tab>("queue");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [faceKey, setFaceKey] = useState<string | null>(null);

  // Read after mount so the server and the client render the same first frame:
  // the tab remembered for this session, and ?member=&email= from the
  // request-access notification email, which fills the new-member form.
  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      const member = q.get("member") || "";
      const email = q.get("email") || "";
      if (member || email) {
        setNewMember({ name: member, email, note: "Requested access from the gate" });
        setTab("members");
        return;
      }
      try {
        const saved = sessionStorage.getItem(TAB_KEY) as Tab | null;
        if (saved && TABS.some(([id]) => id === saved)) setTab(saved);
      } catch { /* private mode */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(TAB_KEY, tab); } catch { /* private mode */ }
  }, [tab]);

  const loadAll = () => {
    setLoading(true);
    setError("");
    fetch("/api/review-queue")
      .then((res) => {
        if (res.status === 401) {
          setAuthRequired(true);
          setLoading(false);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load submissions");
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setAuthRequired(false);
        setSubmissions(data.submissions || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load submissions from R2 bucket.");
        setLoading(false);
      });
    fetch("/api/people")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.people) setPeople(data.people); })
      .catch((err) => console.error(err));
    loadMembers();
  };

  const loadMembers = () => {
    fetch("/api/members")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.members) setMembers(data.members); })
      .catch((err) => console.error(err));
  };

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMember.name.trim()) return;
    setMemberBusy(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      if (!res.ok) throw new Error("Failed to add member");
      const data = await res.json();
      setIssuedCode({ name: data.member.name, code: data.code, email: data.member.email });
      setNewMember({ name: "", email: "", note: "" });
      loadMembers();
    } catch (err) {
      console.error(err);
      alert("Could not add that member. Check console.");
    } finally {
      setMemberBusy(false);
    }
  };

  const patchMember = async (id: string, body: Record<string, unknown>) => {
    setMemberBusy(true);
    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.code) setIssuedCode({ name: data.member.name, code: data.code, email: data.member.email });
      loadMembers();
    } catch (err) {
      console.error(err);
      alert("That did not work. Check console.");
    } finally {
      setMemberBusy(false);
    }
  };

  const removeMember = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? Their access code stops working immediately.`)) return;
    setMemberBusy(true);
    try {
      await fetch("/api/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadMembers();
    } finally {
      setMemberBusy(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadAll, 0);
    return () => clearTimeout(t);
  }, []);

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setAuthError("That password was not recognized.");
        return;
      }
      setPassword("");
      loadAll();
    } catch {
      setAuthError("Could not verify the password. Try again.");
    }
  };

  const handleApprove = async (submissionKey: string) => {
    try {
      const res = await fetch("/api/approve-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionKey }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      const data = await res.json();
      setSubmissions((current) => current.map((sub) =>
        sub.submissionKey === submissionKey
          ? { ...sub, submissionKey: data.newSubmissionKey, data: { ...sub.data, status: "approved" } }
          : sub,
      ));
    } catch (err) {
      console.error(err);
      alert("Failed to approve submission. Check console.");
    }
  };

  const handleDelete = async (submissionKey: string) => {
    if (!confirm("Are you sure you want to permanently delete this submission?")) return;
    try {
      const res = await fetch("/api/delete-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionKey }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setSubmissions((current) => current.filter((sub) => sub.submissionKey !== submissionKey));
    } catch (err) {
      console.error(err);
      alert("Failed to delete submission. Check console.");
    }
  };

  const startEdit = (submission: Submission) => {
    setEditingKey(submission.submissionKey);
    setEdit({
      title: submission.data.title || "",
      displayName: submission.data.displayName || "",
      firstName: submission.data.firstName || "",
      lastName: submission.data.lastName || "",
      nameDisplay: submission.data.nameDisplay || "full",
      location: submission.data.location || "",
      experienceYear: submission.data.experienceYear || "",
      privacy: submission.data.privacy || "public",
      transcript: submission.data.transcript || "",
      hashtags: (submission.data.hashtags || []).join(", "),
    });
  };
  const stopEdit = () => { setEditingKey(null); setEdit(null); };

  const saveEdit = async (submissionKey: string) => {
    if (!edit) return;
    setSaving(true);
    try {
      const updates = {
        title: edit.title,
        displayName: edit.displayName,
        firstName: edit.firstName,
        lastName: edit.lastName,
        nameDisplay: edit.nameDisplay,
        location: edit.location,
        experienceYear: edit.experienceYear,
        privacy: edit.privacy,
        transcript: edit.transcript,
        hashtags: edit.hashtags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
      };
      const res = await fetch("/api/update-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionKey, updates }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const result = await res.json();
      setSubmissions((current) => current.map((sub) =>
        sub.submissionKey === submissionKey ? { ...sub, data: result.data } : sub,
      ));
      stopEdit();
    } catch (err) {
      console.error(err);
      alert("Failed to save changes. Check console.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Ask the archive to transcribe this submission's recording.
   *
   * The result is a draft, not a transcript. It lands in machineTranscript and
   * the moderator decides whether it becomes the record — see acceptDraft.
   */
  const transcribe = async (submissionKey: string) => {
    setTranscribingKey(submissionKey);
    setTranscribeNote((n) => ({ ...n, [submissionKey]: "" }));
    setHiddenDrafts((h) => ({ ...h, [submissionKey]: false }));
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionKey }),
      });
      const result = await res.json();
      if (!res.ok) {
        // The route explains its own failures; show what it said rather than
        // a generic message the moderator can do nothing with.
        setTranscribeNote((n) => ({ ...n, [submissionKey]: result.error || `Failed (${res.status})` }));
        return;
      }
      setSubmissions((current) => current.map((sub) =>
        sub.submissionKey === submissionKey
          ? { ...sub, data: {
              ...sub.data,
              machineTranscript: result.machineTranscript,
              transcriptStatus: "ready",
              transcriptSource: "machine",
              transcriptModel: result.model,
              transcriptWarnings: result.warnings,
              transcriptError: undefined,
            } }
          : sub,
      ));
      const warned = (result.warnings || []).length;
      setTranscribeNote((n) => ({
        ...n,
        [submissionKey]: `${result.wordCount} words${result.model ? ` · ${result.model}` : ""} · draft, not the record${warned ? " — see the note below" : ""}`,
      }));
    } catch (err) {
      console.error(err);
      setTranscribeNote((n) => ({ ...n, [submissionKey]: "Could not reach the transcription service." }));
    } finally {
      setTranscribingKey(null);
    }
  };

  /** Move the machine draft into the transcript and mark it confirmed. */
  const acceptDraft = async (submissionKey: string, text: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/update-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionKey,
          updates: { transcript: text, transcriptStatus: "confirmed", transcriptSource: "machine" },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const result = await res.json();
      setSubmissions((current) => current.map((sub) =>
        sub.submissionKey === submissionKey ? { ...sub, data: result.data } : sub,
      ));
      setTranscribeNote((n) => ({ ...n, [submissionKey]: "" }));
    } catch (err) {
      console.error(err);
      alert("Could not save the transcript. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const savePerson = async (key: string, personEdit: PersonEditState) => {
    setSaving(true);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          name: personEdit.name,
          about: personEdit.about.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
          video: personEdit.video.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const result = await res.json();
      setPeople((current) => current.map((p) => (p.key === key ? { ...p, ...result.person } : p)));
    } catch (err) {
      console.error(err);
      alert("Failed to save person. Check console.");
    } finally {
      setSaving(false);
    }
  };

  // ── what each tab shows ──────────────────────────────────────────────────
  const pending = submissions.filter((s) => !isLive(s));
  const live = submissions.filter(isLive);
  const q = query.trim().toLowerCase();

  const list = useMemo(() => (tab === "live" ? live : pending)
    .filter((s) => {
      if (filter === "all") return true;
      if (filter === "media") return hasMedia(s);
      if (filter === "transcript") return hasMedia(s) && !s.data.transcript;
      return (s.data.privacy || "public") === filter;
    })
    .filter((s) => !q || hay(s).includes(q)), [tab, live, pending, filter, q]);
  const sel = list.find((s) => s.submissionKey === selectedKey) || list[0] || null;
  const editing = Boolean(sel && edit && editingKey === sel.submissionKey);

  const faces = people.filter((p) => !q || p.name.toLowerCase().includes(q));
  const face = faces.find((p) => p.key === faceKey) || faces[0] || null;
  const memberRows = members.filter((m) => !q || `${m.name} ${m.email || ""}`.toLowerCase().includes(q));
  const matchCount = tab === "faces" ? faces.length : tab === "members" ? memberRows.length : list.length;

  // j / k move the selection, Enter opens the record for editing, Esc closes
  // it — unless the keys are going into a form control.
  useEffect(() => {
    if (tab !== "queue" && tab !== "live") return undefined;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.matches("input,textarea,select")) return;
      const i = list.findIndex((s) => s.submissionKey === (sel && sel.submissionKey));
      if (e.key === "j" && i < list.length - 1) setSelectedKey(list[i + 1].submissionKey);
      if (e.key === "k" && i > 0) setSelectedKey(list[i - 1].submissionKey);
      if (e.key === "Enter" && sel && !editing) startEdit(sel);
      if (e.key === "Escape") stopEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const select = (key: string) => { setSelectedKey(key); if (editingKey !== key) stopEdit(); };

  // ── pieces ───────────────────────────────────────────────────────────────
  const renderRow = (s: Submission) => {
    const [p, pc] = privOf(s.data);
    const active = Boolean(sel && sel.submissionKey === s.submissionKey);
    const needs = hasMedia(s) && !s.data.transcript;
    return (
      <button key={s.submissionKey} type="button" className="rv-row" aria-current={active || undefined} onClick={() => select(s.submissionKey)}>
        <span className="rv-row-bar" />
        <span className="rv-row-main">
          <span className="rv-row-title">{s.data.title || "Untitled"}</span>
          <span className="rv-row-sub">{[whoOf(s.data), s.data.location, s.data.experienceYear].filter(Boolean).join(" · ") || "—"}</span>
        </span>
        <span className="rv-row-side">
          <span className={`rv-ui rv-row-priv ${pc}`}>{p}</span>
          <span className="rv-row-meta">
            {s.mediaUrl && <span className="rv-glyph-media" title={s.mediaType || "media"}>{s.mediaType === "audio" ? "〰" : "◉"}</span>}
            {needs && <span className="rv-glyph-needs" title="Needs transcript">◌</span>}
            <span>{shortDate(s.lastModified)}</span>
          </span>
        </span>
      </button>
    );
  };

  const renderMachine = (s: Submission) => {
    const d = s.data;
    const canTranscribe = Boolean(d.audioKey || d.recordingMode === "audio");
    const busy = transcribingKey === s.submissionKey;
    const note = transcribeNote[s.submissionKey];
    const draft = d.machineTranscript && !hiddenDrafts[s.submissionKey] ? d.machineTranscript : null;
    if (!busy && !draft && !note && !(d.transcriptStatus === "confirmed" && d.transcriptSource === "machine")) return null;
    const status = busy ? "Transcribing…"
      : d.transcriptStatus === "confirmed" && d.transcriptSource === "machine" && !draft ? "Confirmed — moved into the record"
      : note || (draft ? "draft, not the record" : "");
    return (
      <div className="rv-machine">
        <div className="rv-machine-head">
          <span className="rv-ui">Machine transcript</span>
          {status && <span className="rv-machine-note">{status}</span>}
        </div>
        {d.transcriptWarnings && d.transcriptWarnings.length > 0 && draft && (
          <div className="rv-machine-warn">{d.transcriptWarnings.map((w, i) => <div key={i}>{w}</div>)}</div>
        )}
        {draft && (
          <>
            <p className="rv-machine-draft">{draft}</p>
            <div className="rv-machine-actions">
              <button type="button" className="rv-cta rv-cta--sm" disabled={saving} onClick={() => acceptDraft(s.submissionKey, draft)}>Use as transcript</button>
              <button type="button" className="rv-quiet" disabled={saving} onClick={() => startEdit(s)}>Edit before using</button>
              {canTranscribe && <button type="button" className="rv-quiet" disabled={busy || saving} onClick={() => transcribe(s.submissionKey)}>Transcribe again</button>}
              <button type="button" className="rv-quiet" onClick={() => setHiddenDrafts((h) => ({ ...h, [s.submissionKey]: true }))}>Discard</button>
            </div>
            <p className="rv-machine-fine">A draft, not a record. Nothing here is published until you use it.</p>
          </>
        )}
      </div>
    );
  };

  const renderDetail = (s: Submission) => {
    const d = s.data;
    const [p, pc] = privOf(d);
    const live = isLive(s);
    const canTranscribe = Boolean(d.audioKey || d.recordingMode === "audio");
    const busy = transcribingKey === s.submissionKey;
    const named = Boolean(edit && (edit.firstName || edit.lastName));
    return (
      <article className="rv-detail">
        <div className="rv-detail-body rv-thin">
          <div className="rv-detail-head">
            <p className="rv-eyebrow">
              <span>{live ? (d.privacy === "archive" ? "Approved · hidden" : "Approved · live") : "Pending review"}</span>
              {d.id && <code title="Submission ID — what a contributor quotes to have this removed">{d.id}</code>}
              {d.privacy === "community" && <span className="rv-badge">Community only</span>}
              {d.adsOk && <span className="rv-badge" title="The contributor is willing to have this story or photo used in Honeycomb advertising">OK for advertising</span>}
              {d.recordingMode === "video" && d.mediaKey && (/-web\.mp4$/i.test(d.mediaKey)
                ? <span className="rv-badge" title="A copy encoded for streaming plays on the site; the original is kept">Streaming copy</span>
                : <span className="rv-badge" style={{ color: "var(--muted)", borderColor: "rgba(198,169,130,.35)" }} title={live ? "The encoder picks this up within about fifteen minutes of approval" : "A streaming copy is made after approval"}>{live ? "Original file · copy pending" : "Original file"}</span>)}
            </p>
            <span className="rv-ui rv-submitted">Submitted {formatDate(s.lastModified)}</span>
          </div>

          {!editing || !edit ? (
            <>
              <h1 className="rv-title">{d.title || "Untitled"}</h1>
              <dl className="rv-meta">
                <div><dt>Submitted by</dt><dd>{whoOf(d) || "—"}</dd></div>
                <div><dt>Where</dt><dd>{d.location || "Unknown"}</dd></div>
                <div><dt>When</dt><dd>{d.experienceYear || "Unknown"}</dd></div>
                <div><dt>Visibility</dt><dd className={pc}>{p}</dd></div>
              </dl>
              <div className={`rv-content${hasMedia(s) ? " rv-content--media" : ""}`}>
                <div>
                  {d.transcript ? (
                    <div className="rv-story">{paragraphs(d.transcript).map((pp, i) => <p key={i}>{pp}</p>)}</div>
                  ) : (
                    <p className="rv-story--none">No written account — a recording stands in for it.</p>
                  )}
                  {d.hashtags && d.hashtags.length > 0 && (
                    <div className="rv-tags">{d.hashtags.map((tag) => <span key={tag} className="rv-tag">#{tag}</span>)}</div>
                  )}
                  {renderMachine(s)}
                </div>
                {hasMedia(s) && (
                  <aside className="rv-media">
                    <span className="rv-label">Attached media</span>
                    {s.photoUrl && <img className="rv-media-photo" src={s.photoUrl} alt="Attached photo" />}
                    {s.mediaUrl && (s.mediaType === "video" || s.mediaType === "audio" || s.mediaType === "image") && (
                      <button type="button" className="rv-media-box" onClick={() => setActiveMedia({ url: s.mediaUrl as string, type: s.mediaType })}>
                        <span><b>▶</b>{s.mediaType === "image" ? "Open image" : `Play ${s.mediaType}`}</span>
                      </button>
                    )}
                    {s.mediaUrl && <a className="rv-ui" href={s.mediaUrl} target="_blank" rel="noreferrer">Download ↓</a>}
                  </aside>
                )}
              </div>
            </>
          ) : (
            <div className="rv-edit">
              <Field label="Title" className="rv-span">
                <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
              </Field>
              <Field label="First name">
                <input value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} placeholder="Jane" />
              </Field>
              <Field label="Last name">
                <input value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} placeholder="Doe" />
              </Field>
              <Field label="Show name as">
                <select value={edit.nameDisplay} onChange={(e) => setEdit({ ...edit, nameDisplay: e.target.value })}>
                  {NAME_DISPLAY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Visibility">
                <select value={edit.privacy} onChange={(e) => setEdit({ ...edit, privacy: e.target.value })}>
                  <option value="public">Public archive</option>
                  <option value="community">Community only</option>
                  <option value="archive">Strictly archived</option>
                </select>
              </Field>
              {named ? (
                <div className="rv-reads rv-span2">Cell reads: <strong>{formatDisplayName(edit.firstName, edit.lastName, edit.nameDisplay)}</strong></div>
              ) : (
                <Field label="Display name (no first / last on this record)" className="rv-span2">
                  <input value={edit.displayName} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} placeholder="e.g. John Berg" />
                </Field>
              )}
              <Field label="Place">
                <input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />
              </Field>
              <Field label="Year">
                <input value={edit.experienceYear} onChange={(e) => setEdit({ ...edit, experienceYear: e.target.value })} />
              </Field>
              <Field label="Transcript" className="rv-span">
                <textarea rows={10} value={edit.transcript} onChange={(e) => setEdit({ ...edit, transcript: e.target.value })} />
              </Field>
              <Field label="Tags (comma-separated)" className="rv-span">
                <input value={edit.hashtags} onChange={(e) => setEdit({ ...edit, hashtags: e.target.value })} placeholder="orb, dc, daytime" />
              </Field>
            </div>
          )}
        </div>

        <footer className="rv-detail-foot">
          {editing ? (
            <>
              <button type="button" className="rv-cta" disabled={saving} onClick={() => saveEdit(s.submissionKey)}>{saving ? "Saving…" : "Save changes"}</button>
              <button type="button" className="rv-quiet" disabled={saving} onClick={stopEdit}>Cancel</button>
            </>
          ) : (
            <>
              {!live && <button type="button" className="rv-cta" onClick={() => handleApprove(s.submissionKey)}>Approve &amp; publish<span aria-hidden="true">↗</span></button>}
              <button type="button" className="rv-quiet" onClick={() => startEdit(s)}>Edit</button>
              {canTranscribe && !d.machineTranscript && (
                <button type="button" className="rv-quiet" disabled={busy || saving} onClick={() => transcribe(s.submissionKey)}>{busy ? "Transcribing…" : "Transcribe recording"}</button>
              )}
            </>
          )}
          <span className="rv-spacer" />
          <button type="button" className="rv-ui rv-danger" onClick={() => handleDelete(s.submissionKey)}>Delete permanently</button>
        </footer>
      </article>
    );
  };

  const renderQueue = () => (
    <div className="rv-queue">
      <section className="rv-list">
        <div className="rv-filters rv-thin">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" className="rv-ui rv-filter" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <div className="rv-rows rv-thin">
          {list.length === 0 && (
            <p className="rv-empty">{tab === "queue" && !q && filter === "all" ? "Nothing waiting. New submissions land here." : "No records match."}</p>
          )}
          {list.map(renderRow)}
        </div>
        <div className="rv-ui rv-list-foot">
          <span>{list.length} record{list.length === 1 ? "" : "s"}</span>
          <span>j / k · Enter edits · Esc</span>
        </div>
      </section>
      {sel ? renderDetail(sel) : <div className="rv-none">Select a record</div>}
    </div>
  );

  const renderFaces = () => (
    <div className="rv-faces">
      <div className="rv-faces-grid rv-thin">
        {faces.length === 0 && <p className="rv-empty">{people.length ? "No faces match." : "Could not load the community faces."}</p>}
        {faces.map((person) => (
          <button key={person.key} type="button" className="rv-face" aria-pressed={Boolean(face && face.key === person.key)} onClick={() => setFaceKey(person.key)}>
            <span className="rv-hex">
              <img src="/assets/cell-gold.png" alt="" />
              <img className="rv-hex-face" src={`/uploads/${person.key}.webp`} alt={person.name} />
            </span>
            <span className="rv-face-name">{person.name}</span>
            <span className="rv-ui rv-face-sub">{person.video ? "◉ video" : "no video yet"}</span>
          </button>
        ))}
      </div>
      {face && <FaceEditor key={face.key} person={face} saving={saving} onSave={savePerson} />}
    </div>
  );

  const codeMail = (c: { name: string; code: string; email?: string }) => c.email
    ? `mailto:${c.email}?subject=${encodeURIComponent("Your Honeycomb access code")}&body=${encodeURIComponent(
      `Hello ${c.name},\n\nHere is your access code for Project Honeycomb: ${c.code}\n\nGo to ${window.location.origin} and enter it where the gate asks for a password or access code. The code is yours alone; please keep it to yourself.\n\nThe Honeycomb team`,
    )}`
    : null;

  const renderMembers = () => (
    <div className="rv-members rv-thin" id="members">
      <div>
        <p className="rv-intro">
          Members unlock the archive with a personal access code instead of the shared password, and can see stories marked
          &ldquo;Community only&rdquo;. Codes are shown once, when issued. Lost codes are replaced, not looked up.
        </p>
        {memberRows.length === 0 ? (
          <p className="rv-empty" style={{ margin: 0 }}>{members.length ? "No members match." : "No members yet."}</p>
        ) : (
          <table className="rv-table">
            <thead>
              <tr><th>Member</th><th>Note</th><th>Added</th><th>Last seen</th><th></th></tr>
            </thead>
            <tbody>
              {memberRows.map((m) => (
                <tr key={m.id} style={{ opacity: m.disabledAt ? 0.6 : 1 }}>
                  <td>
                    <div className="rv-member-name">{m.name}{m.disabledAt && <span className="rv-ui rv-pill">disabled</span>}</div>
                    <div className="rv-member-mail">{m.email || "—"}</div>
                  </td>
                  <td className="rv-dim">{m.note || "—"}</td>
                  <td className="rv-dim rv-nowrap">{new Date(m.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                  <td className="rv-dim rv-nowrap">{m.lastSeenAt ? new Date(m.lastSeenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "never"}</td>
                  <td className="rv-nowrap rv-right">
                    <span className="rv-actions">
                      <button type="button" className="rv-quiet rv-quiet--sm" disabled={memberBusy} onClick={() => patchMember(m.id, { action: "regenerate" })}>New code</button>
                      <button type="button" className="rv-quiet rv-quiet--sm" disabled={memberBusy} onClick={() => patchMember(m.id, { disabled: !m.disabledAt })}>{m.disabledAt ? "Enable" : "Disable"}</button>
                      <button type="button" className="rv-quiet rv-quiet--sm rv-quiet--danger" disabled={memberBusy} onClick={() => removeMember(m.id, m.name)}>Remove</button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="rv-col">
        {issuedCode && (
          <div className="rv-issued">
            <span className="rv-ui">Access code for {issuedCode.name}</span>
            <div className="rv-issued-row">
              <code>{issuedCode.code}</code>
              <button type="button" className="rv-outline" onClick={() => navigator.clipboard?.writeText(issuedCode.code)}>Copy</button>
              {codeMail(issuedCode) && <a className="rv-outline" href={codeMail(issuedCode) as string}>Email it to {issuedCode.name}</a>}
              <button type="button" className="rv-quiet" onClick={() => setIssuedCode(null)}>Done</button>
            </div>
            <p>Send it to them privately. It is not stored in a readable form and cannot be shown again.</p>
          </div>
        )}
        <form className="rv-form" onSubmit={addMember}>
          <span className="rv-ui">Add a member</span>
          <Field label="Name">
            <input value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Full name" required />
          </Field>
          <Field label="Email (optional)">
            <input value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} placeholder="name@example.com" />
          </Field>
          <Field label="Note (optional)">
            <input value={newMember.note} onChange={(e) => setNewMember({ ...newMember, note: e.target.value })} placeholder="Why they have access" />
          </Field>
          <div>
            <button type="submit" className="rv-cta" disabled={memberBusy}>Issue a code<span aria-hidden="true">↗</span></button>
          </div>
        </form>
      </div>
    </div>
  );

  const counts: Record<Tab, number> = { queue: pending.length, live: live.length, faces: people.length, members: members.length };
  const ready = !loading && !error && !authRequired;

  return (
    <div className="rv-shell">
      <header className="rv-bar">
        <div className="rv-brand">
          <Link href="/" className="rv-wordmark">HONEYCOMB</Link>
          <span className="rv-ui">Review</span>
        </div>
        <nav className="rv-tabs rv-thin" aria-label="Dashboard sections">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className="rv-tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}<span className="rv-tab-n">{ready ? counts[id] : "·"}</span>
            </button>
          ))}
          <Link href="/review/todo" className="rv-ui rv-tablink">To Do <span aria-hidden="true">→</span></Link>
        </nav>
        <div className="rv-tools">
          <div className="rv-search">
            <span className="rv-search-glyph" aria-hidden="true">⌕</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, name, place, tag" aria-label="Search the dashboard" />
            {query && (
              <>
                <span className="rv-search-n">{matchCount}</span>
                <button type="button" className="rv-search-x" aria-label="Clear search" onClick={() => setQuery("")}>×</button>
              </>
            )}
          </div>
          <span className="rv-chip"><i aria-hidden="true" />Moderator</span>
          <Link href="/" className="rv-ui rv-back">← Back to site</Link>
        </div>
      </header>

      {loading && <div className="rv-status">Loading securely…</div>}
      {error && !loading && <div className="rv-status rv-err">{error}</div>}

      {authRequired && !loading && (
        <div className="rv-center">
          <form onSubmit={handleUnlock} className="rv-gate">
            <h2>Moderator access</h2>
            <p>Enter the moderator password to open the dashboard.</p>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
            </Field>
            {authError && <div className="rv-err">{authError}</div>}
            <div><button type="submit" className="rv-cta">Unlock<span aria-hidden="true">→</span></button></div>
          </form>
        </div>
      )}

      {ready && (tab === "queue" || tab === "live") && renderQueue()}
      {ready && tab === "faces" && renderFaces()}
      {ready && tab === "members" && renderMembers()}

      {activeMedia && (
        <div className="rv-lightbox" onClick={() => setActiveMedia(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <button type="button" className="rv-quiet" onClick={() => setActiveMedia(null)}>Close ×</button>
            {activeMedia.type === "audio" ? (
              <audio src={activeMedia.url} controls autoPlay />
            ) : activeMedia.type === "image" ? (
              <img src={activeMedia.url} alt="Attached media" />
            ) : (
              <video src={activeMedia.url} controls autoPlay />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
