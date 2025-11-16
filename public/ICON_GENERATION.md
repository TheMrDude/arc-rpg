# Icon Generation Instructions

The PWA requires icons in multiple sizes. You can generate them using one of these methods:

## Method 1: Online Tool (Easiest)
1. Visit https://www.pwabuilder.com/imageGenerator or https://realfavicongenerator.net/
2. Upload a high-resolution logo (at least 512x512px)
3. Download the generated icon pack
4. Place all icons in the `/public` directory

## Method 2: ImageMagick (Command Line)
If you have ImageMagick installed, run these commands from the public directory with your source logo:

```bash
# Assuming you have a logo.png file (512x512 or larger)
convert logo.png -resize 72x72 icon-72x72.png
convert logo.png -resize 96x96 icon-96x96.png
convert logo.png -resize 128x128 icon-128x128.png
convert logo.png -resize 144x144 icon-144x144.png
convert logo.png -resize 152x152 icon-152x152.png
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 384x384 icon-384x384.png
convert logo.png -resize 512x512 icon-512x512.png
```

## Method 3: Design Tool
Use Figma, Photoshop, or similar to create icons in these sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

## Required Icon Files
All these files should be placed in `/public/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Design Recommendations
- Use a simple, recognizable logo
- Ensure the icon works well on both light and dark backgrounds
- Consider using a solid background color
- Keep important elements centered (safe zone: 80% of the canvas)
- The icon represents your app on home screens, so make it memorable!

## Temporary Placeholder
For development, you can create a simple colored square or use the existing logo from your site until professional icons are ready.
