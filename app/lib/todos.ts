import { randomBytes } from "node:crypto";
import { ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET, phys, r2Configured } from "./r2";

/**
 * The change list, stored at todos/{id}.json in R2.
 *
 * This is the list of things people want added to the site or altered. It
 * lives beside the archive rather than in a separate tool because the people
 * who raise items are already signing in to the review dashboard, and a list
 * kept somewhere else is a list nobody updates.
 *
 * One file per item rather than a single list document: two moderators adding
 * items at the same moment would otherwise overwrite each other, and this is
 * exactly the kind of thing two people do at once after a review call.
 *
 * Every field beyond text and status is optional, and records written before
 * a field existed are read as if it were blank — the list has to keep working
 * across its own upgrades.
 */

export type TodoStatus = "open" | "doing" | "done";
/** now: before the next call. soon: this pass. later: parked, still wanted. */
export type TodoPriority = "now" | "soon" | "later";
/** What kind of work it is — which is roughly who picks it up. */
export type TodoArea = "design" | "build" | "content" | "question" | "other";

export interface Todo {
  id: string;
  /** What needs doing, in the words of whoever asked. */
  text: string;
  /** Who raised it. Free text — these are named people, not accounts. */
  askedBy: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  /** Set when it first moved to done, so the list can show when it landed. */
  doneAt?: string | null;
  priority?: TodoPriority;
  area?: TodoArea;
  /** Who is doing it. Free text, same as askedBy. */
  owner?: string;
  /** YYYY-MM-DD, or blank. */
  due?: string;
  /** Context: where it came from, what was said, what it depends on. */
  notes?: string;
  /**
   * The reply. Half the items after a review call are questions, and the
   * answer belongs on the item, not in an email nobody can find later.
   */
  answer?: string;
}

const keyFor = (id: string) => `todos/${id}.json`;

const STATUSES: TodoStatus[] = ["open", "doing", "done"];
const PRIORITIES: TodoPriority[] = ["now", "soon", "later"];
const AREAS: TodoArea[] = ["design", "build", "content", "question", "other"];

export const isStatus = (s: unknown): s is TodoStatus =>
  typeof s === "string" && (STATUSES as string[]).includes(s);
export const isPriority = (s: unknown): s is TodoPriority =>
  typeof s === "string" && (PRIORITIES as string[]).includes(s);
export const isArea = (s: unknown): s is TodoArea =>
  typeof s === "string" && (AREAS as string[]).includes(s);
export const isDue = (s: unknown): s is string =>
  typeof s === "string" && (s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s));

// Open first, then doing, then done — the list should read as work remaining,
// not as a history of what has been finished. Within a status, what is due
// or urgent comes first; the thing just asked for is the tiebreak.
const RANK: Record<TodoStatus, number> = { open: 0, doing: 1, done: 2 };
const URGENCY: Record<TodoPriority, number> = { now: 0, soon: 1, later: 2 };

export function compareTodos(a: Todo, b: Todo) {
  const byStatus = RANK[a.status] - RANK[b.status];
  if (byStatus !== 0) return byStatus;
  if (a.status === "done") return (b.doneAt || "").localeCompare(a.doneAt || "");
  const byUrgency = URGENCY[a.priority || "soon"] - URGENCY[b.priority || "soon"];
  if (byUrgency !== 0) return byUrgency;
  // a date beats no date; an earlier date beats a later one
  if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due);
  if (a.due !== b.due) return a.due ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}

const str = (v: unknown, max = 4000) => (v === undefined || v === null ? "" : String(v)).trim().slice(0, max);

async function readTodo(objectKey: string): Promise<Todo | null> {
  const client = getR2Client();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: objectKey }));
    const body = await res.Body?.transformToString();
    return body ? (JSON.parse(body) as Todo) : null;
  } catch {
    return null;
  }
}

export async function listTodos(): Promise<Todo[]> {
  if (!r2Configured()) return [];
  const client = getR2Client();
  const res = await client.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: phys("todos/"),
  }));
  const files = (res.Contents || []).filter((o) => o.Key?.endsWith(".json"));
  const todos = await Promise.all(files.map((o) => readTodo(o.Key!)));
  return todos
    .filter((t): t is Todo => Boolean(t && t.id))
    .sort(compareTodos);
}

async function save(todo: Todo) {
  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: phys(keyFor(todo.id)),
    Body: JSON.stringify(todo, null, 2),
    ContentType: "application/json",
  }));
}

export interface TodoInput {
  text?: string;
  askedBy?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  area?: TodoArea;
  owner?: string;
  due?: string;
  notes?: string;
  answer?: string;
}

export async function createTodo(input: TodoInput): Promise<Todo> {
  const now = new Date().toISOString();
  const todo: Todo = {
    id: `todo_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`,
    text: str(input.text),
    askedBy: str(input.askedBy, 120),
    status: "open",
    createdAt: now,
    updatedAt: now,
    doneAt: null,
    priority: input.priority || "soon",
    area: input.area || "other",
    owner: str(input.owner, 120),
    due: str(input.due, 10),
    notes: str(input.notes),
    answer: str(input.answer),
  };
  await save(todo);
  return todo;
}

export async function updateTodo(id: string, changes: TodoInput): Promise<Todo | null> {
  const existing = await readTodo(phys(keyFor(id)));
  if (!existing) return null;

  const next: Todo = { ...existing, updatedAt: new Date().toISOString() };
  if (changes.text !== undefined) next.text = str(changes.text);
  if (changes.askedBy !== undefined) next.askedBy = str(changes.askedBy, 120);
  if (changes.owner !== undefined) next.owner = str(changes.owner, 120);
  if (changes.due !== undefined) next.due = str(changes.due, 10);
  if (changes.notes !== undefined) next.notes = str(changes.notes);
  if (changes.answer !== undefined) next.answer = str(changes.answer);
  if (changes.priority !== undefined) next.priority = changes.priority;
  if (changes.area !== undefined) next.area = changes.area;
  if (changes.status !== undefined) {
    next.status = changes.status;
    // stamp the first time it lands, and clear it if somebody reopens the item
    if (changes.status === "done" && existing.status !== "done") next.doneAt = next.updatedAt;
    if (changes.status !== "done") next.doneAt = null;
  }

  await save(next);
  return next;
}

export async function deleteTodo(id: string) {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: phys(keyFor(id)) }));
}
