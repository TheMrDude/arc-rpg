'use client';

export default function OfflinePage() {
  return (
    <div className="kidquest min-h-screen bg-cream flex items-center justify-center p-8">
      <div className="text-center max-w-md kq-card p-8">
        <div className="text-8xl mb-6">📡</div>
        <h1 className="kq-display text-4xl mb-4 text-coral">You're Offline</h1>
        <p className="text-xl text-navy/70 mb-6">
          Looks like your internet connection took a little break.
        </p>
        <p className="text-hero-blue mb-8">
          Reconnect to keep going, no rush!
        </p>
        <button
          onClick={() => window.location.reload()}
          className="kq-btn kq-btn-gold px-8 py-4"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
