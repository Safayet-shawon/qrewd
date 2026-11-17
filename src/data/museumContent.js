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
    finale: { name: 'The Sweet Sixteen', blurb: 'One last thing' },
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
      title: 'Gentle Heart',
      date: '',
      caption: 'You are the kind of person who makes even a quiet afternoon feel like the best part of the day.',
      image: 'images/memories/memory-01.jpg',
      orientation: 'landscape',
    },
    {
      title: 'Sunlight Smile',
      date: '',
      caption: 'Your smile arrives before you do, and the whole world seems to brighten around it.',
      image: 'images/memories/memory-02.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Golden Fields',
      date: '',
      caption: 'Standing in a field of gold, you still look like the most beautiful thing I could see.',
      image: 'images/memories/memory-03.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Little Star',
      date: '',
      caption: 'Even as a little girl with a bright smile, you were already the sweetest thing in any room.',
      image: 'images/memories/memory-04.jpg',
      orientation: 'landscape',
    },
    {
      title: 'Quiet Grace',
      date: '',
      caption: 'Calm, graceful and a little mysterious. I could look at you like this forever.',
      image: 'images/memories/memory-05.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Painted Dreams',
      date: '',
      caption: 'Every line on your hands tells a story, and I want to be part of the next one.',
      image: 'images/memories/memory-06.jpg',
      orientation: 'portrait',
    },
    {
      title: 'River Calm',
      date: '',
      caption: 'On a quiet river, the morning feels softer, and you look like the peace I was looking for.',
      image: 'images/memories/memory-07.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Standing Tall',
      date: '',
      caption: 'Even surrounded by green and grace, you are the one thing in every picture I notice first.',
      image: 'images/memories/memory-08.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Still Moving',
      date: '',
      caption: 'Even in a blur, I would know you anywhere.',
      image: 'images/memories/memory-09.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Like This Flower',
      date: '',
      caption: 'Bright, soft and full of surprises, just like this flower.',
      image: 'images/memories/memory-10.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Chocolate and You',
      date: '',
      caption: 'Sweeter than any cake we could share, and I would choose you every time.',
      image: 'images/memories/memory-11.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Thumbs Up for Us',
      date: '',
      caption: 'With you, even an ordinary moment feels like something worth celebrating.',
      image: 'images/memories/memory-12.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Dressed Up for You',
      date: '',
      caption: 'Standing beside you, I feel like the luckiest person in every frame.',
      image: 'images/memories/memory-13.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Lakeside Promise',
      date: '',
      caption: 'By the water, with the city behind us, I only see your smile.',
      image: 'images/memories/memory-14.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Campus Sunshine',
      date: '',
      caption: 'You make even a sunny afternoon feel softer.',
      image: 'images/memories/memory-15.jpg',
      orientation: 'portrait',
    },
    {
      title: 'Still Standing Together',
      date: '',
      caption: 'No matter where we are, I want to be standing beside you.',
      image: 'images/memories/memory-16.jpg',
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

  // ── Room F — the finale: a cake, then one question ────────────────────────
  finale: {
    // Shown on the cake's wall plate (two lines) and in the panel when the cake is opened.
    cakeTitle: 'Be my queen',
    cakeSubtitle: 'The forever sweet 16',
    cakeMessage: 'Sixteen candles, and every one of them is for you.',
    question: 'Will you marry me?',
    yes: 'Yes',
    notYet: 'Not yet',
    yesTitle: 'Yes!',
    yesMessage: 'Thank you for being part of my world.',
    notYetMessage: 'Take your time. The cake will wait.',
  },

  // ── Optional ambient music ─────────────────────────────────────────────────
  // Never autoplays. The visitor must switch it on. Put a properly licensed
  // file at public/audio/ambient.mp3 (or change the path). If the file is
  // missing the museum simply stays silent.
  music: {
    path: 'audio/ambient.mp3',
  },
};
