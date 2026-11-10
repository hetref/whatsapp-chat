# Static WhatsApp Flow Builder

The dashboard's **Flows** section stores static Flow definitions per signed-in business user and can publish them to the connected WhatsApp Business Account through Meta's Flows API. The app's separate Flow endpoint remains for Data Exchange integrations and is not used by this builder.

## Run and database setup

Configure `DATABASE_URL` in the root environment file, then apply the Prisma migration:

```powershell
npm run db:migrate:dev
```

Start the web app, apply the database migrations, and complete WhatsApp Cloud API setup before opening **Dashboard → Flows**. If setup is incomplete, Flows shows a setup-required screen linking to configuration. Publishing requires an access token with permission to manage Flows and a WhatsApp Business Account ID. Create a draft, add screens and components, configure screen navigation, and use **Preview** to try the form. **JSON** shows the generated Flow JSON; use **Copy JSON** or **Export** to download it.

## Static Flow behavior

- The generator emits Flow JSON version 7.3 using static component options and `navigate`/`complete` actions. It does not emit a Data Endpoint, `data_channel_uri`, or `routing_model`.
- Before saving or publishing a Flow, the editor validates its screens, fields, option values, and navigation to a final submission screen.
- **Publish to Meta** creates the Flow in the configured WhatsApp Business Account, uploads its JSON, and publishes it through Meta's Flows API. Find it in WhatsApp Manager → Flows for that connected account.
- Meta-published Flows cannot be edited or deleted. Duplicate a published Flow to make and publish a new version.
- A `Preview placeholder` is for the in-app preview. Meta Flow JSON does not support a placeholder attribute for input fields inside a Form, so placeholders are not included in exported JSON.
- Records are scoped to the signed-in user and keep the current WhatsApp Business Account ID as an association when available.

For Meta's Flow JSON and component reference, see [Flow JSON](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowjson) and [Components](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/components).
