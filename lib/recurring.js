export function shouldGenerateRecurringQuest(recurringQuest) {
  if (!recurringQuest.is_active) return false;
  if (!recurringQuest.last_generated_at) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastGenerated = new Date(recurringQuest.last_generated_at);
  lastGenerated.setHours(0, 0, 0, 0);

  const diffTime = today - lastGenerated;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (recurringQuest.recurrence_type === 'daily') {
    return diffDays >= 1;
  }

  if (recurringQuest.recurrence_type === 'weekly') {
    return diffDays >= 7;
  }

  if (recurringQuest.recurrence_type === 'custom') {
    return diffDays >= recurringQuest.recurrence_interval;
  }

  return false;
}
