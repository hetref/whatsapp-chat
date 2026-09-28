# Sending a Flow




This guide describes the ways to send a Flow to users.

## Prerequisites
You will need to [verify your business](https://developers.facebook.com/docs/development/release/business-verification) and maintain a [high message quality](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages#message-quality).

## Postman collection {#postman}

All the API requests mentioned below are documented in the [Flows API postman collection](https://www.postman.com/meta/workspace/whatsapp-business-platform/documentation/24926895-7bf51205-92ed-49d1-af4a-0130cf84b6f6) which you can use to make API requests and generate code in different languages.

## Business initiated messages {#templatemessages}

To send a business initiated message with a Flow, you can create and send a [message template](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) with a WhatsApp Flow attached to it. A new button type called FLOW is available. Use this type to specify the Flow to be sent with the message template.

To send a Flow message template you need to:

1. Create a message template with a Flow
2. Send a message template with a Flow

### Create a message template with a Flow

You can quickly build a Flow in the [playground](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/playground) and pass the Flow JSON in the message template creation request. Or you can specify the ID or name of an already published Flow.

Below is an example request to create a message template with a Flow, [see this page for full reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api#post-version-waba-id-message-templates):

#### Sample request

#### Sample request

Message templates can be created and sent in [these languages](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/supported-languages).

#### Sample Response

```curl
{
  "id": "<TEMPLATE_ID>",
  "status": "PENDING",
  "category": "MARKETING"
}
```

#### Sample response

```curl
{
  "id": "<template-id>",
  "status": "PENDING",
  "category": "MARKETING"
}
```

### Send template with flow
**Note:** Ensure that your template passes all required reviews so that `status` is `APPROVED` instead of `PENDING`.

Now you can send a message template with a Flow using the request below
#### Sample request

```curl
curl -X  POST \
 'https://graph.facebook.com/v16.0/FROM_PHONE_NUMBER_ID/messages' \
 -H 'Authorization: Bearer ACCESS_TOKEN' \
 -H 'Content-Type: application/json' \
 -d '{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "PHONE_NUMBER",
  "type": "template",
  "template": {
    "name": "TEMPLATE_NAME",
    "language": {
      "code": "LANGUAGE_AND_LOCALE_CODE"
    },
    "components": [
      {
        "type": "button",
        "sub_type": "flow",
        "index": "0",
        "parameters": [
          {
            "type": "action",
            "action": {
              "flow_token": "FLOW_TOKEN",   //optional, default is "unused"
              "flow_action_data": {
                 ...
              }   // optional, json object with the data payload for the first screen
            }
          }
        ]
      }
    ]
  }
}'
```

####  Sample response

```curl
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "<phone-number>",
      "wa_id": "<phone-number>"
    }
  ],
  "messages": [
    {
      "id": "<message-id>"
    }
  ]
}
```

## User-initiated conversations {#userinitiated}

After you create a Flow, you can send it. You can send a Message with a Flow in a user-initiated conversation using a Message with a Call To Action (CTA). You send this message through the Cloud API with information specific to the Flow. Tapping the CTA button triggers the Flow.

**Warning:** Read more about [message types, limits, and timing](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages).

As mentioned earlier, a message with a Flow is not much different from other types of messages. A Flow message uses the existing APIs, which are described on the following pages:

* [Cloud API Interactive Messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api#interactive-object) documentation page describes how to send Interactive Messages with the Cloud API.

To send a message with a Flow, you can use a new type of the Interactive Object named `flow` with the following properties.

### Interactive message parameters {#interactive-parameters}

| Property | Type | Description |
| --- | --- | --- |
| `interactive.type` | String | Value must be `flow` |
| `interactive.action.name` | String | Value must be `flow` |
| `interactive.action.parameters.flow_message_version` | String | Value must be `3`. |
| `interactive.action.parameters.flow_id` | String | Unique ID of the Flow provided by WhatsApp.<br><br>Cannot be used with the `flow_name` parameter. Only one of these parameters is required. |
| `interactive.action.parameters.flow_name` | String | The name of the Flow that you created. Changing the Flow name will require updating this parameter to match the new name.<br><br>Cannot be used with the `flow_id` parameter. Only one of these parameters is required. |
| `interactive.action.parameters.flow_cta` | String | Text on the CTA button. For example: "Signup"<br><br>CTA text length is advised to be 30 characters or less (no emoji). |
| `interactive.action.parameters.mode` | String | The Flow can be in either `draft` or `published` mode. `published` is the default value for this field. |
| `interactive.action.parameters.flow_token` | String | Flow token that is generated by the business to serve as an identifier. |
| `interactive.action.parameters.flow_action` | String | `navigate` or `data_exchange`. Default value is `navigate` |
| `interactive.action.parameters.flow_action_payload` | String |  |
| `interactive.action.parameters.flow_action_payload.screen` | String | The `id` of the first screen. |
| `interactive.action.parameters.flow_action_payload.data` | String | Optional. The input data for the first screen of the Flow. Must be a non-empty object. |

*In case you edited published flow and now it is in the draft state, use "mode=draft" to send the current draft flow version, or "mode=published" (default value) to send the last published flow version.

**See Flow JSON reference for [entry screen](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowjson#routing-rules) details.**

**Cloud API Sample Request (with all parameters)**

```curl
curl -X  POST \
 'https://graph.facebook.com/v18.0/FROM_PHONE_NUMBER/messages' \
 -H 'Authorization: Bearer ACCESS_TOKEN' \
 -H 'Content-Type: application/json' \
 -d '{
  "recipient_type": "individual",
  "messaging_product": "whatsapp",
  "to": "whatsapp-id",
  "type": "interactive",
  "interactive": {
    "type": "flow",
    "header": {
      "type": "text",
      "text": "Flow message header"
    },
    "body": {
      "text": "Flow message body"
    },
    "footer": {
      "text": "Flow message footer"
    },
    "action": {
      "name": "flow",
      "parameters": {
        "flow_message_version": "3",
        "flow_token": "AQAAAAACS5FpgQ_cAAAAAD0QI3s.",

        "flow_name": "appointment_booking_v1",
        //or
        "flow_id": "123456",

        "flow_cta": "Book!",
        "flow_action": "navigate",
        "flow_action_payload": {
          "screen": "<SCREEN_NAME>",
          "data": "{\"product_name\":\"name\",\"product_description\":\"description\",\"product_price\":100}"
        }
      }
    }
  }
}'
```

**Sample Response**

```json
{
  "contacts": [
    {
      "Input": "+447385946746",
      "wa_id": "47385946746"
    }
  ],
  "messages": [
    {
      "id": "gHTRETHRTHTRTH-av4Y"
    }
  ],
  "meta": {
    "api_status": "stable",
    "version": "2.44.0.27"
  }
}
```
