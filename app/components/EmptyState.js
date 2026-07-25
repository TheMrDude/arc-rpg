'use client';

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="text-center py-10 px-6">
      <div className="text-5xl mb-4">{icon}</div>
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
