# Email Confirmation Setup Guide

## Overview

This guide explains how to configure email confirmation in your Supabase project to work with the ARC RPG application.

## Problem Fixed

**Issue**: Users were signing up, clicking the confirmation link in their email, but then being told their email wasn't confirmed when logging in.

**Root Cause**: The application didn't have a proper auth callback route to handle email confirmations.

**Solution**: Added `/app/auth/callback/route.js` to properly exchange confirmation codes for sessions.

## Supabase Dashboard Configuration

### 1. Configure Site URL and Redirect URLs

Go to your Supabase project dashboard:
- Navigate to **Authentication** → **URL Configuration**

Set the following URLs:

#### Site URL
```
https://your-domain.com
```
For local development:
```
http://localhost:3000
```

#### Redirect URLs (Add both)
```
https://your-domain.com/auth/callback
https://your-domain.com/**
```

For local development, also add:
```
http://localhost:3000/auth/callback
http://localhost:3000/**
```

### 2. Enable Email Confirmation

Go to **Authentication** → **Providers** → **Email**:

- ✅ Enable Email provider
- ✅ Check "Confirm email" (required for email verification)
- Set "Mailer templates" if you want custom email designs

### 3. Configure Email Templates (Optional)

Go to **Authentication** → **Email Templates**:

You can customize the "Confirm signup" template. The confirmation link will automatically redirect to `/auth/callback`.

**Important**: Make sure your email template uses `{{ .ConfirmationURL }}` as the confirmation link.

## How the Flow Works

### Signup Flow

1. User signs up at `/signup`
2. Supabase sends confirmation email
3. User is redirected to `/confirm-email` page with instructions
4. User clicks link in email
5. Supabase redirects to `/auth/callback?code=...`
6. Callback route exchanges code for session
7. User is redirected to `/select-archetype` or `/dashboard`

### Login Flow

1. User attempts to log in at `/login`
2. If email not confirmed:
   - Supabase returns error
   - User sees friendly error message
   - Option to resend confirmation email
3. If email confirmed:
   - User logs in successfully
   - Redirected to appropriate page

## Files Modified/Created

### New Files
- `/app/auth/callback/route.js` - Handles email confirmation redirects
- `/app/confirm-email/page.js` - Shows "check your email" message with resend option

### Modified Files
- `/app/signup/page.js` - Detects if confirmation needed, redirects accordingly
- `/app/login/page.js` - Shows helpful error message for unconfirmed emails

## Testing the Flow

### Test Signup with Email Confirmation

1. Sign up with a new email address
2. Check that you're redirected to `/confirm-email`
3. Check your email inbox for the confirmation email
4. Click the confirmation link
5. Verify you're redirected to `/select-archetype` or `/dashboard`
6. Verify you can now log in successfully

### Test Login with Unconfirmed Email

1. Sign up with a new email (don't click confirmation link)
2. Try to log in
3. Verify you see: "Please confirm your email address before logging in"
4. Click "Resend confirmation email" link
5. Verify you're taken to `/confirm-email` page
6. Click "Resend Email" button
7. Check for new confirmation email

### Test Resend Functionality

1. Go to `/confirm-email` page
2. Click "Resend Email" button
3. Verify success message appears
4. Check email inbox for new confirmation email

## Environment Variables

No new environment variables are required. The existing variables work:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Troubleshooting

### Issue: "Invalid callback URL"

**Solution**: Make sure you've added your domain and `/auth/callback` to the redirect URLs in Supabase dashboard.

### Issue: Still seeing "email not confirmed" after clicking link

**Solution**:
1. Check that the callback route is accessible at `/auth/callback`
2. Verify your redirect URLs are configured correctly in Supabase
3. Check browser console for any errors
4. Try signing out completely and signing back in

### Issue: Not receiving confirmation emails

**Solution**:
1. Check Supabase dashboard → Authentication → Providers → Email is enabled
2. Check spam folder
3. Verify "Confirm email" is checked in Email provider settings
4. Try the "Resend Email" button on `/confirm-email` page

### Issue: Users auto-confirmed without email verification

**Solution**: This is controlled by the "Confirm email" checkbox in Supabase. If unchecked, users are auto-confirmed on signup (useful for development, but should be enabled for production).

## Production Deployment Checklist

- [ ] Configure production Site URL in Supabase
- [ ] Add production redirect URLs (including `/auth/callback`)
- [ ] Enable "Confirm email" in Email provider settings
- [ ] Test complete signup flow on production
- [ ] Test login with unconfirmed email on production
- [ ] Test resend email functionality on production
- [ ] Verify confirmation emails are being sent
- [ ] Check email deliverability (not going to spam)

## Security Considerations

1. **Email Verification**: Always enable email confirmation in production to prevent fake signups
2. **Rate Limiting**: The existing middleware rate limits API routes to prevent abuse
3. **Session Security**: Sessions are stored securely and auto-refresh
4. **HTTPS**: Always use HTTPS in production for secure token exchange

## Additional Features to Consider

- [ ] Email change confirmation (requires similar callback flow)
- [ ] Password reset confirmation (uses same callback route)
- [ ] Magic link authentication (uses same callback route)
- [ ] Two-factor authentication
- [ ] Account recovery options

## Support

If you encounter issues:
1. Check the Supabase dashboard logs
2. Check browser console for errors
3. Verify redirect URLs are configured correctly
4. Test with a fresh incognito/private browsing session
