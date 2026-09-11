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
 */

export type TodoStatus = "open" | "doing" | "done";

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
}

const keyFor = (id: string) => `todos/${id}.json`;

const STATUSES: TodoStatus[] = ["open", "doing", "done"];
export const isStatus = (s: unknown): s is TodoStatus =>
  typeof s === "string" && (STATUSES as string[]).includes(s);

// Open first, then doing, then done — the list should read as work remaining,
// not as a history of what has been finished.
const RANK: Record<TodoStatus, number> = { open: 0, doing: 1, done: 2 };

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
    .sort((a, b) => {
      const byStatus = RANK[a.status] - RANK[b.status];
      if (byStatus !== 0) return byStatus;
      // newest first within a status: the thing just asked for is the thing
      // most likely being discussed
      return b.createdAt.localeCompare(a.createdAt);
    });
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

export async function createTodo(input: { text: string; askedBy?: string }): Promise<Todo> {
  const now = new Date().toISOString();
  const todo: Todo = {
    id: `todo_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`,
    text: String(input.text).trim(),
    askedBy: input.askedBy ? String(input.askedBy).trim() : "",
    status: "open",
    createdAt: now,
    updatedAt: now,
    doneAt: null,
  };
  await save(todo);
  return todo;
}

export async function updateTodo(
  id: string,
  changes: { text?: string; askedBy?: string; status?: TodoStatus },
): Promise<Todo | null> {
  const existing = await readTodo(phys(keyFor(id)));
  if (!existing) return null;

  const next: Todo = { ...existing, updatedAt: new Date().toISOString() };
  if (changes.text !== undefined) next.text = String(changes.text).trim();
  if (changes.askedBy !== undefined) next.askedBy = String(changes.askedBy).trim();
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
