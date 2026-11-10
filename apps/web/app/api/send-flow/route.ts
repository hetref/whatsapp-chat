import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
    const body = await req.json().catch(() => ({}));

    const forwardRes = await fetch(`${apiBase}/api/send-flow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    });

    const responseText = await forwardRes.text();
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: responseText || `Backend server returned status ${forwardRes.status}` },
        { status: forwardRes.status >= 400 ? forwardRes.status : 500 }
      );
    }

    return NextResponse.json(data, { status: forwardRes.status });
  } catch (error: unknown) {
    console.error("[send-flow API Route Error]:", error);
    const message = error instanceof Error ? error.message : "Failed to process send-flow request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

