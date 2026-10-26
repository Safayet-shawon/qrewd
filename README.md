# A Little World — a virtual love museum

A small, cinematic 3D museum made as a personal gift. Visitors approach a lit
museum at dusk, open the doors, and walk through five connected rooms:

| Room | What's in it |
| --- | --- |
| I · The Entrance Gallery | Columned hall, a lectern with the introduction plaque |
| II · Our Memories | A corridor of framed photographs — tap one to look closer |
| III · The Heart Room | A sculptural heart on a dais — touch it to reveal a message |
| IV · Our Little Timeline | One small installation per milestone |
| V · The Final Letter | An envelope on a pedestal that opens into a letter |

Built with **Vite + vanilla JavaScript + Three.js + GSAP**. No backend, no API
keys, no database. It builds to a folder of static files.

```bash
npm install
npm run dev       # local development → http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve dist/ locally to check the build
```

---

## Make it yours

Everything personal lives in **one file**:

```
src/data/museumContent.js
```

It currently holds neutral placeholders ("Your First Memory", "Add Your Date",
"Write Your Memory Here"). Nothing in it describes a real person or event —
replace it all.

| To change… | Edit in `museumContent.js` |
| --- | --- |
| The two names on the welcome plaque | `site.couple` |
| Opening title / subtitle / button | `opening` |
| Room names | `rooms` |
| Welcome plaque text | `intro` |
| Photographs, titles, dates, captions | `memories[]` |
| Timeline milestones | `timeline[]` |
| The heart's engraved line + secret message | `heart` |
| The letter and closing line | `letter` |
| Background music file | `music.path` |

You can **add or remove** entries in `memories` and `timeline`. The corridor
and camera route rebuild themselves — no 3D code needs touching.

### Replacing the photographs

1. Put your photos in `public/images/memories/`. Keep the naming tidy:
   `memory-01.jpg`, `memory-02.jpg`, … and `timeline-01.jpg`, …
2. Point to them in `museumContent.js` (no leading slash):

   ```js
   { title: 'The Day We…', date: '14 Feb 2024', caption: '…',
     image: 'images/memories/memory-01.jpg', orientation: 'portrait' }
   ```

3. Set `orientation` to `'portrait'`, `'landscape'` or `'square'` — it sizes the
   frame. Your photo is always fitted inside at its **own aspect ratio** (never
   stretched), so a mismatch only changes the ivory mat around it.
4. A milestone with no photo: `image: null`.
5. Missing or broken files are fine: that frame shows an intentional
   "a photograph will live here" placeholder instead of a broken image.

Tips: JPEG, about 1600 px on the long edge, under ~400 KB each keeps the museum
fast on phones. (Anything larger than 2048 px is downscaled on load anyway.)
The files that ship in that folder are generated abstract placeholders — delete
or overwrite them.

### Optional music

Music is **off until the visitor turns it on** (the note icon, top right) and is
never required.

1. Get a track you have the right to use — your own recording, or something
   licensed for web use (check the licence; e.g. a CC0 track or one you've
   purchased).
2. Save it as `public/audio/ambient.mp3` (or change `music.path`).
3. That's it. With no file present the toggle shows a polite "no music file
   yet" message and the museum stays silent.

---

## How to explore (for the visitor)

- **Drag** to look around (limited, so you can't get lost). On desktop, the
  mouse adds a slight parallax.
- **Click / tap** a photograph, the plaque, the heart, a milestone or the
  envelope. The camera moves in and a panel appears; **✕**, **Esc** or the
  button returns you to exactly where you were.
- **← / →** (or the on-screen arrows) walk the guided route; the **Look
  closer** button opens whatever is in front of you.
- **Rooms** (top right) jumps anywhere; **Entrance** (top left) returns to the
  first hall.

Reduced-motion is respected: transitions become near-instant and ambient
motion stops. Add `?lite=1` to the URL to force the lightweight visual mode
(it is also chosen automatically on low-memory phones) or `?full=1` to force
full quality.

If the browser can't run WebGL, or the 3D view fails, a calm scrollable version
of the same content is shown instead.

---

## Deploying to Vercel

The site is a plain static Vite build, so Vercel needs no special setup.

**Option A — from Git (recommended)**

1. Push this repository to GitHub.
2. On vercel.com choose **Add New… → Project** and import the repository.
3. Vercel detects Vite. Confirm: *Build command* `npm run build`,
   *Output directory* `dist`. No environment variables are needed.
4. Click **Deploy**. Every push to the main branch redeploys.

**Option B — from your computer**

```bash
npm install -g vercel
npm run build
vercel            # preview deployment
vercel --prod     # production deployment
```

Asset URLs are relative (`base: './'`), so it works at the root of a domain
(and in a sub-folder). There is only one page, so refreshing never breaks it.
`vercel.json` adds long-term caching for the hashed build files.

> Nothing here has been deployed. Deploying is your call.

---

## Project layout

```
index.html                 page shell (intro, HUD, panels, letter reader)
src/
  main.js                  orchestration: overlays, keyboard, fallback
  styles.css               all UI styling
  data/museumContent.js    ← all replaceable content
  core/                    env detection, asset paths, tiny emitter
  scene/
    museum.js              scene, layout, camera stops, picking, render loop
    rooms/                 entrance · gallery · heartRoom · timeline · letterRoom
    frames.js              photo frames + lazy image loading
    lighting.js            pooled spotlights (few real lights, many "slots")
    cameraRig.js           single camera pose animated by GSAP
    architecture.js        batching + arches, columns, trim
    particles.js           dust + embers
    textures.js            procedural textures (floor, plaster, labels…)
  ui/                      ui.js · audio.js · fallback.js
public/images/memories/    ← your photographs
public/audio/              ← optional music
```

## Performance notes

- Static architecture is merged into a few draw calls per room.
- Only a small pool of spotlights is ever active (6 full / 4 lite); they hop
  between "slots" near the visitor with a fade, so shadows and lighting stay
  cheap. Real-time shadows are used by one light only, and not in lite mode.
- Pixel ratio is capped (2 full / 1.25 lite) and lowered automatically if
  frames run long.
- Photographs load lazily as the visitor approaches each room.
