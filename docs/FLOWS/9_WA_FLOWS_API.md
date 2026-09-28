# Flows API




The Flows API is a [Graph API](https://developers.facebook.com/docs/graph-api) that enables you to perform a variety of operations with Flows.

## Postman collection {#postman}

You can use the [Flows API postman collection](https://www.postman.com/meta/workspace/whatsapp-business-platform/documentation/24926895-7bf51205-92ed-49d1-af4a-0130cf84b6f6) to make API requests and generate code in different languages.

## Troubleshooting

See the [troubleshooting](#troubleshooting) section for help with debugging API issues.

## Variables required for API calls {#variables}

The following variables are required in these API calls.

| Key | Value |
| --- | --- |
| BASE-URL | Base URL for Facebook Graph API<br><br>Example: https://graph.facebook.com/v18.0 |
| ACCESS-TOKEN | User access token for authentication. This can be retrieved by copying the *Temporary access token* from your app which expires in 24 hours.<br><br>Alternatively, you can generate a [System User Access Token](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens#system-user-access-tokens). |
| WABA-ID | This can be retrieved by copying the *WhatsApp Business account ID* from your app. |
| FLOW-ID | ID of a Flow returned after calling [Create a Flow](#create). |

## API requests {#requests}

### Creating a Flow {#create}

**Sample Request**

```curl
curl -X POST '{BASE-URL}/{WABA-ID}/flows' \
--header 'Authorization: Bearer {ACCESS-TOKEN}' \
--header "Content-Type: application/json" \
--data '{
  "name": "My first flow",
  "categories": [ "OTHER" ],
  "flow_json" : "{\"version\":\"5.0\",\"screens\":[{\"id\":\"WELCOME_SCREEN\",\"layout\":{\"type\":\"SingleColumnLayout\",\"children\":[{\"type\":\"TextHeading\",\"text\":\"Hello World\"},{\"type\":\"Footer\",\"label\":\"Complete\",\"on-click-action\":{\"name\":\"complete\",\"payload\":{}}}]},\"title\":\"Welcome\",\"terminal\":true,\"success\":true,\"data\":{}}]}",
  "publish" : true
}'
```

| Parameter | Description | Optional |
| --- | --- | --- |
| `name`<br>*string* | Flow name |  |
| `categories`<br>*array* | A list of Flow categories. Multiple values are possible, but at least one is required. Choose the values which represent your business use case. The list of values:<br><br>* `SIGN_UP`<br>* `SIGN_IN`<br>* `APPOINTMENT_BOOKING`<br>* `LEAD_GENERATION`<br>* `CONTACT_US`<br>* `CUSTOMER_SUPPORT`<br>* `SURVEY`<br>* `OTHER` |  |
| `clone_flow_id`<br>*string* | ID of source Flow to clone. You must have permission to access the specified Flow. | ✓ |
| `endpoint_uri`<br>*string* | The URL of the WA Flow Endpoint. Starting from Flow JSON version 3.0 this property should be specified only via API. Do not provide this field if you are cloning a Flow with Flow JSON version below 3.0. | ✓ |

**Sample Response**

```json
{
   "id": "<Flow-ID>"
   "success": true,
   "validation_errors": [
    {
      "error": "INVALID_PROPERTY_VALUE" ,
      "error_type": "FLOW_JSON_ERROR",
      "message": "Invalid value found for property 'type'.",
      "line_start": 10,
      "line_end": 10,
      "column_start": 21,
      "column_end": 34,
      "pointers": [
       {
         "line_start": 10,
         "line_end": 10,
         "column_start": 21,
         "column_end": 34,
         "path": "screens [0]. layout.children [0].type"
       }
      ]
    }
  ]
}
```

### Updating Flow's metadata {#update}
After you have created your Flow, you can update the name or categories using the update request.

**Sample Request**

```curl
curl -X POST '{BASE-URL}/{FLOW-ID}' \
--header 'Authorization: Bearer {ACCESS-TOKEN}' \
--header "Content-Type: application/json" \
--data '{
  "name": "New flow name"
}'
```

| Parameter | Description | Optional |
| --- | --- | --- |
| `name`<br>*string* | Flow name |  |
| `categories`<br>*array* | A list of Flow categories. Missing value will keep existing categories. If provided, one value is required. | ✓ |
| `endpoint_uri`<br>*string* | The URL of the WA Flow Endpoint. Starting from Flow JSON version 3.0 this property should be specified via API or via the Builder UI. Do not provide this field if you are updating a Flow with Flow JSON version below 3.0. | ✓ |

**Sample Response**

```json
{
  "success": true
}
```

### Updating a Flow's Flow JSON {#update-json}

To update Flow JSON for a specified Flow, use this request. Note that the file must be attached as form-data.

**Sample Request**

```curl
curl -X POST '{BASE-URL}/{FLOW_ID}/assets' \
--header 'Authorization: Bearer {ACCESS-TOKEN}' \
--form 'file=@"/path/to/file";type=application/json' \
--form 'name="flow.json"' \
--form 'asset_type="FLOW_JSON"' # file must be attached as form-data
```

| Parameter | Description | Optional |
| --- | --- | --- |
| `name`<br>*string* | Flow asset name. The value must be `flow.json` |  |
| `asset_type`<br>*string* | Asset type. The value must be `FLOW_JSON` |  |
| `file`<br>*json* | File with the JSON content. The size is limited to 10 MB |  |

**Sample Response**

Every update request will return validation errors in the Flow JSON, if any.

```json
{
  "success": true,
  "validation_errors": [
    {
      "error": "INVALID_PROPERTY_VALUE" ,
      "error_type": "FLOW_JSON_ERROR",
      "message": "Invalid value found for property 'type'.",
      "line_start": 10,
      "line_end": 10,
      "column_start": 21,
      "column_end": 34,
      "pointers": [
       {
         "line_start": 10,
         "line_end": 10,
         "column_start": 21,
         "column_end": 34,
         "path": "screens [0]. layout.children [0].type"
       }
      ]
    }
  ]
}
```

**Sample Request**

```curl
curl '{BASE-URL}/{FLOW-ID}?fields=preview.invalidate(false)' \
--header 'Authorization: Bearer {ACCESS-TOKEN}'
```

**Sample Response**

```json
{
  "preview": {
    "preview_url": "https://business.facebook.com/wa/manage/flows/550.../preview/?token=b9d6....",
    "expires_at": "2023-05-21T11:18:09+0000"
  },
  "id": "flow-1"
}
```

The `preview_url` can also be embedded as an iframe into an existing website using the following code (replace url with the one returned by the API):

```html
<iframe src="https://business.facebook.com/wa/manage/flows/550.../preview/?token=b9d6...." width="430" height="800" ></iframe>
```

| Field | Description |
| --- | --- |
| preview_url | Link for the preview page. This link does not require login and can be shared with stakeholders, but the link will expire in 30 days, or if you call the API with `invalidate=true` which will generate a new link. |
| expires_at | Time when the link will expire and you need to call the API again to get a new link (30 days from link creation). |

### Deleting a Flow {#delete}
While a Flow is in `DRAFT` status, it can be deleted. Use this request for that purpose.

**Sample Request**

```curl
curl -X DELETE '{BASE-URL}/{FLOW-ID}' \
--header 'Authorization: Bearer {ACCESS-TOKEN}'
```

**Sample Response**

```json
{
  "success": true
}
```

### Retrieving a List of Flows {#list}

To retrieve a list of Flows under a WhatsApp Business account (WABA), use the following request.

**Sample Request**

```curl
curl '{BASE-URL}/{WABA-ID}/flows' \
--header 'Authorization: Bearer {ACCESS-TOKEN}'
```

**Sample Response**

```json
{
    "data": [
    {
        "id": "flow-1",
        "name": "flow 1",
        "status": "DRAFT",
        "categories": [ "CONTACT_US" ],
        "validation_errors": []
    },
    {
        "id": "flow-2",
        "name": "flow 2",
        "status": "PUBLISHED",
        "categories": [ "SURVEY" ],
        "validation_errors": []
    },
    {
        "id": "flow-3",
        "name": "flow 3",
        "status": "DRAFT",
        "categories": [ "LEAD_GENERATION" ],
        "validation_errors": []
    }
    ],
    "paging": {
        "cursors": {
            "before": "QVFI...",
            "after": "QVFI..."
        }
    }
}
```

### Retrieving Flow details {#details}

This request will return a single Flow's details. By default it will return the fields `id`,`name`, `status`, `categories`, `validation_errors`. You can request other fields by using the `fields` param in the request. The request example below includes all possible fields.

**Sample Request**

**Sample Response**

| Field | Description | Returned by default |
| --- | --- | --- |
| `id`<br>*string* | The unique ID of the Flow. | ✓ |
| `name`<br>*string* | The user-defined name of the Flow which is not visible to users. | ✓ |
| `status`<br>*string* | `DRAFT`: This is the initial status. The Flow is still under development. The Flow can only be sent with `"mode": "draft"` for testing.<br><br>`PUBLISHED`: You have marked the Flow as published so now it can be sent to customers. This Flow cannot be deleted or updated afterwards.<br><br>`DEPRECATED`: You have marked the Flow as deprecated (since it cannot be deleted after publishing). This prevents sending and opening the Flow, to allow you to retire your endpoint. Deprecated Flows cannot be deleted or restored to a previous state.<br><br>`BLOCKED`: Monitoring detected that the endpoint is unhealthy and set the status to Blocked. The Flow cannot be sent or opened in this state; you need to fix the endpoint to get it back to Published state (more details in [Flows Health and Monitoring](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/healthmonitoring)).<br><br>`THROTTLED`: Monitoring detected that the endpoint is unhealthy and set the status to Throttled. Flows with throttled status can be opened, however only 10 messages of the Flow could be sent per hour. You need to fix the endpoint to get it back to the `PUBLISHED` state (more details in [Flows Health and Monitoring](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/healthmonitoring)). | ✓ |
| `categories`<br>*array* | A list of flow categories. | ✓ |
| `validation_errors`<br>*array* | A list of errors in the Flow.<br><br>**All errors must be fixed before the Flow can be published.** | ✓ |
| `json_version`<br>*string* | The version you specified in the Flow JSON asset uploaded. |  |
| `data_api_version`<br>*string* | The version of the Data API you specified in the Flow JSON asset uploaded. Only for Flows with an Endpoint. |  |
| `data_channel_uri`<br>*string* | **[DEPRECATED in API v19.0 ] Use `endpoint_uri` field instead.**<br><br>The URL of the WA Flow Endpoint you specified via API or in the Builder UI. |  |
| `endpoint_uri`<br>*string* | The URL of the WA Flow Endpoint you specified via API or in the Builder UI. |  |
| `preview`<br>*object* | The URL to the web preview page to visualize the flow and its expiry time. |  |
| `whatsapp_business_account`<br>*object* | The WhatsApp Business account which owns the Flow. |  |
| `application`<br>*object* | The Facebook developer application used to create the Flow initially. |  |

### Retrieving a Flow's list of assets {#asset-list}

Returns all assets attached to a specified Flow.

**Sample Request**

```curl
curl '{BASE-URL}/{FLOW-ID}/assets' \
--header 'Authorization: Bearer {ACCESS-TOKEN}'
```

**Sample Response**

```json
{
  "data": [
    {
      "name": "flow.json",
      "asset_type": "FLOW_JSON",
      "download_url": "https://scontent.xx.fbcdn.net/m1/v/t0.57323-24/An_Hq0jnfJ..."
    }
  ],
  "paging": {
    "cursors": {
      "before": "QVFIU...",
      "after": "QVFIU..."
    }
  }
}
```

### Publishing a Flow {#publish}

You can publish your Flow once you have ensured that:

- All validation errors and [publishing checks](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/healthmonitoring#publishing-checks) have been resolved.
- The Flow meets the [design principles](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/bestpractices) of WhatsApp Flows
- The Flow complies with [WhatsApp Terms of Service](https://www.whatsapp.com/legal/terms-of-service/?lang=en), the [WhatsApp Business Messaging Policy](https://faq.whatsapp.com/933578044281252) and, if applicable, the [WhatsApp Commerce Policy](https://www.whatsapp.com/legal/commerce-policy/?lang=en)

**Sample Request**

```curl
curl -X POST '{BASE-URL}/{FLOW-ID}/publish' \
--header 'Authorization: Bearer {ACCESS-TOKEN}'
```

**Sample Response**

```json
{
  "success": true
}
```

### Deprecating a Flow {#deprecate}

Once a Flow is published, it cannot be modified or deleted, but can be marked as deprecated.

**Sample Request**

```curl
curl -X POST '{BASE-URL}/{FLOW-ID}/deprecate' \
--header 'Authorization: Bearer {ACCESS-TOKEN}'
```

**Sample Response**

```json
{
  "success": true
}
```

## Troubleshooting {#troubleshooting}

| Issue | Potential cause | Steps to resolve |
| --- | --- | --- |
| Received a permission error while calling the API | Insufficient Permissions | You can check your permissions with the following link (replace WA Business Account ID and  Business ID with your values)<br><br>https://business.facebook.com/settings/whatsapp-business-accounts/{waba-id}?business_id={business-id}<br><br>To use Flows API you need **Message templates (view and manage)** and **Phone Numbers (view and manage)** permissions. |
|  | Incorrect Access Token | Use the Access Token Debugger tool to verify your token permissions<br><br>[https://developers.facebook.com/tools/debug/accesstoken](https://developers.facebook.com/tools/debug/accesstoken)<br><br>In *Scopes* field, you should have **whatsapp_business_management, whatsapp_business_messaging**. And under *Granular Scopes* section you should see your WABA Id under both **whatsapp_business_management** and **whatsapp_business_messaging**<br><br>After you verify access token, please try to make basic request with the token, like `GET /waba-id` or `GET /flow-id`. |
|  | Invalid request syntax | Use the [Postman Collection](https://www.postman.com/meta/workspace/whatsapp-business-platform/documentation/24926895-7bf51205-92ed-49d1-af4a-0130cf84b6f6) to make the same request. |

