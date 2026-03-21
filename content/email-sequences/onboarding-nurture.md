# HabitQuest Onboarding Email Nurture Sequence

Use these emails with your email provider (Loops, Resend, Postmark, etc.) triggered after a user signs up for the Starter Kit via EmailCapture.

---

## Email 1: Welcome + Starter Kit (Day 0 — Immediate)

**Subject:** Your Habit Transformation Starter Kit is here
**Preview:** 5 science-backed strategies to build habits that stick

Hey!

Thanks for grabbing the Starter Kit. Here are 5 strategies that actually work — backed by behavioral science, not guilt:

**1. Start with identity, not outcomes**
Don't say "I want to run a marathon." Say "I'm a runner." (James Clear nailed this one.)

**2. Make the habit stupidly small**
"Do 1 pushup" beats "Do 50 pushups" every time. Momentum > ambition.

**3. Attach new habits to existing ones**
"After I pour my coffee, I'll journal for 2 minutes." Habit stacking works because your brain already has the cue built in.

**4. Reward yourself immediately**
Your brain needs a payoff NOW, not in 6 months. This is why gamification works — XP and progress bars give your brain the dopamine signal it needs to repeat the behavior.

**5. Remove guilt from the equation**
Miss a day? So what. The research is clear: guilt makes you avoid the habit entirely. Just pick up where you left off.

That last one is why we built HabitQuest. No streaks. No shame. Just progress.

[Start your adventure — it's free →](https://habitquest.dev/signup)

— The HabitQuest Team

---

## Email 2: Which Archetype Are You? (Day 2)

**Subject:** Which hero are you? Take the 2-minute quiz
**Preview:** Warrior, Sage, Builder, Seeker, or Shadow?

Quick question: how do you tackle challenges?

Do you charge in head-first (Warrior)? Plan everything before acting (Shadow)? Build systems to solve it (Builder)?

Your archetype determines your quest style in HabitQuest. Take the quiz to find out yours:

[Take the Archetype Quiz →](https://habitquest.dev/quiz)

It takes 2 minutes, and the results are surprisingly accurate. Some people have told us it's better than most personality tests they've taken.

(Pro tip: share your result on Twitter — it's fun to see what your friends get.)

— The HabitQuest Team

---

## Email 3: The Science Behind It (Day 5)

**Subject:** Why your last habit app failed (it's not your fault)
**Preview:** The neuroscience of why guilt-based apps backfire

Here's something most habit apps won't tell you:

A study in the Journal of Personality and Social Psychology found that guilt-based motivation leads to short-term compliance but long-term avoidance.

In other words: the more an app shames you for missing a day, the more likely you are to delete it.

Your brain doesn't respond to punishment. It responds to rewards. That's not a productivity hack — it's neuroscience.

We wrote a deep dive on the research:
[Why Gamification Makes Habits Stick →](https://habitquest.dev/content/blog/why-gamification-makes-habits-stick)

The key takeaway: variable rewards (like XP, random bonuses, and level-ups) create stronger behavioral patterns than fixed streaks. B.F. Skinner proved this decades ago. Game designers have known it forever. Habit apps are just now catching up.

— The HabitQuest Team

---

## Email 4: Try Pro Free for 7 Days (Day 7)

**Subject:** Unlock the full RPG experience — 7 days free
**Preview:** Boss battles, equipment, unlimited quests. No credit card needed.

You've been using HabitQuest for a week now. How's it going?

If you're enjoying the free tier, here's what you're missing:

- **Unlimited habits** (free tier caps at 3)
- **Boss battles** — defeat the Procrastination Wyrm
- **Equipment shop** — boost your XP gains
- **Quest chains** — multi-step story arcs
- **Journal & reflections** — transform your experiences into narratives
- **Weekly digest emails** — your progress, summarized

We're offering a **7-day free Pro trial**. No credit card required. If you love it, keep it for $5/mo. If not, you go right back to free — no guilt, obviously.

[Start Your 7-Day Pro Trial →](https://habitquest.dev/pricing)

— The HabitQuest Team

---

## Email 5: Your Story Continues (Day 14)

**Subject:** Your character is waiting
**Preview:** The story doesn't end here

Hey,

Just checking in. Your HabitQuest character is still there, ready to pick up where you left off.

That's the thing about HabitQuest — there are no broken streaks, no "you failed" messages. Whether it's been 1 day or 10 days, your story just continues.

Here's what other early users are saying:

> "I finally built a routine that stuck. No guilt, just progress."

> "The quest transformation is weirdly motivating. 'Do laundry' became a legendary mission and I actually wanted to do it."

If you haven't tried it yet, start free:
[Continue Your Adventure →](https://habitquest.dev/signup)

If you're already in, log in and complete today's quest:
[Go to Dashboard →](https://habitquest.dev/login)

Your habits. Your story. No guilt.

— The HabitQuest Team

---

## Implementation Notes

### Trigger: EmailCapture form submission (source: "starter_kit")
### Timing: Day 0, 2, 5, 7, 14
### Unsubscribe: Required in every email footer
### Tracking: Add UTM parameters to all links
  - utm_source=email
  - utm_medium=nurture
  - utm_campaign=onboarding
  - utm_content=email_{number}

### Example UTM link:
```
https://habitquest.dev/signup?utm_source=email&utm_medium=nurture&utm_campaign=onboarding&utm_content=email_1
```

### Recommended providers:
- **Loops.so** — built for SaaS, easy to set up sequences
- **Resend** — developer-friendly, React email templates
- **Postmark** — high deliverability, transactional + marketing
