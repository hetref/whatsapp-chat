

## Base URL

| URL | Description |
|-----|-------------|
| https://graph.facebook.com | WhatsApp Business Cloud API |

## APIs

| Method | Endpoint |
|--------|----------|
| DELETE | [/{Version}/{group_id}/participants](#delete-version-group-id-participants) |
| POST | [/{Version}/{group_id}/participants](#post-version-group-id-participants) |

<jumplink id="delete-version-group-id-participants"></jumplink>
## DELETE /{Version}/{group_id}/participants

Remove Group Participants

Remove participants from group

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
| participants | array of [Participants](#object-participants-1) | ✓ | Array of phone numbers or WhatsApp IDs to remove (max 8 participants) |

### Responses

**200**

Participants removal request processed


<jumplink id="post-version-group-id-participants"></jumplink>
## POST /{Version}/{group_id}/participants

Add Group Participants

Add participants to group

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
| participants | array of [Participants](#object-participants-1) | ✓ | Array of phone numbers or WhatsApp IDs to remove (max 8 participants) |

### Responses

**200**

Participants addition request processed


# Components

## Inline Object Definitions

<jumplink id="object-participants-1"></jumplink>
### Participants

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| user | string | ✓ | WhatsApp user phone number or WhatsApp user ID |

## Authentication

| Scheme | Type | Location |
|--------|------|----------|
| bearerAuth | HTTP Bearer | Header: `Authorization` |

### Usage Examples

- **bearerAuth**: Include `Authorization: Bearer your-token-here` in request headers

### Global Authentication Requirements

All endpoints require: bearerAuth
