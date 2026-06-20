[← Back to Documentation Index](../index.md)

# Microsoft Entra ID Setup for Secured Rulesets

> One-time Azure-side setup an Entra ID (Azure AD) administrator must complete before `@dawmatt/api-grade-mcp` can authenticate to an Entra ID-protected ruleset using the device-code flow.

---

## Who Needs This

[Configuration Reference](configuration.md) and [Quick Start](quick-start.md) describe how to point `api-grade-mcp` at an Entra ID-secured ruleset using `tenantId` and `clientId`. Those values come from an **app registration** that does not exist until someone creates it.

This page is for the person setting up that app registration — typically an Entra ID administrator, or any user with permission to register applications in the tenant. It only needs to be done **once per tenant** (or once per environment, if you maintain separate dev/prod tenants). End users consuming the ruleset do not need to do any of this — they only complete the device-code sign-in described in [Configuration Reference](configuration.md#microsoft-entra-id-device-code-flow--the-server-handles-tokens-for-you-no-env-var-needed).

---

## What `api-grade-mcp` Expects

`api-grade-mcp` authenticates using the OAuth 2.0 **device-code flow**, requesting the scope `api://<clientId>/.default`. This means the app registration must:

1. Be a **public client** (no client secret — device-code flow does not use one).
2. Have device-code flow explicitly allowed.
3. **Expose an API** under its own Application ID URI (`api://<clientId>`) with at least one scope, since `api://<clientId>/.default` is what the server requests.
4. Be granted permission (with admin consent, if your tenant requires it) to call that scope.

The resource being protected (a SharePoint site, or a custom internal web app/API) must independently be configured to accept tokens issued for this app's audience — that part is outside Entra ID's app registration blade and depends on the resource itself (see [Protecting a Custom Resource](#protecting-a-custom-resource-vs-sharepoint) below).

---

## Step-by-Step: Create the App Registration

These steps use the [Azure Portal](https://portal.azure.com). You need permission to register applications in the target tenant (the default "App registration" tenant setting allows any member to do this, but your organization may have restricted it).

### 1. Register the application

1. In the Azure Portal, go to **Microsoft Entra ID** → **App registrations** → **New registration**.
2. **Name**: something identifiable, e.g. `api-grade-mcp`.
3. **Supported account types**: *Accounts in this organizational directory only (Single tenant)* — unless you specifically need multi-tenant access.
4. **Redirect URI**: leave blank. Device-code flow does not use a redirect URI.
5. Click **Register**.

### 2. Record the tenant ID and client ID

On the app's **Overview** page, copy:

- **Application (client) ID** → this is the `clientId` value for `api-grade-mcp` config.
- **Directory (tenant) ID** → this is the `tenantId` value.

You'll supply both when running `set-ruleset-config` with `auth.type: "entra-id"`.

### 3. Allow public client flows (required for device code)

1. Go to **Authentication** in the left nav.
2. Under **Advanced settings**, set **Allow public client flows** to **Yes**.
3. **Save**.

Without this, token acquisition via `acquireTokenByDeviceCode` will be rejected by Entra ID.

### 4. Expose an API

1. Go to **Expose an API** in the left nav.
2. Next to **Application ID URI**, click **Add** and accept the default (`api://<clientId>`), then **Save**.
3. Click **Add a scope**.
   - **Scope name**: `access_as_user` (or any name — `api-grade-mcp` always requests `.default`, which bundles all consented scopes for this API, so the exact name doesn't matter).
   - **Who can consent**: *Admins and users* (or *Admins only*, if your tenant policy requires admin consent for everything).
   - **Admin consent display name / description**: e.g. "Access api-grade ruleset resource".
   - Click **Add scope**.

### 5. Grant the app permission to call its own API

Device-code flow acquires a token *for* this app's own exposed API, so the app needs to be authorized to call itself:

1. Go to **API permissions** in the left nav.
2. Click **Add a permission** → **My APIs** → select the app you just registered (e.g. `api-grade-mcp`).
3. Choose **Delegated permissions**, select the scope you created (e.g. `access_as_user`), and click **Add permissions**.
4. If your tenant requires admin consent, click **Grant admin consent for `<tenant>`** and confirm.

Without admin consent, the first user to authenticate will be prompted to consent themselves (if user consent is permitted by tenant policy) or will be blocked (if it isn't).

---

## Protecting a Custom Resource vs. SharePoint

The app registration above issues `api-grade-mcp` a token with audience `api://<clientId>`. Whether that token is actually *accepted* by the place hosting your ruleset depends on what that resource is:

- **A custom internal web app or API you control**: the resource must be configured to validate bearer tokens issued by your tenant for this specific audience (`api://<clientId>`). This typically means registering the web app as an Entra ID app itself and configuring its middleware (e.g. `Microsoft.Identity.Web` for .NET, `passport-azure-ad` for Node) to accept that audience. Consult your resource's own Entra ID integration setup — this is independent of the `api-grade-mcp` app registration.
- **SharePoint Online**: SharePoint already trusts your tenant's Entra ID and does not require per-app resource configuration in the same way, but `api-grade-mcp` requests `api://<clientId>/.default` rather than a SharePoint-specific scope. If your ruleset is hosted on SharePoint and the request is rejected, confirm with your tenant administrator whether a SharePoint-scoped app registration (with `Sites.Read.All` or similar delegated Microsoft Graph/SharePoint permissions, consented) is needed instead, and treat the `api://<clientId>` scope above as the fallback for custom-hosted rulesets.

If you're unsure which applies, start with a custom resource you control (an internal site or API gateway serving the ruleset YAML) — it gives you the most direct control over what audience is accepted.

---

## Verifying the Setup

Once the app registration is complete:

1. Configure `api-grade-mcp` per [Configuration Reference](configuration.md#microsoft-entra-id-device-code-flow--the-server-handles-tokens-for-you-no-env-var-needed), supplying the `tenantId` and `clientId` recorded above.
2. Trigger a grading request. The server should return `ENTRA_AUTH_REQUIRED` with a device code and verification URL.
3. Visit the URL, sign in, and enter the code.
4. Retry the grading request — it should now succeed and fetch the secured ruleset.

If you instead get an error referencing `AADSTS` consent or invalid-audience codes, recheck steps 3–5 above (public client flow enabled, API exposed, permission granted and consented).

---

## Further Reading

- [Configuration Reference](configuration.md) — how `api-grade-mcp` is configured to use this app registration
- [Troubleshooting](troubleshooting.md) — auth failure recovery options and common errors
- [Quick Start](quick-start.md) — install and configure the MCP server
- [Documentation Index](../index.md)
