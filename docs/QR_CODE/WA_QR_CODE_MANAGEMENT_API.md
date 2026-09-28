

## Base URL

| URL | Description |
|-----|-------------|
| https://graph.facebook.com | Production Graph API server |

## APIs

| Method | Endpoint |
|--------|----------|
| GET | [/{Version}/{Phone-Number-ID}/message_qrdls](#get-version-phone-number-id-message-qrdls) |
| POST | [/{Version}/{Phone-Number-ID}/message_qrdls](#post-version-phone-number-id-message-qrdls) |

<jumplink id="get-version-phone-number-id-message-qrdls"></jumplink>
## GET /{Version}/{Phone-Number-ID}/message_qrdls

List All Message QR Codes

Retrieve all message QR codes for a phone number, sorted by creation time (newest first).
Supports field selection, filtering by code, cursor-based pagination, and QR image generation.


### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| Version | string | ✓ | Graph API version to use for this request. Determines the API behavior and available features. |
| Phone-Number-ID | string | ✓ | The WhatsApp Business Account phone number ID for which to list QR codes. This ID is provided when you add a phone number to your WhatsApp Business Account. |

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fields | string |  | Comma-separated list of fields to include in the response. Available fields: - code: QR code identifier (always included) - prefilled_message: Pre-filled message text (always included) - deep_link_url: WhatsApp deep link URL (always included) - creation_time: Unix timestamp when QR code was created (first-party apps only) - qr_image_url.format(FORMAT): QR code image URL where FORMAT is SVG or PNG Example: "code,prefilled_message,qr_image_url.format(SVG)" |
| code | string |  | Filter results to a specific QR code by its unique identifier. When provided, only the matching QR code will be returned (if it exists). |
| limit | integer [min: 1, max: 25] |  | Maximum number of QR codes to return in a single response. Default and maximum limit is typically 25. |
| after | string |  | Cursor for pagination. Use this to get the next page of results. Obtain this value from the paging.cursors.after field in previous responses. |
| before | string |  | Cursor for pagination. Use this to get the previous page of results. Obtain this value from the paging.cursors.before field in previous responses. |

### Responses

**200**

Successfully retrieved the list of message QR codes

**Content Type**: `application/json`

**Schema**: [QrCodeList](#qrcodelist)

**400**

Bad Request - Invalid parameters or malformed request

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "Invalid fields parameter. Check field names and format specifications",
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
        "message": "Your app doesn't have permission to list QR codes for this phone number",
        "type": "OAuthException",
        "code": 200,
        "error_subcode": 1349174,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn",
        "error_user_title": "Permission Denied",
        "error_user_msg": "Your app doesn't have permission to access this resource"
    }
}\n```

**404**

Not Found - Phone number ID does not exist or is not accessible

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "Phone number not found",
        "type": "GraphMethodException",
        "code": 803,
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


<jumplink id="post-version-phone-number-id-message-qrdls"></jumplink>
## POST /{Version}/{Phone-Number-ID}/message_qrdls

Create or Update Message QR Code

Create a new QR code (without code parameter) or update existing QR code (with code parameter).
Supports optional QR image generation in PNG or SVG format.


### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |
| Content-Type | One of "application/json", "application/x-www-form-urlencoded", "multipart/form-data" | ✓ | Media type of the request body |

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| Version | string | ✓ | Graph API version to use for this request. Determines the API behavior and available features. |
| Phone-Number-ID | string | ✓ | The WhatsApp Business Account phone number ID for which to create or update the QR code. This ID is provided when you add a phone number to your WhatsApp Business Account. |

### Request Body (Required)

**Content Type**: `application/json`

**Schema**: Must be one of: [CreateQrCodeRequest](#createqrcoderequest), [UpdateQrCodeRequest](#updateqrcoderequest)

### Responses

**200**

Successfully created or updated the message QR code

**Content Type**: `application/json`

**Schema**: [QrCodeResponse](#qrcoderesponse)

**400**

Bad Request - Invalid parameters or malformed request

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "Invalid prefilled_message length. Maximum 140 characters allowed",
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
        "message": "Your app doesn't have permission to manage QR codes for this phone number",
        "type": "OAuthException",
        "code": 200,
        "error_subcode": 1349174,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn",
        "error_user_title": "Permission Denied",
        "error_user_msg": "Your app doesn't have permission to access this resource"
    }
}\n```

**404**

Not Found - Phone number ID does not exist or QR code not found for update

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "Phone number not found",
        "type": "GraphMethodException",
        "code": 803,
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

<jumplink id="qrcodedetails"></jumplink>
### QrCodeDetails

Complete details of a message QR code

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | string | ✓ | Unique 14-character QR code identifier |
| prefilled_message | string | ✓ | Pre-filled message text that appears in customer chat |
| deep_link_url | string (uri) | ✓ | WhatsApp deep link URL for direct conversation initiation |
| creation_time | string |  | Creation timestamp (first-party apps only) |
| qr_image_url | string (uri) |  | QR code image download URL (when format specified in fields) |

<jumplink id="qrcodelist"></jumplink>
### QrCodeList

List of message QR codes with pagination information

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | array of [QrCodeDetails](#qrcodedetails) | ✓ | Array of QR code objects |
| paging | [Paging](#object-paging-2) |  | Pagination information for navigating through large result sets. Contains cursors for accessing previous and next pages of results. |

<jumplink id="createqrcoderequest"></jumplink>
### CreateQrCodeRequest

Request payload for creating a new message QR code

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| prefilled_message | string | ✓ | Pre-filled message text (max 140 characters) that appears in customer chat |
| generate_qr_image | One of "PNG", "SVG" |  | QR image format. When specified, response includes qr_image_url |

<jumplink id="updateqrcoderequest"></jumplink>
### UpdateQrCodeRequest

Request payload for updating an existing message QR code

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | string | ✓ | 14-character QR code identifier to update |
| prefilled_message | string | ✓ | New pre-filled message text (max 140 characters) |

<jumplink id="qrcoderesponse"></jumplink>
### QrCodeResponse

Response containing QR code details after creation or update

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| code | string | ✓ | Unique 14-character identifier for the QR code. This code is used for future updates or deletions. |
| prefilled_message | string | ✓ | The pre-filled message text associated with this QR code. This text appears when customers use the QR code. |
| deep_link_url | string (uri) | ✓ | WhatsApp deep link URL that can be used directly without QR code scanning. Customers can click this link to start a conversation with the pre-filled message. |
| qr_image_url | string (uri) |  | URL to download the QR code image. Only present if generate_qr_image parameter was specified in the request. Image format matches the requested format. |

<jumplink id="graphapierror"></jumplink>
### GraphAPIError

Standard Graph API error response

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| error | [Error](#object-error-3) | ✓ |  |

## Inline Object Definitions

<jumplink id="object-cursors-1"></jumplink>
### Cursors

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| before | string |  | Cursor for accessing the previous page of results |
| after | string |  | Cursor for accessing the next page of results |

<jumplink id="object-paging-2"></jumplink>
### Paging

Pagination information for navigating through large result sets.
Contains cursors for accessing previous and next pages of results.


| Property | Type | Required | Description |
|----------|------|----------|-------------|
| cursors | [Cursors](#object-cursors-1) |  |  |
| previous | string (uri) |  | URL for the previous page of results |
| next | string (uri) |  | URL for the next page of results |

<jumplink id="object-error-3"></jumplink>
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
