'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Data-driven testimonial section fed by the public live_testimonials feed.
// Honesty is the brand: we never invent reviews and never pad. Until at least 3
// real, consented quotes exist, we show the "we're early" framing alongside
// however many real quotes we do have (0, 1, or 2).
export default function TestimonialsSection() {
  const [quotes, setQuotes] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/testimonials/live')
      .then((r) => (r.ok ? r.json() : { quotes: [] }))
      .then((data) => {
        if (active) setQuotes(Array.isArray(data?.quotes) ? data.quotes : []);
      })
      .catch(() => {
        if (active) setQuotes([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasEnough = quotes.length >= 3;

  const formatMeta = (t) => {
    const bits = [];
    if (t.level_at_time != null) bits.push(`LVL ${t.level_at_time}`);
    if (t.archetype) bits.push(`${t.archetype} Archetype`);
    return bits.join(', ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-5xl mx-auto"
    >
      <h2 className="text-3xl sm:text-4xl font-black text-center mb-4 text-white">
        {hasEnough ? 'What Questers Are Saying' : 'What Founding Questers Are Saying'}
      </h2>

      {/* Honest early-state framing — shown until we have 3+ real quotes. */}
      {!hasEnough && (
        <p className="text-center text-gray-400 mb-10 text-lg max-w-2xl mx-auto">
          We&apos;re early. This section fills in as real users hit real
          milestones &mdash; no invented reviews here, ever.
        </p>
      )}
      {hasEnough && <div className="mb-8" />}

      {/* Whatever real quotes exist. Never padded. */}
      {loaded && quotes.length > 0 && (
        <div
          className={`grid gap-6 ${
            quotes.length >= 3
              ? 'md:grid-cols-3'
              : quotes.length === 2
              ? 'md:grid-cols-2 max-w-3xl mx-auto'
              : 'max-w-xl mx-auto'
          }`}
        >
          {quotes.map((t, i) => (
            <motion.div
              key={t.id || i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#16213E]/60 border-2 border-[#00D4FF]/20 rounded-xl p-6"
            >
              <p className="text-gray-300 leading-relaxed mb-4 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                {t.display_name && (
                  <p className="font-bold text-white">{t.display_name}</p>
                )}
                {formatMeta(t) && (
                  <p className="text-sm text-[#F59E0B]">{formatMeta(t)}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
