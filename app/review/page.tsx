"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDisplayName, NAME_DISPLAY_OPTIONS } from "../lib/name";
import { SOURCES } from "../lib/source";

interface SubmissionData {
  id: string;
  title: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  nameDisplay?: string;
  consentAt?: string;
  location: string;
  experienceYear: string;
  experienceType?: string;
  transcript: string;
  privacy?: string;
  source?: string;
  hashtags?: string[];
  status?: string;
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
  source: string;
  transcript: string;
  hashtags: string;
}

interface Person {
  key: string;
  name: string;
  about: string[];
  video: string | null;
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

interface PersonEditState {
  name: string;
  about: string;
  video: string;
}

export default function ReviewDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [personEditKey, setPersonEditKey] = useState<string | null>(null);
  const [personEdit, setPersonEdit] = useState<PersonEditState | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [newMember, setNewMember] = useState({ name: "", email: "", note: "" });
  // which submission is being transcribed right now, and anything it came back with
  const [transcribingKey, setTranscribingKey] = useState<string | null>(null);
  const [transcribeNote, setTranscribeNote] = useState<Record<string, string>>({});
  const [issuedCode, setIssuedCode] = useState<{ name: string; code: string } | null>(null);
  const [memberBusy, setMemberBusy] = useState(false);

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
      setIssuedCode({ name: data.member.name, code: data.code });
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
      if (data.code) setIssuedCode({ name: data.member.name, code: data.code });
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

  useEffect(loadAll, []);

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
        body: JSON.stringify({ submissionKey })
      });
      if (!res.ok) throw new Error("Failed to approve");
      const data = await res.json();
      setSubmissions(current => current.map(sub =>
        sub.submissionKey === submissionKey
          ? { ...sub, submissionKey: data.newSubmissionKey, data: { ...sub.data, status: "approved" } }
          : sub
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
        body: JSON.stringify({ submissionKey })
      });
      if (!res.ok) throw new Error("Failed to delete");
      setSubmissions(current => current.filter(sub => sub.submissionKey !== submissionKey));
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
      source: submission.data.source || "",
      transcript: submission.data.transcript || "",
      hashtags: (submission.data.hashtags || []).join(", "),
    });
  };

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
        source: edit.source,
        transcript: edit.transcript,
        hashtags: edit.hashtags.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean),
      };
      const res = await fetch("/api/update-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionKey, updates })
      });
      if (!res.ok) throw new Error("Failed to save");
      const result = await res.json();
      setSubmissions(current => current.map(sub =>
        sub.submissionKey === submissionKey ? { ...sub, data: result.data } : sub
      ));
      setEditingKey(null);
      setEdit(null);
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
    setTranscribeNote(n => ({ ...n, [submissionKey]: "" }));
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
        setTranscribeNote(n => ({ ...n, [submissionKey]: result.error || `Failed (${res.status})` }));
        return;
      }
      setSubmissions(current => current.map(sub =>
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
          : sub
      ));
      const warned = (result.warnings || []).length;
      setTranscribeNote(n => ({
        ...n,
        [submissionKey]: `${result.wordCount} words${warned ? " — see the note below" : ""}`,
      }));
    } catch (err) {
      console.error(err);
      setTranscribeNote(n => ({ ...n, [submissionKey]: "Could not reach the transcription service." }));
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
      setSubmissions(current => current.map(sub =>
        sub.submissionKey === submissionKey ? { ...sub, data: result.data } : sub
      ));
      setTranscribeNote(n => ({ ...n, [submissionKey]: "" }));
    } catch (err) {
      console.error(err);
      alert("Could not save the transcript. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const savePerson = async (key: string) => {
    if (!personEdit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          name: personEdit.name,
          about: personEdit.about.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
          video: personEdit.video.trim() || null,
        })
      });
      if (!res.ok) throw new Error("Failed to save");
      const result = await res.json();
      setPeople(current => current.map(p => (p.key === key ? { ...p, ...result.person } : p)));
      setPersonEditKey(null);
      setPersonEdit(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save person. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.6rem", borderRadius: "4px",
    border: "1px solid var(--line, rgba(128,128,128,0.35))",
    backgroundColor: "rgba(0,0,0,0.15)", color: "inherit", font: "inherit", fontSize: "0.9rem",
  };
  const labelStyle: React.CSSProperties = { fontSize: "0.72rem", opacity: 0.6, display: "block", margin: "0 0 0.25rem" };

  const pending = submissions.filter(s => !s.submissionKey.startsWith("approved/"));
  const approved = submissions.filter(s => s.submissionKey.startsWith("approved/"));

  const renderPersonCard = (person: Person) => {
    const isEditing = personEditKey === person.key && personEdit;
    return (
      <div key={person.key} style={{ display: "flex", flexDirection: "column", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", backgroundColor: "rgba(242,191,73,0.04)" }}>
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid var(--line)", display: "flex", gap: "1rem", alignItems: "center" }}>
          <img src={`/uploads/${person.key}.webp`} alt={person.name} style={{ width: "64px", height: "54px", objectFit: "contain", flexShrink: 0 }} />
          {isEditing ? (
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>Name (shown on the cell and panel)</span>
              <input style={inputStyle} value={personEdit.name} onChange={e => setPersonEdit({ ...personEdit, name: e.target.value })} />
            </div>
          ) : (
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{person.name}</h3>
              <div style={{ fontSize: "0.8rem", opacity: 0.55, marginTop: "0.2rem" }}>
                {person.video ? `🎬 ${person.video}` : "No video yet"}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "1.2rem 1.5rem", flex: 1 }}>
          {isEditing ? (
            <div style={{ display: "grid", gap: "0.8rem" }}>
              <div>
                <span style={labelStyle}>Panel text (separate paragraphs with a blank line)</span>
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={7} value={personEdit.about} onChange={e => setPersonEdit({ ...personEdit, about: e.target.value })} />
              </div>
              <div>
                <span style={labelStyle}>Video path or URL (e.g. /videos/john-berg.mp4 — blank for none)</span>
                <input style={inputStyle} value={personEdit.video} onChange={e => setPersonEdit({ ...personEdit, video: e.target.value })} />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "0.9rem", lineHeight: 1.55, opacity: 0.85, display: "grid", gap: "0.6rem" }}>
              {person.about.map((p, i) => <p key={i} style={{ margin: 0 }}>{p}</p>)}
            </div>
          )}
        </div>
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--line)", display: "flex", gap: "0.5rem", backgroundColor: "rgba(0,0,0,0.1)" }}>
          {isEditing ? (
            <>
              <button onClick={() => savePerson(person.key)} disabled={saving}
                      style={{ flex: 1, padding: "0.6rem", border: "none", borderRadius: "4px", backgroundColor: "#007067", color: "#fff", cursor: "pointer", fontWeight: "500", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button onClick={() => { setPersonEditKey(null); setPersonEdit(null); }} disabled={saving}
                      style={{ flex: 1, padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "transparent", color: "inherit", cursor: "pointer" }}>
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => { setPersonEditKey(person.key); setPersonEdit({ name: person.name, about: person.about.join("\n\n"), video: person.video || "" }); }}
              style={{ flex: 1, padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "transparent", color: "inherit", cursor: "pointer", fontWeight: "500" }}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCard = (submission: Submission) => {
    const isApproved = submission.submissionKey.startsWith("approved/");
    const { title, displayName, location, experienceYear, transcript, hashtags, privacy, source } = submission.data;
    const isEditing = editingKey === submission.submissionKey && edit;

    return (
      <div key={submission.submissionKey} style={{ display: "flex", flexDirection: "column", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", backgroundColor: isApproved ? "rgba(0, 255, 100, 0.05)" : "var(--card-bg, rgba(0,0,0,0.02))" }}>

        {/* Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--line)" }}>
          {isEditing ? (
            <div style={{ display: "grid", gap: "0.8rem" }}>
              <div>
                <span style={labelStyle}>Title</span>
                <input style={inputStyle} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <div>
                      <span style={labelStyle}>First name</span>
                      <input style={inputStyle} value={edit.firstName} onChange={e => setEdit({ ...edit, firstName: e.target.value })} placeholder="Jane" />
                    </div>
                    <div>
                      <span style={labelStyle}>Last name</span>
                      <input style={inputStyle} value={edit.lastName} onChange={e => setEdit({ ...edit, lastName: e.target.value })} placeholder="Doe" />
                    </div>
                  </div>
                  <div>
                    <span style={labelStyle}>Show name as</span>
                    <select style={inputStyle} value={edit.nameDisplay} onChange={e => setEdit({ ...edit, nameDisplay: e.target.value })}>
                      {NAME_DISPLAY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  {(edit.firstName || edit.lastName) ? (
                    <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                      Cell reads: <strong>{formatDisplayName(edit.firstName, edit.lastName, edit.nameDisplay)}</strong>
                    </div>
                  ) : (
                    <div>
                      <span style={labelStyle}>Display name (no first/last on this record)</span>
                      <input style={inputStyle} value={edit.displayName} onChange={e => setEdit({ ...edit, displayName: e.target.value })} placeholder="e.g. John Berg" />
                    </div>
                  )}
                </div>
                <div>
                  <span style={labelStyle}>Privacy</span>
                  <select style={inputStyle} value={edit.privacy} onChange={e => setEdit({ ...edit, privacy: e.target.value })}>
                    <option value="public">Public archive</option>
                    <option value="community">Community only</option>
                    <option value="archive">Strictly archived (hidden from site)</option>
                  </select>
                  <span style={{ ...labelStyle, marginTop: "0.6rem" }}>Source</span>
                  <select style={inputStyle} value={edit.source} onChange={e => setEdit({ ...edit, source: e.target.value })}>
                    {SOURCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.25rem" }}>
                    Sets the frame on the story&rsquo;s cell: Rice silver and navy for Archives of the Impossible, gold otherwise.
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div>
                  <span style={labelStyle}>Place</span>
                  <input style={inputStyle} value={edit.location} onChange={e => setEdit({ ...edit, location: e.target.value })} />
                </div>
                <div>
                  <span style={labelStyle}>Year</span>
                  <input style={inputStyle} value={edit.experienceYear} onChange={e => setEdit({ ...edit, experienceYear: e.target.value })} />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "600" }}>{title || "Untitled"}</h3>
                {isApproved && (
                  <div style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "100px", backgroundColor: privacy === "archive" ? "#666" : "#007067", color: "#fff", whiteSpace: "nowrap" }}>
                    {privacy === "archive" ? "Approved · hidden" : "Approved"}
                  </div>
                )}
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.7, display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {submission.data.id && (
                  <span title="Submission ID — what a contributor quotes to have this removed">
                    🆔 <code style={{ userSelect: "all", letterSpacing: "0.06em" }}>{submission.data.id}</code>
                  </span>
                )}
                {displayName && <span>👤 {displayName}</span>}
                <span>⌖ {location || "Unknown"}</span>
                <span>📅 {experienceYear || "Unknown"}</span>
                {privacy && <span>🔒 {privacy}</span>}
                {source && <span>◈ {SOURCES.find((o) => o.value === source)?.label || source}</span>}
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.5, marginTop: "0.5rem" }}>
                Submitted: {formatDate(submission.lastModified)}
              </div>
            </>
          )}
        </div>

        {/* Transcript */}
        <div style={{ padding: "1.5rem", flex: 1 }}>
          {isEditing ? (
            <div style={{ display: "grid", gap: "0.8rem" }}>
              <div>
                <span style={labelStyle}>Transcript</span>
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={8} value={edit.transcript} onChange={e => setEdit({ ...edit, transcript: e.target.value })} />
              </div>
              <div>
                <span style={labelStyle}>Tags (comma-separated)</span>
                <input style={inputStyle} value={edit.hashtags} onChange={e => setEdit({ ...edit, hashtags: e.target.value })} placeholder="orb, dc, daytime" />
              </div>
            </div>
          ) : (
            <>
              {transcript ? (
                <p style={{ margin: "0 0 1rem 0", lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                  &ldquo;{transcript}&rdquo;
                </p>
              ) : (
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", opacity: 0.55, fontStyle: "italic" }}>
                  No transcript yet — this account is only a recording so far.
                </p>
              )}

              {/* ── machine transcription ───────────────────────────────── */}
              {(() => {
                const d = submission.data;
                const canTranscribe = Boolean(d.audioKey || d.recordingMode === "audio");
                const busy = transcribingKey === submission.submissionKey;
                const note = transcribeNote[submission.submissionKey];
                if (!canTranscribe && !d.machineTranscript) return null;
                return (
                  <div style={{ margin: "0 0 1rem 0", padding: "0.9rem", border: "1px solid var(--line)", borderRadius: "8px", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap" }}>
                      <span style={{ ...labelStyle, margin: 0 }}>Machine transcript</span>
                      {canTranscribe && (
                        <button
                          onClick={() => transcribe(submission.submissionKey)}
                          disabled={busy || saving}
                          style={{ background: "rgba(242,191,73,0.14)", color: "var(--gold)", border: "1px solid var(--line)", padding: "0.3rem 0.75rem", borderRadius: "100px", cursor: busy ? "wait" : "pointer", fontSize: "0.78rem" }}
                        >
                          {busy ? "Transcribing…" : d.machineTranscript ? "Transcribe again" : "Transcribe recording"}
                        </button>
                      )}
                      {d.transcriptStatus === "confirmed" && d.transcriptSource === "machine" && (
                        <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>confirmed</span>
                      )}
                      {note && <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>{note}</span>}
                    </div>

                    {d.transcriptWarnings && d.transcriptWarnings.length > 0 && (
                      <div style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "#f0b95c", lineHeight: 1.5 }}>
                        {d.transcriptWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                      </div>
                    )}

                    {d.machineTranscript && (
                      <>
                        <p style={{ margin: "0.7rem 0 0.6rem", lineHeight: 1.6, fontSize: "0.9rem", opacity: 0.9, whiteSpace: "pre-wrap" }}>
                          {d.machineTranscript}
                        </p>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            onClick={() => acceptDraft(submission.submissionKey, d.machineTranscript as string)}
                            disabled={saving}
                            style={{ background: "var(--gold)", color: "#1A0F06", border: "none", padding: "0.35rem 0.8rem", borderRadius: "100px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}
                          >
                            Use as transcript
                          </button>
                          <button
                            onClick={() => startEdit(submission)}
                            disabled={saving}
                            style={{ background: "transparent", color: "var(--gold)", border: "1px solid var(--line)", padding: "0.35rem 0.8rem", borderRadius: "100px", cursor: "pointer", fontSize: "0.78rem" }}
                          >
                            Edit before using
                          </button>
                        </div>
                        <p style={{ margin: "0.6rem 0 0", fontSize: "0.72rem", opacity: 0.5, lineHeight: 1.5 }}>
                          A draft, not a record. Nothing here is published until you use it.
                          {d.transcriptModel ? ` (${d.transcriptModel})` : ""}
                        </p>
                      </>
                    )}
                  </div>
                );
              })()}
              {hashtags && hashtags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {hashtags.map(tag => (
                    <span key={tag} style={{ backgroundColor: "var(--line)", padding: "0.2rem 0.6rem", borderRadius: "100px", fontSize: "0.75rem", opacity: 0.8 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Media Section */}
        {(submission.mediaUrl || submission.photoUrl) && (
          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--line)", backgroundColor: "rgba(255,255,255,0.02)" }}>
            <h4 style={{ margin: "0 0 0.8rem 0", fontSize: "0.9rem", opacity: 0.7 }}>Attached Media</h4>
            <div style={{ display: "flex", gap: "1rem", overflowX: "auto" }}>
              {submission.photoUrl && (
                <div style={{ flexShrink: 0, width: "100px", height: "100px", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--line)" }}>
                  <img src={submission.photoUrl} alt="Attached" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              {submission.mediaUrl && (
                <div style={{ flexShrink: 0, width: "160px", height: "100px", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--line)", position: "relative", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {submission.mediaType === "video" ? (
                    <>
                      <video src={submission.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
                      <button onClick={() => setActiveMedia(submission.mediaUrl)} style={{ position: "absolute", background: "rgba(0,0,0,0.6)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "0.4rem 0.8rem", borderRadius: "20px", cursor: "pointer", fontSize: "0.8rem" }}>▶ Play Video</button>
                    </>
                  ) : submission.mediaType === "audio" ? (
                    <button onClick={() => setActiveMedia(submission.mediaUrl)} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "0.4rem 0.8rem", borderRadius: "20px", cursor: "pointer", fontSize: "0.8rem" }}>▶ Play Audio</button>
                  ) : (
                    <a href={submission.mediaUrl} target="_blank" rel="noreferrer" style={{ color: "white", fontSize: "0.8rem" }}>Download Media</a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--line)", display: "flex", gap: "0.5rem", backgroundColor: "rgba(0,0,0,0.1)" }}>
          {isEditing ? (
            <>
              <button
                onClick={() => saveEdit(submission.submissionKey)}
                disabled={saving}
                style={{ flex: 1, padding: "0.6rem", border: "none", borderRadius: "4px", backgroundColor: "#007067", color: "#fff", cursor: "pointer", fontWeight: "500", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => { setEditingKey(null); setEdit(null); }}
                disabled={saving}
                style={{ flex: 1, padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "transparent", color: "inherit", cursor: "pointer" }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {!isApproved && (
                <button
                  onClick={() => handleApprove(submission.submissionKey)}
                  style={{ flex: 1, padding: "0.6rem", border: "none", borderRadius: "4px", backgroundColor: "#007067", color: "#fff", cursor: "pointer", fontWeight: "500" }}
                >
                  Approve
                </button>
              )}
              <button
                onClick={() => startEdit(submission)}
                style={{ flex: 1, padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "transparent", color: "inherit", cursor: "pointer", fontWeight: "500" }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(submission.submissionKey)}
                style={{ flex: 1, padding: "0.6rem", border: "none", borderRadius: "4px", backgroundColor: "#d9534f", color: "#fff", cursor: "pointer", fontWeight: "500" }}
              >
                Delete
              </button>
            </>
          )}
        </div>

      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "600", margin: "0 0 0.5rem 0" }}>Unified Review Dashboard</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>Secure archive of uploaded anomalous experiences (Text + Media).</p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <Link href="/review/todo" style={{ padding: "0.5rem 1rem", border: "1px solid var(--line)", borderRadius: "4px", textDecoration: "none", color: "inherit" }}>
            To Do
          </Link>
          <Link href="/" style={{ padding: "0.5rem 1rem", border: "1px solid var(--line)", borderRadius: "4px", textDecoration: "none", color: "inherit" }}>
            &larr; Back to Site
          </Link>
        </div>
      </header>

      {loading && <div style={{ opacity: 0.5 }}>Loading securely...</div>}
      {error && <div style={{ color: "#d9534f" }}>{error}</div>}

      {authRequired && !loading && (
        <form onSubmit={handleUnlock} style={{ maxWidth: "360px", margin: "4rem auto", padding: "2rem", border: "1px solid var(--line)", borderRadius: "8px", display: "grid", gap: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>Moderator access</h2>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.65 }}>Enter the archive password to open the review dashboard.</p>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus
            style={inputStyle} placeholder="Password"
          />
          {authError && <div style={{ color: "#d9534f", fontSize: "0.85rem" }}>{authError}</div>}
          <button type="submit" style={{ padding: "0.7rem", border: "none", borderRadius: "4px", backgroundColor: "#007067", color: "#fff", cursor: "pointer", fontWeight: 500 }}>
            Unlock
          </button>
        </form>
      )}

      {!loading && !error && !authRequired && (
        <>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 1rem" }}>Pending review ({pending.length})</h2>
          {pending.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7, marginBottom: "2.5rem" }}>
              No submissions pending review.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "2rem", marginBottom: "2.5rem" }}>
              {pending.map(renderCard)}
            </div>
          )}

          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 0.4rem" }}>Approved &amp; live ({approved.length})</h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", opacity: 0.6 }}>
            These appear as cells in the honeycomb. Edits publish immediately; set privacy to &ldquo;Strictly archived&rdquo; to hide one from the site without deleting it.
          </p>
          {approved.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7, marginBottom: "2.5rem" }}>
              Nothing approved yet.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "2rem", marginBottom: "2.5rem" }}>
              {approved.map(renderCard)}
            </div>
          )}

          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 0.4rem" }}>Community faces ({people.length})</h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", opacity: 0.6 }}>
            The named cells in the honeycomb. Edit the name, the panel text, or point one at a video — changes go live immediately.
          </p>
          {people.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7, marginBottom: "2.5rem" }}>
              Could not load the community faces.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "2rem", marginBottom: "2.5rem" }}>
              {people.map(renderPersonCard)}
            </div>
          )}

          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 0.4rem" }}>Members ({members.length})</h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", opacity: 0.6 }}>
            Approved members sign in at the gate with their own access code and can see stories marked &ldquo;Community only&rdquo;.
            A code is shown once, here, when you create it &mdash; pass it on however you like. Lost codes are replaced, not looked up.
          </p>

          {issuedCode && (
            <div style={{ marginBottom: "1.5rem", padding: "1.2rem 1.5rem", border: "1px solid #007067", borderRadius: "8px", backgroundColor: "rgba(0,112,103,0.12)" }}>
              <div style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                Access code for <strong>{issuedCode.name}</strong> — copy it now, it will not be shown again:
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <code style={{ fontSize: "1.5rem", letterSpacing: "0.12em", fontWeight: 600 }}>{issuedCode.code}</code>
                <button
                  onClick={() => navigator.clipboard?.writeText(issuedCode.code)}
                  style={{ padding: "0.45rem 0.9rem", border: "1px solid var(--line)", borderRadius: "4px", background: "transparent", color: "inherit", cursor: "pointer" }}
                >Copy</button>
                <button
                  onClick={() => setIssuedCode(null)}
                  style={{ padding: "0.45rem 0.9rem", border: "0", borderRadius: "4px", background: "#007067", color: "#fff", cursor: "pointer" }}
                >Done</button>
              </div>
            </div>
          )}

          <form onSubmit={addMember} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1.5rem" }}>
            <div style={{ flex: "1 1 200px" }}>
              <span style={labelStyle}>Name</span>
              <input style={inputStyle} value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Jane Okafor" required />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <span style={labelStyle}>Email (optional)</span>
              <input style={inputStyle} value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} placeholder="jane@example.com" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <span style={labelStyle}>Note (optional)</span>
              <input style={inputStyle} value={newMember.note} onChange={e => setNewMember({ ...newMember, note: e.target.value })} placeholder="Met at the Denver meetup" />
            </div>
            <button type="submit" disabled={memberBusy}
                    style={{ padding: "0.6rem 1.2rem", border: "none", borderRadius: "4px", backgroundColor: "#007067", color: "#fff", cursor: "pointer", fontWeight: 500, opacity: memberBusy ? 0.6 : 1 }}>
              Add member
            </button>
          </form>

          {members.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7 }}>
              No members yet.
            </div>
          ) : (
            <div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
              {members.map((m, i) => (
                <div key={m.id} style={{
                  display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap",
                  padding: "0.9rem 1.2rem", borderTop: i ? "1px solid var(--line)" : "none",
                  opacity: m.disabledAt ? 0.55 : 1,
                }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      {m.name}
                      {m.disabledAt && <span style={{ marginLeft: "0.6rem", fontSize: "0.7rem", padding: "0.15rem 0.45rem", borderRadius: "100px", background: "#5b3535", color: "#ffd9d9" }}>disabled</span>}
                    </div>
                    <div style={{ fontSize: "0.78rem", opacity: 0.6 }}>
                      {m.email || "no email"} · added {new Date(m.createdAt).toLocaleDateString()}
                      {m.lastSeenAt ? ` · last signed in ${new Date(m.lastSeenAt).toLocaleDateString()}` : " · never signed in"}
                    </div>
                    {m.note && <div style={{ fontSize: "0.78rem", opacity: 0.5, marginTop: "0.2rem" }}>{m.note}</div>}
                  </div>
                  <button onClick={() => patchMember(m.id, { action: "regenerate" })} disabled={memberBusy}
                          style={{ padding: "0.45rem 0.8rem", border: "1px solid var(--line)", borderRadius: "4px", background: "transparent", color: "inherit", cursor: "pointer", fontSize: "0.8rem" }}>
                    New code
                  </button>
                  <button onClick={() => patchMember(m.id, { disabled: !m.disabledAt })} disabled={memberBusy}
                          style={{ padding: "0.45rem 0.8rem", border: "1px solid var(--line)", borderRadius: "4px", background: "transparent", color: "inherit", cursor: "pointer", fontSize: "0.8rem" }}>
                    {m.disabledAt ? "Re-enable" : "Disable"}
                  </button>
                  <button onClick={() => removeMember(m.id, m.name)} disabled={memberBusy}
                          style={{ padding: "0.45rem 0.8rem", border: "none", borderRadius: "4px", background: "#d9534f", color: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Media Player Modal */}
      {activeMedia && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.9)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 9999, padding: "2rem"
        }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "900px", backgroundColor: "#000", borderRadius: "8px", overflow: "hidden" }}>
            <button
              onClick={() => setActiveMedia(null)}
              style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10, background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer" }}
            >
              Close
            </button>
            <video
              src={activeMedia ?? undefined}
              controls
              autoPlay
              style={{ width: "100%", maxHeight: "80vh", display: "block" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
