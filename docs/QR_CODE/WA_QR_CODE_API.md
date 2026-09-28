

## Base URL

| URL | Description |
|-----|-------------|
| https://graph.facebook.com | Production Graph API server |

## APIs

| Method | Endpoint |
|--------|----------|
| DELETE | [/{Version}/{Phone-Number-ID}/message_qrdls/{QR-Code-ID}](#delete-version-phone-number-id-message-qrdls-qr-code-id) |
| GET | [/{Version}/{Phone-Number-ID}/message_qrdls/{QR-Code-ID}](#get-version-phone-number-id-message-qrdls-qr-code-id) |

<jumplink id="delete-version-phone-number-id-message-qrdls-qr-code-id"></jumplink>
## DELETE /{Version}/{Phone-Number-ID}/message_qrdls/{QR-Code-ID}

Delete Individual Message QR Code

Permanently delete a specific QR code. Once deleted, the QR code and deep link become invalid.
Deletion cannot be undone and affects any existing marketing materials using the QR code.


### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| Version | string | ✓ | Graph API version to use for this request. Determines the API behavior and available features. |
| Phone-Number-ID | string | ✓ | The WhatsApp Business Account phone number ID that owns the QR code to be deleted. This ID is provided when you add a phone number to your WhatsApp Business Account. |
| QR-Code-ID | string | ✓ | The unique 14-character identifier of the QR code to delete. This is the code value returned when the QR code was created. |

### Responses

**200**

Successfully deleted the message QR code

**Content Type**: `application/json`

**Schema**: [DeleteQrCodeResponse](#deleteqrcoderesponse)

**400**

Bad Request - Invalid QR code ID format

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "Invalid QR code ID format. Expected 14-character alphanumeric string",
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
        "message": "Your app doesn't have permission to delete QR codes for this phone number",
        "type": "OAuthException",
        "code": 200,
        "error_subcode": 1349174,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn",
        "error_user_title": "Permission Denied",
        "error_user_msg": "Your app doesn't have permission to access this resource"
    }
}\n```

**404**

Not Found - Phone number ID or QR code does not exist

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

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


<jumplink id="get-version-phone-number-id-message-qrdls-qr-code-id"></jumplink>
## GET /{Version}/{Phone-Number-ID}/message_qrdls/{QR-Code-ID}

Get Individual Message QR Code

Retrieve details for a specific QR code by its unique identifier.
Supports field selection and QR image generation. Response returns QR code in data array for consistency.


### Header Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| User-Agent | string |  | The user agent string identifying the client software making the request. |
| Authorization | string | ✓ | Bearer token for API authentication. This should be a valid access token obtained through the appropriate OAuth flow or system user token. |

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| Version | string | ✓ | Graph API version to use for this request. Determines the API behavior and available features. |
| Phone-Number-ID | string | ✓ | The WhatsApp Business Account phone number ID that owns the QR code. This ID is provided when you add a phone number to your WhatsApp Business Account. |
| QR-Code-ID | string | ✓ | The unique 14-character identifier of the QR code to retrieve. This is the code value returned when the QR code was created. |

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fields | string |  | Comma-separated list of fields to include in the response. Available fields: - code: QR code identifier (always included) - prefilled_message: Pre-filled message text (always included) - deep_link_url: WhatsApp deep link URL (always included) - creation_time: Unix timestamp when QR code was created (first-party apps only) - qr_image_url.format(FORMAT): QR code image URL where FORMAT is SVG or PNG Example: "code,prefilled_message,qr_image_url.format(SVG)" |

### Responses

**200**

Successfully retrieved the message QR code details

**Content Type**: `application/json`

**Schema**: [QrCodeResponse](#qrcoderesponse)

**400**

Bad Request - Invalid QR code ID format or parameters

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "Invalid QR code ID format. Expected 14-character alphanumeric string",
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
        "message": "Your app doesn't have permission to access QR codes for this phone number",
        "type": "OAuthException",
        "code": 200,
        "error_subcode": 1349174,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn",
        "error_user_title": "Permission Denied",
        "error_user_msg": "Your app doesn't have permission to access this resource"
    }
}\n```

**404**

Not Found - Phone number ID or QR code does not exist

**Content Type**: `application/json`

**Schema**: [GraphAPIError](#graphapierror)

**Example**:\n```json\n{
    "error": {
        "message": "QR code not found",
        "type": "GraphMethodException",
        "code": 803,
        "fbtrace_id": "AXsgnV2Cm3ZMGF3dF_cfYIn",
        "error_user_title": "QR Code Not Found",
        "error_user_msg": "The QR code you're trying to access doesn't exist or has been deleted"
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

<jumplink id="qrcoderesponse"></jumplink>
### QrCodeResponse

Individual QR code response containing a single QR code in data array format

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| data | array of [QrCodeDetails](#qrcodedetails) | ✓ | Array containing the single QR code object (maintains consistency with collection endpoint) |

<jumplink id="deleteqrcoderesponse"></jumplink>
### DeleteQrCodeResponse

Response confirming successful QR code deletion

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| success | boolean | ✓ | Indicates whether the QR code was successfully deleted |

<jumplink id="graphapierror"></jumplink>
### GraphAPIError

Standard Graph API error response

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| error | [Error](#object-error-1) | ✓ |  |

## Inline Object Definitions

<jumplink id="object-error-1"></jumplink>
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
