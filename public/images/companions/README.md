# Companion Art

Living-companion art, one PNG per species line, per life stage.

> Note: the flat files in this folder (`phoenix.png`, `wyrm.png`, `golem.png`)
> belong to the *encounter* system (`lib/encounters.js`), not the living
> companions. Living-companion art lives in the per-line subfolders below.

## Convention

```
public/images/companions/<line>/<stage>.png
```

- `<line>` is the archetype key from `COMPANION_SPECIES` in `lib/companions.js`
  (`seeker`, `warrior`, `builder`, `shadow`, `sage`).
- `<stage>` is the life-stage index (`0` egg, `1`, `2`, `3`) — the same index
  `companionStage()` returns.

Example (seeker line):

| Stage | Species   | File                             |
| ----- | --------- | -------------------------------- |
| 1     | Trail Kit | `companions/seeker/1.png`        |
| 2     | Foxfire   | `companions/seeker/2.png`        |
| 3     | Prismfox  | `companions/seeker/3.png`        |

Source art is transparent-background PNG, 1024×1024 square, no ground shadow.

## Wiring a stage to its art

Add an `image` field to that stage in `COMPANION_SPECIES` (`lib/companions.js`):

```js
{ emoji: '🐿️', title: 'Trail Kit', name: 'Trail Kit', image: '/images/companions/seeker/1.png' },
```

That's the whole change. A stage with no `image` keeps rendering its emoji, so
partial coverage is fine — art can be added one line at a time.

## Optional tight portrait crop

The character-panel portrait is a ~70px circle and the badge is ~20px. The full
render is scaled to fit there with `object-cover`. If a full-body painterly
render looks muddy that small, add an optional face/bust crop and point a
`portrait` field at it:

```js
{ ..., image: '/images/companions/seeker/2.png', portrait: '/images/companions/seeker/2-portrait.png' },
```

The large showcase (companion card) always uses `image`; the small spots use
`portrait` when present and otherwise fall back to `image`, then to emoji.
