# Lifecycle of a Flow




Flows can exist in a variety of states during their lifetime,
with each state conveying different requirements, abilities, and limitations.
This article outlines the different states that exist, how a Flow transitions into each state, and what each state means for developers building and sending Flows.

## Business-set Flow states

Most common states are the result of API calls, such as creating or publishing a Flow. This section covers the various states that you have control over as a business.

### Draft {#draft}

When a Flow is initially created, it enters the "Draft" state which indicates that the Flow is actively being modified.

While in the Draft state, the Flow is only able to be sent for testing, and also has the ability to be fully deleted if no longer needed.

**Warning:** WhatsApp shows a banner at the top of the Flow when a user views it in Draft state.

**Next states**: [Deleted](#deleted), [Published](#published)

### Deleted {#deleted}

Technically this is not a "state" of a Flow because this represents a Flow that no longer exists.
However, it's important to note that Flows may be deleted, but only if they are in the Draft state.

**Warning:** You can delete a Flow using [Flow Builder](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/gettingstarted).

**Next states**: None (terminal)

### Published {#published}

Once a Flow is ready to be sent, it transitions from the Draft state to the Published state. This allows it to be sent to real users rather than just for testing.

### Deprecated {#deprecated}

Once a Flow enters the Deprecated state, it can no longer be sent to real users. Keep in mind that a deprecated Flow may still be present on users' devices and you may still see responses from the deprecated Flow.

**Next states**: None (terminal)

## System-set Flow states

This section covers the states that can only be entered based on WhatsApp monitoring determining that there is an issue or that an issue has been resolved.

### Throttled {#throttled}

In the case that WhatsApp monitoring detects that the endpoint or screen navigations for your Flow are unhealthy, it transitions the Flow to a Throttled state.
A throttled Flow can still be opened and sent, however sending is limited to 10 messages per hour.

If your Flow enters the Throttled state and you need help diagnosing the issue, start by opening a support case using the [Support Portal](https://business.facebook.com/direct-support/).

If WhatsApp monitoring detects an improvement in the health of the Flow's endpoint, it transitions the Flow out of the Throttled state and back into the [Published](#published) state.

**Next states**: [Published](#published), [Deprecated](#deprecated), [Blocked](#blocked)

### Blocked {#blocked}

If a Flow has entered the [Throttled](#throttled) state and WhatsApp monitoring detects that the health of the provided endpoint has deteriorated even further, it transitions the Flow into the Blocked state. This is to prevent a degraded user experience for WhatsApp Flows.

While in the Blocked state, the business cannot send the Flow and users cannot open it. WhatsApp monitoring continues to check the health of the endpoint, and upon improvement it transitions the Flow back to [Throttled](#throttled) and then to the [Published](#published) state.

**Next states**: [Deprecated](#deprecated), [Throttled](#throttled)

## Example Flow lifecycles

To illustrate how Flows might transition through the various states, here are some real-life examples of the stages and events leading to transitions.

### A successful Flow

In this example, you publish a Flow and it continues to run with no issues. One day it may be deprecated, but it has not entered that state yet.

| State | Event | Action | New state |
| --- | --- | --- | --- |
|  | Create a new Flow | [Create](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#create) | Draft |
| Draft | Update the Flow JSON content | [Update JSON](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#update-json) | Draft |
| Draft | Update the `data_channel_uri` | [Update](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#update) | Draft |
| Draft | Decide that the Flow is ready for production | [Publish](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#publish) | Published |

### A Flow with health issues

In this example, you publish a Flow that has intermittent health issues with the provided endpoint. WhatsApp monitoring detects problems, recoveries, and then further problems. Finally, health is fully restored.

| State | Event | Action | New state |
| --- | --- | --- | --- |
|  | Create a new Flow | [Create](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#create) | Draft |
| Draft | Update the Flow JSON content | [Update JSON](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#update-json) | Draft |
| Draft | Decide that the Flow is ready for production | [Publish](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#publish) | Published |
| Published | WhatsApp monitoring detects health issues with the provided endpoint or screen navigations for your Flow | Throttle | Throttled |
| Throttled | WhatsApp monitoring detects the endpoint is healthy | Unthrottle | Published |
| Published | WhatsApp monitoring detects health issues again | Throttle | Throttled |
| Throttled | WhatsApp monitoring detects health has deteriorated further | Block | Blocked |
| Blocked | WhatsApp monitoring detects the endpoint is healthy | Unblock | Throttled |
| Throttled | WhatsApp monitoring detects the endpoint is still healthy | Unthrottle | Published |

### A Flow that never makes it to production

In this example, you work on a Flow but decide that you no longer need it. This Flow never ends up being visible to real users.

| State | Event | Action | New state |
| --- | --- | --- | --- |
|  | Create a new Flow | [Create](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#create) | Draft |
| Draft | Update the Flow JSON content | [Update JSON](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#update-json) | Draft |
| Draft | Update the `data_channel_uri` | [Update](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#update) | Draft |
| Draft | Decide that the Flow isn't needed anymore | [Delete](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#delete) | Deleted |

