# Supabase Authentication Configuration

This guide explains how to configure Supabase to properly redirect users after email confirmation.

## 🎯 Problem This Solves

**Before:** Users confirm their email → get redirected to landing page → confused
**After:** Users confirm their email → get redirected to dashboard → ready to use the app

---

## 📋 Step-by-Step Configuration

### 1. Access Your Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your HabitQuest project
3. Navigate to **Authentication** (left sidebar)

### 2. Configure URL Settings

Click on **URL Configuration** in the Authentication section.

#### **Site URL**
Set this to your production domain:
```
https://habitquest.dev
```

**For local development:**
```
http://localhost:3000
```

#### **Redirect URLs**
Add these URLs to the "Redirect URLs" allowlist (one per line):

**Production:**
```
https://habitquest.dev/auth/callback
https://habitquest.dev/dashboard
https://habitquest.dev/select-archetype
```

**Local Development:**
```
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
http://localhost:3000/select-archetype
```

> **Note:** Supabase requires you to explicitly allow each redirect URL for security.

### 3. Configure Email Templates (CRITICAL)

Navigate to **Authentication → Email Templates**

#### **Confirm Signup Template**

Click on "Confirm signup" template and update the confirmation link:

**Find this line:**
```html
<a href="{{ .ConfirmationURL }}">Confirm your email</a>
```

**Replace with:**
```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Confirm your email</a>
```

**Or use this complete template:**

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your account:</p>

<p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
    Confirm your email address
  </a>
</p>

<p>
  Or copy and paste this URL into your browser:
</p>

<p>
  {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard
</p>

<p>
  If you didn't sign up for HabitQuest, you can safely ignore this email.
</p>
```

**Why this matters:**
- `{{ .SiteURL }}` uses your configured Site URL
- `/auth/callback` is your Next.js route that handles the confirmation
- `token_hash={{ .TokenHash }}` provides the authentication token
- `type=email` tells Supabase this is an email confirmation
- `next=/dashboard` tells your app where to redirect after success

#### **Save the Template**

Click **Save** at the bottom of the page.

### 4. Email Provider Settings (Optional but Recommended)

For production, configure a custom SMTP provider:

Navigate to **Authentication → Providers → Email**

**Recommended providers:**
- SendGrid
- Amazon SES
- Mailgun
- Resend

**Why?**
- Better deliverability
- Custom sender email (`team@habitquest.dev` instead of `noreply@...`)
- Higher sending limits
- Better spam protection

---

## 🔄 How the Flow Works

### User Registration Flow

```mermaid
graph LR
    A[User signs up] --> B[Supabase sends confirmation email]
    B --> C[User clicks email link]
    C --> D[/auth/callback route]
    D --> E{Has archetype?}
    E -->|No| F[/select-archetype]
    E -->|Yes| G[/dashboard]
```

### URL Breakdown

When a user clicks the confirmation link:

```
https://habitquest.dev/auth/callback?token_hash=abc123&type=email&next=/dashboard
```

1. **`/auth/callback`** - Next.js route handler
2. **`token_hash=abc123`** - Authentication token from Supabase
3. **`type=email`** - Type of confirmation (email, recovery, etc.)
4. **`next=/dashboard`** - Where to redirect after success (optional)

---

## 🧪 Testing the Configuration

### Test Email Confirmation Flow

1. **Sign up with a new email:**
   ```
   Visit: https://habitquest.dev/signup
   Enter test email and password
   ```

2. **Check your email:**
   - You should receive a confirmation email
   - The link should contain `/auth/callback?token_hash=...`

3. **Click the confirmation link:**
   - You should be redirected through `/auth/callback`
   - If you have no archetype: redirected to `/select-archetype`
   - If you have an archetype: redirected to `/dashboard`

4. **Verify you're logged in:**
   - You should see your dashboard
   - You should NOT see the landing page

### Test Authenticated User Redirects

1. **After logging in, try to visit:**
   ```
   https://habitquest.dev/
   ```
   **Expected:** Automatic redirect to `/dashboard`

2. **Try to visit login page while authenticated:**
   ```
   https://habitquest.dev/login
   ```
   **Expected:** Automatic redirect to `/dashboard`

### Test Protected Routes

1. **Log out, then try to visit:**
   ```
   https://habitquest.dev/dashboard
   ```
   **Expected:** Automatic redirect to `/login?redirect=/dashboard`

---

## 🐛 Troubleshooting

### Issue: "Invalid redirect URL" error

**Solution:**
- Check that your redirect URL is added to the allowlist in Supabase
- Make sure there are no typos
- Verify the URL matches exactly (including https/http)

### Issue: User still sees landing page after confirmation

**Solution:**
1. Check that the email template uses the updated confirmation link
2. Verify middleware is deployed and running
3. Clear browser cookies and try again
4. Check browser console for errors

### Issue: Confirmation email not received

**Solutions:**
- Check spam folder
- Verify email provider is configured in Supabase
- Check Supabase logs for email sending errors
- Test with a different email provider

### Issue: "Auth session missing" error

**Solution:**
- Clear browser cookies
- Check that cookies are enabled in browser
- Verify Supabase URL and anon key in `.env.local`

---

## 🔒 Security Considerations

### Rate Limiting

The middleware includes rate limiting for API routes:
- **Limit:** 30 requests per minute per IP
- **Automatically blocks** excessive requests
- **Production:** Consider using Redis for distributed rate limiting

### Cookie Settings

Supabase auth cookies are:
- **HttpOnly:** Yes (prevents XSS attacks)
- **Secure:** Yes in production (HTTPS only)
- **SameSite:** Lax (protects against CSRF)

### Protected Routes

All dashboard routes require authentication:
- `/dashboard`
- `/select-archetype`
- `/setup`
- `/quiz`
- `/history`
- `/skills`
- `/equipment`
- `/shop`
- `/payment-success`

---

## 📝 Environment Variables

Make sure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## ✅ Checklist

Before deploying to production:

- [ ] Site URL configured in Supabase
- [ ] Redirect URLs added to allowlist
- [ ] Email template updated with new confirmation link
- [ ] Email provider configured (SendGrid, SES, etc.)
- [ ] Environment variables set
- [ ] Middleware deployed
- [ ] Test full signup → confirm → dashboard flow
- [ ] Test protected route redirects
- [ ] Test authenticated user landing page redirect
- [ ] Verify cookies are working correctly

---

## 🚀 Deployment Notes

### Vercel Deployment

When deploying to Vercel:

1. Add environment variables in Vercel dashboard
2. Redeploy after Supabase config changes
3. Test with production URL
4. Monitor Vercel logs for middleware errors

### Domain Setup

If using a custom domain:

1. Update Site URL in Supabase to your custom domain
2. Update all redirect URLs to use custom domain
3. Redeploy application
4. Update email template if needed

---

## 🆘 Need Help?

If you encounter issues:

1. Check Supabase logs: **Logs → Auth Logs**
2. Check Vercel logs: **Deployments → [Your deployment] → Logs**
3. Check browser console for errors
4. Verify all steps in this guide

---

**Last Updated:** 2024-11-15
**HabitQuest Auth System v2.0**
