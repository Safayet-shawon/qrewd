import gsap from 'gsap';
import { Emitter } from '../core/emitter.js';
import { reducedMotion, isCoarsePointer } from '../core/env.js';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const $ = (id) => document.getElementById(id);
const d = (v) => (reducedMotion() ? 0.01 : v);

/** All DOM for the museum: intro, HUD, menu, info panel, letter reader. */
export function createUI(content, rooms) {
  const ui = new Emitter();
  const app = $('app');
  const el = {
    intro: $('intro'),
    hud: $('hud'),
    dock: $('dock'),
    caption: $('roomCaption'),
    heartLine: $('heartLine'),
    hint: $('hint'),
    menu: $('menu'),
    scrim: $('menuScrim'),
    panel: $('panel'),
    letter: $('letter'),
    toast: $('toast'),
    skip: $('btnSkip'),
    look: $('btnLook'),
    prev: $('btnPrev'),
    next: $('btnNext'),
    stopLabel: $('stopLabel'),
    music: $('btnMusic'),
    menuBtn: $('btnMenu'),
  };
  const touch = isCoarsePointer();

  /* ───────── static text ───────── */
  document.title = content.site.documentTitle || content.site.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', content.site.description || '');
  $('introTitle').textContent = content.opening.title;
  $('introSub').textContent = content.opening.subtitle;
  $('enterLabel').textContent = content.opening.enterLabel;

  /* ───────── rooms: menu + progress ───────── */
  const menuList = $('menuList');
  const progress = $('progress');
  rooms.forEach((r, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" data-room="${r.key}"><span class="num">${NUMERALS[i]}</span><span class="name"></span><span class="blurb"></span></button>`;
    li.querySelector('.name').textContent = r.name;
    li.querySelector('.blurb').textContent = r.blurb;
    menuList.appendChild(li);

    const pli = document.createElement('li');
    pli.innerHTML = `<button type="button" data-room="${r.key}"></button>`;
    pli.querySelector('button').setAttribute('aria-label', `Go to ${r.name}`);
    pli.querySelector('button').title = r.name;
    progress.appendChild(pli);
  });
  const onRoomClick = (e) => {
    const b = e.target.closest('[data-room]');
    if (!b) return;
    closeMenu();
    ui.emit('room', b.dataset.room);
  };
  menuList.addEventListener('click', onRoomClick);
  progress.addEventListener('click', onRoomClick);

  /* ───────── simple wiring ───────── */
  const wire = (id, evt) => $(id).addEventListener('click', () => ui.emit(evt));
  wire('enterBtn', 'enter');
  wire('btnSkip', 'skip');
  wire('btnPrev', 'prev');
  wire('btnNext', 'next');
  wire('btnLook', 'look');
  wire('btnEntrance', 'entrance');
  wire('btnMusic', 'music');
  wire('panelClose', 'panelClose');
  wire('panelPrev', 'panelPrev');
  wire('panelNext', 'panelNext');
  wire('letterClose', 'letterClose');
  wire('letterDone', 'letterClose');
  $('btnHelp').addEventListener('click', () => ui.emit('help'));
  $('btnMenu').addEventListener('click', () => (el.menu.hidden ? openMenu() : closeMenu()));
  $('menuClose').addEventListener('click', closeMenu);
  el.scrim.addEventListener('click', closeMenu);

  /* ───────── intro ───────── */
  ui.hideIntro = () =>
    new Promise((res) => {
      gsap.to(el.intro, {
        opacity: 0,
        y: -14,
        duration: d(1.0),
        ease: 'power2.inOut',
        onComplete: () => {
          el.intro.hidden = true;
          res();
        },
      });
    });
  ui.focusEnter = () => $('enterBtn').focus({ preventScroll: true });
  ui.setPhase = (p) => (app.dataset.phase = p);
  /** Hide the dock/hint while a modal flow (e.g. the letter) is still animating in. */
  ui.setOverlay = (v) => (app.dataset.overlay = v || '');
  ui.showSkip = (on) => {
    el.skip.hidden = !on;
    if (on) gsap.fromTo(el.skip, { opacity: 0 }, { opacity: 1, duration: d(0.6), delay: 0.8 });
  };

  /* ───────── HUD ───────── */
  ui.showHud = () => {
    el.hud.hidden = false;
    el.dock.hidden = false;
    gsap.fromTo([el.hud, el.dock], { opacity: 0 }, { opacity: 1, duration: d(1.2), ease: 'power1.out' });
  };

  let current = null;
  ui.setStop = (stop, count) => {
    current = stop;
    progress.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === stop.roomIndex ? 'true' : 'false'));
    menuList.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === stop.roomIndex ? 'true' : 'false'));
    el.stopLabel.textContent = stop.label;
    el.prev.disabled = stop.index === 0;
    el.next.disabled = stop.index === count - 1;
    const featured = !!stop.featured;
    el.look.classList.toggle('is-empty', !featured);
    el.look.disabled = !featured;
    el.look.firstElementChild.textContent = stop.cue || '';
    $('sr').textContent = stop.label;
  };

  let capTl = null;
  ui.showCaption = (room) => {
    capTl?.kill();
    el.caption.querySelector('.caption__num').textContent = `Room ${NUMERALS[room.index]}`;
    el.caption.querySelector('.caption__name').textContent = room.name;
    el.caption.querySelector('.caption__blurb').textContent = room.blurb;
    capTl = gsap.timeline();
    capTl.fromTo(el.caption, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: d(1.1), ease: 'power2.out' });
    capTl.to(el.caption, { opacity: 0, duration: d(1.2), ease: 'power1.in' }, d(3.4));
  };

  let heartTween = null;
  ui.heartLine = (text) => {
    heartTween?.kill();
    if (text) {
      el.heartLine.textContent = text;
      heartTween = gsap.to(el.heartLine, { opacity: 1, duration: d(1.6), delay: d(4.6), ease: 'power1.out' });
    } else heartTween = gsap.to(el.heartLine, { opacity: 0, duration: d(0.5) });
  };

  let hintTween = null;
  ui.hint = (text, ms = 7000) => {
    hintTween?.kill();
    if (!text) {
      hintTween = gsap.to(el.hint, { opacity: 0, duration: d(0.5) });
      return;
    }
    el.hint.textContent = text;
    hintTween = gsap.timeline();
    hintTween.to(el.hint, { opacity: 1, duration: d(0.9), delay: 0.4 });
    hintTween.to(el.hint, { opacity: 0, duration: d(0.9) }, `+=${ms / 1000}`);
  };
  const foot = document.querySelector('.menu__foot');
  if (foot && touch) foot.textContent = 'Drag to look around. Tap a piece to look closer.';
  ui.helpText = touch
    ? 'Drag to look around. Tap a photograph, the heart or the letter to explore. Use the arrows to move on.'
    : 'Drag to look around. Click a photograph, the heart or the letter to explore. Arrow keys move between pieces.';

  let toastTween = null;
  ui.toast = (msg) => {
    toastTween?.kill();
    el.toast.textContent = msg;
    toastTween = gsap.timeline();
    toastTween.to(el.toast, { opacity: 1, duration: d(0.4) });
    toastTween.to(el.toast, { opacity: 0, duration: d(0.6) }, '+=3.2');
  };

  ui.setMusic = (on) => {
    el.music.setAttribute('aria-pressed', String(on));
    el.music.setAttribute('aria-label', on ? 'Turn music off' : 'Turn music on');
  };

  /* ───────── menu ───────── */
  let menuReturn = null;
  function openMenu() {
    menuReturn = document.activeElement;
    el.menu.hidden = false;
    el.scrim.hidden = false;
    el.menuBtn.setAttribute('aria-expanded', 'true');
    gsap.fromTo(el.menu, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: d(0.5), ease: 'power3.out' });
    gsap.fromTo(el.scrim, { opacity: 0 }, { opacity: 1, duration: d(0.4) });
    menuList.querySelector('button[aria-current="true"]')?.focus({ preventScroll: true });
    ui.emit('menuopen');
  }
  function closeMenu() {
    if (el.menu.hidden) return;
    el.menuBtn.setAttribute('aria-expanded', 'false');
    gsap.to(el.menu, { x: 30, opacity: 0, duration: d(0.35), ease: 'power2.in', onComplete: () => (el.menu.hidden = true) });
    gsap.to(el.scrim, { opacity: 0, duration: d(0.35), onComplete: () => (el.scrim.hidden = true) });
    menuReturn?.focus?.({ preventScroll: true });
  }
  ui.menuOpen = () => !el.menu.hidden;
  ui.closeMenu = closeMenu;

  /* ───────── info panel ───────── */
  let panelReturn = null;
  let panelOpen = false;
  ui.panelOpen = () => panelOpen;
  ui.panelInsets = () => {
    // How much of the screen the panel will cover once open.
    const w = app.clientWidth;
    const h = app.clientHeight;
    if (w <= 760) return { right: 0, bottom: Math.min(h * 0.46, 330) };
    const landscapeShort = h <= 520;
    const pw = Math.min(23 * 16, w * (landscapeShort ? 0.42 : 0.34));
    return { right: pw + 28, bottom: 0 };
  };
  ui.openPanel = ({ eyebrow, title, date, text, count, onPrev, image }) => {
    $('panelEyebrow').textContent = eyebrow || '';
    $('panelTitle').textContent = title || '';
    const dateEl = $('panelDate');
    dateEl.textContent = date || '';
    dateEl.hidden = !date;
    $('panelText').textContent = text || '';
    const fig = $('panelFigure');
    fig.hidden = !image;
    if (image) {
      const img = $('panelImg');
      img.onerror = () => (fig.hidden = true);
      img.src = image;
    }
    $('panelNav').hidden = !count;
    if (count) {
      $('panelCount').textContent = count;
      $('panelPrev').disabled = !onPrev;
    }
    if (!panelOpen) {
      panelReturn = document.activeElement;
      el.panel.hidden = false;
      app.dataset.overlay = 'panel';
      const mobile = app.clientWidth <= 760;
      gsap.fromTo(
        el.panel,
        mobile ? { y: 50, opacity: 0 } : { x: 30, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: d(0.7), delay: d(0.35), ease: 'power3.out' },
      );
    } else {
      gsap.fromTo(el.panel.querySelectorAll('.panel__title,.panel__date,.panel__text,.panel__figure'), { opacity: 0.2 }, { opacity: 1, duration: d(0.6) });
    }
    panelOpen = true;
    $('panelClose').focus({ preventScroll: true });
    el.panel.scrollTop = 0;
  };
  ui.setPanelNav = ({ prevEnabled, nextEnabled }) => {
    $('panelPrev').disabled = !prevEnabled;
    $('panelNext').disabled = !nextEnabled;
  };
  ui.closePanel = () =>
    new Promise((res) => {
      if (!panelOpen) return res();
      panelOpen = false;
      const mobile = app.clientWidth <= 760;
      gsap.to(el.panel, {
        ...(mobile ? { y: 40 } : { x: 24 }),
        opacity: 0,
        duration: d(0.4),
        ease: 'power2.in',
        onComplete: () => {
          el.panel.hidden = true;
          gsap.set(el.panel, { clearProps: 'transform' });
          app.dataset.overlay = '';
          panelReturn?.focus?.({ preventScroll: true });
          res();
        },
      });
    });

  /* ───────── the letter ───────── */
  let letterOpen = false;
  let letterTl = null;
  let letterReturn = null;
  ui.letterOpen = () => letterOpen;

  ui.openLetter = (L) => {
    letterReturn = document.activeElement;
    letterOpen = true;
    $('letterEyebrow').textContent = content.site.couple.filter(Boolean).join('  &  ');
    $('letterHeading').textContent = L.heading;
    $('letterGreeting').textContent = L.greeting || '';
    $('letterGreeting').hidden = !L.greeting;
    const body = $('letterBody');
    body.replaceChildren();
    (L.paragraphs || []).forEach((t) => {
      const p = document.createElement('p');
      p.textContent = t;
      body.appendChild(p);
    });
    $('letterSign').textContent = L.signature || '';
    $('letterSign').hidden = !L.signature;
    $('letterClosing').textContent = L.closing || '';
    $('letterClosing').hidden = !L.closing;

    el.letter.hidden = false;
    app.dataset.overlay = 'letter';
    const scroller = $('letterScroll');
    scroller.scrollTop = 0;

    const paper = $('letterPaper');
    const parts = [
      document.querySelector('#letterPaper > .eyebrow'),
      $('letterHeading'),
      paper.querySelector('.rule'),
      $('letterGreeting'),
      ...body.children,
      $('letterSign'),
      paper.querySelector('.rule--end'),
      $('letterClosing'),
      $('letterDone'),
    ].filter((n) => n && !n.hidden);

    gsap.set(parts, { opacity: 0, y: 14 });
    letterTl?.kill();
    letterTl = gsap.timeline();
    letterTl.fromTo(el.letter, { opacity: 0 }, { opacity: 1, duration: d(0.7) }, 0);
    letterTl.fromTo(paper, { opacity: 0, y: 36, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: d(1.1), ease: 'power3.out' }, 0.1);

    let userScrolled = false;
    const stopFollow = () => (userScrolled = true);
    scroller.addEventListener('wheel', stopFollow, { once: true, passive: true });
    scroller.addEventListener('touchmove', stopFollow, { once: true, passive: true });

    let at = 0.9;
    parts.forEach((n) => {
      const isClosing = n.id === 'letterClosing';
      const chars = (n.textContent || '').length;
      const slow = isClosing ? 1.8 : 1.2;
      letterTl.to(
        n,
        {
          opacity: 1,
          y: 0,
          duration: d(slow),
          ease: 'power2.out',
          onStart: () => {
            if (userScrolled || reducedMotion()) return;
            const r = n.getBoundingClientRect();
            const vr = scroller.getBoundingClientRect();
            if (r.bottom > vr.bottom - 60) n.scrollIntoView({ behavior: 'smooth', block: 'center' });
          },
        },
        d(at),
      );
      at += n.tagName === 'P' && !isClosing ? Math.min(1.9, 0.55 + chars * 0.011) : isClosing ? 2.2 : 0.55;
    });
    // tap the paper to bring the whole letter in at once
    const showAll = () => letterTl?.progress(1);
    paper.addEventListener('click', showAll, { once: true });
    $('letterClose').focus({ preventScroll: true });
  };

  ui.closeLetter = () =>
    new Promise((res) => {
      if (!letterOpen) {
        app.dataset.overlay = '';
        return res();
      }
      letterOpen = false;
      letterTl?.kill();
      gsap.to(el.letter, {
        opacity: 0,
        duration: d(0.5),
        ease: 'power1.in',
        onComplete: () => {
          el.letter.hidden = true;
          app.dataset.overlay = '';
          letterReturn?.focus?.({ preventScroll: true });
          res();
        },
      });
    });

  // keep Tab inside the modal letter
  el.letter.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [$('letterClose'), $('letterDone')];
    const i = f.indexOf(document.activeElement);
    e.preventDefault();
    f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
  });

  ui.dispose = () => {
    ui.clear();
    gsap.killTweensOf([el.intro, el.hud, el.dock, el.caption, el.heartLine, el.hint, el.menu, el.panel, el.letter, el.toast]);
  };

  return ui;
}
