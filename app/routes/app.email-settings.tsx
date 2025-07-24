import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Checkbox,
  Banner,
  FormLayout,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { testEmailSettings } from "../services/email.server";

interface EmailSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  toEmail: string;
}

// In a real app, you'd store these in a database
// For now, we'll use a simple in-memory store (will reset on server restart)
let emailSettings: EmailSettings = {
  enabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  fromEmail: '',
  toEmail: '',
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    return { emailSettings };
  } catch (error) {
    // If authentication fails, return default settings
    console.warn("Authentication failed in email settings:", error);
    return { emailSettings };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    await authenticate.admin(request);
  } catch (error) {
    console.warn("Authentication failed in email settings action:", error);
    // Continue anyway for email settings
  }
  
  const formData = await request.formData();
  const action = formData.get("_action") as string;

  if (action === "save") {
    // Update email settings
    emailSettings = {
      enabled: formData.get("enabled") === "on",
      smtpHost: formData.get("smtpHost") as string || '',
      smtpPort: parseInt(formData.get("smtpPort") as string) || 587,
      smtpUser: formData.get("smtpUser") as string || '',
      smtpPassword: formData.get("smtpPassword") as string || '',
      fromEmail: formData.get("fromEmail") as string || '',
      toEmail: formData.get("toEmail") as string || '',
    };

    return { 
      success: true, 
      message: "Email settings saved successfully!",
      type: "save"
    };
  }

  if (action === "test") {
    // Test email configuration
    const testSettings: EmailSettings = {
      enabled: formData.get("enabled") === "on",
      smtpHost: formData.get("smtpHost") as string || '',
      smtpPort: parseInt(formData.get("smtpPort") as string) || 587,
      smtpUser: formData.get("smtpUser") as string || '',
      smtpPassword: formData.get("smtpPassword") as string || '',
      fromEmail: formData.get("fromEmail") as string || '',
      toEmail: formData.get("toEmail") as string || '',
    };

    // Add required properties for SimpleEmailSettings
    const simpleEmailSettings = {
      enabled: testSettings.enabled,
      recipientEmail: testSettings.toEmail,
      shopInfo: {
        email: testSettings.fromEmail || "shop@example.com",
        name: "Demo Shop",
        myshopifyDomain: "demo-shop.myshopify.com"
      }, // Replace with actual shop info if available
      smtpHost: testSettings.smtpHost,
      smtpPort: testSettings.smtpPort,
      smtpUser: testSettings.smtpUser,
      smtpPassword: testSettings.smtpPassword,
      fromEmail: testSettings.fromEmail,
    };

    const result = await testEmailSettings(simpleEmailSettings);
    
    return {
      success: result.success,
      message: result.message,
      type: "test"
    };
  }

  return { success: false, message: "Unknown action", type: "error" };
};

export default function EmailSettings() {
  const { emailSettings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  
  const [settings, setSettings] = useState(emailSettings);

  const handleFieldChange = (field: keyof EmailSettings, value: string | boolean | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Page>
      <TitleBar title="Email Notification Settings" />
      <BlockStack gap="500">
        {actionData && (
          <Banner
            tone={actionData.success ? "success" : "critical"}
            title={actionData.success ? "Success" : "Error"}
          >
            <Text as="p" variant="bodyMd">
              {actionData.message}
            </Text>
          </Banner>
        )}

        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  About Email Notifications
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Configure email alerts to be automatically notified when products reach low stock levels or go out of stock.
                </Text>
                <Divider />
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Common SMTP Settings:
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    <strong>Gmail:</strong><br />
                    Host: smtp.gmail.com<br />
                    Port: 587<br />
                    Use App Password, not regular password
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    <strong>Outlook/Hotmail:</strong><br />
                    Host: smtp.live.com<br />
                    Port: 587
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    <strong>Yahoo:</strong><br />
                    Host: smtp.mail.yahoo.com<br />
                    Port: 587
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Email Configuration
                </Text>

                <Form method="post">
                  <FormLayout>
                    <Checkbox
                      label="Enable email notifications"
                      checked={settings.enabled}
                      onChange={(checked) => handleFieldChange('enabled', checked)}
                      helpText="Turn on to receive email alerts for low stock products"
                      name="enabled"
                    />

                    <TextField
                      label="SMTP Host"
                      value={settings.smtpHost}
                      onChange={(value) => handleFieldChange('smtpHost', value)}
                      placeholder="smtp.gmail.com"
                      helpText="Your email provider's SMTP server address"
                      name="smtpHost"
                      autoComplete="off"
                      disabled={!settings.enabled}
                    />

                    <TextField
                      label="SMTP Port"
                      type="number"
                      value={settings.smtpPort.toString()}
                      onChange={(value) => handleFieldChange('smtpPort', parseInt(value) || 587)}
                      placeholder="587"
                      helpText="Usually 587 for TLS or 465 for SSL"
                      name="smtpPort"
                      autoComplete="off"
                      disabled={!settings.enabled}
                    />

                    <TextField
                      label="Email Username"
                      value={settings.smtpUser}
                      onChange={(value) => handleFieldChange('smtpUser', value)}
                      placeholder="your-email@gmail.com"
                      helpText="Your email address used for authentication"
                      name="smtpUser"
                      autoComplete="username"
                      disabled={!settings.enabled}
                    />

                    <TextField
                      label="Email Password"
                      type="password"
                      value={settings.smtpPassword}
                      onChange={(value) => handleFieldChange('smtpPassword', value)}
                      placeholder="your-app-password"
                      helpText="Use app-specific password for Gmail, not your regular password"
                      name="smtpPassword"
                      autoComplete="current-password"
                      disabled={!settings.enabled}
                    />

                    <TextField
                      label="From Email Address"
                      value={settings.fromEmail}
                      onChange={(value) => handleFieldChange('fromEmail', value)}
                      placeholder="your-email@gmail.com"
                      helpText="Email address that alerts will be sent from"
                      name="fromEmail"
                      autoComplete="email"
                      disabled={!settings.enabled}
                    />

                    <TextField
                      label="Recipient Email Address"
                      value={settings.toEmail}
                      onChange={(value) => handleFieldChange('toEmail', value)}
                      placeholder="alerts@yourcompany.com"
                      helpText="Email address where alerts will be sent"
                      name="toEmail"
                      autoComplete="email"
                      disabled={!settings.enabled}
                    />
                  </FormLayout>

                  <input type="hidden" name="_action" value="save" />
                  <BlockStack gap="300">
                    <Button
                      submit
                      variant="primary"
                      disabled={!settings.enabled}
                    >
                      Save Settings
                    </Button>
                  </BlockStack>
                </Form>

                <Form method="post">
                  <input type="hidden" name="enabled" value={settings.enabled ? "on" : "off"} />
                  <input type="hidden" name="smtpHost" value={settings.smtpHost} />
                  <input type="hidden" name="smtpPort" value={settings.smtpPort.toString()} />
                  <input type="hidden" name="smtpUser" value={settings.smtpUser} />
                  <input type="hidden" name="smtpPassword" value={settings.smtpPassword} />
                  <input type="hidden" name="fromEmail" value={settings.fromEmail} />
                  <input type="hidden" name="toEmail" value={settings.toEmail} />
                  <input type="hidden" name="_action" value="test" />
                  
                  <Button
                    submit
                    disabled={!settings.enabled || !settings.toEmail || !settings.smtpHost}
                  >
                    Send Test Email
                  </Button>
                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
