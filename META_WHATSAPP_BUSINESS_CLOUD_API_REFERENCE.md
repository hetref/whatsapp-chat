# Meta WhatsApp Business Platform: Complete Integration Reference

## 1. Scope

This document is a pure Meta WhatsApp Business Platform reference for building a full integration.

It covers:

- Account connection and required credentials
- Webhook verification and webhook event processing
- Sending and receiving text, template, and media messages
- Media upload/download lifecycle and constraints
- Template lifecycle: create, fetch, edit, delete
- Delivery statuses, errors, quality controls, and operational rules

It intentionally avoids framework-specific implementation details.

---

## 2. Core Concepts and Identifiers

A production integration must handle these identifiers and secrets:

- `access_token`: Bearer token used in Graph API Authorization header
- `api_version`: Graph API version, e.g. `v23.0`
- `phone_number_id`: Sender phone identity for message/media endpoints
- `business_account_id` (WABA ID): Template-management scope and account-level actions
- `verify_token`: Shared secret used during webhook verification handshake
- `app_secret`: Used to verify webhook signature (`X-Hub-Signature-256`)

Base URL:

- `https://graph.facebook.com`

Primary endpoint families:

- Messages: `POST /{version}/{phone_number_id}/messages`
- Media upload: `POST /{version}/{phone_number_id}/media`
- Media metadata URL: `GET /{version}/{media_id}`
- Media delete: `DELETE /{version}/{media_id}`
- Templates list/create/delete by WABA: `/{version}/{business_account_id}/message_templates`
- Template get/edit by template ID: `/{version}/{template_id}`

---

## 3. Connecting a Business WhatsApp Account

## 3.1 Required Meta Setup

1. Create/select a Meta App with WhatsApp product enabled.
2. Connect a WhatsApp Business Account (WABA) and phone number.
3. Obtain:
   - `phone_number_id`
   - `business_account_id`
   - long-lived or system-user `access_token`
4. Ensure token has required permissions for your use case:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - optionally business-management scopes depending on org setup

## 3.2 Webhook Setup

Register a callback URL and verify token in Meta Developer settings.

Webhook verification request from Meta:

- Method: `GET`
- Query params:
  - `hub.mode`
  - `hub.verify_token`
  - `hub.challenge`

Verification rule:

- If `hub.mode == "subscribe"` and verify token matches your stored verify token, return `200` with raw `hub.challenge` text body.
- Otherwise return `403`.

Recommended security:

- Validate `X-Hub-Signature-256` using your app secret for webhook POST payload authenticity.

---

## 4. High-Level Messaging Rules

## 4.1 Session vs Template Messaging

- User-initiated 24-hour customer service window:
  - After a user messages the business, non-template free-form messages are allowed for 24 hours.
- Outside the 24-hour window:
  - Only approved template messages are allowed.

## 4.2 Opt-In and Policy

- You must have user opt-in before sending business-initiated messages.
- Message content must follow Meta/WhatsApp policy rules.
- Repeated negative feedback reduces template quality and can cause template pausing or disabling.

## 4.3 Delivery Order

- Delivery order is not guaranteed to match API request order.
- For strict sequence, send next message only after receiving status webhook indicating delivered/read for prior message.

---

## 5. Sending Messages

Common request headers:

- `Authorization: Bearer <access_token>`
- `Content-Type: application/json` (or multipart for media upload)

Common send endpoint:

- `POST /{version}/{phone_number_id}/messages`

Common required fields:

- `messaging_product: "whatsapp"`
- `to: "<E164_or_digits>"`
- `type: "text" | "template" | "image" | "video" | "audio" | "document" | ...`

## 5.1 Send Text Message

Example request body:

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "16505551234",
  "type": "text",
  "text": {
    "body": "Hello from WhatsApp Cloud API"
  }
}
```

Notes:

- Text body practical limit is commonly treated as 4096 chars.
- `to` should be normalized to digits with country code.

## 5.2 Send Template Message

Example request body (positional parameters):

```json
{
  "messaging_product": "whatsapp",
  "to": "16505551234",
  "type": "template",
  "template": {
    "name": "order_confirmation",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "John" },
          { "type": "text", "text": "ORD-12345" }
        ]
      }
    ]
  }
}
```

Media header template send example:

```json
{
  "messaging_product": "whatsapp",
  "to": "16505551234",
  "type": "template",
  "template": {
    "name": "invoice_with_pdf",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "document",
            "document": { "id": "<MEDIA_ID>" }
          }
        ]
      }
    ]
  }
}
```

Rules:

- Template must be approved before send.
- Template can be held/paused by quality systems.
- If using named parameters, parameter names must match template definitions.

## 5.3 Send Media Message

You can send media by:

- `id` (preferred when uploaded through WhatsApp media endpoint)
- `link` (publicly accessible URL, often presigned)

Example image by ID:

```json
{
  "messaging_product": "whatsapp",
  "to": "16505551234",
  "type": "image",
  "image": {
    "id": "<MEDIA_ID>",
    "caption": "Product image"
  }
}
```

Example document by link:

```json
{
  "messaging_product": "whatsapp",
  "to": "16505551234",
  "type": "document",
  "document": {
    "link": "https://example.com/invoice.pdf",
    "filename": "invoice.pdf",
    "caption": "Invoice"
  }
}
```

Audio note:

- Audio messages do not use caption.

## 5.4 Mark Message as Read

Read receipt call uses the same messages endpoint.

Example:

```json
{
  "messaging_product": "whatsapp",
  "status": "read",
  "message_id": "<wamid>"
}
```

---

## 6. Receiving Messages (Webhook)

## 6.1 Incoming Message Event Structure

Incoming user message webhooks contain `messages` array:

- `object: "whatsapp_business_account"`
- `entry[].changes[].value.messages[]`
- `entry[].changes[].value.contacts[]`
- `entry[].changes[].value.metadata.phone_number_id`

Common message fields:

- `id` (wamid)
- `from` (user wa_id)
- `timestamp`
- `type`
- type-specific object: `text`, `image`, `document`, `audio`, `video`, `sticker`, etc.

## 6.2 Outgoing Status Event Structure

Message status webhooks contain `statuses` array:

- statuses like `sent`, `delivered`, `read`, and errors
- include `recipient_id`, `conversation`, and `pricing` metadata

Important:

- A single outbound message can trigger multiple status webhooks.
- Status webhooks do not include original message body.

## 6.3 Webhook Processing Rules

- Always return `200 OK` quickly after receiving and queue heavy processing.
- Use message ID (`wamid`) as idempotency key to avoid duplicate inserts.
- Handle errors in these locations:
  - `entry.changes.value.errors`
  - `messages[].errors`
  - `statuses[].errors`

---

## 7. Media Lifecycle

## 7.1 Upload Media (Outbound)

Endpoint:

- `POST /{version}/{phone_number_id}/media` (multipart form-data)

Required form fields:

- `messaging_product=whatsapp`
- `file=@/path/file.ext;type=<mime>`
- `type=<mime>`

Success response includes:

- `id` (media ID)

## 7.2 Get Media URL

Endpoint:

- `GET /{version}/{media_id}`

Response contains temporary `url`.

Rules:

- Media URL validity is short-lived (about 5 minutes).
- If URL expires, query media ID again for a fresh URL.

## 7.3 Download Media

- Perform `GET <media_url>` with Bearer token.
- If 404 occurs, refresh media URL by querying media ID again.

## 7.4 Delete Media

Endpoint:

- `DELETE /{version}/{media_id}`

Response:

- `{ "success": true }` on successful deletion.

## 7.5 Media Expiry and Availability

- Media uploaded via media endpoint persists up to 30 days unless deleted earlier.
- Media IDs from inbound webhook events may only be downloadable for about 7 days.

---

## 8. Supported Media Types and Size Limits

Cloud API supported examples (from Meta docs):

## 8.1 Audio (max 16 MB)

- `audio/aac` (`.aac`)
- `audio/amr` (`.amr`)
- `audio/mpeg` (`.mp3`)
- `audio/mp4` (`.m4a`)
- `audio/ogg` (`.ogg`, OPUS codecs, mono)

## 8.2 Video (max 16 MB)

- `video/mp4` (`.mp4`)
- `video/3gpp` (`.3gp`)

Video compatibility note:

- Prefer H.264 Main/Baseline profile and AAC audio for better device compatibility.

## 8.3 Images

- `image/jpeg` (`.jpeg`) up to 5 MB
- `image/png` (`.png`) up to 5 MB
- `image/webp` is used for stickers (sticker-specific limits)

## 8.4 Documents (max 100 MB)

- `application/pdf`
- `text/plain`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `application/vnd.ms-powerpoint`
- `application/vnd.openxmlformats-officedocument.presentationml.presentation`

## 8.5 Sticker Limits

- Static WebP: 100 KB
- Animated WebP: 500 KB

Operational note:

- Inbound media over platform limit can trigger webhook error code such as `131052`.

---

## 9. Template Lifecycle

## 9.1 Create Template

Endpoint:

- `POST /{version}/{business_account_id}/message_templates`

Core fields:

- `name`
- `category` (`MARKETING`, `UTILITY`, `AUTHENTICATION`)
- `language` (e.g. `en_US`)
- `components`
- optional `parameter_format` (`named` or `positional`)
- optional `message_send_ttl_seconds`

Creation constraints and rules:

- Name max length: 512
- Name format generally lowercase alphanumeric and underscore
- Variables require example values during creation
- Only approved templates can be sent
- Template creation review is automatic

Throughput/limits:

- Up to 100 template creations per WABA per hour
- Total template capacity depends on business verification state

## 9.2 List Templates

Endpoint:

- `GET /{version}/{business_account_id}/message_templates`

Useful query params:

- `fields`
- `limit`
- `status`
- `name` (for filtering by name)

## 9.3 Get Template by ID

Endpoint:

- `GET /{version}/{template_id}`

Useful fields:

- `id`, `name`, `status`, `category`, `language`, `components`, `quality_score`, rejection reason fields

## 9.4 Edit Template

Endpoint:

- `POST /{version}/{template_id}`

Rules:

- Editing triggers review/approval lifecycle again.
- Edit availability and acceptable fields can depend on current status/policy constraints.
- If edit is restricted for your case, standard operational fallback is to create a new template version and route sends to it.

## 9.5 Delete Template

Endpoint:

- `DELETE /{version}/{business_account_id}/message_templates`

Query params:

- `name` (template name)
- or `hsm_id` depending endpoint usage

Response usually:

```json
{ "success": true }
```

## 9.6 Template Quality and Status

Common status values:

- `APPROVED`
- `PENDING` / in review
- `REJECTED`
- `PAUSED`
- `DISABLED`

Important behavior:

- `PAUSED` and `DISABLED` templates cannot be sent.
- Template quality signals and pacing can reduce delivery or pause templates.
- Status changes can be consumed via template status webhooks.

---

## 10. Template Component Rules (Practical Validation Baseline)

These are safe baseline validation rules commonly enforced before API submission:

- Exactly one `BODY` component required
- At most one `HEADER`
- At most one `FOOTER`
- At most one `BUTTONS`
- Footer should not contain variables
- BODY text max around 1024 chars
- FOOTER text max around 60 chars
- Button text max around 25 chars
- Total buttons max around 10
- URL button requires URL field
- Phone button requires phone number field
- For variable placeholders, ensure example values count matches variable count

Parameter styles:

- Positional: `{{1}}`, `{{2}}`, ...
- Named: `{{first_name}}`, `{{order_number}}`, ...

---

## 11. End-to-End Request Flows

## 11.1 Connect Account Flow

1. Collect `access_token`, `phone_number_id`, `business_account_id`, `api_version`, `verify_token`.
2. Register webhook callback URL and token in Meta.
3. Respond to verification `GET` with `hub.challenge`.
4. Subscribe to relevant webhook fields (`messages`, status updates, template status updates as needed).
5. Validate inbound webhook signatures.

## 11.2 Send Text Flow

1. Normalize recipient phone.
2. Build text payload.
3. `POST /messages`.
4. Persist returned message ID (`wamid`).
5. Consume status webhooks for lifecycle (`sent`, `delivered`, `read`, errors).

## 11.3 Send Template Flow

1. Ensure template status is approved.
2. Build template payload with language and components/parameters.
3. Send via `POST /messages`.
4. Persist message ID.
5. Track quality/pausing outcomes via webhook and template status checks.

## 11.4 Send Media Flow (Upload then Send)

1. Upload media to WhatsApp via `POST /media` to get `media_id`.
2. Send message via `POST /messages` with media object (`id` or `link`).
3. Persist message ID and media metadata.
4. Track delivery via status webhooks.

## 11.5 Receive Media Flow (Inbound)

1. Receive webhook with inbound message (`messages[]`) containing media info and media ID.
2. Resolve media URL using `GET /{media_id}`.
3. Download media with Bearer token before URL expiry.
4. Store media securely.
5. Acknowledge webhook quickly (`200 OK`).

## 11.6 Template CRUD Flow

- Create: `POST /{waba_id}/message_templates`
- Read list: `GET /{waba_id}/message_templates`
- Read by ID: `GET /{template_id}`
- Edit: `POST /{template_id}`
- Delete: `DELETE /{waba_id}/message_templates?name=<template_name>`

---

## 12. Error Handling and Reliability Rules

## 12.1 Transport and API Errors

- Retry only safe/idempotent operations with backoff.
- Do not blindly retry policy/validation errors.
- Preserve and log Meta error object fields:
  - `code`
  - `error_subcode`
  - `type`
  - `message`
  - `error_user_msg`
  - `fbtrace_id`

## 12.2 Common Operational Error Patterns

- Expired/invalid token
- Invalid recipient format
- Unsupported media type or mismatched MIME
- Media too large
- Template not approved or paused
- Message outside service window without template

## 12.3 Idempotency

- Inbound: dedupe by inbound `wamid`.
- Outbound: track your request IDs and returned `wamid` to avoid duplicate sends on retries.

---

## 13. Security and Compliance Baseline

- Never expose permanent access tokens to client devices.
- Store credentials encrypted at rest.
- Verify webhook signatures (`X-Hub-Signature-256`).
- Use least-privilege tokens and rotate periodically.
- Enforce user consent and opt-in evidence for business-initiated messaging.
- Redact sensitive fields from logs (tokens, personally identifying metadata where required).

---

## 14. Minimal Payload Examples (Copy-Ready)

## 14.1 Webhook Verify Response Behavior

Request:

- `GET /webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>`

Success response:

- status `200`
- body exactly `<challenge>`

Failure response:

- status `403`

## 14.2 Send Media by Link

```json
{
  "messaging_product": "whatsapp",
  "to": "16505551234",
  "type": "video",
  "video": {
    "link": "https://example.com/file.mp4",
    "caption": "Demo video"
  }
}
```

## 14.3 Create Template (Utility)

```json
{
  "name": "order_update",
  "category": "UTILITY",
  "language": "en_US",
  "parameter_format": "positional",
  "components": [
    {
      "type": "BODY",
      "text": "Hello {{1}}, your order {{2}} is shipped.",
      "example": {
        "body_text": [["John", "ORD-12345"]]
      }
    }
  ]
}
```

## 14.4 Delete Template by Name

- `DELETE /{version}/{business_account_id}/message_templates?name=order_update`

---

## 15. Practical Checklist for a Complete Meta WhatsApp Integration

- Credentials collected and validated (`access_token`, `phone_number_id`, `business_account_id`, `api_version`)
- Webhook verification implemented (`hub.challenge` echo)
- Webhook signature validation enabled
- Inbound `messages[]` and outbound `statuses[]` both parsed
- Text, template, and media send payloads implemented
- Media lifecycle implemented (upload, resolve URL, download, delete as needed)
- Template lifecycle implemented (create/list/get/edit/delete)
- Template quality/status monitoring implemented
- Service-window and template-send rules enforced
- Idempotency and retry strategy defined
- Security and token rotation policy defined

---

## 16. Notes on Versioning

- Meta changes behavior and fields across Graph API versions.
- Pin a specific version in all requests and schedule periodic upgrade validation.
- Re-check supported media types, template rules, and status behaviors during upgrades.
