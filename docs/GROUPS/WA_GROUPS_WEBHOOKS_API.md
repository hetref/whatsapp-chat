# Webhooks for Groups API



In order to receive webhook notifications for metadata about your groups, please subscribe to the following webhook fields:

* `group_lifecycle_update`
* `group_participants_update`
* `group_settings_update`
* `group_status_update`

## `group_lifecycle_update` webhooks

A `group_lifecycle_update` webhook is triggered when a group is either created or deleted.

### Group create succeed

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "DISPLAY_PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "groups": [
              {
                "timestamp": "TIMESTAMP",
                "group_id": "GROUP_ID",
                "type": "group_create",
                "request_id": "REQUEST_ID",
                "subject": "test invite link",
                "invite_link": "https://chat.whatsapp.com/LINK_ID",
                "join_approval_mode": "JOIN_APPROVAL_MODE"
              }
            ]
          },
          "field": "group_lifecycle_update"
        }
      ]
    }
  ]
}
```

### Group create fail

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_ACCOUNT_ID",
      "changes": [
        {
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                   "display_phone_number": "DISPLAY_PHONE_NUMBER",
                   "phone_number_id": "PHONE_NUMBER_ID",
              },
               "groups": [
          {
                    "timestamp": "TIMESTAMP",
                    "type": "group_create",
                    "subject": "GROUP_SUBJECT",
                    "description": "GROUP_DESCRIPTION",
                    "request_id": "REQUEST_ID",
                    "group_id": "GROUP_ID",
                    "errors": [
                      {
                        "code": "ERROR_CODE",
                        "message": "ERROR_MESSAGE",
                        "title": "ERROR_TITLE",
                        "error_data": {
                          "details": "ERROR_DETAILS"
                        }
                      }
                    ]
          }
               ]
            },
          "field": "group_lifecycle_update"
        }
      ]
    }
  ]
}
```

### Delete group succeed

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_ACCOUNT_ID",
      "changes": [
        {
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                   "display_phone_number": "DISPLAY_PHONE_NUMBER",
                   "phone_number_id": "PHONE_NUMBER_ID",
              },
               "groups": [
                  {
                    "timestamp": "TIMESTAMP",
                    "group_id": "GROUP_ID",
                    "type": "group_delete",
                    "request_id": "REQUEST_ID",
                 }
               ]
          },
          "field": "group_lifecycle_update"
        }
      ]
    }
  ]
}
```

### Delete group fails

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_ACCOUNT_ID",
      "changes": [
        {
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                   "display_phone_number": "DISPLAY_PHONE_NUMBER",
                   "phone_number_id": "PHONE_NUMBER_ID",
              },
               "groups": [
                  {
                    "timestamp": "TIMESTAMP",
                    "group_id": "GROUP_ID",
                    "type": "group_delete",
                    "request_id": "REQUEST_ID",
                    "errors": [
                      {
                        "code": "ERROR_CODE",
                        "message": "ERROR_MESSAGE",
                        "title": "ERROR_TITLE",
                        "error_data": {
                          "details": "ERROR_DETAILS"
                        }
                      }
                    ]
                 }
               ]
          },
          "field": "group_lifecycle_update"
        }
      ]
    }
  ]
}
```

## `group_participants_update` webhooks

A `group_participants_update` webhook is triggered when a WhatsApp user joins a group with an invite link, requests to join a group, cancels their request, or when one or more join requests are approved.

### User joined group using invite link succeed

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_ACCOUNT_ID",
      "changes": [
        {
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                   "display_phone_number": "DISPLAY_PHONE_NUMBER",
                   "phone_number_id": "PHONE_NUMBER_ID",
              },
               "groups": [
                  {
                    "timestamp": "TIMESTAMP",
                    "group_id": "GROUP_ID",
                    "type": "group_participants_add",
                    "reason": "invite_link",
                    "added_participants": [
                        {
                          "wa_id": "WHATSAPP_ID",
                        },
                    ]
                 }
              ]
          },
          "field": "group_participants_update"
        }
      ]
    }
  ]
}
```

### User accepts or cancels join request

* **For join requests:** `GROUP_REQUEST_TYPE` is set to `group_join_request_created`.
* **For cancel requests:** `GROUP_REQUEST_TYPE` is set to `group_join_request_revoked`.

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "BUSINESS_DISPLAY_PHONE_NUMBER",
              "phone_number_id": "BUSINESS_PHONE_NUMBER_ID"
            },
            "groups": [
              {
                "timestamp": "WEBHOOK_TRIGGER_TIMESTAMP",
                "group_id": "GROUP_ID",
                "type": "GROUP_REQUEST_TYPE",
                "reason": "REASON_FOR_REQUEST_OUTCOME",
                "join_request_id": "JOIN_REQUEST_ID",
                "wa_id": "WHATSAPP_USER_ID"
              }
            ]
          },
          "field": "group_participants_update"
        }
      ]
    }
  ]
}
```

### Join request approved

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "BUSINESS_DISPLAY_PHONE_NUMBER",
              "phone_number_id": "BUSINESS_PHONE_NUMBER_ID"
            },
            "groups": [
              {
                "timestamp": WEBHOOK_TRIGGER_TIMESTAMP,
                "group_id": "GROUP_ID",
                "type": "group_participants_add",
                "reason": "invite_link",
                "added_participants": [
                  {
                    "input": "WHATSAPP_USER_PHONE_NUMBER",
                    "wa_id": "WHATSAPP_USER_ID"
                  },
                  //Additional added participants here, if approved in bulk.
                ]
              }
            ]
          },
          "field": "group_participants_update"
        }
      ]
    }
  ]
}
```

### Group participant remove succeed

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_ACCOUNT_ID",
      "changes": [
        {
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                   "display_phone_number": "DISPLAY_PHONE_NUMBER",
                   "phone_number_id": "PHONE_NUMBER_ID",
              },
               "groups": [
                  {
                    "timestamp": "TIMESTAMP",
                    "group_id": "GROUP_ID",
                    "type": "group_participants_remove",
                    "request_id": "REQUEST_ID",
                    "removed_participants": [
                        // User 1 removed successfully
                        {
                          "input": "PHONE_NUMBER or WHATSAPP_ID"
                        },
                        {
                          "input": "PHONE_NUMBER or WHATSAPP_ID"
                        },
                        ...
                    ]
                 }
                 "initiated_by": "business"
              ]
          },
          "field": "group_participants_update"
        }
      ]
    }
  ]
}
```

### Group participant remove with participants partially fails

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_ACCOUNT_ID",
      "changes": [
        {
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                   "display_phone_number": "DISPLAY_PHONE_NUMBER",
                   "phone_number_id": "PHONE_NUMBER_ID",
              },
               "groups": [
                  {
                    "timestamp": "TIMESTAMP",
                    "group_id": "GROUP_ID",
                    "type": "group_participants_remove",
                    "request_id": "REQUEST_ID",
                    "initiated_by": "business",
                    "removed_participants": [
                      // User 1 removed successfully
                      {
                        "input": "PHONE_NUMBER or WHATSAPP_ID"
                      },
                      // Additional users removed successfully
                      ...
                    ],
                    "failed_participants": [
                      // User 2 not removed due to errors
                      {
                        "input": "PHONE_NUMBER or WHATSAPP_ID",
                        "errors": [
                          {
                            "code": "ERROR_CODE",
                            "message": "ERROR_MESSAGE",
                            "title": "ERROR_TITLE",
                            "error_data": {
                              "details": "ERROR_DETAILS"
                            }
                          }
                        ]
                      }
                    ],
                    "errors": [
                      {
                        "code": "ERROR_CODE",
                        "message": "Failed to remove some participants from the group",
                        "title": "Not All Participants Remove Succeeded",
                        "error_data": {
                          "details": "ERROR_DETAILS"
                        }
                      }
                    ]
                 }
                 "initiated_by": "business"
              ]
          },
          "field": "group_participants_update"
        }
      ]
    }
  ]
}
```

### Group participant remove fails

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_ACCOUNT_ID",
      "changes": [
        {
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                   "display_phone_number": "DISPLAY_PHONE_NUMBER",
                   "phone_number_id": "PHONE_NUMBER_ID",
              },
               "groups": [
                  {
                    "timestamp": "TIMESTAMP",
                    "group_id": "GROUP_ID",
                    "type": "group_participants_remove",
                    "request_id": "REQUEST_ID",
                    "failed_participants": [
                      {
                        "input": "PHONE_NUMBER or WHATSAPP_ID"
                      },
                      {
                        "input": "PHONE_NUMBER or WHATSAPP_ID"
                      },
                      // Additional users failed to be removed
                      ...
                    ],
                    "errors": [
                      {
                        "code": "ERROR_CODE",
                        "message": "ERROR_MESSAGE",
                        "title": "ERROR_TITLE",
                        "error_data": {
                          "details": "ERROR_DETAILS"
                        }
                      }
                    ]
                 }
                 "initiated_by": "business"
              ]
          },
          "field": "group_participants_update"
        }
      ]
    }
  ]
}
```

### Group participant leaves webhook

This webhook is sent when a group participant leaves the group. The `initiated_by` field and only the `wa_id` in the `removed_participants` list will point to the participant who left the group.

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_ACCOUNT_ID",
      "changes": [
        {
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                   "display_phone_number": "DISPLAY_PHONE_NUMBER",
                   "phone_number_id": "PHONE_NUMBER_ID",
              },
               "groups": [
                  {
                    "timestamp": "TIMESTAMP",
                    "group_id": "GROUP_ID",
                    "type": "group_participants_remove",
                    "removed_participants": [
                      {
                        "wa_id": "WHATSAPP_ID",
                      }
                    ]
                 }
                 "initiated_by": "participant"
               ]
          },
          "field": "group_participants_update"
        }
      ]
    }
  ]
}
```

## `group_settings_update` webhooks

### Group settings update succeed

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "<ID>",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "DISPLAY_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "groups": [
              {
                "timestamp": "TIMESTAMP",
                "group_id": "GROUP_ID",
                "type": "group_settings_update",
                "request_id": "REQUEST_ID",
                "profile_picture": {
                  "mime_type": "image/jpeg",
                  "update_successful": true,
                  "sha256": "PHOTO_HASH",
                },
                "group_subject": {
                  "text": "Test Subject",
                  "update_successful": true,
                },
                "group_description": {
                  "text": "Test Description",
                  "update_successful": true,
                }
              }
            ]
          },
          "field": "group_settings_update"
        }
      ]
    }
  ]
}
```

### Group settings update partial fail

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "DISPLAY_PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "groups": [
              {
                "timestamp": "TIMESTAMP",
                "group_id": "GROUP_ID",
                "type": "group_settings_update",
                "request_id": "REQUEST_ID",
                "profile_picture": {
                  "mime_type": "image/jpeg",
                  "update_successful": true,
                  "sha256": "PHOTO_HASH",
                },
                "group_subject": {
                  "text": "Test Subject",
                  "update_successful": false,
                  "errors": [
                    {
                      "code": "ERROR_CODE",
                      "message": "ERROR_MESSAGE",
                      "title": "ERROR_TITLE",
                      "error_data": {
                        "details": "ERROR_DETAILS"
                      }
                    }
                  ]
                },
                "group_description": {
                  "text": "Test Description",
                  "update_successful": false,
                  "errors": [
                    {
                      "code": "ERROR_CODE",
                      "message": "ERROR_MESSAGE",
                      "title": "ERROR_TITLE",
                      "error_data": {
                        "details": "ERROR_DETAILS"
                      }
                    }
                  ]
                },
                "errors": [
                  {
                    "code": "ERROR_CODE",
                    "message": "ERROR_MESSAGE",
                    "title": "ERROR_TITLE",
                    "error_data": {
                      "details": "ERROR_DETAILS"
                    }
                  }
                ]
              }
            ]
          },
          "field": "group_settings_update"
        }
      ]
    }
  ]
}
```

### Group settings update total fail

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "<ID>",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "DISPLAY_PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER"
            },
            "groups": [
              {
                "timestamp": "TIMESTAMP",
                "group_id": "GROUP_ID",
                "request_id": "REQUEST_ID",
                "type": "group_settings_update",
                "profile_picture": {
                  "mime_type": "image/jpeg",
                    "sha256": "PHOTO_HASH",
                  "update_successful": false,
                  "errors": [
                    {
                      "code": "ERROR_CODE",
                      "message": "ERROR_MESSAGE",
                      "title": "ERROR_TITLE",
                      "error_data": {
                        "details": "ERROR_DETAILS"
                      }
                    }
                  ]
                },
                "group_subject": {
                  "text": "Test Subject",
                  "update_successful": false,
                  "errors": [
                    {
                      "code": "ERROR_CODE",
                      "message": "ERROR_MESSAGE",
                      "title": "ERROR_TITLE",
                      "error_data": {
                        "details": "ERROR_DETAILS"
                      }
                    }
                  ]
                },
                "group_description": {
                  "text": "Test Description",
                  "update_successful": false,
                  "errors": [
                    {
                      "code": "ERROR_CODE",
                      "message": "ERROR_MESSAGE",
                      "title": "ERROR_TITLE",
                      "error_data": {
                        "details": "ERROR_DETAILS"
                      }
                    }
                  ]
                },
                "errors": [
                  {
                    "code": "ERROR_CODE",
                    "message": "ERROR_MESSAGE",
                    "title": "ERROR_TITLE",
                    "error_data": {
                      "details": "ERROR_DETAILS"
                    }
                  }
                ]
              }
            ]
          },
          "field": "group_settings_update"
        }
      ]
    }
  ]
}
```

## `group_status_update` webhooks

WhatsApp uses advanced machine learning technology to evaluate group information including group subjects, profile photos, and group descriptions. We also provide simple options for users to make reports to us from any chat.

We may prevent further activity in chat groups to comply with our legal obligations. We may also prevent further chat activity when a group admin is in violation of our [Terms of Service](https://www.whatsapp.com/legal/terms-of-service).

You may receive a webhook if a group you manage is suspended. You may also receive a webhook if a suspended group you manage becomes clear of suspensions.

### Group suspended

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "DISPLAY_PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "groups": [
              {
                "timestamp": "TIMESTAMP",
                "type": "group_suspend",
                "group_id": "GROUP_ID"
              }
            ]
          },
          "field": "group_status_update"
        }
      ]
    }
  ]
}
```

### Group suspension cleared

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "DISPLAY_PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "groups": [
              {
                "timestamp": "TIMESTAMP",
                "type": "group_suspend_cleared",
                "group_id": "GROUP_ID"
              }
            ]
          },
          "field": "group_status_update"
        }
      ]
    }
  ]
}
```

## Group message status webhooks

When you send messages to a group, you will receive a status webhook when the message is sent, delivered, and read. Instead of sending multiple webhooks for each status update, WhatsApp may send an aggregated webhook.

There are two types of aggregated message status webhooks you can receive.

### Multiple participants, single message

If you send a message and are set to receive several `read` or `delivered` statuses from participants, you receive a single, aggregated webhook that contains multiple `status` objects.

Each webhook you receive will be in reference to a single message sent to a single group and a single status type, that is, single group, single status by multiple participants for a single message.

**Aggregated group message status**

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "BUSINESS_DISPLAY_PHONE_NUMBER",
              "phone_number_id": "BUSINESS_PHONE_NUMBER_ID"
            },
            "statuses": [
              {
                "id": "WHATSAPP_MESSAGE_ID",
                "status": "read",
                "timestamp": "WEBHOOK_TRIGGER_TIMESTAMP",
                "recipient_id": "GROUP_ID",
                "recipient_type": "group",
                "recipient_participant_id": "GROUP_PARTICIPANT_PHONE_NUMBER_1",
                "conversation": {
                  "id": "CONVERSATION_ID",
                  "origin": {
                    "type": "CONVERSATION_CATEGORY"
                  },
                  "pricing": {
                    "billable": IS_BILLABLE,
                    "pricing_model": "PRICING_MODEL",
                    "category": "CONVERSATION_CATEGORY"
                  }
                }
              },
              {
                "id": "WHATSAPP_MESSAGE_ID",
                "status": "read",
                "timestamp": "WEBHOOK_TRIGGER_TIMESTAMP",
                "recipient_id": "GROUP_ID",
                "recipient_type": "group",
                "recipient_participant_id": "GROUP_PARTICIPANT_PHONE_NUMBER_2",
                "conversation": {
                  "id": "CONVERSATION_ID",
                  "origin": {
                    "type": "CONVERSATION_CATEGORY"
                  },
                  "pricing": {
                    "billable": IS_BILLABLE,
                    "pricing_model": "PRICING_MODEL",
                    "category": "CONVERSATION_CATEGORY"
                  }
                }
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

### Multiple messages, single participant

If you send multiple messages to a group and are set to receive several `read` or `delivered` statuses from a single
participant, WhatsApp may send you a single, aggregated webhook that contains multiple `status` objects.

Each webhook you receive will be in reference to multiple messages sent to a single group and a single status type, that is, single group, single status by single participant for multiple messages.

**Aggregated group message status**

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "BUSINESS_DISPLAY_PHONE_NUMBER",
              "phone_number_id": "BUSINESS_PHONE_NUMBER_ID"
            },
            "statuses": [
              {
                "id": "WHATSAPP_MESSAGE_ID_1",
                "status": "delivered",
                "timestamp": "WEBHOOK_TRIGGER_TIMESTAMP",
                "recipient_id": "GROUP_ID",
                "recipient_type": "group",
                "recipient_participant_id": "GROUP_PARTICIPANT_PHONE_NUMBER",
                "conversation": {
                  "id": "CONVERSATION_ID",
                  "origin": {
                    "type": "CONVERSATION_CATEGORY"
                  },
                  "pricing": {
                    "billable": IS_BILLABLE,
                    "pricing_model": "PRICING_MODEL",
                    "category": "CONVERSATION_CATEGORY"
                  }
                }
              },
              {
                "id": "WHATSAPP_MESSAGE_ID_2",
                "status": "delivered",
                "timestamp": "WEBHOOK_TRIGGER_TIMESTAMP",
                "recipient_id": "GROUP_ID",
                "recipient_type": "group",
                "recipient_participant_id": "GROUP_PARTICIPANT_PHONE_NUMBER",
                "conversation": {
                  "id": "CONVERSATION_ID",
                  "origin": {
                    "type": "CONVERSATION_CATEGORY"
                  },
                  "pricing": {
                    "billable": IS_BILLABLE,
                    "pricing_model": "PRICING_MODEL",
                    "category": "CONVERSATION_CATEGORY"
                  }
                }
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

### Group message delivered

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "BUSINESS_DISPLAY_PHONE_NUMBER",
              "phone_number_id": "BUSINESS_PHONE_NUMBER_ID"
            },
            "statuses": [
              {
                "id": "WHATSAPP_MESSAGE_ID",
                "status": "delivered",
                "timestamp": "WEBHOOK_TRIGGER_TIMESTAMP",
                "recipient_id": "GROUP_ID",
                "recipient_type": "group",
                "participant_recipient_id": "GROUP_PARTICIPANT_PHONE_NUMBER",
                "conversation": {
                "id": "CONVERSATION_ID",
                "origin": {
                  "type": "CONVERSATION_CATEGORY"
                }
              },
                "pricing": {
                  "billable": IS_BILLABLE,
                  "pricing_model": "PRICING_MODEL",
                  "category": "CONVERSATION_CATEGORY"
                }
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

### Pricing information

Status messages webhooks that contain pricing information will have:

- `CONVERSATION_CATEGORY` set to one of:
  - `group_marketing` — Indicates a marketing conversation.
  - `group_utility` — Indicates a utility conversation.
  - `group_service` — Indicates a service conversation.
- `IS_BILLABLE` set to one of:
  - `true` — Indicates a billable conversation.
  - `false` — Indicates a non-billable conversation.
- `PRICING_MODEL` set to `PMP`.

[Learn more about Groups API pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/pricing)

####  Group message read (_With pricing_)

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "BUSINESS_DISPLAY_PHONE_NUMBER",
              "phone_number_id": "BUSINESS_PHONE_NUMBER_ID"
            },
            "statuses": [
              {
                "id": "WHATSAPP_MESSAGE_ID",
                "status": "read",
                "timestamp": "WEBHOOK_TRIGGER_TIMESTAMP",
                "recipient_id": "GROUP_ID",
                "recipient_type": "group",
                "participant_recipient_id": "GROUP_PARTICIPANT_PHONE_NUMBER",
                "conversation": {
                "id": "CONVERSATION_ID",
                "origin": {
                  "type": "CONVERSATION_CATEGORY"
                }
              },
                "pricing": {
                  "billable": IS_BILLABLE,
                  "pricing_model": "PRICING_MODEL",
                  "category": "CONVERSATION_CATEGORY"
                }
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

#### Group message read (_Without pricing_)

```curl
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "BUSINESS_DISPLAY_PHONE_NUMBER",
              "phone_number_id": "BUSINESS_PHONE_NUMBER_ID"
            },
            "statuses": [
              {
                "id": "WHATSAPP_MESSAGE_ID",
                "status": "read",
                "timestamp": "WEBHOOK_TRIGGER_TIMESTAMP",
                "recipient_id": "GROUP_ID",
                "recipient_type": "group",
                "participant_recipient_id": "GROUP_PARTICIPANT_PHONE_NUMBER"
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
