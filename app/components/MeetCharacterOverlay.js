'use client';

import Image from 'next/image';
import Overlay from './Overlay';
import { useOverlaySlot, OVERLAY_PRIORITY } from '@/lib/overlayQueue';

/**
 * A Storybook character arrives to meet the player. Reward-priority: it
 * queues behind the celebration/dice/reflection chain for the quest that
 * earned it and can never stack on top of them.
 *
 * All four of the shell's close paths route through onMeet, which the
 * caller guards with claimReward('meet-character') -- closing the overlay
 * IS meeting the character (there is nothing to decline; a child tapping
 * the backdrop still gets their friend recorded).
 */
export default function MeetCharacterOverlay({ character, onMeet, show }) {
  const visible = useOverlaySlot(
    'meet-character',
    OVERLAY_PRIORITY.REWARD,
    Boolean(show && character)
  );

  if (!character) return null;

  return (
    <Overlay
      open={visible}
      onClose={onMeet}
      title={`You met ${character.name}!`}
      labelledBy="meet-character-heading"
      closeLabel="Add to Storybook"
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <p className="kq-chip bg-gold/20 text-navy text-xs font-bold">
          <span aria-hidden="true">📖</span> A new friend joins your Storybook
        </p>
        <Image
          src={character.src}
          alt={character.alt}
          width={480}
          height={320}
          loading="eager"
          className="w-full max-w-[360px] h-auto rounded-candy border-2 border-stone object-cover"
        />
        <h2 id="meet-character-heading" className="kq-display text-2xl text-navy">
          You met {character.name}!
        </h2>
        <p className="text-navy/70 italic max-w-[360px]">
          &ldquo;{character.beat}&rdquo;
        </p>
        <button
          onClick={onMeet}
          className="kq-btn kq-btn-gold px-8 py-3 text-base"
        >
          <span aria-hidden="true">✨</span> Add to Storybook
        </button>
      </div>
    </Overlay>
  );
}
