# HabitQuest PWA Setup Guide

Your app is now configured as a Progressive Web App (PWA)! Users can install it on their devices.

## ✅ What's Already Done

- ✅ Service Worker configured for offline support
- ✅ Manifest.json with app metadata
- ✅ Meta tags for iOS and Android
- ✅ Install prompt component
- ✅ Offline page
- ✅ Push notification infrastructure (ready to use)

## 📱 How to Create App Icons

You need to create app icons in various sizes. Here's how:

### Option 1: Use a Free Icon Generator

1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload a 512x512 PNG image of your logo/icon
3. Download the generated icon pack
4. Extract to `public/icons/` folder

### Option 2: Manual Creation

Create these sizes manually and save to `public/icons/`:

- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

**Design Tips:**
- Use your brand colors (#FF6B6B red, #00D4FF cyan, #FFD93D gold)
- Make it simple and recognizable at small sizes
- Consider using the ⚔️ sword emoji or RPG-themed iconography
- Keep important elements in the center "safe zone" (avoid edges)

### Quick Start Icon

For now, you can use this simple approach:

```bash
# In your project root
cd public/icons

# Create a simple placeholder with ImageMagick (if installed)
# Or use any image editor to create a 512x512 icon and resize it

# Example with convert command:
convert -size 512x512 xc:#FF6B6B -gravity center -pointsize 200 -fill white -annotate +0+0 "⚔" icon-512x512.png
convert icon-512x512.png -resize 384x384 icon-384x384.png
convert icon-512x512.png -resize 192x192 icon-192x192.png
convert icon-512x512.png -resize 152x152 icon-152x152.png
convert icon-512x512.png -resize 144x144 icon-144x144.png
convert icon-512x512.png -resize 128x128 icon-128x128.png
convert icon-512x512.png -resize 96x96 icon-96x96.png
convert icon-512x512.png -resize 72x72 icon-72x72.png
```

## 🚀 Testing the PWA

### On Desktop (Chrome/Edge)

1. Open your app in Chrome/Edge
2. Look for the install icon in the address bar (⊕ or computer icon)
3. Click it to install
4. The app will open in its own window!

### On Android

1. Open your app in Chrome
2. Tap the menu (⋮) → "Install app" or "Add to Home screen"
3. The install prompt will appear
4. Accept to add to home screen
5. Launch from home screen - it runs fullscreen!

### On iOS/iPhone

1. Open your app in Safari (must be Safari, not Chrome)
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Give it a name and tap "Add"
5. Launch from home screen

## 🔔 Push Notifications (Future Feature)

The infrastructure is ready! To enable push notifications:

1. Get VAPID keys for web push
2. Update the service worker with your keys
3. Request notification permission from users
4. Use the notification API routes we created

## 📊 PWA Features Currently Active

### ✅ Working Now
- **Install prompt** - Shows on first visit
- **Offline page** - Graceful offline experience
- **Caching** - Pages cached for faster loads
- **Standalone mode** - Runs in its own window
- **Theme colors** - Matches your brand

### 🔜 Ready to Implement
- **Push notifications** - Database tables ready
- **Background sync** - Sync offline quest completions
- **Shortcuts** - Quick actions from home screen

## 🎨 Customization

### Change Theme Color

Edit `app/layout.js`:
```javascript
themeColor: '#FF6B6B' // Change to your preferred color
```

### Update App Name

Edit `public/manifest.json`:
```json
"name": "Your New Name",
"short_name": "Short Name"
```

### Modify Start URL

Edit `public/manifest.json`:
```json
"start_url": "/your-page" // Default is /dashboard
```

## 📈 PWA Benefits

1. **Installable** - Users can add to home screen
2. **Fast** - Caches assets for instant loading
3. **Offline** - Basic functionality works offline
4. **Engaging** - Push notifications keep users coming back
5. **Discoverable** - Better SEO and app store visibility
6. **No App Store** - No approval process or fees
7. **Auto-updates** - Service worker updates automatically

## 🐛 Troubleshooting

### Install Prompt Not Showing?

- Check Chrome DevTools → Application → Manifest
- Ensure HTTPS is enabled (or localhost for dev)
- Clear cache and reload
- Check browser console for errors

### Icons Not Loading?

- Verify files exist in `public/icons/`
- Check file names match manifest.json exactly
- Clear browser cache
- Check Network tab in DevTools

### Service Worker Not Registering?

- Check browser console for errors
- Verify `public/sw.js` exists
- Ensure HTTPS (or localhost)
- Try unregistering old SWs in DevTools → Application → Service Workers

## 📚 Resources

- [PWA Builder](https://www.pwabuilder.com/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Can I Use PWA](https://caniuse.com/web-app-manifest)

---

**Your app is ready to be installed! Just add the icons and you're live! 🎮⚔️**
