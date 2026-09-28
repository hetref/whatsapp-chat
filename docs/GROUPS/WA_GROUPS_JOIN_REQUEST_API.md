

## Base URL

| URL | Description |
|-----|-------------|
| https://graph.facebook.com | WhatsApp Business Cloud API |

## APIs

| Method | Endpoint |
|--------|----------|
| DELETE | [/{Version}/{group_id}/join_requests](#delete-version-group-id-join-requests) |
| GET | [/{Version}/{group_id}/join_requests](#get-version-group-id-join-requests) |
| POST | [/{Version}/{group_id}/join_requests](#post-version-group-id-join-requests) |

<jumplink id="delete-version-group-id-join-requests"></jumplink>
## DELETE /{Version}/{group_id}/join_requests

Reject Join Requests

Reject one or more join requests

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
| join_requests | array of string | ✓ | Array of join request IDs to reject |

### Responses

**200**

Join requests rejection response

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | string |  |  |
| rejected_join_requests | array of string |  |  |
| failed_join_requests | array of [Failed_join_requests](#object-failed_join_requests-1) |  |  |
| errors | array of [Error](#error) |  |  |


<jumplink id="get-version-group-id-join-requests"></jumplink>
## GET /{Version}/{group_id}/join_requests

Get Join Requests

Get a list of open join requests for a group

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

### Responses

**200**

List of join requests

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | array of [Data](#object-data-2) |  |  |
| paging | [PagingInfo](#paginginfo) |  |  |


<jumplink id="post-version-group-id-join-requests"></jumplink>
## POST /{Version}/{group_id}/join_requests

Approve Join Requests

Approve one or more join requests

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
| join_requests | array of string | ✓ | Array of join request IDs to approve |

### Responses

**200**

Join requests approval response

**Content Type**: `application/json`

**Schema**: object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| messaging_product | string |  |  |
| approved_join_requests | array of string |  |  |
| failed_join_requests | array of [Failed_join_requests](#object-failed_join_requests-1) |  |  |
| errors | array of [Error](#error) |  |  |


# Components

## Schemas

<jumplink id="error"></jumplink>
### Error

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | integer |  | Error code |
| message | string |  | Error message |
| title | string |  | Error title |
| error_data | [Error_data](#object-error_data-3) |  |  |

<jumplink id="paginginfo"></jumplink>
### PagingInfo

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| cursors | [Cursors](#object-cursors-4) |  |  |
| previous | string |  | Previous page URL |
| next | string |  | Next page URL |

## Inline Object Definitions

<jumplink id="object-failed_join_requests-1"></jumplink>
### Failed_join_requests

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| join_request_id | string |  |  |
| errors | array of [Error](#error) |  |  |

<jumplink id="object-data-2"></jumplink>
### Data

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| join_request_id | string |  | Join request ID |
| wa_id | string |  | WhatsApp user ID |
| creation_timestamp | integer |  | Unix timestamp indicating when the join request was created |

<jumplink id="object-error_data-3"></jumplink>
### Error_data

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| details | string |  | Error details |

<jumplink id="object-cursors-4"></jumplink>
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
