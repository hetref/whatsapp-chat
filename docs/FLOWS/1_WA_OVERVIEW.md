# Overview




WhatsApp Flows enables you to build interactive workflows inside WhatsApp. This section covers walkthroughs, technical references, and best practices for creating high-quality, engaging user experiences.

## Guides

### [Implementing Endpoints for Flows](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/implementingyourflowendpoint)

Learn how to use endpoints to provide dynamic data for the screens and control routing in your Flow.

### [Sending Flows](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/sendingaflow)

Learn how to send Flows via business-initiated templates and user-initiated interactive messages.

### [Flows encryption](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/whatsapp-business-encryption)

Set up encryption for secure data exchange between your endpoint and WhatsApp Flows.

### [Flow health and monitoring](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/healthmonitoring)

Monitor your Flow's health and address issues detected by WhatsApp.

### [Testing and debugging](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/testingdebugging)

Learn how to test and debug your WhatsApp Flow.

### [Best practices](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/bestpractices)

Learn how to make high-quality Flows with our Best Practices.

### [Flows templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flows-templates)

Use pre-built templates to quickly create and send Flows.

### [Examples](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/examples)

See code examples and tutorials on how to build Flow-based solutions.

## Reference

### [Flow JSON](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowjson)

Learn the structure and properties of Flow JSON used to define screens and routing.

### [Components](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/components)

Reference for all available Flow components including text inputs, dropdowns, date pickers, and more.

### [Media upload components](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/media_upload)

Reference for media upload components that allow users to upload images and documents in Flows.

### [Flows API](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi)

Create, update, publish, and manage Flows using the Graph API.

### [Webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowswebhooks)

Subscribe to Flow webhooks to receive response messages, status changes, and endpoint health alerts.

### [Error codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/reference/error-codes)

Learn about error responses from the Flows API and how to resolve them.

### [Lifecycle of a flow](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/lifecycle)

Understand Flow states (Draft, Published, Throttled, Blocked, and Deprecated) and how transitions work.

### [Versioning](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/versioning)

Learn about Flow JSON, Data API, and message versioning schemes and their lifecycle.

### [Metrics API](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/metrics_api)

Query system metrics for Flow endpoint performance (deprecated April 2026).

## Learn more

- Ready to create your first Flow? [Get Started here](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/gettingstarted).
- Want to experiment with a demo Flow? [Try it now with the Flows Playground](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/playground).

## Supported platforms

WhatsApp Flows support the following platforms:

* Android running OS 6.0 and newer
* iPhone running iOS 12 and newer

WhatsApp Flows are not supported on companion devices (for example, WhatsApp Web).

## Terminology

**Flows**: Represents a use case or workflow that a business offers to users. For example, "Book an appointment". A Flow consists of screens, components (such as input fields), assets such as graphics), and (optionally) an endpoint for data-driven interactions.

**Flow JSON**: Flow JSON is used to programmatically define Flows.

**Components**: Individual building blocks that make up a screen (text fields, buttons, and so on).

**Screens**: A collection of Components on a single screen, defined in Flow JSON.

**Endpoint**: Communication channel created to exchange data between WhatsApp screens and the business server that processes data from each screen. Based on the business logic, the channel is then used to respond back with data to render the next screen in the workflow.
