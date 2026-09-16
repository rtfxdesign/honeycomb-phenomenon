"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/**
 * The change list.
 *
 * Things people want added to the site or altered, kept where the people who
 * ask for them already sign in. Same moderator password as the rest of the
 * dashboard, same unlock flow, so this is not a second thing to remember.
 *
 * It is built for the hour after a review call: a pile of items goes in,
 * half of them are questions, a few are urgent, and somebody has to be able
 * to find "the scrollbar one" a week later.
 */

type TodoStatus = "open" | "doing" | "done";
type TodoPriority = "now" | "soon" | "later";
type TodoArea = "design" | "build" | "content" | "question" | "other";

interface Todo {
  id: string;
  text: string;
  askedBy: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  doneAt?: string | null;
  priority?: TodoPriority;
  area?: TodoArea;
  owner?: string;
  due?: string;
  notes?: string;
  answer?: string;
}

interface Draft {
  text: string;
  askedBy: string;
  owner: string;
  priority: TodoPriority;
  area: TodoArea;
  due: string;
  notes: string;
  answer: string;
}

const STATUS_LABEL: Record<TodoStatus, string> = { open: "Open", doing: "In progress", done: "Done" };
const STATUS_COLOR: Record<TodoStatus, string> = { open: "#e0a33a", doing: "#4a9ed4", done: "#4fa373" };
const ORDER: TodoStatus[] = ["open", "doing", "done"];

const PRIORITY_LABEL: Record<TodoPriority, string> = { now: "Now", soon: "Soon", later: "Later" };
const PRIORITY_COLOR: Record<TodoPriority, string> = { now: "#e25c4a", soon: "#e0a33a", later: "#8a8f98" };
const PRIORITIES: TodoPriority[] = ["now", "soon", "later"];

const AREA_LABEL: Record<TodoArea, string> = {
  design: "Design", build: "Build", content: "Content", question: "Question", other: "Other",
};
const AREAS: TodoArea[] = ["design", "build", "content", "question", "other"];

type View = "active" | "done" | "all";

const EMPTY_DRAFT: Draft = {
  text: "", askedBy: "", owner: "", priority: "soon", area: "other", due: "", notes: "", answer: "",
};

/** Days from today to a YYYY-MM-DD date; negative when it has passed. */
const daysUntil = (due: string) => {
  const [y, m, d] = due.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((target - now.getTime()) / 86400000);
};

const dueLabel = (due: string) => {
  const n = daysUntil(due);
  if (n < -1) return `${-n} days overdue`;
  if (n === -1) return "due yesterday";
  if (n === 0) return "due today";
  if (n === 1) return "due tomorrow";
  if (n <= 7) return `due in ${n} days`;
  return `due ${new Date(due + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
};

const dueColor = (due: string) => {
  const n = daysUntil(due);
  return n < 0 ? "#e25c4a" : n <= 3 ? "#e0a33a" : "inherit";
};

const draftOf = (t: Todo): Draft => ({
  text: t.text,
  askedBy: t.askedBy || "",
  owner: t.owner || "",
  priority: t.priority || "soon",
  area: t.area || "other",
  due: t.due || "",
  notes: t.notes || "",
  answer: t.answer || "",
});

const paragraphs = (s: string) =>
  s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** The list as plain text, for pasting into an email or a message. */
const asText = (items: Todo[]) =>
  items.map((t) => {
    const bits = [
      t.priority && t.priority !== "soon" ? PRIORITY_LABEL[t.priority].toUpperCase() : "",
      t.area && t.area !== "other" ? AREA_LABEL[t.area] : "",
      t.owner ? `→ ${t.owner}` : "",
      t.due ? dueLabel(t.due) : "",
    ].filter(Boolean).join(" · ");
    const head = `${t.status === "done" ? "[x]" : t.status === "doing" ? "[~]" : "[ ]"} ${t.text}${bits ? `  (${bits})` : ""}`;
    const answer = t.answer ? `\n    Answer: ${t.answer.replace(/\s*\n\s*/g, " ")}` : "";
    return head + answer;
  }).join("\n");

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [draftMore, setDraftMore] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);

  const [view, setView] = useState<View>("active");
  const [areaFilter, setAreaFilter] = useState<TodoArea | "">("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 2400);
    return () => clearTimeout(id);
  }, [notice]);

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

  const addItem = async (event?: React.FormEvent) => {
    event?.preventDefault();
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
      // the person asking, and usually the kind of thing, stay the same across
      // a run of items after a call — only what changes per item clears
      setDraft((d) => ({ ...EMPTY_DRAFT, askedBy: d.askedBy, area: d.area, priority: d.priority }));
      setNotice("Added");
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

  const startEdit = (t: Todo) => { setEditingId(t.id); setEditDraft(draftOf(t)); };
  const saveEdit = async (id: string) => {
    if (!editDraft.text.trim()) return;
    await patch(id, { ...editDraft });
    setEditingId(null);
  };

  const submitOnEnter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); fn(); }
  };

  const copy = async (items: Todo[], what: string) => {
    try {
      await navigator.clipboard.writeText(asText(items));
      setNotice(`Copied ${items.length} ${what}`);
    } catch {
      setNotice("Could not copy");
    }
  };

  // ── derived ────────────────────────────────────────────────────────────
  const owners = useMemo(
    () => Array.from(new Set(todos.map((t) => (t.owner || "").trim()).filter(Boolean))).sort(),
    [todos],
  );

  const counts = useMemo(() => {
    const c = { open: 0, doing: 0, done: 0, now: 0, overdue: 0, week: 0 };
    for (const t of todos) {
      c[t.status]++;
      if (t.status === "done") continue;
      if (t.priority === "now") c.now++;
      if (t.due) {
        const n = daysUntil(t.due);
        if (n < 0) c.overdue++;
        else if (n <= 7) c.week++;
      }
    }
    return c;
  }, [todos]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todos.filter((t) => {
      if (view === "active" && t.status === "done") return false;
      if (view === "done" && t.status !== "done") return false;
      if (areaFilter && (t.area || "other") !== areaFilter) return false;
      if (ownerFilter && (t.owner || "").trim() !== ownerFilter) return false;
      if (q) {
        const hay = [t.text, t.notes, t.answer, t.askedBy, t.owner].join("\n").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [todos, view, areaFilter, ownerFilter, query]);

  const filtered = Boolean(areaFilter || ownerFilter || query.trim());

  // ── styles ─────────────────────────────────────────────────────────────
  const input: React.CSSProperties = {
    width: "100%", padding: "0.55rem 0.7rem", borderRadius: "5px",
    border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)",
    color: "inherit", font: "inherit", boxSizing: "border-box",
  };
  const label: React.CSSProperties = { fontSize: "0.7rem", opacity: 0.6, display: "block", margin: "0 0 0.25rem", letterSpacing: "0.02em" };
  const pill = (bg: string, fg: string): React.CSSProperties => ({
    background: bg, color: fg, border: "none", borderRadius: "100px",
    padding: "0.28rem 0.7rem", cursor: "pointer", font: "inherit", fontSize: "0.74rem",
  });
  const outlined = (color = "var(--line)", fg = "inherit"): React.CSSProperties => ({
    ...pill("transparent", fg), border: `1px solid ${color}`,
  });
  const chip = (active: boolean, color = "rgba(255,255,255,0.7)"): React.CSSProperties => ({
    ...pill(active ? color : "transparent", active ? "#111" : "inherit"),
    border: `1px solid ${active ? color : "var(--line)"}`,
    opacity: active ? 1 : 0.75,
  });
  const primary: React.CSSProperties = {
    padding: "0.6rem 1.2rem", border: "none", borderRadius: "5px", backgroundColor: "#007067",
    color: "#fff", cursor: busy ? "wait" : "pointer", fontWeight: 500, font: "inherit",
  };

  // ── pieces ─────────────────────────────────────────────────────────────
  // A render helper rather than a nested component: a component defined
  // inside render is a new type every pass, which remounts the inputs and
  // drops focus on every keystroke.
  const renderFields = (d: Draft, set: (d: Draft) => void, onSubmit: () => void, autoFocus?: boolean) => (
    <div style={{ display: "grid", gap: "0.7rem" }}>
      <div>
        <span style={label}>What needs doing</span>
        <textarea
          style={{ ...input, resize: "vertical" }} rows={2} autoFocus={autoFocus}
          placeholder="e.g. The member code on the gate should be case-insensitive"
          value={d.text}
          onChange={(e) => set({ ...d, text: e.target.value })}
          onKeyDown={submitOnEnter(onSubmit)}
        />
      </div>
      <div className="todo-fields">
        <div>
          <span style={label}>Kind</span>
          <select style={input} value={d.area} onChange={(e) => set({ ...d, area: e.target.value as TodoArea })}>
            {AREAS.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
          </select>
        </div>
        <div>
          <span style={label}>Priority</span>
          <select style={input} value={d.priority} onChange={(e) => set({ ...d, priority: e.target.value as TodoPriority })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </div>
        <div>
          <span style={label}>Due</span>
          <input type="date" style={input} value={d.due}
            onChange={(e) => set({ ...d, due: e.target.value })} />
        </div>
        <div>
          <span style={label}>Asked by</span>
          <input style={input} placeholder="e.g. Paul" list="todo-people" value={d.askedBy}
            onChange={(e) => set({ ...d, askedBy: e.target.value })} />
        </div>
        <div>
          <span style={label}>Owner</span>
          <input style={input} placeholder="who's doing it" list="todo-people" value={d.owner}
            onChange={(e) => set({ ...d, owner: e.target.value })} />
        </div>
      </div>
      <div>
        <span style={label}>Notes — context, where it came from, what it depends on</span>
        <textarea style={{ ...input, resize: "vertical" }} rows={3} value={d.notes}
          onChange={(e) => set({ ...d, notes: e.target.value })} onKeyDown={submitOnEnter(onSubmit)} />
      </div>
      <div>
        <span style={label}>Answer — the reply, if this is a question or needs one</span>
        <textarea style={{ ...input, resize: "vertical" }} rows={2} value={d.answer}
          onChange={(e) => set({ ...d, answer: e.target.value })} onKeyDown={submitOnEnter(onSubmit)} />
      </div>
    </div>
  );

  const renderItem = (t: Todo) => {
    const isEditing = editingId === t.id;
    const priority = t.priority || "soon";
    const area = t.area || "other";
    return (
      <article
        key={t.id}
        className="todo-item"
        style={{
          border: "1px solid var(--line)", borderRadius: "8px", padding: "0.95rem 1.1rem",
          background: "rgba(255,255,255,0.02)",
          borderLeft: `3px solid ${STATUS_COLOR[t.status]}`,
          opacity: t.status === "done" ? 0.6 : 1,
        }}
      >
        {isEditing ? (
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {renderFields(editDraft, setEditDraft, () => saveEdit(t.id), true)}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => saveEdit(t.id)} disabled={busy} style={pill("#007067", "#fff")}>Save</button>
              <button onClick={() => setEditingId(null)} disabled={busy} style={outlined()}>Cancel</button>
              <span style={{ fontSize: "0.7rem", opacity: 0.5, alignSelf: "center" }}>⌘/Ctrl + Enter saves</span>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", fontSize: "0.72rem", marginBottom: "0.5rem" }}>
              {t.status !== "done" && (
                <span style={{ color: PRIORITY_COLOR[priority], fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  ● {PRIORITY_LABEL[priority]}
                </span>
              )}
              <span style={{ ...outlined(), cursor: "default", padding: "0.12rem 0.55rem", opacity: 0.8 }}>{AREA_LABEL[area]}</span>
              {t.due && t.status !== "done" && (
                <span style={{ color: dueColor(t.due), fontWeight: dueColor(t.due) === "inherit" ? 400 : 600, opacity: dueColor(t.due) === "inherit" ? 0.7 : 1 }}>
                  {dueLabel(t.due)}
                </span>
              )}
              {t.owner && <span style={{ opacity: 0.75 }}>→ {t.owner}</span>}
            </div>

            <p style={{
              margin: "0 0 0.45rem", lineHeight: 1.5, fontSize: "0.98rem",
              textDecoration: t.status === "done" ? "line-through" : "none",
            }}>
              {t.text}
            </p>

            {t.notes && (
              <div style={{ fontSize: "0.85rem", lineHeight: 1.55, opacity: 0.72, margin: "0 0 0.6rem" }}>
                {paragraphs(t.notes).map((p, i) => <p key={i} style={{ margin: "0 0 0.4rem" }}>{p}</p>)}
              </div>
            )}

            {t.answer && (
              <div style={{
                fontSize: "0.86rem", lineHeight: 1.55, margin: "0 0 0.7rem", padding: "0.6rem 0.8rem",
                borderRadius: "6px", background: "rgba(0,112,103,0.12)", borderLeft: "2px solid #007067",
              }}>
                <span style={{ ...label, color: "#4fb3a9", opacity: 1, marginBottom: "0.2rem" }}>Answer</span>
                {paragraphs(t.answer).map((p, i) => <p key={i} style={{ margin: "0 0 0.35rem" }}>{p}</p>)}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", fontSize: "0.72rem", opacity: 0.55, marginBottom: "0.6rem" }}>
              {t.askedBy && <span>Asked by {t.askedBy}</span>}
              <span>{new Date(t.createdAt).toLocaleDateString()}</span>
              {t.doneAt && <span>done {new Date(t.doneAt).toLocaleDateString()}</span>}
            </div>

            <div className="todo-actions" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {ORDER.filter((s) => s !== t.status).map((s) => (
                <button key={s} onClick={() => patch(t.id, { status: s })} disabled={busy}
                  style={outlined(STATUS_COLOR[s], STATUS_COLOR[s])}>
                  {s === "done" ? "Mark done" : s === "doing" ? "Start" : "Reopen"}
                </button>
              ))}
              {t.status !== "done" && priority !== "now" && (
                <button onClick={() => patch(t.id, { priority: "now" })} disabled={busy}
                  style={{ ...outlined(), opacity: 0.7 }}>Bump to now</button>
              )}
              <button onClick={() => startEdit(t)} disabled={busy} style={{ ...outlined(), opacity: 0.7 }}>
                {t.answer ? "Edit" : area === "question" ? "Answer" : "Edit"}
              </button>
              <button onClick={() => remove(t.id, t.text)} disabled={busy}
                style={{ ...outlined("rgba(217,83,79,0.4)", "#d9534f"), opacity: 0.8 }}>Delete</button>
            </div>
          </>
        )}
      </article>
    );
  };

  const stat = (n: number, word: string, color?: string) => (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "0.3rem" }}>
      <strong style={{ fontSize: "1.15rem", color, fontWeight: 600 }}>{n}</strong>
      <span style={{ opacity: 0.6, fontSize: "0.8rem" }}>{word}</span>
    </span>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", padding: "2rem" }}>
      <style>{`
        .todo-fields{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0.7rem}
        @media (max-width:820px){.todo-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}
        .todo-actions button{opacity:.55;transition:opacity .15s}
        .todo-item:hover .todo-actions button, .todo-actions button:focus-visible{opacity:1}
        .todo-toolbar{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
        input[type=date]{color-scheme:dark}
        .todo-notice{position:fixed;bottom:1.4rem;left:50%;transform:translateX(-50%);background:#007067;color:#fff;padding:.5rem .9rem;border-radius:100px;font-size:.8rem;box-shadow:0 6px 20px rgba(0,0,0,.35)}
      `}</style>
      <datalist id="todo-people">
        {Array.from(new Set([...owners, ...todos.map((t) => t.askedBy).filter(Boolean)])).map((n) => <option key={n} value={n} />)}
      </datalist>

      <header style={{ marginBottom: "1.6rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 600, margin: "0 0 0.4rem 0" }}>To Do</h1>
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
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus style={input} placeholder="Password" />
          {authError && <div style={{ color: "#d9534f", fontSize: "0.85rem" }}>{authError}</div>}
          <button type="submit" style={primary}>Unlock</button>
        </form>
      )}

      {!loading && !error && !authRequired && (
        <div style={{ maxWidth: "860px" }}>
          {/* the numbers that matter */}
          <div style={{ display: "flex", gap: "1.4rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.4rem", padding: "0.8rem 1.1rem", border: "1px solid var(--line)", borderRadius: "8px", background: "rgba(255,255,255,0.015)" }}>
            {stat(counts.open, "open", STATUS_COLOR.open)}
            {stat(counts.doing, "in progress", STATUS_COLOR.doing)}
            {stat(counts.done, "done", STATUS_COLOR.done)}
            {counts.now > 0 && <span style={{ opacity: 0.3 }}>|</span>}
            {counts.now > 0 && stat(counts.now, "marked now", PRIORITY_COLOR.now)}
            {counts.overdue > 0 && stat(counts.overdue, "overdue", "#e25c4a")}
            {counts.week > 0 && stat(counts.week, "due this week", "#e0a33a")}
          </div>

          {/* add */}
          <form onSubmit={addItem} style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "1.1rem 1.2rem", marginBottom: "1.6rem", display: "grid", gap: "0.8rem" }}>
            {draftMore ? (
              renderFields(draft, setDraft, () => addItem())
            ) : (
              <div>
                <span style={label}>What needs doing</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0.6rem", alignItems: "start" }}>
                  <textarea
                    style={{ ...input, resize: "vertical" }} rows={2}
                    placeholder="e.g. The member code on the gate should be case-insensitive"
                    value={draft.text}
                    onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                    onKeyDown={submitOnEnter(() => addItem())}
                  />
                  <select style={{ ...input, width: "auto" }} value={draft.area} title="Kind"
                    onChange={(e) => setDraft({ ...draft, area: e.target.value as TodoArea })}>
                    {AREAS.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
                  </select>
                  <input style={{ ...input, width: "9rem" }} placeholder="Asked by" list="todo-people" value={draft.askedBy}
                    onChange={(e) => setDraft({ ...draft, askedBy: e.target.value })} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
              <button type="submit" disabled={busy || !draft.text.trim()}
                style={{ ...primary, opacity: draft.text.trim() ? 1 : 0.5 }}>
                Add item
              </button>
              <button type="button" onClick={() => setDraftMore((m) => !m)} style={{ ...outlined(), opacity: 0.75 }}>
                {draftMore ? "Fewer fields" : "Priority, due date, owner, notes…"}
              </button>
              <span style={{ fontSize: "0.7rem", opacity: 0.45, marginLeft: "auto" }}>⌘/Ctrl + Enter adds</span>
            </div>
          </form>

          {/* find */}
          {todos.length > 0 && (
            <div className="todo-toolbar" style={{ marginBottom: "1.2rem" }}>
              <div style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: "100px", overflow: "hidden" }}>
                {([["active", "Open"], ["done", "Done"], ["all", "All"]] as [View, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setView(v)} style={{
                    ...pill(view === v ? "rgba(255,255,255,0.14)" : "transparent", "inherit"),
                    borderRadius: 0, padding: "0.32rem 0.85rem", opacity: view === v ? 1 : 0.6,
                  }}>{l}</button>
                ))}
              </div>
              <span style={{ width: "1px", height: "1.2rem", background: "var(--line)" }} />
              {AREAS.map((a) => (
                <button key={a} onClick={() => setAreaFilter(areaFilter === a ? "" : a)} style={chip(areaFilter === a)}>
                  {AREA_LABEL[a]}
                </button>
              ))}
              {owners.length > 0 && (
                <select style={{ ...input, width: "auto", padding: "0.3rem 0.6rem", fontSize: "0.78rem", borderRadius: "100px" }}
                  value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                  <option value="">Anyone</option>
                  {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              <input
                style={{ ...input, width: "12rem", padding: "0.32rem 0.7rem", fontSize: "0.8rem", borderRadius: "100px", marginLeft: "auto" }}
                placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)}
              />
              <button onClick={() => copy(visible, view === "done" ? "done items" : "items")} style={{ ...outlined(), opacity: 0.7 }} title="Copy what's shown as plain text">
                Copy list
              </button>
            </div>
          )}

          {/* the list */}
          {todos.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7 }}>
              Nothing on the list. Add the first thing above.
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", opacity: 0.7 }}>
              {filtered ? "Nothing matches those filters." : view === "done" ? "Nothing finished yet." : "Nothing open — the list is clear."}
              {filtered && (
                <div style={{ marginTop: "0.7rem" }}>
                  <button onClick={() => { setAreaFilter(""); setOwnerFilter(""); setQuery(""); }} style={outlined()}>Clear filters</button>
                </div>
              )}
            </div>
          ) : (
            ORDER.map((status) => {
              const group = visible.filter((t) => t.status === status);
              if (group.length === 0) return null;
              return (
                <section key={status} style={{ marginBottom: "2rem" }}>
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 0.8rem", display: "flex", alignItems: "center", gap: "0.6rem", opacity: 0.85 }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: STATUS_COLOR[status], display: "inline-block" }} />
                    {STATUS_LABEL[status]} <span style={{ opacity: 0.5, fontWeight: 400 }}>{group.length}</span>
                  </h2>
                  <div style={{ display: "grid", gap: "0.7rem" }}>
                    {group.map(renderItem)}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {notice && <div className="todo-notice">{notice}</div>}
    </div>
  );
}
