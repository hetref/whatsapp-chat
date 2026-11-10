import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { isWhatsAppSetupComplete } from "@/lib/whatsapp-setup";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setupComplete = await isWhatsAppSetupComplete(userId);
    return NextResponse.json({ setupComplete });
  } catch (error) {
    console.error("[Settings Status] Failed to check WhatsApp setup:", error);
    return NextResponse.json({ error: "Failed to check WhatsApp setup." }, { status: 500 });
  }
}
