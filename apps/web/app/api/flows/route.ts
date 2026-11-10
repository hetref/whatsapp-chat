import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { isWhatsAppSetupComplete } from "@/lib/whatsapp-setup";
import { generateFlowJson, validateFlowConfig } from "@/lib/flows/flow-json";
import {
  createFlow,
  isFlowBuilderConfig,
  isRecord,
  listFlows,
} from "@/lib/flows/flow-store";
import {
  createDefaultFlowConfig,
  FLOW_CATEGORIES,
  type FlowCategory,
} from "@/lib/flows/flow-types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isWhatsAppSetupComplete(userId))) {
      return NextResponse.json({ error: "Complete WhatsApp setup to access Flows." }, { status: 403 });
    }
    const flows = await listFlows(userId);

    // Also fetch Meta-published flows if WhatsApp credentials exist
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { id: userId },
        select: { accessToken: true, businessAccountId: true, apiVersion: true },
      });
      if (settings?.accessToken && settings.businessAccountId) {
        const apiVer = settings.apiVersion || "v23.0";
        const metaRes = await fetch(
          `https://graph.facebook.com/${apiVer}/${settings.businessAccountId}/flows?access_token=${settings.accessToken}`
        );
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          const metaFlowList: Array<{ id: string; name: string; status?: string; categories?: string[] }> =
            Array.isArray(metaData.data) ? metaData.data : [];
          const existingMetaIds = new Set(flows.map((f) => f.metaFlowId).filter(Boolean));
          for (const mf of metaFlowList) {
            if (!existingMetaIds.has(mf.id)) {
              try {
                const created = await prisma.whatsAppFlow.create({
                  data: {
                    userId,
                    businessAccountId: settings.businessAccountId,
                    name: mf.name,
                    description: `Meta Flow (${mf.categories?.[0] || 'OTHER'})`,
                    category: (mf.categories?.[0] || 'OTHER') as FlowCategory,
                    status: (mf.status || 'PUBLISHED') as any,
                    metaFlowId: mf.id,
                    flowJson: {},
                    screenConfig: { screens: [] },
                  },
                });
                flows.push({
                  id: created.id,
                  name: created.name,
                  description: created.description,
                  category: created.category as FlowCategory,
                  status: created.status as any,
                  metaFlowId: created.metaFlowId,
                  flowJson: created.flowJson as any,
                  screenConfig: created.screenConfig as any,
                  createdAt: created.createdAt.toISOString(),
                  updatedAt: created.updatedAt.toISOString(),
                });
                existingMetaIds.add(mf.id);
              } catch (createErr) {
                console.warn("[Flows GET] Failed to auto-sync Meta flow into DB:", createErr);
                flows.push({
                  id: mf.id,
                  name: mf.name,
                  description: `Meta Flow (${mf.categories?.[0] || 'OTHER'})`,
                  category: (mf.categories?.[0] || 'OTHER') as FlowCategory,
                  status: (mf.status || 'PUBLISHED') as any,
                  metaFlowId: mf.id,
                  flowJson: {},
                  screenConfig: { screens: [] },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
        }
      }
    } catch (metaErr) {
      console.warn("[Flows GET] Failed to fetch Meta flows:", metaErr);
    }

    return NextResponse.json({ success: true, data: flows });
  } catch (error) {
    console.error("[Flows GET] Failed to list flows:", error);
    return NextResponse.json({ error: "Failed to load flows." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isWhatsAppSetupComplete(userId))) {
      return NextResponse.json({ error: "Complete WhatsApp setup to access Flows." }, { status: 403 });
    }

    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = body.category;
    const screenConfig = body.screenConfig === undefined
      ? createDefaultFlowConfig()
      : body.screenConfig;

    if (!name || name.length > 60) {
      return NextResponse.json({ error: "Flow name must be between 1 and 60 characters." }, { status: 400 });
    }
    if (description.length > 512) {
      return NextResponse.json({ error: "Description must be 512 characters or fewer." }, { status: 400 });
    }
    if (typeof category !== "string" || !FLOW_CATEGORIES.includes(category as FlowCategory)) {
      return NextResponse.json({ error: "Choose a supported Flow category." }, { status: 400 });
    }
    if (!isFlowBuilderConfig(screenConfig)) {
      return NextResponse.json({ error: "Flow screen configuration is invalid." }, { status: 400 });
    }

    const validationErrors = validateFlowConfig(screenConfig, category);
    if (validationErrors.length) {
      return NextResponse.json({ error: "Flow configuration is invalid.", details: validationErrors }, { status: 400 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: { businessAccountId: true },
    });
    const flow = await createFlow({
      userId,
      businessAccountId: settings?.businessAccountId ?? null,
      name,
      description: description || null,
      category: category as FlowCategory,
      status: "DRAFT",
      flowJson: generateFlowJson(screenConfig),
      screenConfig,
    });
    return NextResponse.json({ success: true, data: flow }, { status: 201 });
  } catch (error) {
    console.error("[Flows POST] Failed to create flow:", error);
    return NextResponse.json({ error: "Failed to create flow." }, { status: 500 });
  }
}
