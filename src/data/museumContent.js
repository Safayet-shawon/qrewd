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
 *  • Add or remove entries in `memories`, `videos` and `pictures`; the museum rebuilds
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
    couple: ['Shawon', 'Abonty'],
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
    letter: { name: 'The Final Letter', blurb: 'Saved for last' },
    videos: { name: 'Moments in Motion', blurb: 'Little clips, playing on loop' },
    pictures: { name: 'Only the Pictures', blurb: 'Still, and full of feeling' },
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

  // ── Room — Only the Pictures: photographs with a line of feeling each ──────
  pictures: [
    { title: 'A Look', image: 'images/pictures/picture-01.jpg', orientation: 'portrait', caption: 'Some moments need no words, and this is one of them.' },
    { title: 'Warm and Real', image: 'images/pictures/picture-02.jpg', orientation: 'portrait', caption: 'The kind of smile that makes everything else feel quiet.' },
    { title: 'Golden Light', image: 'images/pictures/picture-03.jpg', orientation: 'portrait', caption: 'In this light you look like a memory I already love.' },
    { title: 'Just Us', image: 'images/pictures/picture-04.jpg', orientation: 'portrait', caption: 'Being yours is the easiest thing I have ever done.' },
    { title: 'Soft Colours', image: 'images/pictures/picture-05.jpg', orientation: 'portrait', caption: 'You bring colour into every day I spend with you.' },
    { title: 'Blue and Gold', image: 'images/pictures/picture-06.jpg', orientation: 'portrait', caption: 'Even the background cannot compete with how you look.' },
    { title: 'Quiet Happiness', image: 'images/pictures/picture-07.jpg', orientation: 'portrait', caption: 'This is what calm happiness looks like, and it looks like you.' },
    { title: 'Always You', image: 'images/pictures/picture-08.jpg', orientation: 'portrait', caption: 'Out of all the faces I could look at, yours is the one I choose.' },
  ],

  // ── Room — Moments in Motion: short clips that loop, one per frame ───────────
  // Each clip is in public/video/. It plays (muted) while the visitor is near.
  videos: [
    { title: 'Still Happy', caption: 'Watching this again feels like the first time, every time.', video: 'video/clip-01.mp4' },
    { title: 'Our Little Loop', caption: 'I would happily watch this moment on repeat for the rest of my life.', video: 'video/clip-02.mp4' },
    { title: 'Laughter', caption: 'The sound of your laugh is the best part of every clip.', video: 'video/clip-03.mp4' },
    { title: 'Soft Light', caption: 'Even in simple light, you look like the most beautiful thing I know.', video: 'video/clip-04.mp4' },
    { title: 'Quick Smile', caption: 'A short clip, but it holds the whole feeling of being with you.', video: 'video/clip-05.mp4' },
    { title: 'Another Day', caption: 'Every ordinary day with you turns into a memory worth keeping.', video: 'video/clip-06.mp4' },
    { title: 'In Motion', caption: 'Walking, turning, smiling: you are my favourite place to look.', video: 'video/clip-07.mp4' },
    { title: 'The Last Clip', caption: 'Thank you for every little moment we have shared.', video: 'video/clip-08.mp4' },
  ],

  // ── Room C — the heart ─────────────────────────────────────────────────────
  heart: {
    // Engraved above the far doorway and shown when you arrive.
    message: 'Of all the places in the world, this little world is yours.',
    // Revealed when the sculpture is touched.
    secretTitle: 'Just for You',
    secretMessage:
      'Out of every heart in the world, yours is the one that feels like home. I keep finding new reasons to love you, and I hope you always know how much you mean to me.',
  },

  // ── Room E — the final letter ──────────────────────────────────────────────
  letter: {
    heading: 'A Letter For You',
    greeting: 'My dearest Abonty,',
    // One string per paragraph.
    paragraphs: [
      'Every day with you feels like the best part of my life. You make the quiet moments warm and the ordinary days feel like something worth keeping.',
      'I want to spend my days making you smile, sharing small adventures, and growing old with your hand in mine. You are my favourite person, my calm and my joy.',
      'Thank you for being you, and for letting me be part of your world.',
    ],
    signature: 'Forever yours, Shawon',
    // The very last line, set apart from the rest of the letter.
    closing: 'Thank you for being part of my world.',
  },

  // ── Room F — the finale: a cake, then one question ────────────────────────
  finale: {
    // Shown when the cake is opened: the button that starts the moment.
    cakeTitle: 'Be my queen',
    cakeSubtitle: 'The forever sweet 16',
    cakeMessage: 'Sixteen candles, and every one of them is for you. Will you let me make every birthday, and every day, sweeter?',
    cutLabel: 'Cut the cake',
    laterLabel: 'Later',
    // The sweet note: front side. Turning it over shows the question.
    loveLetter: [
      'My sweetest Abonty,',
      'You are the reason my days feel softer and my heart feels lighter. Every picture in this little world is a small way of saying how much I adore you.',
      'So here is my last, sweetest question, written just for you.',
    ],
    turnLabel: 'Turn the page',
    // Back side of the note.
    question: 'Will you marry me?',
    yes: 'Yes',
    notYet: 'Not yet',
    yesTitle: 'Yes!',
    yesMessage: 'Thank you for being part of my world. Forever starts now.',
    notYetMessage: 'Take your time. The cake will wait.',
  },

  // ── How to explore: shown once after entering, and again from the ? button ──
  guide: {
    title: 'How to explore',
    steps: [
      'Walk with the joystick (phone) or W A S D / arrow keys (laptop). Drag to look around.',
      'Stand in front of a photo, clip, or piece. When it glows, tap Read (or press Enter) to look closer.',
      'Go next and Go previous take you to the next place, one by one.',
      'At the end, the cake: tap Read, then Cut the cake, and the crackers fly.',
      'A sweet note appears. Turn the page to find the question, then answer Yes or Not yet.',
    ],
    done: 'Got it',
  },

  // ── Optional ambient music ─────────────────────────────────────────────────
  // Never autoplays. The visitor must switch it on. Put a properly licensed
  // file at public/audio/ambient.mp3 (or change the path). If the file is
  // missing the museum simply stays silent.
  music: {
    path: 'audio/ambient.mp3',
  },
};
