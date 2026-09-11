import { NextRequest, NextResponse } from "next/server";
import { isModerator } from "../../lib/auth";
import { r2Configured } from "../../lib/r2";
import { listTodos, createTodo, updateTodo, deleteTodo, isStatus } from "../../lib/todos";

export const dynamic = "force-dynamic";

/**
 * The change list. Moderator-only in every direction — this is the team's
 * working list, not something a visitor should be able to read or add to.
 */
const guard = (request: NextRequest) =>
  !isModerator(request) ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : !r2Configured() ? NextResponse.json({ error: "R2 is not configured" }, { status: 503 })
      : null;

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
    const { text, askedBy } = await request.json();
    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: "Say what needs doing" }, { status: 400 });
    }
    return NextResponse.json({ success: true, todo: await createTodo({ text, askedBy }) });
  } catch (error) {
    console.error("Failed to create todo:", error);
    return NextResponse.json({ error: "Failed to add the item" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const { id, text, askedBy, status } = await request.json();
    if (!id) return NextResponse.json({ error: "Item id is required" }, { status: 400 });
    if (status !== undefined && !isStatus(status)) {
      return NextResponse.json({ error: "Status must be open, doing or done" }, { status: 400 });
    }
    const todo = await updateTodo(id, { text, askedBy, status });
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
