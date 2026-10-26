/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  MUSEUM CONTENT — the one file you edit to make this museum yours.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Everything below is neutral placeholder text. Nothing here describes a real
 *  person, date or event — replace it with your own.
 *
 *  • Photos live in  public/images/memories/  and are referenced WITHOUT a
 *    leading slash, e.g.  'images/memories/memory-01.jpg'.
 *  • Add or remove entries in `memories` and `timeline`; the museum rebuilds
 *    itself (frames, corridor length, camera stops) from these lists.
 *  • `orientation` tells the museum how big to make the frame before the photo
 *    has loaded: 'portrait' | 'landscape' | 'square'. The photo itself is never
 *    stretched — it is fitted inside the frame at its own aspect ratio.
 *  • A missing photo is fine: an elegant placeholder is shown instead.
 */
export const museumContent = {
  // ── Site ───────────────────────────────────────────────────────────────────
  site: {
    title: 'A Little World',
    documentTitle: 'A Little World — a museum made just for you',
    description: 'A small virtual museum, made as a gift.',
    // Shown on the introduction plaque. Replace with the two names.
    couple: ['Your Name', 'Their Name'],
  },

  // ── Opening screen ─────────────────────────────────────────────────────────
  opening: {
    title: 'A LITTLE WORLD, MADE JUST FOR YOU',
    subtitle: 'Every little moment has a place here.',
    enterLabel: 'ENTER OUR WORLD',
  },

  // ── Room names (shown in the menu and as a caption on arrival) ─────────────
  rooms: {
    entrance: { name: 'The Entrance Gallery', blurb: 'Where it begins' },
    memories: { name: 'Our Memories', blurb: 'A corridor of photographs' },
    heart: { name: 'The Heart Room', blurb: 'The centre of everything' },
    timeline: { name: 'Our Little Timeline', blurb: 'Moments, in order' },
    letter: { name: 'The Final Letter', blurb: 'Saved for last' },
  },

  // ── Room A — introduction plaque ───────────────────────────────────────────
  intro: {
    heading: 'Welcome to Our Little World',
    message:
      'Every room holds a piece of us. Take your time, wander slowly, and look closely at the things that were made to be found.',
  },

  // ── Room B — memory gallery ────────────────────────────────────────────────
  // Add / remove / reorder freely. Frames alternate between the left and right
  // wall and the corridor grows to fit.
  memories: [
    {
      title: 'Your First Memory',
      date: 'Add Your Date',
      caption: 'Write Your Memory Here',
      image: 'images/memories/memory-01.jpg',
      orientation: 'landscape',
    },
    {
      title: 'Your Second Memory',
      date: 'Add Your Date',
      caption: 'Write Your Memory Here',
      image: 'images/memories/memory-02.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Your Third Memory',
      date: 'Add Your Date',
      caption: 'Write Your Memory Here',
      image: 'images/memories/memory-03.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Your Fourth Memory',
      date: 'Add Your Date',
      caption: 'Write Your Memory Here',
      image: 'images/memories/memory-04.jpg',
      orientation: 'landscape',
    },
    {
      title: 'Your Fifth Memory',
      date: 'Add Your Date',
      caption: 'Write Your Memory Here',
      image: 'images/memories/memory-05.jpg',
      orientation: 'square',
    },
    {
      title: 'Your Sixth Memory',
      date: 'Add Your Date',
      caption: 'Write Your Memory Here',
      image: 'images/memories/memory-06.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Your Seventh Memory',
      date: 'Add Your Date',
      caption: 'Write Your Memory Here',
      image: 'images/memories/memory-07.jpg',
      orientation: 'landscape',
    },
    {
      title: 'Your Eighth Memory',
      date: 'Add Your Date',
      caption: 'Write Your Memory Here',
      image: 'images/memories/memory-08.jpg',
      orientation: 'portrait',
    },
  ],

  // ── Room C — the heart ─────────────────────────────────────────────────────
  heart: {
    // Engraved above the far doorway and shown when you arrive.
    message: 'Of all the places in the world, this little world is yours.',
    // Revealed when the sculpture is touched.
    secretTitle: 'A Little Something',
    secretMessage:
      'Write a short, private message here. It appears when the heart is touched.',
  },

  // ── Room D — timeline ──────────────────────────────────────────────────────
  // `image` is optional: use null (or omit it) for a milestone with no photo.
  timeline: [
    {
      title: 'Milestone One',
      date: 'Add Your Date',
      memory: 'Write Your Memory Here',
      image: 'images/memories/timeline-01.jpg',
    },
    {
      title: 'Milestone Two',
      date: 'Add Your Date',
      memory: 'Write Your Memory Here',
      image: 'images/memories/timeline-02.jpg',
    },
    {
      title: 'Milestone Three',
      date: 'Add Your Date',
      memory: 'Write Your Memory Here',
      image: null,
    },
    {
      title: 'Milestone Four',
      date: 'Add Your Date',
      memory: 'Write Your Memory Here',
      image: 'images/memories/timeline-03.jpg',
    },
    {
      title: 'Milestone Five',
      date: 'Add Your Date',
      memory: 'Write Your Memory Here',
      image: 'images/memories/timeline-04.jpg',
    },
  ],

  // ── Room E — the final letter ──────────────────────────────────────────────
  letter: {
    heading: 'A Letter For You',
    greeting: 'Dear you,',
    // One string per paragraph.
    paragraphs: [
      'Write the first paragraph of your letter here. Each entry in this list becomes its own paragraph on the page.',
      'Add as many paragraphs as you like. They appear one by one, slowly, as the letter is read.',
      'Replace all of this with your own words.',
    ],
    signature: 'Yours, always',
    // The very last line, set apart from the rest of the letter.
    closing: 'Thank you for being part of my world.',
  },

  // ── Optional ambient music ─────────────────────────────────────────────────
  // Never autoplays. The visitor must switch it on. Put a properly licensed
  // file at public/audio/ambient.mp3 (or change the path). If the file is
  // missing the museum simply stays silent.
  music: {
    path: 'audio/ambient.mp3',
  },
};
