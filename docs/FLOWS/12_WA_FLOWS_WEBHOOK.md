# Flows Webhooks


This guide describes the webhooks available for WhatsApp Flows, including which webhooks to subscribe to and how to monitor them.

There are various webhooks related to WhatsApp Flows that you should subscribe to and monitor.

Message webhook:

- [Flow response message webhook](#flowresponse)  

Webhook to monitor the status of your business' Flows:

- [Flows status changes](#statuschange)

Webhooks to monitor performance of endpoint-powered Flows:  

- [Client error rates](#clienter)
- [Endpoint error rates](#endpoint-error-rate-webhook)
- [Endpoint channel latencies](#endpoint-latency-webhook)
- [Endpoint channel availability](#endpoint-availability-webhook)

## Webhook setup

### Create an endpoint

Before you can start receiving notifications, you will need to create an endpoint on your server to receive notifications.

Your endpoint must be able to process two types of HTTPS requests: Verification Requests and Event Notifications. Since both requests use HTTPs, your server must have a valid TLS or SSL certificate correctly configured and installed. Self-signed certificates are not supported.

[Learn more about Verifying Requests and Event Notifications](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#create-endpoint)

#### Sample app endpoints

To test your Webhooks, you can create a [sample app](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/sample-app-endpoints)
with an endpoint for receiving notifications.

### Subscribe to webhooks

Once your endpoint is ready, go to your App Dashboard. If you do not have an app, [create a Business Type App](https://developers.facebook.com/docs/development/create-an-app).
In your App Dashboard, find the WhatsApp product and click **Configuration.** Then, find the webhooks section and select **Configure a webhook.** A dialog will then appear asking you for the following:

- Callback URL: The URL WhatsApp will be sending the events to. This URL is the endpoint you created above

- Verify Token: Set up when you create your webhook endpoint

After adding the information, click **Verify and Save.**

Back in the App Dashboard, click **WhatsApp > Configuration** on the left-side panel. From the Configuration page, select **Webhooks > Manage.** A dialog box will open with all the objects you can get notified about. To receive messages from your users, click **Subscribe** for **flows** AND **messages**.

**Note:** A Meta App can have only one endpoint configured. If you need to send your webhook updates to multiple endpoints, you need multiple Meta Apps.

If you are a Solution Partner, you may need to:  

1. [Add the `whatsapp_business_messaging` permission](https://developers.facebook.com/docs/development/create-an-app/app-dashboard#app-review) in your App Dashboard
1. [Successfully complete Meta App Review](https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review) – This step will take time but you can continue to test during the entire review process.

**Warning:** To get Webhook events for a specific WABA, you must [explicitly subscribe to that WABA](https://developers.facebook.com/documentation/business-messaging/whatsapp/whatsapp-business-accounts#waba-subscriptions).

## Flow response message webhook {#flowresponse}

When a user completes the Flow, a response message is sent to the WhatsApp chat. You receive it through the same webhook you use to process all other messages from users. The `response_json` field contains Flow-specific data whose structure is controlled by the Flow JSON or, for endpoint-powered Flows, by the final response payload from the endpoint.

**Warning:** The Flow response does not include the Flow ID. You can include a custom field in your Flow payload or an identifier in the `flow_token` field to identify the corresponding Flow.

Below is the structure of the Flow response message webhook payload:

```json
{
  "messages": [{
    "context": {
      "from": "16315558151",
      "id": "gBGGEiRVVgBPAgm7FUgc73noXjo"
    },
    "from": "<USER_ACCOUNT_NUMBER>",
    "id": "<MESSAGE_ID>",
    "type": "interactive",
    "interactive": {
      "type": "nfm_reply",
      "nfm_reply": {
        "name": "flow",
        "body": "Sent",
        "response_json": "{\"flow_token\": \"<FLOW_TOKEN>\", \"optional_param1\": \"<value1>\", \"optional_param2\": \"<value2>\"}"
      }
    },
    "timestamp": "<MESSAGE_SEND_TIMESTAMP>"
  }]
}
```

| Parameter | Description |
| --- | --- |
| `context`<br>*object* | Context of the message that the user replied to. Context object contains message_id of flows request message and sender number. |
| `context.from`<br>*string* | User's WhatsApp account number |
| `context.id`<br>*string* | Message ID |
| `context.type`<br>*string* | Always `interactive` |
| `interactive.type`<br>*string* | Always `nfm_reply` |
| `interactive.nfm_reply.name`<br>*string* | `flow` |
| `interactive.nfm_reply.body`<br>*string* | Always `Sent` |
| `interactive.nfm_reply.response_json`<br>*string* | Flow-specific data. The structure is either defined in flow JSON (see [Complete action](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowjson#complete-action)) or, if flow is using an endpoint, controlled by endpoint (see Final Response Payload in [Data Exchange Request](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/implementingyourflowendpoint#data_exchange_request)) |
| `timestamp`<br>*string* | Time of flow response message |

## Flows status and performance webhooks
### Webhook notification object

A combination of nested objects of JSON arrays and objects that contain information about a change.

| Name | Description |
| --- | --- |
| `object`<br><br>*string* | The webhook a business has subscribed to |
| `entry`<br>*array of objects* | An array of entry objects. Entry objects have the following properties:<br><br>- `id` - *string.* The WhatsApp Business account ID for the business that is subscribed to the webhook.<br><br>- `changes` - *Array of objects.* An array of change objects. Change objects have the following properties:<br><br>1. `value` — *Object.* A value object. See [Value Object](#value-object).<br><br>2. `field` — *String.* Notification type. Value will be flows. |

### Value object

Contains details for the change that triggered the webhook. This object is nested within the `changes` array of the `entry` array.

| Name | Description |
| --- | --- |
| `flow_id`<br><br>*string* | ID of the flow |
| `threshold`<br>*number* | The alert threshold that was reached or recovered from |
| `event`<br>*string* | Type of webhook notification sent, value being one of:<br><br>- `FLOW_STATUS_CHANGE`<br>- `CLIENT_ERROR_RATE`<br>- `ENDPOINT_ERROR_RATE`<br>- `ENDPOINT_LATENCY`<br>- `ENDPOINT_AVAILABILITY` |
| `message`<br>*string* | Detailed message describing webhook |
| `old_status`<br>*string* | Previous status of the flow, value being one of:<br><br>- `DRAFT`<br>- `PUBLISHED`<br>- `DEPRECATED`<br>- `BLOCKED`<br>- `THROTTLED` |
| `new_status`<br>*string* | Previous status of the flow, value being one of:<br><br>- `DRAFT`<br>- `PUBLISHED`<br>- `DEPRECATED`<br>- `BLOCKED`<br>- `THROTTLED` |
| `alert_state`<br>*string* | Status of the alert, value being one of:<br><br>- `ACTIVATED`<br><br>- `DEACTIVATED` |
| `requests_count`<br>*integer* | Number of requests used to calculate metric |
| `errors`<br>*array of objects* | An array of error objects describing each error included in the alert. Error objects have the following properties:<br><br>- `error_count` — *Integer.* Number of occurrences of the error. Example: 29.<br><br>- `error_rate` — *Integer.* Error specific error rate. Example: 16.<br><br>- `error_type` — *String.* The name of the error. See [Webhook Alerts and Endpoint Error Types](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/reference/error-codes#error-types-reported-via-webhook-alerts-or-propagated-back-to-endpoint) section of Error Codes page for details and suggestions for resolutions. |
| `p50_latency`<br>*integer* | P50 latency of the endpoint requests |
| `p90_latency`<br>*integer* | P90 latency of the endpoint requests |
| `error_rate`<br>*integer* | Overall error rate for the alert |

## Types of webhook notifications

### Status change webhook {#statuschange}

A notification is sent when the status for the flow changes, specifically when the flow is either `Published`, `Throttled`, `Blocked` or `Deprecated.`  

```json
{
  "entry": [
      {
        "id": "644600416743275",
        "time": 1684969340,
        "changes": [
          {
            "value": {
              "event": "FLOW_STATUS_CHANGE",
              "message": "Flow Webhook 3 changed status from DRAFT to PUBLISHED",
              "flow_id": "6627390910605886",
              "old_status": "DRAFT",
              "new_status": "PUBLISHED"
            },
            "field": "flows"
          }
        ]
      }
    ],
    "object": "whatsapp_business_account"
}
```

### Client error rate webhook {#clienter}

**Note:** Client error rate is approximate as it's not available for all the client devices and regions.

You receive a notification when the error rate for screen navigations on the client goes over one of the following thresholds and then again when it goes below these thresholds.

Error rate thresholds:

- 5%
- 10%
- 50%

The detection period for these thresholds is 60 minutes, which is the period over which the error rate is calculated. WhatsApp will only send a webhook if the error rate of the events in the past 60 minutes reaches any of these thresholds or goes below them.

#### Possible resolutions

- Check the errors listed in the alert and check the [error codes reference guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/reference/error-codes#error-types-reported-via-webhook-alerts-or-propagated-back-to-endpoint) for possible resolutions.

```json
{
  "entry": [
    {
      "id": "106181168862417",
      "time": 1674160476,
      "changes": [
        {
          "value": {
            "event": "CLIENT_ERROR_RATE",
            "message": "The flow client request error rate has reached the 5% threshold in the last 60 minutes. A higher error rate will make it harder for users to complete the flow, resulting in drop-offs.",
            "flow_id": "691244242662581",
            "error_rate": 14.28,
            "threshold": 10,
            "alert_state": "ACTIVATED",
            "errors": [
              {
                "error_type": "INVALID_SCREEN_TRANSITION",
                "error_rate": 66.66,
                "error_count": 2
              },
              {
                "error_type": "PUBLIC_KEY_MISSING",
                "error_rate": 33.33,
                "error_count": 1
              }
            ]
          },
          "field": "flows"
        }
      ]
    }
  ],
  "object": "whatsapp_business_account"
}
```

### Endpoint error rate webhook

You receive a notification when the error rate for endpoint requests goes over one of the following thresholds and then again when it goes below these thresholds.

Error rate thresholds:

- 5%
- 10%
- 50%

The detection period for these thresholds is 30 minutes, which is the period over which the error rate is calculated. WhatsApp will only send a webhook if the error rate of the events in the past 30 minutes reaches any of these thresholds or goes below them.

#### Possible resolutions

- Check the errors listed in the alert and check the [error codes reference guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/reference/error-codes#error-types-reported-via-webhook-alerts-or-propagated-back-to-endpoint) for possible resolutions.

```json
{
  "entry": [
    {
      "id": "106181168862417",
      "time": 1674160476,
      "changes": [
        {
          "value": {
            "event": "ENDPOINT_ERROR_RATE",
            "message": "The flow endpoint request error rate has reached the 10% threshold in the last 30 minutes. A higher error rate will make it harder for users to complete the flow, resulting in drop-offs.",
            "flow_id": "691244242662581",
            "error_rate": 14.28,
            "threshold": 10,
            "alert_state": "ACTIVATED",
            "errors": [
              {
                "error_type": "CAPABILITY_ERROR",
                "error_rate": 66.66,
                "error_count": 2
              },
              {
                "error_type": "TIMEOUT",
                "error_rate": 33.33,
                "error_count": 1
              }
            ]
          },
          "field": "flows"
        }
      ]
    }
  ],
  "object": "whatsapp_business_account"
}
```

### Endpoint latency webhook

You receive a notification when the p90 latency for endpoint requests goes over one of these thresholds and then again when it goes below these thresholds.

p90 latency thresholds:

- 1s
- 5s
- 7s

The detection period for these thresholds is 30 minutes, which is the period over which the latency is calculated. WhatsApp will only send a webhook if the latency of the events in the past 30 minutes reaches any of these thresholds or goes below them.

#### Possible resolutions
- Improve responsiveness of your endpoint and aim to return response in less than 1 second.

```json
{
  "entry": [
    {
      "id": "106181168862417",
      "time": 1674160476,
      "changes": [
        {
          "value": {
            "event": "ENDPOINT_LATENCY",
            "message": "Flow endpoint latency has reached the p90 threshold in the last 30 minutes. High latency will increase the loading time between screens in the flow, impacting user experience.",
            "flow_id": "691244242662581",
            "p90_latency": 8000,
            "p50_latency": 500,
            "requests_count": 34,
            "threshold": 7000,
            "alert_state": "ACTIVATED"
          },
          "field": "flows"
        }
      ]
    }
  ],
  "object": "whatsapp_business_account"
}
```

### Endpoint availability webhook

You receive a notification when the endpoint availability goes below the 90% threshold and then again when it goes above the threshold.

The detection period for the alert is 10 minutes.

#### Possible resolutions

- Ensure that your endpoint is available all the time and reachable from the internet.
- Check that it can correctly responds to [health check requests](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/whatsapp-business-encryption#set-business-public-key).  

```json
{
  "entry": [
    {
      "id": "106181168862417",
      "time": 1674160476,
      "changes": [
        {
          "value": {
            "event": "ENDPOINT_AVAILABILITY",
            "message": "The flow endpoint availability has breached the 90% threshold in the last 10 minutes. Users will be unable to open or use the flow.",
            "flow_id": "12345678",
            "alert_state": "ACTIVATED",
            "availability": 75,
            "threshold" : 90
          },
          "field": "flows"
        }

      ]
    }
  ],
  "object": "whatsapp_business_account"
}
```

