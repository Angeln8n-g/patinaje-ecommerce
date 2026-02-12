import { NextResponse } from "next/server";

// Auth callback is no longer needed with JWT auth.
// Redirect to store.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/skating-store`);
}
