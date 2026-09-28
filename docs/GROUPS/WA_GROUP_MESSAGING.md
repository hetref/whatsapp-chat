# Group messaging



**Warning:** **This page now only discusses how to send and receive messages in groups.**

**To learn how to manage groups, see the [Group Management Reference page](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/reference)**

## Overview

This document describes the APIs and webhooks for sending and receiving messages within groups. It details support for various message types, including:

* Text messages
* Media messages
* Text-based templates
* Media-based templates

## Subscribe to groups metadata webhooks

To receive webhook notifications for metadata about your groups, subscribe to the following webhook fields:

* `group_lifecycle_update`
* `group_participants_update`
* `group_settings_update`
* `group_status_update`

**Warning:** For a full reference of webhooks for the Groups API, see the [Webhooks for Groups API reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/webhooks).

## Send group message

To send a group message, use the [Messages API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api#post-version-phone-number-id-messages).

This endpoint has been extended to support group messages in the following way:

* The `recipient_type` field now supports `group` as well as `individual`.
* The `to` field now supports the `group ID` that is obtained when using the Groups API.

### Example group message send

```html
curl 'https://graph.facebook.com/v25.0/756079150920219/messages' \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer EAAAu...' \
-d '
{
  "messaging_product": "whatsapp",
  "recipient_type": "group",
  "to": "Y2FwaV9ncm91cDoxNzA1NTU1MDEzOToxMjAzNjM0MDQ2OTQyMzM4MjAZD",
  "type": "text",
  "text": {
      "preview_url": true,
      "body": "This is another destination option: https://www.luckytravel.com/DDLmU5F1Pw"
  }
}'
```

### Webhooks

#### Group message sent example

```html
{
   "object": "whatsapp_business_account",
   "entry": [
     {
       "id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
       "changes": [
         {
           "value": {
               "messaging_product": "whatsapp",
               "metadata": {
                    "display_phone_number": "<BUSINESS_DISPLAY_PHONE_NUMBER>",
                    "phone_number_id": "<BUSINESS_PHONE_NUMBER_ID>"
               },
               "statuses": [
                 {
                   "id": "<WHATSAPP_MESSAGE_ID>",
                   "recipient_id": "<GROUP_ID>",
                   "recipient_type": "group",
                   "status": "sent",
                   "timestamp": "<WEBHOOK_TRIGGER_TIMESTAMP>",
                 }
               ]
           },
           "field": "messages"
         }
       ]
     }
   ]
 }
```

#### Group message failed example

```html
{
   "object": "whatsapp_business_account",
   "entry": [
     {
       "id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
       "changes": [
         {
           "value": {
               "messaging_product": "whatsapp",
               "metadata": {
                    "display_phone_number": "<BUSINESS_DISPLAY_PHONE_NUMBER>",
                    "phone_number_id": "<BUSINESS_PHONE_NUMBER_ID>"
               },
               "statuses": [
                 {
                   "id": "<WHATSAPP_MESSAGE_ID>",
                   "recipient_id": "<GROUP_ID>",
                   "recipient_type": "group",
                   "status": "failed",
                   "timestamp": "<WEBHOOK_TRIGGER_TIMESTAMP>",
                   "errors": [
                     {
                       "code": "<ERROR_CODE>",
                       "title": "<ERROR_TITLE>",
                       "message": "<ERROR_MESSAGE>",
                       "error_data": {
                         "details": "<ERROR_DETAILS>",
                       },
                       "href": "/documentation/business-messaging/whatsapp/support/error-codes"
                    }
                  ]
                }
              ]
           },
           "field": "messages"
         }
       ]
     }
   ]
 }
```

## Receive group messages

You can use the following webhooks to receive statuses on messages received in the group.

The `message` object includes a `group_id` field to indicate this is a group message. The `from` field in the `message` object and the contact object point to the same participant who sends this message.

### Webhooks

#### Receive group message webhook sample

```html
{
  "object": "whatsapp_business_account",
  "entry": [{
      "id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
      "changes": [{
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                  "display_phone_number": "<BUSINESS_DISPLAY_PHONE_NUMBER>",
                  "phone_number_id": "<BUSINESS_PHONE_NUMBER_ID>"
              },
              "contacts": [{
                  "profile": {
                    "name": "<WHATSAPP_USER_NAME>"
                  },
                  "wa_id": "<WHATSAPP_USER_PHONE_NUMBER>"
                }],
              "messages": [{
                  "from": "<GROUP_PARTICIPANT_PHONE_NUMBER>",
                  "group_id": "<GROUP_ID>",
                  "id": "<WHATSAPP_MESSAGE_ID>",
                  "timestamp": "<WEBHOOK_TRIGGER_TIMESTAMP>",
                  "text": {
                    "body": "<MESSAGE_BODY>"
                  },
                  "type": "text"
                }]
          },
          "field": "messages"
        }]
  }]
}
```

#### Receive unsupported group message webhook sample

```html
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
      "changes": [
        {
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                   "display_phone_number": "<BUSINESS_DISPLAY_PHONE_NUMBER>",
                   "phone_number_id": "<BUSINESS_PHONE_NUMBER_ID>",
              },
              "contacts": [
                {
                  "profile": {
                    "name": "<WHATSAPP_USER_NAME>"
                  },
                  "wa_id": "<WHATSAPP_USER_PHONE_NUMBER>"
                }
              ],
              "messages": [
                {
                  "from": "<GROUP_PARTICIPANT_PHONE_NUMBER>",
                  "group_id": "<GROUP_ID>",
                  "id": "<WHATSAPP_MESSAGE_ID>",
                  "timestamp": "<WEBHOOK_TRIGGER_TIMESTAMP>",
                  "errors": [
                    {
                      "code": 130501,
                      "message": "Message type is not currently supported",
                      "title": "Unsupported message type",
                      "error_data": {
                        "details": "<ERROR_DETAILS>"
                      }
                    }
                  ],
                  "type": "unsupported"
                }
              ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

## Pin and unpin group message

Pinning a message highlights its relevance.

The display order of the pinned messages is based on the chronological order of parent messages, newest first. If three messages are already pinned when a new pin request is made, the oldest pinned message will be automatically unpinned.

### Limits

1. When calling the API, only one message can be pinned at a time.
1. Only the group admin can pin or unpin messages.
1. A maximum of 3 pinned messages can exist at any time.

### Request syntax
`POST /<BUSINESS_PHONE_NUMBER_ID>/messages`

**Note: You will receive an error in the sync response if the `recipient_type` and `to` type do not match.**

### Request body

```html
{
  "messaging_product": "whatsapp",
  "recipient_type": "group",
  "to": "<GROUP_ID>",
  "type": "pin",
  "pin": {
    "type": "<PIN_OPERATION>",
    "message_id": "<MESSAGE_ID>",
    "expiration_days": "<EXPIRATION>"
  }
}
```

### Body parameters

| Placeholder | Description | Sample Value |
| --- | --- | --- |
| `<GROUP_ID>`<br><br>_String_ | **Required**<br><br>The group in which you are pinning a message. | `Y2FwaV9ncm91cDoxOTUwNTU1MDA3OToxMjAzNjMzOTQzMjAdOTY0MTUZD` |
| `<PIN_OPERATION>`<br><br>_String_ | **Required**<br><br>The pinning operation you are performing on the group.<br><br>Can either be `"pin"` or `"unpin"` | `pin` |
| `<MESSAGE_ID>`<br><br>_String_ | **Required**<br><br>A unique identifier for the message you are pinning or unpinning in the group. | `wamid.HBgLM...` |
| `<EXPIRATION>`<br><br>_Integer_ | **Required when `PIN_OPERATION` is `pin`**<br><br>Pin duration in days. Can be 1 to 30 days. | `4` |

### Response body

```html
    {
      "messaging_product": "whatsapp",
      "contacts": [
        {
          "input": "Y2FwaV9ncm91cDo....",
          "wa_id": "Y2FwaV9ncm91cDo...."
        }
      ],
      "messages": [
        {
          "id": "wamid.HBgLM..."
        }
      ]
}
```

### Webhooks

Subscribe to the `messages` webhook topic to receive message status notifications. Standard sent and delivered statuses webhooks will be received for the `message_id` in the response.

[Learn more about the messages `status` webhook object here](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status)

## Group message status webhooks

When you send messages to a group, you will receive a webhook when the message is delivered or read.

You receive a single aggregated webhook instead of multiple webhooks.

This means that if you send a message and are set to receive several `read` or `delivered` statuses, you receive a single aggregated webhook containing multiple `status` objects.

Each webhook you receive is only ever in reference to a single message sent to a single group and a single status type.

[Learn more about the Group Message Status webhook](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/webhooks#group-message-status-webhooks)
