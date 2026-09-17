import { NextResponse } from "next/server";
import { getCanonicalPublicOfficials } from "@/lib/civic-data/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "50") || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
  const officials = await getCanonicalPublicOfficials();
  return NextResponse.json({ data: officials.slice(offset, offset + limit), total: officials.length, limit, offset });
}

