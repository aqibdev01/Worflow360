# Supabase OTP Email Verification Setup

This guide explains how to configure Supabase to send 6-digit OTP codes for email verification instead of magic links.

## Step 1: Go to Supabase Dashboard

1. Open your Supabase project at https://supabase.com/dashboard
2. Navigate to **Authentication** > **Email Templates**

## Step 2: Configure the "Confirm signup" Template

Select the **"Confirm signup"** template and replace it with:

### Subject Line:
```
Your Workflow360 Verification Code
```

### Email Body (HTML):
```html
<h2>Welcome to Workflow360!</h2>

<p>Thank you for signing up. Please use the following verification code to complete your registration:</p>

<div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
  <h1 style="font-size: 36px; letter-spacing: 8px; font-family: monospace; margin: 0; color: #1f2937;">{{ .Token }}</h1>
</div>

<p style="color: #6b7280; font-size: 14px;">This code will expire in 24 hours.</p>

<p style="color: #6b7280; font-size: 14px;">If you didn't create an account with Workflow360, you can safely ignore this email.</p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

<p style="color: #9ca3af; font-size: 12px;">This is an automated message from Workflow360. Please do not reply to this email.</p>
```

## Step 3: Configure Authentication Settings

1. Go to **Authentication** > **Settings** > **Email Auth**
2. Make sure the following settings are enabled:
   - **Enable Email Signup**: ON
   - **Confirm email**: ON (this ensures users must verify their email)
   - **Secure email change**: ON (optional but recommended)

3. Under **Email OTP** settings (if available):
   - **OTP Expiry**: 86400 seconds (24 hours) or your preferred duration
   - **OTP Length**: 6 digits

## Step 4: SMTP Configuration (Optional but Recommended)

For better email deliverability, configure a custom SMTP server:

1. Go to **Project Settings** > **Authentication** > **SMTP Settings**
2. Enable **Custom SMTP**
3. Configure your SMTP server (e.g., SendGrid, Mailgun, AWS SES)

## Important Notes

### The {{ .Token }} Variable
- `{{ .Token }}` - This outputs the 6-digit OTP code
- `{{ .ConfirmationURL }}` - This outputs a magic link (NOT what we want for OTP)

Make sure you use `{{ .Token }}` in your template, NOT `{{ .ConfirmationURL }}`.

### Testing
1. Sign up with a test email
2. Check your email inbox (and spam folder)
3. You should receive an email with a 6-digit code
4. Enter the code on the verification page

### Troubleshooting

**Email not received?**
- Check your spam/junk folder
- Verify SMTP settings if using custom SMTP
- Check Supabase logs: Authentication > Logs

**Still receiving links instead of OTP?**
- Double-check that your template uses `{{ .Token }}`
- Clear your template and re-paste it
- Save the template and try signing up again

**OTP not working?**
- Make sure you're entering the code within the expiry time
- Check that the email matches exactly what was used during signup
- Try resending the code

## Code Reference

The verification flow in this project:

1. **Signup** (`app/auth/signup/page.tsx`): User signs up and is redirected to verify-email
2. **Verify** (`app/auth/verify-email/page.tsx`): User enters 6-digit OTP code
3. **API Call**: Uses `supabase.auth.verifyOtp({ email, token, type: "signup" })`
4. **Success**: User is redirected to dashboard
