import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@/lib/prisma";
import type { FlowBuilderConfig, FlowCategory, FlowStatus, StoredFlow } from "./flow-types";

const FLOW_COLUMNS = `
  id::text AS "id",
  name AS "name",
  description AS "description",
  category AS "category",
  status::text AS "status",
  meta_flow_id AS "metaFlowId",
  flow_json AS "flowJson",
  screen_config AS "screenConfig",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export async function listFlows(userId: string): Promise<StoredFlow[]> {
  return prisma.$queryRaw<StoredFlow[]>`
    SELECT ${Prisma.raw(FLOW_COLUMNS)}
    FROM "whatsapp_flows"
    WHERE "user_id" = ${userId}
    ORDER BY "updated_at" DESC
  `;
}

export async function getFlow(userId: string, id: string): Promise<StoredFlow | null> {
  const rows = await prisma.$queryRaw<StoredFlow[]>`
    SELECT ${Prisma.raw(FLOW_COLUMNS)}
    FROM "whatsapp_flows"
    WHERE "user_id" = ${userId} AND "id" = ${id}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createFlow(input: {
  userId: string;
  businessAccountId: string | null;
  name: string;
  description: string | null;
  category: FlowCategory;
  status: FlowStatus;
  flowJson: Record<string, unknown>;
  screenConfig: FlowBuilderConfig;
}): Promise<StoredFlow> {
  const rows = await prisma.$queryRaw<StoredFlow[]>`
    INSERT INTO "whatsapp_flows" (
      "id", "user_id", "business_account_id", "name", "description",
      "category", "status", "flow_json", "screen_config", "created_at", "updated_at"
    ) VALUES (
      ${randomUUID()}::uuid, ${input.userId}, ${input.businessAccountId},
      ${input.name}, ${input.description}, ${input.category},
      ${input.status}::"WhatsAppFlowStatus", ${JSON.stringify(input.flowJson)}::jsonb,
      ${JSON.stringify(input.screenConfig)}::jsonb, now(), now()
    )
    RETURNING ${Prisma.raw(FLOW_COLUMNS)}
  `;
  return rows[0];
}

export async function updateFlow(
  userId: string,
  id: string,
  input: {
    businessAccountId: string | null;
    name: string;
    description: string | null;
    category: FlowCategory;
    status: FlowStatus;
    flowJson: Record<string, unknown>;
    screenConfig: FlowBuilderConfig;
  },
): Promise<StoredFlow | null> {
  const rows = await prisma.$queryRaw<StoredFlow[]>`
    UPDATE "whatsapp_flows"
    SET
      "business_account_id" = ${input.businessAccountId},
      "name" = ${input.name},
      "description" = ${input.description},
      "category" = ${input.category},
      "status" = ${input.status}::"WhatsAppFlowStatus",
      "flow_json" = ${JSON.stringify(input.flowJson)}::jsonb,
      "screen_config" = ${JSON.stringify(input.screenConfig)}::jsonb,
      "updated_at" = now()
    WHERE "user_id" = ${userId} AND "id" = ${id}::uuid
    RETURNING ${Prisma.raw(FLOW_COLUMNS)}
  `;
  return rows[0] ?? null;
}

export async function setMetaFlowId(userId: string, id: string, metaFlowId: string): Promise<boolean> {
  const count = await prisma.$executeRaw`
    UPDATE "whatsapp_flows"
    SET "meta_flow_id" = ${metaFlowId}, "updated_at" = now()
    WHERE "user_id" = ${userId} AND "id" = ${id}::uuid
      AND ("meta_flow_id" IS NULL OR "meta_flow_id" = ${metaFlowId})
  `;
  return count > 0;
}

export async function deleteFlow(userId: string, id: string): Promise<boolean> {
  const count = await prisma.$executeRaw`
    DELETE FROM "whatsapp_flows"
    WHERE "user_id" = ${userId} AND "id" = ${id}::uuid
  `;
  return count > 0;
}

export function isFlowBuilderConfig(value: unknown): value is FlowBuilderConfig {
  if (!isRecord(value) || !Array.isArray(value.screens)) return false;
  return value.screens.every((screen) => {
    if (!isRecord(screen) || !Array.isArray(screen.components)) return false;
    if (typeof screen.id !== "string" || typeof screen.title !== "string") return false;
    if (typeof screen.terminal !== "boolean") return false;
    if (screen.nextScreenId !== null && typeof screen.nextScreenId !== "string") return false;
    return screen.components.every((component) => {
      if (!isRecord(component)) return false;
      return (
        typeof component.id === "string" &&
        typeof component.type === "string" &&
        typeof component.name === "string" &&
        typeof component.label === "string" &&
        typeof component.text === "string" &&
        typeof component.placeholder === "string" &&
        typeof component.helperText === "string" &&
        typeof component.required === "boolean" &&
        (component.inputType === "text" || component.inputType === "email" ||
          component.inputType === "number" || component.inputType === "phone") &&
        typeof component.minChars === "number" &&
        typeof component.maxChars === "number" &&
        typeof component.minDate === "string" &&
        typeof component.maxDate === "string" &&
        typeof component.minSelections === "number" &&
        typeof component.maxSelections === "number" &&
        Array.isArray(component.options) &&
        component.options.every(
          (option) =>
            isRecord(option) &&
            typeof option.id === "string" &&
            typeof option.title === "string",
        )
      );
    });
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
