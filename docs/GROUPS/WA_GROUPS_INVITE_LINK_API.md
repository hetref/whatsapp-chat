

## Base URL

| URL | Description |
|-----|-------------|
| https://graph.facebook.com | WhatsApp Business Cloud API |

## APIs

| Method | Endpoint |
|--------|----------|
| DELETE | [/{Version}/{group_id}/invite_link](#delete-version-group-id-invite-link) |
| POST | [/{Version}/{group_id}/invite_link](#post-version-group-id-invite-link) |

<jumplink id="delete-version-group-id-invite-link"></jumplink>
## DELETE /{Version}/{group_id}/invite_link

Delete Group Invite Link

Delete an existing group invite link

### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |
| Content-Type | One of "application/json", "application/x-www-form-urlencoded", "multipart/form-data" | ✓ | Media type of the request body |

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| Version | string | ✓ |  |
| group_id | string | ✓ | Group ID |

### Request Body (Required)

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | "whatsapp" | ✓ |  |

### Responses

**200**

Group invite link deleted successfully

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | string |  |  |
| success | string |  |  |


<jumplink id="post-version-group-id-invite-link"></jumplink>
## POST /{Version}/{group_id}/invite_link

Create Group Invite Link

Create a new group invite link

### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |
| Content-Type | One of "application/json", "application/x-www-form-urlencoded", "multipart/form-data" | ✓ | Media type of the request body |

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| Version | string | ✓ |  |
| group_id | string | ✓ | Group ID |

### Request Body (Required)

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | "whatsapp" | ✓ |  |

### Responses

**200**

Group invite link created successfully

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | string |  |  |
| invite_link | string |  | Group invite link |


## Authentication

| Scheme | Type | Location |
|--------|------|----------|
| bearerAuth | HTTP Bearer | Header: `Authorization` |

### Usage Examples

- **bearerAuth**: Include `Authorization: Bearer your-token-here` in request headers

### Global Authentication Requirements

All endpoints require: bearerAuth
