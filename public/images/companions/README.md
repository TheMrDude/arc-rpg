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

## Size budget

**512×512, transparent PNG, palette (indexed) colour, under 60 KB per file.**

Check before committing:

```bash
# every companion PNG, largest first
find public/images/companions -name '*.png' -printf '%s\t%p\n' | sort -rn |
  awk -F'\t' '{ printf "%6.1f KB  %s%s\n", $1/1024, $2, ($1 > 61440 ? "   <-- OVER BUDGET" : "") }'
```

This is not arbitrary. The seeker line first shipped as the raw 1024–1254 px
masters at **1.5 MB, 1.4 MB and 1.9 MB — 4.8 MB for one line, rendering at 64 px
and 70 px**, roughly 20× oversized. Five lines at that weight is 24 MB of art on
a dashboard a child opens on a tablet. Resized and quantised, the same three
files are 51.7 KB, 51.9 KB and 36.4 KB: **99.0% smaller, and indistinguishable
at the sizes they actually render.**

512 px is deliberate headroom, not a guess: the largest slot is the hatch
prompt's 72 px glyph, so 512 covers a 3× DPR screen with room to spare.

Reproduce the conversion with `sharp` (already a dependency):

```js
await sharp(src)
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ palette: true, colors: 256, dither: 1, effort: 10, compressionLevel: 9 })
  .toFile(dest);
```

Drop `colors` to 128 if 256 lands over budget. Sharp's quantiser has a cliff
around 144 colours — anything from 144 to 256 produces the same file — so those
are effectively the only two settings worth trying, and `quality` changes
nothing for palette output.

Large flat areas quantise almost perfectly. **Wide smooth gradients are the hard
case**: Prismfox's rainbow tail needs 128 colours to fit, which measures 2.3/255
mean error against the master at display size. That is invisible on a device and
obvious under 5× magnification — check at real size, not zoomed, before deciding
it is a problem.

Masters are not kept in the repo. The pre-optimisation originals are recoverable
from git history if a re-encode is ever needed:

```bash
git show 057cbe0:public/images/companions/seeker/1.png > /tmp/master-1.png
```

Keep full-resolution masters wherever the art itself is commissioned and stored.

## Verifying a new file

Confirm it still reads correctly at the sizes it renders — 64 px on the
companion card, 70 px in the character-panel circle — rather than at 100%. A
quick numeric check against the master, resized to display size, catches
quantisation damage that eyeballing a large preview will not.

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
