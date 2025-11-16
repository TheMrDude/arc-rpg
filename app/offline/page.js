export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">⚔️</div>
        <h1 className="text-4xl font-black mb-4 text-[#FF6B6B]">YOU'RE OFFLINE</h1>
        <p className="text-xl text-[#E2E8F0] mb-6">
          Your internet connection has been severed, brave hero.
        </p>
        <p className="text-[#00D4FF] mb-8">
          Reconnect to continue your epic journey!
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
