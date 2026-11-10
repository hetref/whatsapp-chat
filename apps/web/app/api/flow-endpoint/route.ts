import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiBase}/api/flow-endpoint`);
    const data = await res.json().catch(() => ({ status: "active" }));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "active", service: "WaChat Flow Proxy" });
  }
}

export async function POST(req: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  try {
    const rawBody = await req.text();
    const contentType = req.headers.get("content-type") || "application/json";

    const forwardRes = await fetch(`${apiBase}/api/flow-endpoint`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
      },
      body: rawBody,
    });

    const responseText = await forwardRes.text();
    const responseContentType = forwardRes.headers.get("content-type") || "text/plain";

    return new NextResponse(responseText, {
      status: forwardRes.status,
      headers: {
        "Content-Type": responseContentType,
      },
    });
  } catch (err: unknown) {
    console.error("[Flow Endpoint Proxy Error]:", err);
    return new NextResponse(
      JSON.stringify({
        version: "3.0",
        screen: "WELCOME",
        data: { error_message: "Failed to connect to flow backend" },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

