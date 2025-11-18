# Vercel Deployment Checklist

## Environment Variables Required

Verify these are set in your Vercel Dashboard → Project Settings → Environment Variables:

### Supabase (Required)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Production only - sensitive!)

### Stripe (Required)
- `STRIPE_SECRET_KEY` (Production: sk_live_...)
- `STRIPE_WEBHOOK_SECRET` (whsec_...)

### Anthropic AI (Required)
- `ANTHROPIC_API_KEY` (sk-ant-...)

## Deployment Troubleshooting

### If deployment fails:

1. **Check Build Logs**
   - Go to Vercel Dashboard → Deployments
   - Click on the failed deployment
   - Check "Build Logs" for errors

2. **Common Issues**
   - Missing environment variables
   - Node version mismatch (should use Node 18+)
   - Build timeout (upgrade Vercel plan if needed)
   - TypeScript errors (should be fixed now)

3. **Force Redeploy**
   - Go to Vercel Dashboard → Deployments
   - Click on latest deployment
   - Click "..." menu → "Redeploy"

4. **Manual Deploy**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy from main branch
   vercel --prod
   ```

## Build succeeded locally ✅

The build completes successfully on main branch. If Vercel fails, it's likely:
- Missing environment variables
- Vercel configuration issue
- Network/timeout issue

Check Vercel dashboard for specific error messages.
