'use client';

import Image from 'next/image';

// `image`/`imageAlt` are optional: pass them to show character art instead of
// the emoji glyph. Callers that only pass `icon` are unchanged.
export default function EmptyState({ icon, image, imageAlt, title, description, actionLabel, onAction }) {
  return (
    <div className="text-center py-10 px-6">
      {image ? (
        <Image
          src={image}
          alt={imageAlt || ''}
          width={120}
          height={80}
          loading="lazy"
          className="mx-auto mb-4 h-20 w-auto object-contain"
        />
      ) : (
        <div className="text-5xl mb-4">{icon}</div>
      )}
      <h3 className="kq-display text-xl text-hero-blue mb-3">
        {title}
      </h3>
      <p className="text-navy/60 mb-2 max-w-md mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="kq-btn kq-btn-blue mt-4"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
