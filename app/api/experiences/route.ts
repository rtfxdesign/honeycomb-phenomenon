export async function GET() {
  return Response.json({ experiences: [] });
}

export async function POST() {
  return Response.json({ error: "Submissions are handled by the private moderation queue." }, { status: 405 });
}
