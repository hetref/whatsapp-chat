# Sending a Flow



**Warning:** To read more about message types, limits, and timing, see [Send messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages).

To send the Flow as a template, first you need to [create a template](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api#post-version-waba-id-message-templates). Here is an example request:

| Property | Type | Description |
| --- | --- | --- |
| `buttons.flow_id` | String | `id` of a flow |
| `buttons.navigate_screen` | String | Flow JSON screen name. Required if flow_action is `navigate` |
| `buttons.flow_action` | Enum | `navigate` or `data_exchange`. Default value is `navigate` |

For more details, see the [template components reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/components).

#### Sample response

```curl
{
  "id": "<template-id>",
  "status": "PENDING",
  "category": "MARKETING"
}
```

**Note:** Ensure that your template passes all required reviews so that `status` is `APPROVED` instead of `PENDING`.

Now you can send a template message with a flow using the following request:

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

#### Sample response

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
