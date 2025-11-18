'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Testimonial {
  name: string;
  text: string;
  level: number;
  avatar?: string;
  achievement?: string;
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  autoPlay?: boolean;
  interval?: number; // milliseconds
}

export default function TestimonialsCarousel({
  testimonials,
  autoPlay = true,
  interval = 5000
}: TestimonialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay || testimonials.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, testimonials.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  if (testimonials.length === 0) return null;

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Main Testimonial Card */}
      <div className="relative bg-[#16213E] border-3 border-[#00D4FF] rounded-xl p-8 min-h-[280px] overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 text-[#00D4FF]/10 text-9xl font-black leading-none">
          "
        </div>
        <div className="absolute bottom-0 right-0 text-[#00D4FF]/10 text-9xl font-black leading-none rotate-180">
          "
        </div>

        {/* Content */}
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              {/* Avatar / Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B4A] to-[#9B59B6] flex items-center justify-center text-4xl mb-4 border-4 border-[#00D4FF]"
              >
                {currentTestimonial.avatar || '🎮'}
              </motion.div>

              {/* Name & Level */}
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-2xl font-black text-[#F59E0B]">
                  {currentTestimonial.name}
                </h3>
                <span className="px-3 py-1 bg-gradient-to-r from-[#7C3AED] to-[#FF5733] rounded-full font-black text-sm">
                  LVL {currentTestimonial.level}
                </span>
              </div>

              {/* Achievement Badge (if exists) */}
              {currentTestimonial.achievement && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4 px-4 py-2 bg-[#FFD93D]/20 border-2 border-[#FFD93D] rounded-lg"
                >
                  <span className="text-sm font-bold text-[#FFD93D]">
                    🏆 {currentTestimonial.achievement}
                  </span>
                </motion.div>
              )}

              {/* Testimonial Text */}
              <blockquote className="text-xl text-gray-100 italic leading-relaxed mb-4 max-w-2xl">
                "{currentTestimonial.text}"
              </blockquote>

              {/* Star Rating */}
              <div className="text-2xl text-[#10B981]">
                ⭐⭐⭐⭐⭐
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Arrows */}
      {testimonials.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-6 w-12 h-12 bg-[#00D4FF] hover:bg-[#00B8E6] border-3 border-[#0F3460] rounded-full flex items-center justify-center text-2xl text-[#1A1A2E] font-black transition-all shadow-lg hover:scale-110"
            aria-label="Previous testimonial"
          >
            ←
          </button>

          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-6 w-12 h-12 bg-[#00D4FF] hover:bg-[#00B8E6] border-3 border-[#0F3460] rounded-full flex items-center justify-center text-2xl text-[#1A1A2E] font-black transition-all shadow-lg hover:scale-110"
            aria-label="Next testimonial"
          >
            →
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {testimonials.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-[#00D4FF] scale-125'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar (optional) */}
      {autoPlay && testimonials.length > 1 && (
        <div className="mt-4 w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            key={currentIndex}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: interval / 1000, ease: 'linear' }}
            className="h-full bg-gradient-to-r from-[#00D4FF] to-[#7C3AED]"
          />
        </div>
      )}
    </div>
  );
}

// Extended testimonials data with more details
export const extendedTestimonials: Testimonial[] = [
  {
    name: 'Sarah M.',
    text: 'Lost 15 lbs by turning exercise into epic quests. This app made fitness actually fun! I look forward to my "daily raids" now.',
    level: 47,
    avatar: '🏃‍♀️',
    achievement: '90-Day Streak Warrior'
  },
  {
    name: 'Mike R.',
    text: 'Finally kept a 90-day streak. The gamification actually works where other apps failed. The story system keeps me coming back.',
    level: 62,
    avatar: '💪',
    achievement: 'Legendary Consistency'
  },
  {
    name: 'Alex T.',
    text: 'Went from procrastinator to productivity beast in 30 days. The AI transformations are genuinely motivating and hilarious.',
    level: 38,
    avatar: '🚀',
    achievement: 'Quest Master'
  },
  {
    name: 'Jordan K.',
    text: 'As someone with ADHD, traditional trackers never worked. This RPG approach finally clicked. I\'ve completed more tasks in 2 weeks than the last 2 months.',
    level: 29,
    avatar: '🎯',
    achievement: 'Consistency Champion'
  },
  {
    name: 'Taylor S.',
    text: 'The weekly AI-generated story chapters are genius. Reading about my "legendary achievements" feels way better than checking off boring boxes.',
    level: 55,
    avatar: '📖',
    achievement: 'Story Seeker'
  }
];
