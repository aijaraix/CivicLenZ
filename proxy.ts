import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/operator")) return NextResponse.next();
  const expectedUser = process.env.OPERATOR_DASHBOARD_USER;
  const expectedPassword = process.env.OPERATOR_DASHBOARD_PASSWORD;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = expectedUser && expectedPassword
    ? `Basic ${Buffer.from(`${expectedUser}:${expectedPassword}`).toString("base64")}`
    : "";
  if (!expected || supplied !== expected) {
    return new NextResponse("Operator authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="CivicLenZ Operator", charset="UTF-8"', "Cache-Control": "no-store" },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/operator/:path*"] };

