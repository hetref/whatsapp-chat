import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { isWhatsAppSetupComplete } from "@/lib/whatsapp-setup";
import { getMetaFlowStatus, MetaFlowApiError, deleteMetaFlow } from "@/lib/flows/meta-api";
import { generateFlowJson, validateFlowConfig } from "@/lib/flows/flow-json";
import {
  deleteFlow,
  getFlow,
  isFlowBuilderConfig,
  isRecord,
  updateFlow,
} from "@/lib/flows/flow-store";
import { FLOW_CATEGORIES, type FlowCategory, type FlowStatus } from "@/lib/flows/flow-types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FLOW_STATUSES: FlowStatus[] = ["DRAFT", "PUBLISHED", "DEPRECATED"];

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isWhatsAppSetupComplete(userId))) {
      return NextResponse.json({ error: "Complete WhatsApp setup to access Flows." }, { status: 403 });
    }
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid Flow ID." }, { status: 400 });

    const flow = await getFlow(userId, id);
    if (!flow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: flow });
  } catch (error) {
    console.error("[Flows GET] Failed to load flow:", error);
    return NextResponse.json({ error: "Failed to load flow." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isWhatsAppSetupComplete(userId))) {
      return NextResponse.json({ error: "Complete WhatsApp setup to access Flows." }, { status: 403 });
    }
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid Flow ID." }, { status: 400 });
    const currentFlow = await getFlow(userId, id);
    if (!currentFlow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });
    if (currentFlow.metaFlowId && currentFlow.status === "PUBLISHED") {
      return NextResponse.json({
        error: "This Flow is published in Meta and cannot be edited. Duplicate it to make changes.",
      }, { status: 409 });
    }

    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = body.category;
    const status = body.status;
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
    if (typeof status !== "string" || !FLOW_STATUSES.includes(status as FlowStatus)) {
      return NextResponse.json({ error: "Choose a valid Flow status." }, { status: 400 });
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
      select: { accessToken: true, apiVersion: true, businessAccountId: true },
    });
    if (currentFlow.metaFlowId) {
      if (!settings?.accessToken) {
        return NextResponse.json({
          error: "Reconnect WhatsApp in Setup before editing this Flow.",
        }, { status: 400 });
      }

      const metaStatus = await getMetaFlowStatus({
        apiVersion: settings.apiVersion || "v23.0",
        metaFlowId: currentFlow.metaFlowId,
        accessToken: settings.accessToken,
      });
      if (metaStatus !== "DRAFT") {
        return NextResponse.json({
          error: "This Flow is no longer a draft in Meta and cannot be edited there.",
        }, { status: 409 });
      }
    }
    const flow = await updateFlow(userId, id, {
      businessAccountId: settings?.businessAccountId ?? null,
      name,
      description: description || null,
      category: category as FlowCategory,
      status: status as FlowStatus,
      flowJson: generateFlowJson(screenConfig),
      screenConfig,
    });
    if (!flow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: flow });
  } catch (error) {
    if (error instanceof MetaFlowApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[Flows PUT] Failed to update flow:", error);
    return NextResponse.json({ error: "Failed to update flow." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isWhatsAppSetupComplete(userId))) {
      return NextResponse.json({ error: "Complete WhatsApp setup to access Flows." }, { status: 403 });
    }
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid Flow ID." }, { status: 400 });

    const flow = await getFlow(userId, id);
    if (!flow) return NextResponse.json({ error: "Flow not found." }, { status: 404 });
    if (flow.metaFlowId) {
      const settings = await prisma.userSettings.findUnique({
        where: { id: userId },
        select: { accessToken: true, apiVersion: true },
      });
      if (!settings?.accessToken) {
        return NextResponse.json({
          error: "Reconnect WhatsApp in Setup before deleting this Flow from Meta.",
        }, { status: 400 });
      }

      const apiVersion = settings.apiVersion || "v23.0";
      const metaStatus = await getMetaFlowStatus({
        apiVersion,
        metaFlowId: flow.metaFlowId,
        accessToken: settings.accessToken,
      });
      if (metaStatus === "PUBLISHED") {
        return NextResponse.json({
          error: "This Flow is published in Meta and cannot be deleted.",
        }, { status: 409 });
      }

      await deleteMetaFlow({
        apiVersion,
        metaFlowId: flow.metaFlowId,
        accessToken: settings.accessToken,
      });
    }

    const deleted = await deleteFlow(userId, id);
    if (!deleted) return NextResponse.json({ error: "Flow not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MetaFlowApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[Flows DELETE] Failed to delete flow:", error);
    return NextResponse.json({ error: "Failed to delete flow." }, { status: 500 });
  }
}
