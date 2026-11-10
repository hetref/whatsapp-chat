import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { isWhatsAppSetupComplete } from "@/lib/whatsapp-setup";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 25;

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isWhatsAppSetupComplete(userId))) {
      return NextResponse.json({ error: "Complete WhatsApp setup to access Flow submissions." }, { status: 403 });
    }

    const { id } = await params;
    const isUuid = UUID_PATTERN.test(id);

    // Look up flow by either internal UUID or metaFlowId
    let flow = await prisma.whatsAppFlow.findFirst({
      where: {
        userId,
        OR: [
          ...(isUuid ? [{ id }] : []),
          { metaFlowId: id },
        ],
      },
      select: { id: true, name: true },
    });

    // If not in DB yet, try to discover from Meta and auto-sync
    if (!flow) {
      try {
        const settings = await prisma.userSettings.findUnique({
          where: { id: userId },
          select: { accessToken: true, businessAccountId: true, apiVersion: true },
        });
        if (settings?.accessToken) {
          const apiVer = settings.apiVersion || "v23.0";
          const metaRes = await fetch(
            `https://graph.facebook.com/${apiVer}/${id}?fields=id,name,categories,status&access_token=${settings.accessToken}`
          );
          if (metaRes.ok) {
            const metaFlow = await metaRes.json();
            const created = await prisma.whatsAppFlow.create({
              data: {
                userId,
                businessAccountId: settings.businessAccountId,
                name: metaFlow.name || "Meta Flow",
                description: `Meta Flow (${metaFlow.categories?.[0] || "OTHER"})`,
                category: (metaFlow.categories?.[0] || "OTHER") as any,
                status: (metaFlow.status || "PUBLISHED") as any,
                metaFlowId: String(metaFlow.id),
                flowJson: {},
                screenConfig: { screens: [] },
              },
            });
            flow = { id: created.id, name: created.name };
          }
        }
      } catch (syncErr) {
        console.warn("[Flow Submissions GET] Failed to sync flow from Meta:", syncErr);
      }
    }

    if (!flow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });

    const pageValue = Number(request.nextUrl.searchParams.get("page") || "1");
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const [countRows, submissions] = await Promise.all([
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS "total"
        FROM "whatsapp_flow_submissions"
        WHERE "user_id" = ${userId} AND "flow_id" = ${flow.id}::uuid
      `,
      prisma.$queryRaw<{
        id: string;
        contactPhone: string;
        contactName: string | null;
        responseData: Record<string, unknown>;
        submittedAt: Date;
      }[]>`
        SELECT
          "id"::text AS "id",
          "contact_phone" AS "contactPhone",
          "contact_name" AS "contactName",
          "response_data" AS "responseData",
          "submitted_at" AS "submittedAt"
        FROM "whatsapp_flow_submissions"
        WHERE "user_id" = ${userId} AND "flow_id" = ${flow.id}::uuid
        ORDER BY "submitted_at" DESC
        LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
      `,
    ]);
    const total = countRows[0]?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        flow: { id: flow.id, name: flow.name },
        submissions,
        pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
      },
    });
  } catch (error) {
    console.error("[Flow Submissions GET] Failed to load submissions:", error);
    return NextResponse.json({ error: "Failed to load Flow submissions." }, { status: 500 });
  }
}
