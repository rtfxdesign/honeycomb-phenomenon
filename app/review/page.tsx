"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SubmissionData {
  id: string;
  title: string;
  displayName?: string;
  location: string;
  experienceYear: string;
  experienceType?: string;
  transcript: string;
  privacy?: string;
  hashtags?: string[];
  status?: string;
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
      location: submission.data.location || "",
      experienceYear: submission.data.experienceYear || "",
      privacy: submission.data.privacy || "public",
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
        location: edit.location,
        experienceYear: edit.experienceYear,
        privacy: edit.privacy,
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
    const { title, displayName, location, experienceYear, transcript, hashtags, privacy } = submission.data;
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
                <div>
                  <span style={labelStyle}>Display name (shown on the cell)</span>
                  <input style={inputStyle} value={edit.displayName} onChange={e => setEdit({ ...edit, displayName: e.target.value })} placeholder="e.g. John Berg" />
                </div>
                <div>
                  <span style={labelStyle}>Privacy</span>
                  <select style={inputStyle} value={edit.privacy} onChange={e => setEdit({ ...edit, privacy: e.target.value })}>
                    <option value="public">Public archive</option>
                    <option value="community">Community only</option>
                    <option value="archive">Strictly archived (hidden from site)</option>
                  </select>
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
                {displayName && <span>👤 {displayName}</span>}
                <span>⌖ {location || "Unknown"}</span>
                <span>📅 {experienceYear || "Unknown"}</span>
                {privacy && <span>🔒 {privacy}</span>}
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
              <p style={{ margin: "0 0 1rem 0", lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                &ldquo;{transcript}&rdquo;
              </p>
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
        <Link href="/" style={{ padding: "0.5rem 1rem", border: "1px solid var(--line)", borderRadius: "4px", textDecoration: "none", color: "inherit" }}>
          &larr; Back to Site
        </Link>
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
            <div style={{ padding: "2rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7 }}>
              Could not load the community faces.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "2rem" }}>
              {people.map(renderPersonCard)}
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
