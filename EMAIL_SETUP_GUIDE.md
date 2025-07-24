# Email Notification Setup Guide

This guide will help you set up email notifications for your Spector app.

## 📧 Email Notification Features

Your app now includes:
- **Automatic email alerts** when products reach low stock or go out of stock
- **Manual "Send Alert Now"** button for immediate notifications
- **Test email functionality** to verify your settings
- **Professional email templates** with product details and stock levels

## ⚙️ Setting Up Email Notifications

### 1. Access Email Settings
- Open your Spector Dashboard
- Click the **"Email Settings"** button in the sidebar
- Or navigate directly to `/app/email-settings`

### 2. Configure SMTP Settings

#### For Gmail:
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
Email Username: your-email@gmail.com
Email Password: [Use App Password - see instructions below]
From Email: your-email@gmail.com
Recipient Email: alerts@yourcompany.com
```

#### For Outlook/Hotmail:
```
SMTP Host: smtp.live.com
SMTP Port: 587
Email Username: your-email@outlook.com
Email Password: [Your email password]
From Email: your-email@outlook.com
Recipient Email: alerts@yourcompany.com
```

#### For Yahoo:
```
SMTP Host: smtp.mail.yahoo.com
SMTP Port: 587
Email Username: your-email@yahoo.com
Email Password: [Your email password]
From Email: your-email@yahoo.com
Recipient Email: alerts@yourcompany.com
```

### 3. Gmail App Password Setup (Recommended)

For Gmail users, you should use an "App Password" instead of your regular password:

1. **Enable 2-Factor Authentication** on your Google account
2. Go to your **Google Account settings**
3. Navigate to **Security** > **2-Step Verification** > **App passwords**
4. Generate a new app password for "Mail"
5. Use this 16-character password in the Email Settings

### 4. Test Your Configuration
1. Fill in all the email settings
2. Check **"Enable email notifications"**
3. Click **"Send Test Email"**
4. Check your recipient email for the test message

### 5. Save and Use
1. Click **"Save Settings"** to store your configuration
2. Return to the main dashboard
3. When products are low stock or out of stock, click **"Send Alert Now"**

## 📋 Email Alert Content

Your email alerts will include:
- **Summary of total products needing attention**
- **Out of Stock Products** (critical priority)
- **Low Stock Products** (warning priority) 
- **Stock quantities remaining**
- **Threshold information**
- **Timestamp of when alert was generated**
- **Next steps recommendations**

## 🔧 Troubleshooting

### Common Issues:

**"Authentication failed"**
- Double-check your email username and password
- For Gmail, ensure you're using an App Password
- Verify 2-factor authentication is enabled (Gmail)

**"Connection refused"**
- Check the SMTP host and port settings
- Ensure your firewall isn't blocking the connection
- Try port 465 instead of 587 for some providers

**"Email not received"**
- Check spam/junk folders
- Verify the recipient email address is correct
- Send a test email first to confirm settings

**"Settings not saving"**
- Ensure all required fields are filled out
- Check that "Enable email notifications" is checked
- Try refreshing the page and re-entering settings

### Security Best Practices:
- Always use App Passwords for Gmail
- Use a dedicated email account for sending alerts
- Keep your SMTP credentials secure
- Regularly update your app passwords

## 🚀 Next Steps

Once email notifications are set up:
1. Monitor your inventory regularly via the dashboard
2. Adjust your stock threshold as needed
3. Set up email rules to organize alert emails
4. Consider setting up multiple recipient emails for your team

Need help? The email settings page includes helpful tips and common SMTP configurations for popular email providers.
