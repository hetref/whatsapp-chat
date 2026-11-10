import type { FlowCategory } from "./flow-types";

type MetaResponse = Record<string, unknown>;

export class MetaFlowApiError extends Error {
  constructor(
    message: string,
    readonly validationErrors: unknown[] = [],
  ) {
    super(message);
    this.name = "MetaFlowApiError";
  }
}

function getErrorMessage(body: MetaResponse): string {
  const error = body.error;
  if (typeof error === "object" && error !== null && "message" in error &&
      typeof error.message === "string") {
    return error.message;
  }
  return "Meta rejected the WhatsApp Flow request.";
}

async function requestMeta(
  url: string,
  accessToken: string,
  init: RequestInit,
): Promise<MetaResponse> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  const body: unknown = await response.json();
  if (!response.ok || typeof body !== "object" || body === null || Array.isArray(body)) {
    const responseBody = typeof body === "object" && body !== null && !Array.isArray(body)
      ? body as MetaResponse
      : {};
    throw new MetaFlowApiError(getErrorMessage(responseBody));
  }

  const result = body as MetaResponse;
  if (result.success === false) {
    throw new MetaFlowApiError(getErrorMessage(result));
  }
  const validationErrors = Array.isArray(result.validation_errors) ? result.validation_errors : [];
  if (validationErrors.length > 0) {
    throw new MetaFlowApiError(
      "Meta found validation errors in the Flow JSON. Fix them before publishing.",
      validationErrors,
    );
  }
  return result;
}

function graphUrl(apiVersion: string, path: string): string {
  return `https://graph.facebook.com/${apiVersion}/${path}`;
}

export async function createMetaFlow(input: {
  apiVersion: string;
  businessAccountId: string;
  accessToken: string;
  name: string;
  category: FlowCategory;
}): Promise<string> {
  const result = await requestMeta(
    graphUrl(input.apiVersion, `${encodeURIComponent(input.businessAccountId)}/flows`),
    input.accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input.name, categories: [input.category] }),
    },
  );
  if (typeof result.id !== "string" || !result.id) {
    throw new MetaFlowApiError("Meta created the Flow but did not return its ID.");
  }
  return result.id;
}

export async function uploadMetaFlowJson(input: {
  apiVersion: string;
  metaFlowId: string;
  accessToken: string;
  flowJson: Record<string, unknown>;
}): Promise<void> {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([JSON.stringify(input.flowJson)], { type: "application/json" }),
    "flow.json",
  );
  formData.append("name", "flow.json");
  formData.append("asset_type", "FLOW_JSON");

  await requestMeta(
    graphUrl(input.apiVersion, `${encodeURIComponent(input.metaFlowId)}/assets`),
    input.accessToken,
    { method: "POST", body: formData },
  );
}

export async function getMetaFlowStatus(input: {
  apiVersion: string;
  metaFlowId: string;
  accessToken: string;
}): Promise<string> {
  const result = await requestMeta(
    `${graphUrl(input.apiVersion, encodeURIComponent(input.metaFlowId))}?fields=status`,
    input.accessToken,
    { method: "GET" },
  );
  if (typeof result.status !== "string") {
    throw new MetaFlowApiError("Meta did not return the Flow status.");
  }
  return result.status;
}

export async function publishMetaFlow(input: {
  apiVersion: string;
  metaFlowId: string;
  accessToken: string;
}): Promise<void> {
  await requestMeta(
    graphUrl(input.apiVersion, `${encodeURIComponent(input.metaFlowId)}/publish`),
    input.accessToken,
    { method: "POST" },
  );
}

export async function deleteMetaFlow(input: {
  apiVersion: string;
  metaFlowId: string;
  accessToken: string;
}): Promise<void> {
  await requestMeta(
    graphUrl(input.apiVersion, encodeURIComponent(input.metaFlowId)),
    input.accessToken,
    { method: "DELETE" },
  );
}
