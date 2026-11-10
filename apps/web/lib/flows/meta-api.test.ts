import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetaFlow,
  publishMetaFlow,
  uploadMetaFlowJson,
} from "./meta-api";

test("creates, uploads, and publishes a Flow using the connected WABA", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init: init ?? {} });
    const body = requests.length === 1 ? { id: "meta-flow-123" } : { success: true };
    return new Response(JSON.stringify(body), { status: 200 });
  };

  try {
    const metaFlowId = await createMetaFlow({
      apiVersion: "v23.0",
      businessAccountId: "waba-456",
      accessToken: "test-token",
      name: "Appointment request",
      category: "APPOINTMENT_BOOKING",
    });
    await uploadMetaFlowJson({
      apiVersion: "v23.0",
      metaFlowId,
      accessToken: "test-token",
      flowJson: { version: "7.3", screens: [] },
    });
    await publishMetaFlow({
      apiVersion: "v23.0",
      metaFlowId,
      accessToken: "test-token",
    });

    assert.equal(requests.length, 3);
    assert.equal(requests[0].url, "https://graph.facebook.com/v23.0/waba-456/flows");
    assert.deepEqual(JSON.parse(String(requests[0].init.body)), {
      name: "Appointment request",
      categories: ["APPOINTMENT_BOOKING"],
    });
    assert.equal(requests[1].url, "https://graph.facebook.com/v23.0/meta-flow-123/assets");
    const formData = requests[1].init.body as FormData;
    assert.equal(formData.get("name"), "flow.json");
    assert.equal(formData.get("asset_type"), "FLOW_JSON");
    assert.equal((formData.get("file") as File).name, "flow.json");
    assert.equal(requests[2].url, "https://graph.facebook.com/v23.0/meta-flow-123/publish");
    assert.equal(requests[2].init.method, "POST");
    assert.equal(new Headers(requests[2].init.headers).get("authorization"), "Bearer test-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
