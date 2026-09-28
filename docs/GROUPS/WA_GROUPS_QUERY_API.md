

## Base URL

| URL | Description |
|-----|-------------|
| https://graph.facebook.com | WhatsApp Business Cloud API |

## APIs

| Method | Endpoint |
|--------|----------|
| DELETE | [/{Version}/{group_id}](#delete-version-group-id) |
| GET | [/{Version}/{group_id}](#get-version-group-id) |
| POST | [/{Version}/{group_id}](#post-version-group-id) |

<jumplink id="delete-version-group-id"></jumplink>
## DELETE /{Version}/{group_id}

Delete Group

Delete the group and remove all participants, including the business

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

### Responses

**200**

Group deletion successful

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean |  |  |


<jumplink id="get-version-group-id"></jumplink>
## GET /{Version}/{group_id}

Get Group Info

Retrieve metadata about a single group

### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| Version | string | ✓ |  |
| group_id | string | ✓ | Group ID |

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fields | string |  | Comma-separated list of fields to return |

### Responses

**200**

Group information

**Content Type**: `application/json`

**Schema**: [GroupInfo](#groupinfo)


<jumplink id="post-version-group-id"></jumplink>
## POST /{Version}/{group_id}

Update Group Settings

Update the subject, description, and photo of a group

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
| subject | string |  | The new subject for the group |
| description | string |  | The new description for the group |
| profile_picture_file | string |  | Path to an image file for group profile picture |

**Content Type**: `multipart/form-data`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | "whatsapp" |  |  |
| file | string (binary) |  | Image file for group profile picture (JPEG, max 5MB, square format, min 192x192) |

### Responses

**200**

Group settings updated successfully


# Components

## Schemas

<jumplink id="groupinfo"></jumplink>
### GroupInfo

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string |  | Group ID |
| messaging_product | string |  |  |
| join_approval_mode | One of "approval_required", "auto_approve" |  | Join approval mode for the group |
| subject | string |  | Group subject |
| description | string |  | Group description |
| suspended | boolean |  | Returns true if the group has been suspended by WhatsApp |
| creation_timestamp | integer |  | UNIX timestamp in seconds at which the group was created |
| participants | array of [Participants](#object-participants-1) |  | List of participants in the group |
| total_participant_count | integer |  | Total number of participants in the group, excluding your business |

## Inline Object Definitions

<jumplink id="object-participants-1"></jumplink>
### Participants

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| wa_id | string |  | WhatsApp user ID |

## Authentication

| Scheme | Type | Location |
|--------|------|----------|
| bearerAuth | HTTP Bearer | Header: `Authorization` |

### Usage Examples

- **bearerAuth**: Include `Authorization: Bearer your-token-here` in request headers

### Global Authentication Requirements

All endpoints require: bearerAuth
