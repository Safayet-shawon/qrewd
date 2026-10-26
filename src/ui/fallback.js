import { asset } from '../core/assets.js';

/**
 * A calm, scrollable version of the museum for browsers that cannot run WebGL
 * (or if the 3D view fails). It reuses the same content and the same panel /
 * letter reader as the 3D experience.
 */
export function buildFallback(root, content, { onMemory, onMilestone, onHeart, onLetter, reason }) {
  root.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'fb';

  const h = document.createElement('header');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = content.site.title;
  const h1 = document.createElement('h1');
  h1.textContent = content.opening.title;
  const lede = document.createElement('p');
  lede.className = 'lede';
  lede.textContent = content.opening.subtitle;
  h.append(eyebrow, h1, lede);
  if (reason) {
    const n = document.createElement('p');
    n.className = 'note';
    n.textContent = reason;
    h.append(n);
  }
  wrap.append(h);

  const grid = (title, items, handler, dateKey = 'date') => {
    const s = document.createElement('section');
    const hh = document.createElement('header');
    const t = document.createElement('h2');
    t.textContent = title;
    hh.append(t);
    const ul = document.createElement('ul');
    ul.className = 'fb__grid';
    items.forEach((m, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fb__card';
      const ph = document.createElement('span');
      ph.className = 'ph';
      if (m.image) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = '';
        img.src = asset(m.image);
        img.onerror = () => img.remove();
        ph.append(img);
      }
      const name = document.createElement('b');
      name.textContent = m.title;
      const date = document.createElement('small');
      date.textContent = m[dateKey];
      b.append(ph, name, date);
      b.addEventListener('click', () => handler(i, b));
      li.append(b);
      ul.append(li);
    });
    s.append(hh, ul);
    return s;
  };

  wrap.append(grid(content.rooms.memories.name, content.memories, onMemory));
  wrap.append(grid(content.rooms.timeline.name, content.timeline, onMilestone));

  const actions = document.createElement('section');
  const ah = document.createElement('header');
  const at = document.createElement('h2');
  at.textContent = content.rooms.heart.name;
  const am = document.createElement('p');
  am.className = 'lede';
  am.textContent = content.heart.message;
  ah.append(at, am);
  const row = document.createElement('div');
  row.className = 'fb__actions';
  const bh = document.createElement('button');
  bh.type = 'button';
  bh.className = 'btn btn--primary';
  bh.textContent = 'Touch the heart';
  bh.addEventListener('click', onHeart);
  const bl = document.createElement('button');
  bl.type = 'button';
  bl.className = 'btn btn--primary';
  bl.textContent = 'Open the letter';
  bl.addEventListener('click', onLetter);
  row.append(bh, bl);
  actions.append(ah, row);
  wrap.append(actions);

  root.append(wrap);
  root.hidden = false;
}
