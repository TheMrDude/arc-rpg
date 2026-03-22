/**
 * Server-side encounter service.
 * Handles rolling, applying rewards, and logging encounters.
 */
import { ENCOUNTER_TABLE } from './encounterTable';

const ENCOUNTER_CHANCE = 0.3; // 30% chance per quest completion

/**
 * Roll for a random encounter (server-side only).
 * Returns encounter data or null if no encounter triggered.
 */
export function rollForEncounter() {
  if (Math.random() >= ENCOUNTER_CHANCE) {
    return null; // No encounter
  }

  const roll = Math.floor(Math.random() * 10) + 1; // 1-10
  const encounter = ENCOUNTER_TABLE.find(e => e.roll === roll);

  if (!encounter) return null;

  // Calculate actual reward value
  const [min, max] = encounter.rewardRange;
  const rewardValue = Math.floor(Math.random() * (max - min + 1)) + min;

  return {
    roll,
    name: encounter.name,
    icon: encounter.icon,
    rarity: encounter.rarity,
    description: encounter.description,
    rewardType: encounter.rewardType,
    rewardValue,
    effectQuestsRemaining: encounter.effectQuestsRemaining || 0,
  };
}

/**
 * Apply encounter rewards server-side.
 * Returns the gold change and any effects to create.
 */
export function getEncounterRewards(encounter) {
  let goldChange = 0;
  let effectToCreate = null;

  switch (encounter.rewardType) {
    case 'gold':
      goldChange = encounter.rewardValue;
      break;
    case 'gold_loss':
      goldChange = -encounter.rewardValue;
      break;
    case 'bonus_xp':
      effectToCreate = {
        effect_type: 'bonus_xp',
        effect_value: encounter.rewardValue,
        quests_remaining: encounter.effectQuestsRemaining,
      };
      break;
    case 'critical_hit':
      goldChange = encounter.rewardValue; // 100 gold
      effectToCreate = {
        effect_type: 'double_xp',
        effect_value: 2,
        quests_remaining: encounter.effectQuestsRemaining,
      };
      break;
    case 'none':
    default:
      break;
  }

  return { goldChange, effectToCreate };
}
