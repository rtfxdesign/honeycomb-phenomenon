"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * The change list.
 *
 * Things people want added to the site or altered, kept where the people who
 * ask for them already sign in. Same moderator password as the rest of the
 * dashboard, same unlock flow, so this is not a second thing to remember.
 */

type TodoStatus = "open" | "doing" | "done";

interface Todo {
  id: string;
  text: string;
  askedBy: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  doneAt?: string | null;
}

const STATUS_LABEL: Record<TodoStatus, string> = {
  open: "Open",
  doing: "In progress",
  done: "Done",
};

const STATUS_COLOR: Record<TodoStatus, string> = {
  open: "#e0a33a",
  doing: "#4a9ed4",
  done: "#4fa373",
};

const ORDER: TodoStatus[] = ["open", "doing", "done"];

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ text: "", askedBy: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ text: "", askedBy: "" });

  useEffect(() => { load(); }, []);

  const load = () => {
    setLoading(true);
    fetch("/api/todos")
      .then((res) => {
        if (res.status === 401) { setAuthRequired(true); setLoading(false); return null; }
        if (!res.ok) throw new Error("Failed to load the change list");
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setAuthRequired(false);
        setTodos(data.todos || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load the change list.");
        setLoading(false);
      });
  };

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setAuthError("That password was not recognized."); return; }
      setPassword("");
      load();
    } catch {
      setAuthError("Could not verify the password. Try again.");
    }
  };

  const addItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to add");
      const data = await res.json();
      setTodos((c) => [data.todo, ...c]);
      // the name usually stays the same across a run of items, so only the
      // text clears
      setDraft((d) => ({ text: "", askedBy: d.askedBy }));
    } catch (err) {
      console.error(err);
      alert("Could not add that item.");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setTodos((c) => c.map((t) => (t.id === id ? data.todo : t)));
    } catch (err) {
      console.error(err);
      alert("Could not update that item.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, text: string) => {
    if (!confirm(`Delete this item?\n\n${text}`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/todos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setTodos((c) => c.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      alert("Could not delete that item.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (t: Todo) => {
    setEditingId(t.id);
    setEditDraft({ text: t.text, askedBy: t.askedBy });
  };

  const saveEdit = async (id: string) => {
    if (!editDraft.text.trim()) return;
    await patch(id, { text: editDraft.text, askedBy: editDraft.askedBy });
    setEditingId(null);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.6rem 0.7rem", borderRadius: "4px",
    border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)",
    color: "inherit", font: "inherit", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.72rem", opacity: 0.6, display: "block", margin: "0 0 0.25rem",
  };
  const pill = (bg: string, fg: string): React.CSSProperties => ({
    background: bg, color: fg, border: "none", borderRadius: "100px",
    padding: "0.28rem 0.7rem", fontSize: "0.75rem", cursor: "pointer",
  });

  const counts = ORDER.reduce((acc, s) => {
    acc[s] = todos.filter((t) => t.status === s).length;
    return acc;
  }, {} as Record<TodoStatus, number>);

  const renderItem = (t: Todo) => {
    const isEditing = editingId === t.id;
    return (
      <div
        key={t.id}
        style={{
          border: "1px solid var(--line)", borderRadius: "8px", padding: "1rem",
          background: "rgba(255,255,255,0.02)",
          borderLeft: `3px solid ${STATUS_COLOR[t.status]}`,
          opacity: t.status === "done" ? 0.62 : 1,
        }}
      >
        {isEditing ? (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            <textarea
              style={{ ...inputStyle, resize: "vertical" }} rows={3} autoFocus
              value={editDraft.text}
              onChange={(e) => setEditDraft({ ...editDraft, text: e.target.value })}
            />
            <input
              style={inputStyle} placeholder="Asked by"
              value={editDraft.askedBy}
              onChange={(e) => setEditDraft({ ...editDraft, askedBy: e.target.value })}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => saveEdit(t.id)} disabled={busy}
                style={pill("#007067", "#fff")}>Save</button>
              <button onClick={() => setEditingId(null)} disabled={busy}
                style={{ ...pill("transparent", "inherit"), border: "1px solid var(--line)" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{
              margin: "0 0 0.6rem", lineHeight: 1.55, fontSize: "0.95rem",
              textDecoration: t.status === "done" ? "line-through" : "none",
            }}>
              {t.text}
            </p>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.7rem" }}>
              {t.askedBy && <span>Asked by {t.askedBy}</span>}
              <span>{new Date(t.createdAt).toLocaleDateString()}</span>
              {t.doneAt && <span>done {new Date(t.doneAt).toLocaleDateString()}</span>}
            </div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {ORDER.filter((s) => s !== t.status).map((s) => (
                <button key={s} onClick={() => patch(t.id, { status: s })} disabled={busy}
                  style={{ ...pill("transparent", STATUS_COLOR[s]), border: `1px solid ${STATUS_COLOR[s]}` }}>
                  {s === "done" ? "Mark done" : `Move to ${STATUS_LABEL[s].toLowerCase()}`}
                </button>
              ))}
              <button onClick={() => startEdit(t)} disabled={busy}
                style={{ ...pill("transparent", "inherit"), border: "1px solid var(--line)", opacity: 0.8 }}>Edit</button>
              <button onClick={() => remove(t.id, t.text)} disabled={busy}
                style={{ ...pill("transparent", "#d9534f"), border: "1px solid rgba(217,83,79,0.4)" }}>Delete</button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>To Do</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>
            Things to add to the site or change. Anyone with the moderator password can add to this.
          </p>
        </div>
        <Link href="/review" style={{ padding: "0.5rem 1rem", border: "1px solid var(--line)", borderRadius: "4px", textDecoration: "none", color: "inherit" }}>
          &larr; Review dashboard
        </Link>
      </header>

      {loading && <div style={{ opacity: 0.5 }}>Loading securely...</div>}
      {error && <div style={{ color: "#d9534f" }}>{error}</div>}

      {authRequired && !loading && (
        <form onSubmit={handleUnlock} style={{ maxWidth: "360px", margin: "4rem auto", padding: "2rem", border: "1px solid var(--line)", borderRadius: "8px", display: "grid", gap: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>Moderator access</h2>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.65 }}>Enter the archive password to open the change list.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus
            style={inputStyle} placeholder="Password" />
          {authError && <div style={{ color: "#d9534f", fontSize: "0.85rem" }}>{authError}</div>}
          <button type="submit" style={{ padding: "0.7rem", border: "none", borderRadius: "4px", backgroundColor: "#007067", color: "#fff", cursor: "pointer", fontWeight: 500 }}>
            Unlock
          </button>
        </form>
      )}

      {!loading && !error && !authRequired && (
        <>
          <form onSubmit={addItem} style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "1.2rem", marginBottom: "2rem", display: "grid", gap: "0.8rem", maxWidth: "760px" }}>
            <div>
              <span style={labelStyle}>What needs doing</span>
              <textarea
                style={{ ...inputStyle, resize: "vertical" }} rows={2}
                placeholder="e.g. The member code on the gate should be case-insensitive"
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.8rem", alignItems: "end" }}>
              <div>
                <span style={labelStyle}>Asked by</span>
                <input
                  style={inputStyle} placeholder="e.g. Dane"
                  value={draft.askedBy}
                  onChange={(e) => setDraft({ ...draft, askedBy: e.target.value })}
                />
              </div>
              <button type="submit" disabled={busy || !draft.text.trim()}
                style={{ padding: "0.62rem 1.2rem", border: "none", borderRadius: "4px", backgroundColor: "#007067", color: "#fff", cursor: busy ? "wait" : "pointer", fontWeight: 500, opacity: draft.text.trim() ? 1 : 0.5 }}>
                Add item
              </button>
            </div>
          </form>

          {todos.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7 }}>
              Nothing on the list. Add the first thing above.
            </div>
          ) : (
            ORDER.map((status) => {
              const group = todos.filter((t) => t.status === status);
              if (group.length === 0) return null;
              return (
                <section key={status} style={{ marginBottom: "2.2rem" }}>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 0.9rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: STATUS_COLOR[status], display: "inline-block" }} />
                    {STATUS_LABEL[status]} ({counts[status]})
                  </h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
                    {group.map(renderItem)}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
