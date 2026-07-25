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
      <h2 className="kq-display text-3xl sm:text-4xl text-center mb-4 text-navy">
        {hasEnough ? 'What Questers Are Saying' : 'What Founding Questers Are Saying'}
      </h2>

      {/* Honest early-state framing — shown until we have 3+ real quotes. */}
      {!hasEnough && (
        <p className="text-center text-navy/60 mb-10 text-lg max-w-2xl mx-auto">
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
              className="kq-card p-6"
            >
              <div className="text-3xl mb-3" aria-hidden="true">💬</div>
              <p className="text-navy font-bold leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                {t.display_name && (
                  <p className="kq-display text-navy">{t.display_name}</p>
                )}
                {formatMeta(t) && (
                  <p className="text-sm text-navy/50 font-bold">{formatMeta(t)}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
