import { NextRequest, NextResponse } from "next/server";
import { isModerator } from "../../lib/auth";
import { r2Configured } from "../../lib/r2";
import {
  listMembersPublic, createMember, updateMember, regenerateCode, deleteMember,
} from "../../lib/members";

export const dynamic = "force-dynamic";

const guard = (request: NextRequest) =>
  !isModerator(request) ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : !r2Configured() ? NextResponse.json({ error: "R2 is not configured" }, { status: 503 })
      : null;

export async function GET(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    return NextResponse.json({ members: await listMembersPublic() });
  } catch (error) {
    console.error("Failed to list members:", error);
    return NextResponse.json({ error: "Failed to list members" }, { status: 500 });
  }
}

/** Create a member. The access code comes back once and is never stored. */
export async function POST(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const { name, email, note } = await request.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "A name is required" }, { status: 400 });
    }
    const created = await createMember({ name, email, note });
    return NextResponse.json({ success: true, ...created });
  } catch (error) {
    console.error("Failed to create member:", error);
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
  }
}

/** Rename, enable/disable, or issue a fresh access code. */
export async function PATCH(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const { id, action, name, email, note, disabled } = await request.json();
    if (!id) return NextResponse.json({ error: "Member id is required" }, { status: 400 });

    if (action === "regenerate") {
      const result = await regenerateCode(id);
      if (!result) return NextResponse.json({ error: "Unknown member" }, { status: 404 });
      return NextResponse.json({ success: true, ...result });
    }

    const changes: Record<string, unknown> = {};
    if (name !== undefined) changes.name = String(name).trim();
    if (email !== undefined) changes.email = String(email).trim();
    if (note !== undefined) changes.note = String(note).trim();
    if (disabled !== undefined) changes.disabledAt = disabled ? new Date().toISOString() : null;

    const member = await updateMember(id, changes);
    if (!member) return NextResponse.json({ error: "Unknown member" }, { status: 404 });
    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error("Failed to update member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Member id is required" }, { status: 400 });
    await deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete member:", error);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
