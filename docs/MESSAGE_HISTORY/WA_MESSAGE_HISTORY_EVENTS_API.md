

## Base URL

| URL | Description |
|-----|-------------|
| https://graph.facebook.com | Production Graph API server |

## APIs

| Method | Endpoint |
|--------|----------|
| GET | [/{Version}/{Message-History-ID}/events](#get-version-message-history-id-events) |

<jumplink id="get-version-message-history-id-events"></jumplink>
## GET /{Version}/{Message-History-ID}/events

Get WhatsApp Message History Events

Retrieve paginated message delivery status events for a specific message history entry,
including delivery status occurrences, timestamps, and application information.

**Use Cases:**
- Track detailed message delivery status events and transitions
- Monitor delivery status occurrence timestamps
- Retrieve application information for delivery events
- Debug message delivery issues and status changes

**Rate Limiting:**
Standard Graph API rate limits apply. Use appropriate retry logic with exponential backoff.

**Caching:**
Message history events can be cached for short periods, but delivery status events
may change frequently. Implement appropriate cache invalidation strategies.

**Pagination:**
This endpoint supports cursor-based pagination. Use the `after` and `before` cursors
from the response to navigate through results.


### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| Version | string | ✓ | Graph API version to use for this request. Determines the API behavior and available features. |
| Message-History-ID | string | ✓ | Your WhatsApp Business Message History ID. This ID is provided when you retrieve message history and can be found through message history APIs. |

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| delivery_status | [WhatsAppMessageDeliveryStatus](#whatsappmessagedeliverystatus) |  | Filter results by specific delivery status. When provided, only events with this delivery status will be returned. |
| fields | string |  | Comma-separated list of fields to include in the response. If not specified, default fields will be returned (cursor, node{id,delivery_status,occurrence_timestamp}). Available fields: cursor, node{id,delivery_status,error_description,occurrence_timestamp,status_timestamp,application,webhook_update_state,webhook_uri} |
| limit | integer [min: 1, max: 100] |  | Maximum number of message history events to return per page. Default is 25, maximum is 100. |
| after | string |  | Cursor for pagination. Use this to get the next page of results. This value comes from the `paging.cursors.after` field in previous responses. |
| before | string |  | Cursor for pagination. Use this to get the previous page of results. This value comes from the `paging.cursors.before` field in previous responses. |

### Responses

**200**

Successfully retrieved WhatsApp message history events

**Content Type**: `application/json`

**Schema**: [MessageHistoryEventsResponse](#messagehistoryeventsresponse)

**400**

Bad Request - Invalid parameters or malformed request

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "Invalid parameter: delivery_status must be a valid delivery status",
        "type": "OAuthException",
        "code": 100,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn"
    }
}\n```

**401**

Unauthorized - Invalid or missing access token

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "Invalid OAuth access token",
        "type": "OAuthException",
        "code": 190,
        "error_subcode": 463,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn"
    }
}\n```

**403**

Forbidden - Insufficient permissions or access denied

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "Your app doesn't have permission to access message history events for this resource",
        "type": "OAuthException",
        "code": 200,
        "error_subcode": 1349174,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn",
        "error_user_title": "Permission Denied",
        "error_user_msg": "Your app doesn't have permission to access this resource"
    }
}\n```

**404**

Not Found - Message History ID does not exist or is not accessible

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "WhatsApp Business Message History not found",
        "type": "GraphMethodException",
        "code": 803,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn"
    }
}\n```

**422**

Unprocessable Entity - Request parameters are valid but cannot be processed

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "The requested fields are not available for this message history",
        "type": "GraphMethodException",
        "code": 100,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn"
    }
}\n```

**500**

Internal Server Error - Unexpected server error

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "An unexpected error occurred. Please retry your request",
        "type": "GraphMethodException",
        "code": 2,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn",
        "is_transient": true
    }
}\n```


# Components

## Schemas

<jumplink id="whatsappmessagehistoryeventsedge"></jumplink>
### WhatsAppMessageHistoryEventsEdge

Edge containing message delivery status occurrence with pagination cursor

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| cursor | string |  | Pagination cursor for this edge |
| node | [WhatsAppBusinessMessageDeliveryStatusOccurrence](#whatsappbusinessmessagedeliverystatusoccurrence) | ✓ |  |

<jumplink id="whatsappbusinessmessagedeliverystatusoccurrence"></jumplink>
### WhatsAppBusinessMessageDeliveryStatusOccurrence

Message delivery status occurrence with detailed event information

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | ✓ | Unique identifier for the message delivery status occurrence |
| delivery_status | [WhatsAppMessageDeliveryStatus](#whatsappmessagedeliverystatus) | ✓ |  |
| error_description | string |  | Error description if the delivery encountered an error |
| occurrence_timestamp | integer (int64) | ✓ | Unix timestamp when the delivery status occurrence happened |
| status_timestamp | integer (int64) |  | Unix timestamp when the status was recorded |
| application | [ApplicationNode](#applicationnode) |  |  |
| webhook_update_state | One of "ERROR", "SUCCESS" |  | State of the webhook update for this delivery status event |
| webhook_uri | string (uri) |  | URI of the webhook that received this delivery status update |

<jumplink id="whatsappmessagedeliverystatus"></jumplink>
### WhatsAppMessageDeliveryStatus

Message delivery status

**Type**: string

**Enum Values**: "ACCEPTED", "DELIVERED", "ERROR", "READ", "SENT"

<jumplink id="applicationnode"></jumplink>
### ApplicationNode

Meta application that processed the delivery status event

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string |  | Unique identifier for the Meta application |
| name | string |  | Name of the Meta application |

<jumplink id="messagehistoryeventsresponse"></jumplink>
### MessageHistoryEventsResponse

Paginated response containing message history events

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | array of [WhatsAppMessageHistoryEventsEdge](#whatsappmessagehistoryeventsedge) |  | Array of message history event edges |
| paging | [PaginationInfo](#paginationinfo) |  |  |

<jumplink id="paginationinfo"></jumplink>
### PaginationInfo

Pagination information for navigating through results

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| cursors | [Cursors](#object-cursors-1) |  | Pagination cursors for navigation |
| previous | string (uri) |  | URL for the previous page of results |
| next | string (uri) |  | URL for the next page of results |

<jumplink id="graphapierror"></jumplink>
### GraphAPIError

Standard Graph API error response

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| error | [Error](#object-error-2) | ✓ |  |

## Inline Object Definitions

<jumplink id="object-cursors-1"></jumplink>
### Cursors

Pagination cursors for navigation

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| before | string |  | Cursor for the previous page of results |
| after | string |  | Cursor for the next page of results |

<jumplink id="object-error-2"></jumplink>
### Error

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| message | string | ✓ | Human-readable error message |
| type | string | ✓ | Error category type |
| code | integer | ✓ | Numeric error code |
| error_subcode | integer |  | More specific error subcode when available |
| fbtrace_id | string |  | Unique identifier for debugging and support requests with Meta |
| is_transient | boolean |  | Indicates whether this error is temporary and the request should be retried |
| error_user_title | string |  | User-friendly error title for display purposes |
| error_user_msg | string |  | User-friendly error message for display purposes |

## Authentication

| Scheme | Type | Location |
|--------|------|----------|
| bearerAuth | HTTP Bearer | Header: `Authorization` |

### Usage Examples

- **bearerAuth**: Include `Authorization: Bearer your-token-here` in request headers

### Global Authentication Requirements

All endpoints require: bearerAuth
