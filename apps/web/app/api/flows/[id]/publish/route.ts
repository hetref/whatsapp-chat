import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { isWhatsAppSetupComplete } from "@/lib/whatsapp-setup";
import {
  createMetaFlow,
  getMetaFlowStatus,
  MetaFlowApiError,
  publishMetaFlow,
  uploadMetaFlowJson,
} from "@/lib/flows/meta-api";
import { generateFlowJson, validateFlowConfig } from "@/lib/flows/flow-json";
import {
  getFlow,
  isFlowBuilderConfig,
  isRecord,
  setMetaFlowId,
  updateFlow,
} from "@/lib/flows/flow-store";
import { FLOW_CATEGORIES, type FlowCategory } from "@/lib/flows/flow-types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isWhatsAppSetupComplete(userId))) {
      return NextResponse.json({ error: "Complete WhatsApp setup before publishing a Flow." }, { status: 403 });
    }

    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid Flow ID." }, { status: 400 });
    const currentFlow = await getFlow(userId, id);
    if (!currentFlow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });

    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = body.category;
    const screenConfig = body.screenConfig;
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
      select: { accessToken: true, businessAccountId: true, apiVersion: true },
    });
    if (!settings?.accessToken || !settings.businessAccountId) {
      return NextResponse.json({
        error: "Add a WhatsApp access token and Business Account ID in Setup before publishing to Meta.",
      }, { status: 400 });
    }

    const apiVersion = settings.apiVersion || "v23.0";
    let metaFlowId = currentFlow.metaFlowId;

    if (metaFlowId) {
      const metaStatus = await getMetaFlowStatus({
        apiVersion,
        metaFlowId,
        accessToken: settings.accessToken,
      });
      if (metaStatus === "PUBLISHED") {
        const publishedFlow = await updateFlow(userId, id, {
          businessAccountId: settings.businessAccountId,
          name: currentFlow.name,
          description: currentFlow.description,
          category: currentFlow.category,
          status: "PUBLISHED",
          flowJson: currentFlow.flowJson,
          screenConfig: currentFlow.screenConfig,
        });
        if (!publishedFlow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });
        return NextResponse.json({
          success: true,
          data: publishedFlow,
        });
      }
      if (metaStatus !== "DRAFT") {
        return NextResponse.json({
          error: `This Flow is ${metaStatus.toLowerCase()} in Meta and cannot be published again.`,
        }, { status: 409 });
      }
    }

    const flowJson = generateFlowJson(screenConfig);
    const savedFlow = await updateFlow(userId, id, {
      businessAccountId: settings.businessAccountId,
      name,
      description: description || null,
      category: category as FlowCategory,
      status: "DRAFT",
      flowJson,
      screenConfig,
    });
    if (!savedFlow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });

    if (!metaFlowId) {
      metaFlowId = await createMetaFlow({
        apiVersion,
        businessAccountId: settings.businessAccountId,
        accessToken: settings.accessToken,
        name,
        category: category as FlowCategory,
      });
      const linked = await setMetaFlowId(userId, id, metaFlowId);
      if (!linked) {
        return NextResponse.json({
          error: "Meta created a draft Flow, but WaChat could not link it. Contact support with Meta Flow ID: " + metaFlowId,
        }, { status: 500 });
      }
    }

    await uploadMetaFlowJson({
      apiVersion,
      metaFlowId,
      accessToken: settings.accessToken,
      flowJson,
    });
    await publishMetaFlow({
      apiVersion,
      metaFlowId,
      accessToken: settings.accessToken,
    });

    const publishedFlow = await updateFlow(userId, id, {
      businessAccountId: settings.businessAccountId,
      name,
      description: description || null,
      category: category as FlowCategory,
      status: "PUBLISHED",
      flowJson,
      screenConfig,
    });
    if (!publishedFlow) {
      return NextResponse.json({
        error: `Meta published this Flow, but WaChat could not update its status. Meta Flow ID: ${metaFlowId}`,
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: publishedFlow });
  } catch (error) {
    if (error instanceof MetaFlowApiError) {
      return NextResponse.json({
        error: error.message,
        ...(error.validationErrors.length ? { details: error.validationErrors } : {}),
      }, { status: error.validationErrors.length ? 422 : 502 });
    }
    console.error("[Flows Publish] Failed to publish flow to Meta:", error);
    return NextResponse.json({ error: "Failed to publish Flow to Meta." }, { status: 500 });
  }
}
