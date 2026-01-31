/**
 * Social Media Sharing Utilities
 * Generate share URLs for all major platforms
 */

export interface ShareContent {
  url?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  via?: string; // Twitter handle
  imageUrl?: string;
}

/**
 * Generate share URLs for all platforms
 */
export function generateSocialShareUrls(content: ShareContent) {
  const {
    url = typeof window !== 'undefined' ? window.location.href : 'https://habitquest.dev',
    title = 'HabitQuest - Turn Your Life Into An Epic RPG',
    description = 'The anti-guilt habit tracker. Transform boring tasks into epic RPG quests with AI. No streak shame. No punishment. Just your personal adventure.',
    hashtags = ['HabitQuest', 'Gamification', 'Productivity', 'RPG'],
    via = 'officialmrdude',
    imageUrl,
  } = content;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const hashtagString = hashtags.join(',');

  return {
    // X (Twitter) - Full web sharing support
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&hashtags=${hashtagString}&via=${via}`,

    // Facebook - Share dialog
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDescription}`,

    // LinkedIn - Share URL
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,

    // Reddit - Submit link
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,

    // Pinterest - Pin creation (requires image)
    pinterest: imageUrl
      ? `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(imageUrl)}&description=${encodedDescription}`
      : `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedDescription}`,

    // Telegram - Share URL
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,

    // WhatsApp - Share URL
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,

    // Email - Mailto link
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,

    // Copy text for clipboard
    copyText: `${title}\n\n${description}\n\n${url}`,

    // Copy just URL
    copyUrl: url,
  };
}

/**
 * Open share URL in popup window
 */
export function openShareWindow(url: string, platform: string) {
  const width = 600;
  const height = 600;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  window.open(
    url,
    `Share to ${platform}`,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Track social share event
 */
export function trackSocialShare(platform: string, content?: string) {
  // This will be picked up by your analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'share', {
      method: platform,
      content_type: content || 'general',
    });
  }
}

/**
 * Get platform-specific instructions for mobile-only apps
 */
export function getMobileShareInstructions(platform: 'instagram' | 'tiktok'): {
  title: string;
  steps: string[];
  appUrl?: string;
} {
  if (platform === 'instagram') {
    return {
      title: 'Share on Instagram',
      steps: [
        '1. Screenshot or save HabitQuest content',
        '2. Open Instagram app on your phone',
        '3. Create a new Story or Post',
        '4. Share with your followers!',
        '5. Tag @habitquest for a shoutout',
      ],
      appUrl: 'instagram://app',
    };
  } else {
    return {
      title: 'Share on TikTok',
      steps: [
        '1. Open TikTok app on your phone',
        '2. Create a video about your HabitQuest journey',
        '3. Use hashtag #HabitQuest',
        '4. Mention habitquest.dev in your video',
        '5. Watch your streak grow viral!',
      ],
      appUrl: 'tiktok://app',
    };
  }
}
