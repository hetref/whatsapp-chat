

## Base URL

| URL | Description |
|-----|-------------|
| https://graph.facebook.com | WhatsApp Business Cloud API |

## APIs

| Method | Endpoint |
|--------|----------|
| GET | [/{Version}/{Phone-Number-ID}/groups](#get-version-phone-number-id-groups) |
| POST | [/{Version}/{Phone-Number-ID}/groups](#post-version-phone-number-id-groups) |

<jumplink id="get-version-phone-number-id-groups"></jumplink>
## GET /{Version}/{Phone-Number-ID}/groups

Get Active Groups

Retrieve a list of active groups for a given business phone number

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
| Phone-Number-ID | string | ✓ | Business phone number ID |

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| limit | integer [min: 1, max: 1024] |  | Number of groups to fetch in the request |
| after | string |  | Cursor that points to the end of a page of data |
| before | string |  | Cursor that points to the beginning of a page of data |

### Responses

**200**

List of active groups

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | [Data](#object-data-2) |  |  |
| paging | [PagingInfo](#paginginfo) |  |  |


<jumplink id="post-version-phone-number-id-groups"></jumplink>
## POST /{Version}/{Phone-Number-ID}/groups

Create Group

Create a new group and get an invite link

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
| Phone-Number-ID | string | ✓ | Business phone number ID |

### Request Body (Required)

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | "whatsapp" | ✓ | Messaging product |
| subject | string | ✓ | Group subject. Maximum 128 characters. Whitespace is trimmed. |
| description | string |  | Group description. Maximum 2048 characters. |
| join_approval_mode | One of "approval_required", "auto_approve" |  | Indicates if WhatsApp users who click the invitation link can join the group with or without being approved first. - approval_required: WhatsApp users must be approved via join request before they can access the group - auto_approve: WhatsApp users can join the group without approval |

### Responses

**200**

Group creation request submitted successfully

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | string |  |  |
| request_id | string |  | Group creation request ID |

**400**

Bad Request - Invalid request parameters

**Content Type**: `application/json`

**Schema**: [ErrorResponse](#errorresponse)

**401**

Unauthorized - Invalid or missing access token

**Content Type**: `application/json`

**Schema**: [ErrorResponse](#errorresponse)

**500**

Internal Server Error - An unexpected error occurred

**Content Type**: `application/json`

**Schema**: [ErrorResponse](#errorresponse)


# Components

## Schemas

<jumplink id="errorobject"></jumplink>
### ErrorObject

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| message | string | ✓ | Human-readable description of the error |
| type | string | ✓ | Error type classification |
| code | integer | ✓ | Numeric error code |

<jumplink id="errorresponse"></jumplink>
### ErrorResponse

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| error | [ErrorObject](#errorobject) | ✓ |  |

<jumplink id="paginginfo"></jumplink>
### PagingInfo

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| cursors | [Cursors](#object-cursors-3) |  |  |
| previous | string |  | Previous page URL |
| next | string |  | Next page URL |

## Inline Object Definitions

<jumplink id="object-groups-1"></jumplink>
### Groups

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string |  | Group ID |
| subject | string |  | Group subject |
| created_at | string |  | Group creation timestamp |

<jumplink id="object-data-2"></jumplink>
### Data

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| groups | array of [Groups](#object-groups-1) |  |  |

<jumplink id="object-cursors-3"></jumplink>
### Cursors

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| before | string |  | Before cursor |
| after | string |  | After cursor |

## Authentication

| Scheme | Type | Location |
|--------|------|----------|
| bearerAuth | HTTP Bearer | Header: `Authorization` |

### Usage Examples

- **bearerAuth**: Include `Authorization: Bearer your-token-here` in request headers

### Global Authentication Requirements

All endpoints require: bearerAuth
