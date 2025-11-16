/**
 * PERFORMANCE OPTIMIZATION UTILITIES
 *
 * Helpers for improving app performance.
 */

/**
 * Debounce function calls
 * Useful for search inputs, window resize, etc.
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 * Ensures function is called at most once per interval
 *
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Lazy load images
 * Returns a placeholder until image is in viewport
 *
 * @param {string} src - Image source URL
 * @param {string} placeholder - Placeholder image (optional)
 * @returns {object} Image props
 */
export function lazyImage(src, placeholder = '/placeholder.png') {
  if (typeof window === 'undefined') {
    return { src: placeholder };
  }

  return {
    src,
    loading: 'lazy',
    onError: (e) => {
      e.target.src = placeholder;
    }
  };
}

/**
 * Memoize expensive calculations
 * Caches results based on arguments
 *
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export function memoize(fn) {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Check if element is in viewport
 * Useful for lazy loading
 *
 * @param {HTMLElement} element - DOM element
 * @returns {boolean} Whether element is visible
 */
export function isInViewport(element) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Batch API calls
 * Combines multiple API calls into one request
 *
 * @param {Array} calls - Array of API call functions
 * @param {number} delay - Delay before batching in ms
 * @returns {Promise} Combined results
 */
export function batchApiCalls(calls, delay = 50) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const results = await Promise.all(calls.map(call => call()));
      resolve(results);
    }, delay);
  });
}

/**
 * Preload critical resources
 * Improves perceived performance
 *
 * @param {Array<string>} urls - URLs to preload
 * @param {string} type - Resource type (image, script, style)
 */
export function preloadResources(urls, type = 'image') {
  if (typeof window === 'undefined') return;

  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    document.head.appendChild(link);
  });
}

/**
 * Optimize images for different screen sizes
 * Returns srcset for responsive images
 *
 * @param {string} baseUrl - Base image URL
 * @param {Array<number>} sizes - Array of widths
 * @returns {string} srcset string
 */
export function generateSrcSet(baseUrl, sizes = [320, 640, 960, 1280]) {
  return sizes
    .map(size => `${baseUrl}?w=${size} ${size}w`)
    .join(', ');
}

/**
 * Local storage with expiration
 * Caches data with TTL
 *
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @param {number} ttl - Time to live in milliseconds
 */
export function cacheWithExpiry(key, data, ttl = 3600000) {
  const item = {
    value: data,
    expiry: Date.now() + ttl
  };
  localStorage.setItem(key, JSON.stringify(item));
}

/**
 * Get cached data if not expired
 *
 * @param {string} key - Storage key
 * @returns {any|null} Cached data or null if expired
 */
export function getCachedData(key) {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    return null;
  }
}

/**
 * Request Idle Callback wrapper
 * Schedules non-critical work during idle time
 *
 * @param {Function} callback - Function to run when idle
 * @param {object} options - Idle callback options
 */
export function scheduleIdleTask(callback, options = {}) {
  if (typeof window === 'undefined') return;

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, options);
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(callback, 1);
  }
}

/**
 * Measure component render time
 * Useful for performance debugging
 *
 * @param {string} componentName - Name of component
 * @param {Function} fn - Function to measure
 * @returns {any} Function result
 */
export function measurePerformance(componentName, fn) {
  if (process.env.NODE_ENV !== 'development') {
    return fn();
  }

  const start = performance.now();
  const result = fn();
  const end = performance.now();

  console.log(`[Performance] ${componentName}: ${(end - start).toFixed(2)}ms`);

  return result;
}
