# Meta WhatsApp Cloud API: Sending Template Messages Guide

This guide provides step-by-step instructions for sending WhatsApp Template Messages directly using **Meta's Official WhatsApp Cloud API (Graph API)**.

---

## 1. Prerequisites from Meta Developer Dashboard

Before sending a template message, ensure you have gathered the following details from your [Meta Developer Dashboard](https://developers.facebook.com/):

1. **Phone Number ID (`PHONE_NUMBER_ID`)**: Found under **WhatsApp > API Setup** in your Meta App.
2. **Access Token (`ACCESS_TOKEN`)**: A temporary token (from API Setup) or a Permanent System User Token with `whatsapp_business_messaging` permissions.
3. **Approved Template Name (`TEMPLATE_NAME`)**: The exact name of an approved template created in the **Meta WhatsApp Manager**.
4. **Language Code (`LANGUAGE_CODE`)**: The language code used when creating the template (e.g., `en_US`, `en`, `hi`, `es`).
5. **Recipient Phone Number (`RECIPIENT_PHONE_NUMBER`)**: Phone number in **E.164 format** without leading `+` or spaces (e.g., `919876543210` or `15551234567`).

---

## 2. Official Meta Graph API Endpoint & Headers

### **Endpoint URL**
```http
POST https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/messages
```
*(Note: Replace `{PHONE_NUMBER_ID}` with your actual Meta Phone Number ID. You can use Graph API version `v20.0`, `v21.0`, `v22.0`, or `v23.0`.)*

### **HTTP Headers**
```http
Authorization: Bearer <YOUR_META_ACCESS_TOKEN>
Content-Type: application/json
```

---

## 3. Payload Examples

### A. Simple Template Message (No Variables)

Use this when your template contains no dynamic text placeholders (`{{1}}`, `{{2}}`).

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": {
      "code": "en_US"
    }
  }
}
```

---

### B. Template with Dynamic Body Variables

Use this when your template body contains variables like:  
`"Hello {{1}}, your order {{2}} has been confirmed."`

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "order_update",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Alex"
          },
          {
            "type": "text",
            "text": "ORD-98765"
          }
        ]
      }
    ]
  }
}
```

---

### C. Template with Media Header (Image / Document / Video)

Use this if your approved template has a media header (e.g., Image).

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "promo_flyer",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": {
              "link": "https://example.com/images/banner.jpg"
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Special 20% Discount!"
          }
        ]
      }
    ]
  }
}
```

---

### D. Template with Dynamic Call-To-Action (CTA) URL Button

If your template button has a dynamic URL tail (e.g., `https://example.com/track/{{1}}`):

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "template",
  "template": {
    "name": "order_tracking",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Alex" }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [
          {
            "type": "text",
            "text": "ORD-98765"
          }
        ]
      }
    ]
  }
}
```

---

## 4. cURL Commands

### Send Simple Template cURL

```bash
curl -i -X POST \
  "https://graph.facebook.com/v22.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "919876543210",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

### Send Template with Parameters cURL

```bash
curl -i -X POST \
  "https://graph.facebook.com/v22.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "919876543210",
    "type": "template",
    "template": {
      "name": "order_confirmation",
      "language": {
        "code": "en_US"
      },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "John Doe" },
            { "type": "text", "text": "ORD-12345" }
          ]
        }
      ]
    }
  }'
```

---

## 5. Code Implementations

### Node.js (native `fetch` - ES Module or Node 18+)

```javascript
const PHONE_NUMBER_ID = "YOUR_PHONE_NUMBER_ID";
const ACCESS_TOKEN = "YOUR_META_ACCESS_TOKEN";

async function sendTemplateMessage() {
  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: "919876543210", // Recipient phone number with country code
    type: "template",
    template: {
      name: "hello_world",
      language: {
        code: "en_US"
      }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Error sending template message:", data);
  } else {
    console.log("Message sent successfully! Message ID:", data.messages[0].id);
  }
}

sendTemplateMessage();
```

---

### Python (`requests`)

```python
import requests

PHONE_NUMBER_ID = "YOUR_PHONE_NUMBER_ID"
ACCESS_TOKEN = "YOUR_META_ACCESS_TOKEN"

url = f"https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/messages"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "messaging_product": "whatsapp",
    "to": "919876543210",
    "type": "template",
    "template": {
        "name": "hello_world",
        "language": {
            "code": "en_US"
        }
    }
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()

if response.status_code == 200:
    print("Success! Message ID:", data['messages'][0]['id'])
else:
    print("Error:", data)
```

---

## 6. Response Formats

### **Success Response (`200 OK`)**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "919876543210",
      "wa_id": "919876543210"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQTFEREMxRjAzNEVBNDUzOTk5AA=="
    }
  ]
}
```

---

### **Common Errors & Fixes**

| Error Code | Error Message / Cause | How to Fix |
| :--- | :--- | :--- |
| **`190`** | Invalid / Expired OAuth Access Token | Generate a new Access Token in Meta App or create a permanent System User token. |
| **`100`** | Template does not exist in specified language | Check exact `name` and `code` (e.g. `en_US` vs `en`) in Meta WhatsApp Manager. |
| **`132000`** | Number of parameters does not match template | Ensure your `components` parameters array matches the exact number of `{{1}}`, `{{2}}` variables in the approved template. |
| **`131026`** | Receiver does not exist / Not on WhatsApp | Verify recipient phone number format and ensure the number is registered on WhatsApp. |
