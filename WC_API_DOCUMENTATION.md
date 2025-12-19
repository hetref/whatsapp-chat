# WhatsApp Cloud API - Complete API Documentation

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
  - [Creating API Keys](#creating-api-keys)
  - [Authentication](#authentication)
  - [Base URLs](#base-urls)
- [API Endpoints](#api-endpoints)
  - [Status & Health Check](#status--health-check)
  - [Template Management](#template-management)
  - [Message Sending](#message-sending) *(Coming Soon)*
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Security Best Practices](#security-best-practices)
- [SDK & Code Examples](#sdk--code-examples)
- [Changelog](#changelog)

---

## Overview

The WhatsApp Cloud API (WC API) provides programmatic access to WhatsApp Business messaging features through a RESTful API. This API allows you to:

- ✅ Create and manage message templates
- ✅ Send template messages to customers
- ✅ Send text, media, and interactive messages
- ✅ Monitor template status and performance
- ✅ Access real-time messaging capabilities

**Current Version:** v1.0  
**Protocol:** HTTPS  
**Data Format:** JSON  
**Authentication:** Bearer Token (API Key)

---

## Getting Started

### Creating API Keys

API keys are required to access all WC API endpoints. To create an API key:

1. **Navigate to Settings**
   - Log in to your WaChat dashboard
   - Go to `/protected/settings`

2. **Create New API Key**
   - Click "Create API Key" button
   - Enter a descriptive name (e.g., "Production Server", "Mobile App", "Development")
   - Click "Create"

3. **Save Your API Key**
   - ⚠️ **Important:** Copy the API key immediately
   - The full key is shown **only once** during creation
   - Store it securely (environment variables, secrets manager)

4. **Manage API Keys**
   - **View:** See all your API keys with partial masking
   - **Rename:** Update the name of an API key
   - **Revoke:** Delete an API key (cannot be undone)
   - **Monitor:** Check last usage timestamp

### Authentication

All API requests must include your API key in the `Authorization` header using the Bearer token scheme:

```http
Authorization: Bearer wc_live_your_api_key_here
```

**Example:**

```bash
curl -X GET https://yourdomain.com/api/wc/status \
  -H "Authorization: Bearer wc_live_abc123def456..."
```

**Security Notes:**
- Never expose API keys in client-side code
- Use environment variables to store keys
- Rotate keys regularly
- Create separate keys for different environments

### Base URLs

**Production:** `https://yourdomain.com/api/wc`  
**Development:** `http://localhost:3000/api/wc`

All endpoint paths are relative to the base URL.

---

## API Endpoints

### Status & Health Check

Check API availability and get template statistics.

#### `GET /api/wc/status`

**Description:** Verify API connectivity and retrieve account information.

**Authentication:** Required

**Request:**

```bash
curl -X GET https://yourdomain.com/api/wc/status \
  -H "Authorization: Bearer wc_live_your_api_key"
```

**Response:**

```json
{
  "success": true,
  "message": "WhatsApp Cloud API is operational",
  "data": {
    "status": "active",
    "api_version": "v23.0",
    "timestamp": "2025-12-19T10:30:00.000Z",
    "templates": {
      "total": 15,
      "approved": 12,
      "pending": 2,
      "rejected": 1
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `message` | string | Human-readable status message |
| `data.status` | string | API operational status |
| `data.api_version` | string | WhatsApp API version in use |
| `data.timestamp` | string | Current server timestamp (ISO 8601) |
| `data.templates.total` | number | Total templates created |
| `data.templates.approved` | number | Templates approved by Meta |
| `data.templates.pending` | number | Templates awaiting review |
| `data.templates.rejected` | number | Templates rejected by Meta |

---

### Template Management

Message templates are pre-approved message formats required for initiating conversations with customers.

#### `GET /api/wc/templates`

**Description:** Retrieve all message templates for your WhatsApp Business account.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 100 | Number of templates per page (max: 250) |
| `after` | string | No | - | Pagination cursor for next page |

**Request:**

```bash
# Get all templates
curl -X GET https://yourdomain.com/api/wc/templates \
  -H "Authorization: Bearer wc_live_your_api_key"

# With pagination
curl -X GET "https://yourdomain.com/api/wc/templates?limit=50&after=cursor_abc123" \
  -H "Authorization: Bearer wc_live_your_api_key"
```

**Response:**

```json
{
  "success": true,
  "message": "Templates retrieved successfully",
  "data": {
    "templates": [
      {
        "id": "123456789",
        "name": "order_confirmation",
        "language": "en_US",
        "status": "APPROVED",
        "category": "UTILITY",
        "components": [
          {
            "type": "HEADER",
            "format": "TEXT",
            "text": "Order Confirmed"
          },
          {
            "type": "BODY",
            "text": "Hi {{1}}, your order {{2}} has been confirmed!"
          },
          {
            "type": "FOOTER",
            "text": "Thank you for shopping with us"
          }
        ],
        "created_at": "2025-12-01T10:00:00.000Z"
      }
    ],
    "paging": {
      "cursors": {
        "after": "cursor_next_page"
      }
    }
  }
}
```

**Template Status Values:**

- `APPROVED` - Ready to send
- `PENDING` - Under Meta review (typically 24-48 hours)
- `REJECTED` - Rejected by Meta (see rejection reason)
- `DISABLED` - Temporarily disabled

---

#### `POST /api/wc/templates`

**Description:** Create a new message template for Meta approval.

**Authentication:** Required

**Request Body:**

```json
{
  "name": "order_confirmation",
  "category": "UTILITY",
  "language": "en_US",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Order Update"
    },
    {
      "type": "BODY",
      "text": "Hi {{1}}, your order {{2}} is on the way! Track: {{3}}"
    },
    {
      "type": "FOOTER",
      "text": "Reply STOP to opt out"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Track Order",
          "url": "https://example.com/track/{{1}}"
        }
      ]
    }
  ]
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Template name (lowercase, underscores only) |
| `category` | string | Yes | `MARKETING`, `UTILITY`, or `AUTHENTICATION` |
| `language` | string | Yes | Language code (e.g., `en_US`, `es_ES`) |
| `components` | array | Yes | Template components (header, body, footer, buttons) |

**Component Types:**

1. **HEADER** (Optional)
   - Format: `TEXT`, `IMAGE`, `VIDEO`, `DOCUMENT`
   - Contains title or media

2. **BODY** (Required)
   - Main message content
   - Supports variables: `{{1}}`, `{{2}}`, etc.
   - Max 1024 characters

3. **FOOTER** (Optional)
   - Small disclaimer text
   - Max 60 characters
   - No variables allowed

4. **BUTTONS** (Optional)
   - Quick Reply, URL, or Phone Number buttons
   - Max 3 buttons per template

**Request Example:**

```bash
curl -X POST https://yourdomain.com/api/wc/templates \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_message",
    "category": "UTILITY",
    "language": "en_US",
    "components": [
      {
        "type": "BODY",
        "text": "Welcome {{1}}! Your account is ready."
      }
    ]
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Template created successfully and submitted for review",
  "data": {
    "id": "987654321",
    "name": "welcome_message",
    "status": "PENDING",
    "category": "UTILITY",
    "language": "en_US"
  }
}
```

**Important Notes:**
- Templates require Meta approval (24-48 hours typically)
- Follow [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- Test templates in sandbox environment first
- Use clear, non-promotional language for UTILITY category

---

#### `GET /api/wc/templates/:id`

**Description:** Retrieve details of a specific template.

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Template ID |

**Request:**

```bash
curl -X GET https://yourdomain.com/api/wc/templates/123456789 \
  -H "Authorization: Bearer wc_live_your_api_key"
```

**Response:**

```json
{
  "success": true,
  "message": "Template retrieved successfully",
  "data": {
    "id": "123456789",
    "name": "order_confirmation",
    "language": "en_US",
    "status": "APPROVED",
    "category": "UTILITY",
    "components": [
      {
        "type": "HEADER",
        "format": "TEXT",
        "text": "Order Update"
      },
      {
        "type": "BODY",
        "text": "Hi {{1}}, your order {{2}} is confirmed!"
      }
    ],
    "rejected_reason": null,
    "created_at": "2025-12-01T10:00:00.000Z",
    "updated_at": "2025-12-01T12:00:00.000Z"
  }
}
```

---

#### `DELETE /api/wc/templates/:id`

**Description:** Delete a message template permanently.

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Template ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Template name (for verification) |

**Request:**

```bash
curl -X DELETE "https://yourdomain.com/api/wc/templates/123456789?name=order_confirmation" \
  -H "Authorization: Bearer wc_live_your_api_key"
```

**Response:**

```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

**Important Notes:**
- Deletion is permanent and cannot be undone
- Template name is required for verification
- Deleted templates cannot be recovered
- Consider disabling instead of deleting for audit trails

---

### Message Sending

Send text, template, and media messages to WhatsApp users.

---

#### `POST /api/wc/messages/text`

**Description:** Send a text message to a WhatsApp user.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient phone number (E.164 format: +1234567890) |
| `text` | string | Yes | Message text (max 4096 characters) |

**Example Request:**

```bash
curl -X POST https://yourdomain.com/api/wc/messages/text \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "text": "Hello! This is a test message from the WC API."
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Text message sent successfully",
  "data": {
    "message_id": "wamid.HBgNMTIzNDU2Nzg5MAA=",
    "recipient": "+1234567890",
    "text": "Hello! This is a test message from the WC API.",
    "timestamp": "2025-12-19T10:30:00.000Z",
    "whatsapp_response": {
      "messaging_product": "whatsapp",
      "contacts": [
        {
          "input": "1234567890",
          "wa_id": "1234567890"
        }
      ],
      "messages": [
        {
          "id": "wamid.HBgNMTIzNDU2Nzg5MAA="
        }
      ]
    }
  },
  "timestamp": "2025-12-19T10:30:00.000Z"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| `INVALID_PARAMETERS` | Missing or invalid to/text field |
| `TEXT_TOO_LONG` | Text exceeds 4096 characters |
| `INVALID_PHONE_NUMBER` | Invalid phone number format |
| `WHATSAPP_API_ERROR` | Error from WhatsApp API |

---

#### `POST /api/wc/messages/template`

**Description:** Send a pre-approved template message to initiate conversations or send structured messages.

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient phone number (E.164 format) |
| `template` | object | Yes | Template configuration |
| `template.name` | string | Yes | Template name (must be approved by Meta) |
| `template.language` | string | Yes | Language code (e.g., `en_US`, `es_ES`) |
| `template.components` | array | No | Template components with variable values |

**Component Types:**

- **header** - Header parameters (text, image, video, document)
- **body** - Body text parameters
- **footer** - Footer text parameters
- **button** - Button parameters for URL/phone buttons

**Example Request:**

```bash
curl -X POST https://yourdomain.com/api/wc/messages/template \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "template": {
      "name": "order_confirmation",
      "language": "en_US",
      "components": [
        {
          "type": "header",
          "parameters": [
            {
              "type": "text",
              "text": "John Doe"
            }
          ]
        },
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": "ORD-12345"
            },
            {
              "type": "text",
              "text": "December 25, 2025"
            }
          ]
        }
      ]
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Template message sent successfully",
  "data": {
    "message_id": "wamid.HBgNMTIzNDU2Nzg5MAA=",
    "recipient": "+1234567890",
    "template_name": "order_confirmation",
    "language": "en_US",
    "timestamp": "2025-12-19T10:30:00.000Z",
    "whatsapp_response": {
      "messaging_product": "whatsapp",
      "contacts": [
        {
          "input": "1234567890",
          "wa_id": "1234567890"
        }
      ],
      "messages": [
        {
          "id": "wamid.HBgNMTIzNDU2Nzg5MAA="
        }
      ]
    }
  },
  "timestamp": "2025-12-19T10:30:00.000Z"
}
```

**Important Notes:**
- Template must be approved by Meta before use
- Template name must match exactly
- Components must match template structure
- Use appropriate language code for the template

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| `INVALID_PARAMETERS` | Missing or invalid required fields |
| `INVALID_PHONE_NUMBER` | Invalid phone number format |
| `WHATSAPP_API_ERROR` | Template not found, not approved, or invalid parameters |

---

#### `POST /api/wc/messages/media`

**Description:** Send media messages (images, videos, audio, documents) to WhatsApp users.

**Authentication:** Required

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient phone number (E.164 format) |
| `files` | file[] | Yes | One or more media files |
| `captions` | string[] | No | Optional captions for each file |

**Supported Media Types:**

| Type | Formats | Max Size |
|------|---------|----------|
| **Image** | JPG, JPEG, PNG, WebP | 5 MB |
| **Video** | MP4, 3GP | 16 MB |
| **Audio** | AAC, MP3, AMR, OGG, OPUS | 16 MB |
| **Document** | PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT | 100 MB |

**Example Request:**

```bash
curl -X POST https://yourdomain.com/api/wc/messages/media \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -F "to=+1234567890" \
  -F "files=@/path/to/image.jpg" \
  -F "captions=Check out this product!"
```

**Multiple Files:**

```bash
curl -X POST https://yourdomain.com/api/wc/messages/media \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -F "to=+1234567890" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg" \
  -F "captions=First image" \
  -F "captions=Second image"
```

**Response:**

```json
{
  "success": true,
  "message": "All media messages sent successfully",
  "data": {
    "recipient": "+1234567890",
    "total_files": 2,
    "success_count": 2,
    "failure_count": 0,
    "results": [
      {
        "success": true,
        "filename": "image1.jpg",
        "message_id": "wamid.HBgNMTIzNDU2Nzg5MAA=",
        "media_type": "image",
        "media_id": "1234567890",
        "caption": "First image",
        "s3_uploaded": true
      },
      {
        "success": true,
        "filename": "image2.jpg",
        "message_id": "wamid.ABcDEfGhIjKlMnOpQrStUvWx=",
        "media_type": "image",
        "media_id": "0987654321",
        "caption": "Second image",
        "s3_uploaded": true
      }
    ],
    "timestamp": "2025-12-19T10:30:00.000Z"
  },
  "timestamp": "2025-12-19T10:30:00.000Z"
}
```

**JavaScript Example:**

```javascript
const formData = new FormData();
formData.append('to', '+1234567890');
formData.append('files', fileInput.files[0]);
formData.append('captions', 'Check this out!');

const response = await fetch('https://yourdomain.com/api/wc/messages/media', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wc_live_your_api_key'
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| `INVALID_PARAMETERS` | Missing to or files field |
| `NO_FILES` | No files provided |
| `UNSUPPORTED_FILE_TYPE` | File type not supported by WhatsApp |
| `INVALID_PHONE_NUMBER` | Invalid phone number format |
| `WHATSAPP_API_ERROR` | Error uploading or sending media |

**Important Notes:**
- Files are automatically uploaded to WhatsApp servers
- Files are also backed up to your S3 storage
- Multiple files can be sent in one request
- Each file is sent as a separate message
- Captions are only supported for images, videos, and documents (not audio)

---

## Response Format

All API responses follow a consistent structure:

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Invalid or missing API key |
| `403` | Forbidden | Valid API key but insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |
| `503` | Service Unavailable | Temporary service disruption |

---

## Error Handling

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_API_KEY` | API key is invalid or revoked | Check API key, create new one if needed |
| `API_KEY_INACTIVE` | API key has been deactivated | Activate the API key or create a new one |
| `MISSING_AUTHORIZATION` | Authorization header missing | Include `Authorization: Bearer <key>` |
| `INVALID_PARAMETERS` | Request parameters are invalid | Check API documentation for correct format |
| `TEMPLATE_NOT_FOUND` | Template doesn't exist | Verify template ID/name |
| `TEMPLATE_NOT_APPROVED` | Template not approved by Meta | Wait for approval or check rejection reason |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement backoff strategy |
| `WHATSAPP_API_ERROR` | Error from Meta WhatsApp API | Check error details and Meta documentation |
| `DATABASE_ERROR` | Database operation failed | Retry request, contact support if persistent |

### Error Response Example

```json
{
  "success": false,
  "message": "Template not found",
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "details": "No template found with ID: 123456789",
    "timestamp": "2025-12-19T10:30:00.000Z"
  }
}
```

### Meta WhatsApp API Errors

When errors occur from Meta's API, they are passed through with additional context:

```json
{
  "success": false,
  "message": "WhatsApp API error",
  "error": {
    "code": "WHATSAPP_API_ERROR",
    "details": {
      "error": {
        "message": "Template name already exists",
        "type": "OAuthException",
        "code": 100,
        "fbtrace_id": "AbCdEf123456"
      }
    }
  }
}
```

### Best Practices

1. **Always check `success` field** before processing response data
2. **Log error codes** for debugging and monitoring
3. **Implement retry logic** for 5xx errors with exponential backoff
4. **Handle 429 errors** by respecting rate limits
5. **Parse error details** for user-friendly messages
6. **Monitor error rates** to detect issues early

---

## Rate Limiting

### Current Limits

- **API Calls:** 100 requests per minute per API key
- **Template Creation:** 10 templates per hour
- **Burst Allowance:** Up to 150 requests in 1 minute (temporary)

### Rate Limit Headers

Response includes rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703001600
```

### Handling Rate Limits

When rate limited, you'll receive:

**Status:** `429 Too Many Requests`

**Response:**
```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "retry_after": 60,
    "limit": 100,
    "window": "1 minute"
  }
}
```

**Best Practices:**
- Implement exponential backoff
- Cache responses when possible
- Use webhooks for real-time updates instead of polling
- Distribute requests evenly over time
- Monitor rate limit headers

---

## Security Best Practices

### API Key Management

✅ **DO:**
- Store API keys in environment variables
- Use different keys for dev/staging/prod
- Rotate keys every 90 days
- Revoke compromised keys immediately
- Use secrets management services (AWS Secrets Manager, HashiCorp Vault)
- Monitor API key usage regularly

❌ **DON'T:**
- Hardcode API keys in source code
- Commit API keys to version control
- Share API keys via email or chat
- Use same key across multiple environments
- Expose API keys in client-side code
- Log API keys in application logs

### Network Security

- **Use HTTPS only** - Never send API keys over HTTP
- **Validate SSL certificates** - Prevent man-in-the-middle attacks
- **Implement IP whitelisting** - Restrict API access to known IPs
- **Use VPN or private networks** - For sensitive operations

### Request Security

- **Validate all inputs** - Prevent injection attacks
- **Sanitize user data** - Before including in API requests
- **Use prepared statements** - When querying databases
- **Implement request signing** - For additional verification

### Monitoring & Auditing

- **Log all API requests** - For audit trails
- **Monitor for anomalies** - Unusual usage patterns
- **Set up alerts** - For suspicious activity
- **Regular security audits** - Review access patterns

---

## SDK & Code Examples

### JavaScript/TypeScript

```typescript
// WC API Client Example
class WCApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://yourdomain.com/api/wc') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  }

  // Get API status
  async getStatus() {
    return this.request('/status');
  }

  // List templates
  async listTemplates(limit = 100, after?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (after) params.set('after', after);
    return this.request(`/templates?${params}`);
  }

  // Create template
  async createTemplate(template: any) {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  // Get template
  async getTemplate(id: string) {
    return this.request(`/templates/${id}`);
  }

  // Delete template
  async deleteTemplate(id: string, name: string) {
    return this.request(`/templates/${id}?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  // Send text message
  async sendTextMessage(to: string, text: string) {
    return this.request('/messages/text', {
      method: 'POST',
      body: JSON.stringify({ to, text }),
    });
  }

  // Send template message
  async sendTemplateMessage(to: string, template: any) {
    return this.request('/messages/template', {
      method: 'POST',
      body: JSON.stringify({ to, template }),
    });
  }

  // Send media message
  async sendMediaMessage(to: string, files: File[], captions?: string[]) {
    const formData = new FormData();
    formData.append('to', to);
    files.forEach(file => formData.append('files', file));
    if (captions) {
      captions.forEach(caption => formData.append('captions', caption));
    }

    const response = await fetch(`${this.baseUrl}/messages/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  }
}

// Usage
const client = new WCApiClient(process.env.WC_API_KEY!);

// Check status
const status = await client.getStatus();
console.log('Templates:', status.data.templates);

// List templates
const templates = await client.listTemplates();
console.log('Total templates:', templates.data.templates.length);

// Create template
const newTemplate = await client.createTemplate({
  name: 'welcome_message',
  category: 'UTILITY',
  language: 'en_US',
  components: [
    {
      type: 'BODY',
      text: 'Welcome {{1}} to our service!',
    },
  ],
});
console.log('Template created:', newTemplate.data.id);

// Send text message
const textMessage = await client.sendTextMessage(
  '+1234567890',
  'Hello! This is a test message.'
);
console.log('Text message sent:', textMessage.data.message_id);

// Send template message
const templateMessage = await client.sendTemplateMessage('+1234567890', {
  name: 'welcome_message',
  language: 'en_US',
  components: [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'John Doe' }
      ]
    }
  ]
});
console.log('Template message sent:', templateMessage.data.message_id);
```

### Python

```python
import requests
import os
from typing import Optional, Dict, Any

class WCApiClient:
    def __init__(self, api_key: str, base_url: str = "https://yourdomain.com/api/wc"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def _request(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[Any, Any]:
        url = f"{self.base_url}{endpoint}"
        response = requests.request(method, url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    def get_status(self) -> Dict[Any, Any]:
        return self._request("/status")
    
    def list_templates(self, limit: int = 100, after: Optional[str] = None) -> Dict[Any, Any]:
        params = f"?limit={limit}"
        if after:
            params += f"&after={after}"
        return self._request(f"/templates{params}")
    
    def create_template(self, template: Dict) -> Dict[Any, Any]:
        return self._request("/templates", method="POST", data=template)
    
    def get_template(self, template_id: str) -> Dict[Any, Any]:
        return self._request(f"/templates/{template_id}")
    
    def delete_template(self, template_id: str, name: str) -> Dict[Any, Any]:
        return self._request(f"/templates/{template_id}?name={name}", method="DELETE")
    
    def send_text_message(self, to: str, text: str) -> Dict[Any, Any]:
        return self._request("/messages/text", method="POST", data={
            "to": to,
            "text": text
        })
    
    def send_template_message(self, to: str, template: Dict) -> Dict[Any, Any]:
        return self._request("/messages/template", method="POST", data={
            "to": to,
            "template": template
        })
    
    def send_media_message(self, to: str, file_path: str, caption: Optional[str] = None) -> Dict[Any, Any]:
        import requests
        
        url = f"{self.base_url}/messages/media"
        
        with open(file_path, 'rb') as f:
            files = {'files': f}
            data = {'to': to}
            if caption:
                data['captions'] = caption
            
            response = requests.post(
                url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                files=files,
                data=data
            )
            response.raise_for_status()
            return response.json()

# Usage
client = WCApiClient(os.getenv("WC_API_KEY"))

# Get status
status = client.get_status()
print(f"Templates: {status['data']['templates']}")

# List templates
templates = client.list_templates()
print(f"Total templates: {len(templates['data']['templates'])}")

# Create template
new_template = client.create_template({
    "name": "welcome_message",
    "category": "UTILITY",
    "language": "en_US",
    "components": [
        {
            "type": "BODY",
            "text": "Welcome {{1}} to our service!"
        }
    ]
})
print(f"Template created: {new_template['data']['id']}")

# Send text message
text_msg = client.send_text_message("+1234567890", "Hello from Python!")
print(f"Text message sent: {text_msg['data']['message_id']}")

# Send template message
template_msg = client.send_template_message("+1234567890", {
    "name": "welcome_message",
    "language": "en_US",
    "components": [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": "John Doe"}
            ]
        }
    ]
})
print(f"Template message sent: {template_msg['data']['message_id']}")

# Send media message
media_msg = client.send_media_message(
    "+1234567890",
    "/path/to/image.jpg",
    "Check this out!"
)
print(f"Media sent: {media_msg['data']['success_count']} files")
```

### cURL Examples

```bash
# Check API status
curl -X GET https://yourdomain.com/api/wc/status \
  -H "Authorization: Bearer wc_live_your_api_key"

# List templates
curl -X GET https://yourdomain.com/api/wc/templates \
  -H "Authorization: Bearer wc_live_your_api_key"

# Create template
curl -X POST https://yourdomain.com/api/wc/templates \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_message",
    "category": "UTILITY",
    "language": "en_US",
    "components": [
      {
        "type": "BODY",
        "text": "Welcome {{1}}!"
      }
    ]
  }'

# Get specific template
curl -X GET https://yourdomain.com/api/wc/templates/123456789 \
  -H "Authorization: Bearer wc_live_your_api_key"

# Delete template
curl -X DELETE "https://yourdomain.com/api/wc/templates/123456789?name=welcome_message" \
  -H "Authorization: Bearer wc_live_your_api_key"

# Send text message
curl -X POST https://yourdomain.com/api/wc/messages/text \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "text": "Hello from cURL!"
  }'

# Send template message
curl -X POST https://yourdomain.com/api/wc/messages/template \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "template": {
      "name": "welcome_message",
      "language": "en_US",
      "components": [
        {
          "type": "body",
          "parameters": [
            {"type": "text", "text": "John Doe"}
          ]
        }
      ]
    }
  }'

# Send media message
curl -X POST https://yourdomain.com/api/wc/messages/media \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -F "to=+1234567890" \
  -F "files=@/path/to/image.jpg" \
  -F "captions=Check this out!"
```

---

## Changelog

### Version 1.0.0 (December 19, 2025)

**Initial Release**

- ✅ API Key Management
  - Create, view, rename, and revoke API keys
  - Secure key generation with SHA-256 hashing
  - Encrypted key storage for reveal functionality
  - Last usage tracking
  
- ✅ Template Management
  - List all templates with pagination
  - Create new templates
  - Get template details
  - Delete templates
  
- ✅ Message Sending
  - **Text Messages** - Send plain text messages (max 4096 chars)
  - **Template Messages** - Send pre-approved template messages with variables
  - **Media Messages** - Send images, videos, audio, and documents
  
- ✅ Status Endpoint
  - API health check
  - Template statistics
  
- ✅ Security Features
  - Bearer token authentication
  - API key validation and encryption
  - Request rate limiting
  
- ✅ Error Handling
  - Standardized error responses
  - Meta WhatsApp API error passthrough
  - Detailed error codes

**Coming Soon:**

- 📊 Analytics and reporting
- 🔔 Webhook event subscriptions
- 📱 Contact management
- 🔄 Bulk operations
- 📈 Usage metrics and dashboards
- 💬 Interactive message buttons
- 📍 Location messages
- 📞 Call-to-action buttons

---

## Support

### Getting Help

- **Documentation:** This file
- **API Reference:** [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- **Issues:** GitHub Issues
- **Email:** support@yourdomain.com

### Reporting Bugs

When reporting bugs, please include:
1. API endpoint used
2. Request headers and body
3. Response received
4. Expected behavior
5. API key ID (not the full key!)
6. Timestamp of the request

---

**Built with ❤️ for developers**

*Last updated: December 19, 2025*
