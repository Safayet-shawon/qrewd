import './styles.css';
import { museumContent as content } from './data/museumContent.js';
import { detectQuality, webglAvailable, reducedMotion } from './core/env.js';
import { asset } from './core/assets.js';
import { createUI } from './ui/ui.js';
import { createAudio } from './ui/audio.js';
import { buildFallback } from './ui/fallback.js';

const ROOM_KEYS = ['entrance', 'memories', 'heart', 'timeline', 'letter'];
const rooms = ROOM_KEYS.map((key, index) => ({ key, index, name: content.rooms[key].name, blurb: content.rooms[key].blurb }));

const app = document.getElementById('app');
const canvas = document.getElementById('scene');
const ui = createUI(content, rooms);
const audio = createAudio(content.music?.path, {
  onChange: (on) => ui.setMusic(on),
  onError: (msg) => ui.toast(msg),
});
ui.on('music', () => audio.toggle());

let museum = null;
let overlay = null; // 'panel' | 'letter' | null
let session = 0; // bumps whenever an overlay opens/closes so stale async steps stop
let entering = false;
let ready = null;

/* ───────────────────────── Overlay content ───────────────────────── */

const lists = { memory: content.memories, milestone: content.timeline };
const group = (kind) => museum.items.filter((i) => i.kind === kind).sort((a, b) => a.index - b.index);

/** Text for the information panel. `withImage` is only used when there is no 3D view. */
function describe(kind, index, withImage) {
  if (kind === 'memory' || kind === 'milestone') {
    const list = lists[kind];
    const m = list[index];
    return {
      eyebrow: `${kind === 'memory' ? 'Memory' : 'Milestone'} ${index + 1} of ${list.length}`,
      title: m.title,
      date: m.date,
      text: kind === 'memory' ? m.caption : m.memory,
      count: `${index + 1} / ${list.length}`,
      image: withImage && m.image ? asset(m.image) : null,
    };
  }
  if (kind === 'plaque') {
    return {
      eyebrow: 'Welcome',
      title: content.intro.heading,
      date: content.site.couple.filter(Boolean).join('  &  '),
      text: content.intro.message,
    };
  }
  return { eyebrow: 'For you', title: content.heart.secretTitle, date: '', text: content.heart.secretMessage };
}

let current = null; // { kind, index }

function showPanel(kind, index) {
  current = { kind, index };
  ui.openPanel(describe(kind, index, !museum));
  const list = lists[kind];
  if (list) ui.setPanelNav({ prevEnabled: index > 0, nextEnabled: index < list.length - 1 });
}

async function openItem(item) {
  if (!museum || overlay || !museum.entered) return;
  const my = ++session;
  ui.closeMenu();
  ui.hint(null);
  const idx = museum.stops.findIndex((s) => s.featured === item);
  if (idx >= 0 && idx !== museum.stopIndex) museum.markStop(idx);
  museum.setLocked(true);

  if (item.kind === 'letter') {
    overlay = 'letter';
    ui.setOverlay('letter');
    await museum.focusItem(item, { right: 0, bottom: 0 });
    if (my !== session) return;
    await museum.letter.open();
    if (my !== session) return;
    ui.openLetter(content.letter);
    return;
  }

  overlay = 'panel';
  if (item.kind === 'heart') museum.heart.pulse();
  museum.focusItem(item, ui.panelInsets());
  showPanel(item.kind, item.index);
}

function stepGroup(dir) {
  if (overlay !== 'panel' || !current || !lists[current.kind]) return;
  const index = current.index + dir;
  if (index < 0 || index >= lists[current.kind].length) return;
  if (museum) {
    const next = group(current.kind)[index];
    const idx = museum.stops.findIndex((s) => s.featured === next);
    if (idx >= 0) museum.markStop(idx);
    museum.focusItem(next, ui.panelInsets());
  }
  showPanel(current.kind, index);
}

async function closeOverlay() {
  if (!overlay) return;
  const was = overlay;
  overlay = null;
  current = null;
  const my = ++session;
  if (was === 'letter') {
    const closing = ui.closeLetter();
    museum?.letter.close();
    await closing;
    if (!museum || my !== session) return;
    await museum.unfocus();
  } else {
    await Promise.all([ui.closePanel(), museum?.unfocus()]);
  }
  if (!museum || my !== session) return;
  museum.setLocked(false);
}

/* ───────────────────────── Wiring ───────────────────────── */

ui.on('panelClose', closeOverlay);
ui.on('letterClose', closeOverlay);
ui.on('panelPrev', () => stepGroup(-1));
ui.on('panelNext', () => stepGroup(1));

function wireMuseum() {
  museum.events.on('stopchange', (stop, prev) => {
    ui.setStop(stop, museum.stops.length);
    if (!prev || prev.room !== stop.room) {
      ui.showCaption(rooms[stop.roomIndex]);
      ui.heartLine(stop.room === 'heart' ? content.heart.message : null);
    }
  });
  museum.events.on('select', openItem);
  museum.events.on('dragstart', () => ui.hint(null));

  ui.on('prev', () => !overlay && museum.prev());
  ui.on('next', () => !overlay && museum.next());
  ui.on('look', () => {
    const f = museum.stops[museum.stopIndex]?.featured;
    if (f) openItem(f);
  });
  ui.on('room', async (key) => {
    if (overlay) await closeOverlay();
    museum.goToRoom(key);
  });
  ui.on('entrance', async () => {
    if (!museum.entered) return;
    if (overlay) await closeOverlay();
    museum.goToStop(0);
  });
  ui.on('help', () => ui.hint(ui.helpText, 9000));
  ui.on('skip', () => museum.skipEntrance());
  museum.onContextLost(() => startFallback('The 3D view was interrupted, so here is the quiet version of the museum.'));
}

ui.on('enter', async () => {
  if (entering) return;
  entering = true;
  ui.setPhase('entering');
  await ready;
  if (!museum) return;
  ui.hideIntro();
  ui.showSkip(true);
  await museum.playEntrance();
  ui.showSkip(false);
  ui.setPhase('museum');
  ui.showHud();
  setTimeout(() => !overlay && ui.hint(ui.helpText, 8000), 1800);
  document.getElementById('scene').focus({ preventScroll: true });
});

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') {
    if (ui.menuOpen()) ui.closeMenu();
    else if (overlay) closeOverlay();
    return;
  }
  if (!museum || !museum.entered || ui.menuOpen()) return;
  const onCanvas = document.activeElement === canvas || document.activeElement === document.body;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (overlay === 'panel') stepGroup(1);
    else if (!overlay) museum.next();
    e.preventDefault();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (overlay === 'panel') stepGroup(-1);
    else if (!overlay) museum.prev();
    e.preventDefault();
  } else if (e.key === 'Enter' && onCanvas && !overlay) {
    const f = museum.stops[museum.stopIndex]?.featured;
    if (f) openItem(f);
  }
});

/* ───────────────────────── Fallback (no 3D) ───────────────────────── */

function startFallback(reason) {
  if (museum) {
    museum.dispose();
    museum = null;
  }
  overlay = null;
  current = null;
  app.dataset.phase = 'fallback';
  ['intro', 'hud', 'dock'].forEach((id) => (document.getElementById(id).hidden = true));
  canvas.style.display = 'none';
  const open = (kind, i) => {
    overlay = 'panel';
    showPanel(kind, i);
  };
  buildFallback(document.getElementById('fallback'), content, {
    reason,
    onMemory: (i) => open('memory', i),
    onMilestone: (i) => open('milestone', i),
    onHeart: () => open('heart', 0),
    onLetter: () => {
      overlay = 'letter';
      ui.openLetter(content.letter);
    },
  });
}

/* ───────────────────────── Boot ───────────────────────── */

async function boot() {
  if (!webglAvailable()) {
    startFallback('Your browser can’t show the 3D view, so here is the quiet version of the museum.');
    return;
  }
  const quality = detectQuality();
  ready = (async () => {
    try {
      const [{ createMuseum }, { loadFonts }] = await Promise.all([import('./scene/museum.js'), import('./scene/textures.js')]);
      await loadFonts();
      museum = await createMuseum(canvas, content, quality);
      wireMuseum();
      ui.setStop(museum.stops[0], museum.stops.length);
      app.dataset.ready = 'true';
    } catch (err) {
      console.error('3D scene failed to start', err);
      museum = null;
      startFallback('The 3D view couldn’t start on this device, so here is the quiet version of the museum.');
    }
  })();
  await ready;
}

boot();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    museum?.dispose();
    audio.dispose();
    ui.dispose();
  });
}
