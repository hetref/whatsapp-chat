

## Base URL

| URL | Description |
|-----|-------------|
| https://graph.facebook.com |  |

## APIs

| Method | Endpoint |
|--------|----------|
| GET | [/{Version}/{Phone-Number-ID}/call_permissions](#get-version-phone-number-id-call-permissions) |
| POST | [/{Version}/{Phone-Number-ID}/calls](#post-version-phone-number-id-calls) |

<jumplink id="get-version-phone-number-id-call-permissions"></jumplink>
## GET /{Version}/{Phone-Number-ID}/call_permissions

Check Call Permissions

Check whether you have permission to call a WhatsApp user and what actions are available. This endpoint returns the current permission status for calling a specific user, along with available actions and their limits.

**Permission Status:**
- `granted`: You have active permission to call this user - `pending`: A permission request has been sent but not yet approved - `denied`: The user has denied call permissions - `expired`: Previous permission has expired

**Available Actions:**
- `start_call`: Initiate a new call to this user - `send_call_permission_request`: Send a permission request to this user

**Error Handling:**
This endpoint may return various error codes including rate limiting errors if too many permission checks are made within a short period.


### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |
| Content-Type | One of "application/json", "application/x-www-form-urlencoded", "multipart/form-data" | ✓ | Media type of the request body |

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_wa_id | string | ✓ | The WhatsApp ID of the user you want to check call permissions for |

### Responses

**200**

Call Permissions Check Success

**Content Type**: `application/json`

**Schema**: [CallPermissionCheckResponsePayload](#callpermissioncheckresponsepayload)

**400**

Bad Request - Invalid request parameters

**Content Type**: `application/json`

**Schema**: [ErrorResponse](#errorresponse)

**403**

Forbidden - Insufficient permissions

**Content Type**: `application/json`

**Schema**: [ErrorResponse](#errorresponse)

**500**

Internal Server Error - An unexpected error occurred

**Content Type**: `application/json`

**Schema**: [ErrorResponse](#errorresponse)


<jumplink id="post-version-phone-number-id-calls"></jumplink>
## POST /{Version}/{Phone-Number-ID}/calls

Manage Calls

Use this endpoint to initiate, accept, reject, or terminate WhatsApp calls.

**For initiating or managing a call:**
Send a POST request with the appropriate action (connect, pre_accept, accept, reject, terminate).

**For terminating a call:**
Send a POST request with action "terminate" and the call_id.

**Note:** Response with error code 138006 indicates a lack of a call request permission for this business number from the WhatsApp user.


### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |
| Content-Type | One of "application/json", "application/x-www-form-urlencoded", "multipart/form-data" | ✓ | Media type of the request body |

### Request Body (Optional)

**Content Type**: `application/json`

**Schema**: Must be one of: [CallRequestPayload](#callrequestpayload), [CallTerminateRequestPayload](#callterminaterequestpayload)

### Responses

**200**

Call Management Success

**Content Type**: `application/json`

**Schema**: Must be one of: [CallResponsePayload](#callresponsepayload), [CallTerminateResponsePayload](#callterminateresponsepayload)


# Components

## Schemas

<jumplink id="callpermissioncheckresponsepayload"></jumplink>
### CallPermissionCheckResponsePayload

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | string | ✓ | Messaging product |
| permission | [Permission](#object-permission-1) | ✓ | Call permission details |
| actions | array of [Actions](#object-actions-3) |  | Available actions and their restrictions |

<jumplink id="callrequestpayload"></jumplink>
### CallRequestPayload

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | string | ✓ | Messaging product |
| to | string | ✓ | The number being called (callee) |
| action | One of "accept", "connect", "media_update", "pre_accept", "reject", "terminate" | ✓ | The action being taken on the given call ID |
| session | [Session](#object-session-4) |  | Contains the session description protocol (SDP) type and description language |
| biz_opaque_callback_data | string |  | An arbitrary string you can pass in that is useful for tracking and logging purposes. Any app subscribed to the "calls" webhook field on your WhatsApp Business Account can receive this string, as it is included in the calls object within the subsequent Call Terminate Webhook payload. Cloud API does not process this field. Maximum 512 characters |

<jumplink id="callterminaterequestpayload"></jumplink>
### CallTerminateRequestPayload

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | string | ✓ | Messaging product |
| call_id | string | ✓ | The WhatsApp call ID |
| action | "terminate" | ✓ | Action to terminate the call |

<jumplink id="callresponsepayload"></jumplink>
### CallResponsePayload

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | string |  |  |
| calls | array of [Calls](#object-calls-5) |  |  |

<jumplink id="callterminateresponsepayload"></jumplink>
### CallTerminateResponsePayload

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean |  |  |

## Inline Object Definitions

<jumplink id="object-permission-1"></jumplink>
### Permission

Call permission details

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| status | One of "granted", "pending", "denied", "expired" | ✓ | Current permission status for calling this user |
| expiration_time | integer (int64) |  | Unix timestamp when the permission expires (if applicable) |

<jumplink id="object-limits-2"></jumplink>
### Limits

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| time_period | string | ✓ | Time period for the limit |
| current_usage | integer | ✓ | Current usage count |
| max_allowed | integer | ✓ | Maximum allowed usage |
| limit_expiration_time | integer (int64) |  | Unix timestamp when the limit resets |

<jumplink id="object-actions-3"></jumplink>
### Actions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| action_name | One of "start_call", "send_call_permission_request" | ✓ | Name of the action |
| can_perform_action | boolean | ✓ | Whether the business can perform this action |
| limits | array of [Limits](#object-limits-2) |  | Rate limits for this action |

<jumplink id="object-session-4"></jumplink>
### Session

Contains the session description protocol (SDP) type and description language

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| sdp_type | One of "offer", "answer" | ✓ | SDP type - "offer" for connect action, "answer" for accept action |
| sdp | string | ✓ | The SDP info of the device on the other end of the call. The SDP must be compliant with RFC 8866 |

<jumplink id="object-calls-5"></jumplink>
### Calls

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string |  |  |

## Authentication

| Scheme | Type | Location |
|--------|------|----------|
| bearerAuth | HTTP Bearer | Header: `Authorization` |

### Usage Examples

- **bearerAuth**: Include `Authorization: Bearer your-token-here` in request headers

### Global Authentication Requirements

All endpoints require: bearerAuth
