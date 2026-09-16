import { NextRequest, NextResponse } from "next/server";
import { isModerator } from "../../lib/auth";
import { r2Configured } from "../../lib/r2";
import {
  listTodos, createTodo, updateTodo, deleteTodo,
  isStatus, isPriority, isArea, isDue, type TodoInput,
} from "../../lib/todos";

export const dynamic = "force-dynamic";

/**
 * The change list. Moderator-only in every direction — this is the team's
 * working list, not something a visitor should be able to read or add to.
 */
const guard = (request: NextRequest) =>
  !isModerator(request) ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : !r2Configured() ? NextResponse.json({ error: "R2 is not configured" }, { status: 503 })
      : null;

/**
 * Pull the fields we accept out of a request body, and say what is wrong
 * with any that fail. Unknown fields are ignored rather than stored.
 */
function readInput(body: Record<string, unknown>): { input: TodoInput; error?: string } {
  const input: TodoInput = {};
  if (body.text !== undefined) input.text = String(body.text);
  if (body.askedBy !== undefined) input.askedBy = String(body.askedBy);
  if (body.owner !== undefined) input.owner = String(body.owner);
  if (body.notes !== undefined) input.notes = String(body.notes);
  if (body.answer !== undefined) input.answer = String(body.answer);
  if (body.status !== undefined) {
    if (!isStatus(body.status)) return { input, error: "Status must be open, doing or done" };
    input.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!isPriority(body.priority)) return { input, error: "Priority must be now, soon or later" };
    input.priority = body.priority;
  }
  if (body.area !== undefined) {
    if (!isArea(body.area)) return { input, error: "Area must be design, build, content, question or other" };
    input.area = body.area;
  }
  if (body.due !== undefined) {
    if (!isDue(body.due)) return { input, error: "Due date must be YYYY-MM-DD or blank" };
    input.due = body.due;
  }
  return { input };
}

export async function GET(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    return NextResponse.json({ todos: await listTodos() });
  } catch (error) {
    console.error("Failed to list todos:", error);
    return NextResponse.json({ error: "Failed to list the change list" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const { input, error } = readInput(await request.json());
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (!input.text || !input.text.trim()) {
      return NextResponse.json({ error: "Say what needs doing" }, { status: 400 });
    }
    return NextResponse.json({ success: true, todo: await createTodo(input) });
  } catch (error) {
    console.error("Failed to create todo:", error);
    return NextResponse.json({ error: "Failed to add the item" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Item id is required" }, { status: 400 });
    const { input, error } = readInput(body);
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (input.text !== undefined && !input.text.trim()) {
      return NextResponse.json({ error: "An item cannot be blank" }, { status: 400 });
    }
    const todo = await updateTodo(id, input);
    if (!todo) return NextResponse.json({ error: "Unknown item" }, { status: 404 });
    return NextResponse.json({ success: true, todo });
  } catch (error) {
    console.error("Failed to update todo:", error);
    return NextResponse.json({ error: "Failed to update the item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Item id is required" }, { status: 400 });
    await deleteTodo(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete todo:", error);
    return NextResponse.json({ error: "Failed to delete the item" }, { status: 500 });
  }
}
