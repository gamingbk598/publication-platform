import type { Article, Author, Category, ContentBlock, Tag } from '../types/article';

/**
 * SAMPLE DATA — Phase 2 only.
 * Every public page reads through the exported helper functions below, so
 * swapping this module for Supabase queries in Phase 3 requires no changes
 * in the page components.
 */

export const categories: Category[] = [
  {
    id: 'cat-tech',
    name: 'Technology',
    slug: 'technology',
    description: 'Hardware, software, and the industry that builds them.',
    placeholderGradient: 'from-sky-200 to-indigo-300',
  },
  {
    id: 'cat-ai',
    name: 'AI',
    slug: 'ai',
    description: 'Machine learning, models, policy, and their consequences.',
    placeholderGradient: 'from-violet-200 to-purple-300',
  },
  {
    id: 'cat-science',
    name: 'Science',
    slug: 'science',
    description: 'Discoveries, research, and the natural world.',
    placeholderGradient: 'from-emerald-200 to-teal-300',
  },
  {
    id: 'cat-education',
    name: 'Education',
    slug: 'education',
    description: 'Learning, teaching, and building better study habits.',
    placeholderGradient: 'from-amber-200 to-orange-300',
  },
  {
    id: 'cat-business',
    name: 'Business',
    slug: 'business',
    description: 'Markets, strategy, and the economics of technology.',
    placeholderGradient: 'from-slate-200 to-zinc-300',
  },
  {
    id: 'cat-lifestyle',
    name: 'Lifestyle',
    slug: 'lifestyle',
    description: 'Creativity, work-life, and everyday improvement.',
    placeholderGradient: 'from-rose-200 to-pink-300',
  },
];

export const tags: Tag[] = [
  { slug: 'edge-ai', name: 'Edge AI' },
  { slug: 'policy', name: 'Policy' },
  { slug: 'space', name: 'Space' },
  { slug: 'open-source', name: 'Open Source' },
  { slug: 'productivity', name: 'Productivity' },
  { slug: 'climate', name: 'Climate' },
  { slug: 'publishing', name: 'Publishing' },
  { slug: 'cloud', name: 'Cloud' },
  { slug: 'webb', name: 'JWST' },
];

export const authors: Author[] = [
  {
    id: 'author-1',
    name: 'Amara Rahman',
    slug: 'amara-rahman',
    role: 'owner',
    title: 'Editor-in-Chief',
    bio: 'Founder and editor-in-chief. Writes about technology policy and the intersection of AI with daily life. Fifteen years in digital publishing.',
    expertise: ['Technology policy', 'AI regulation', 'Digital publishing'],
    joinedAt: '2026-01-05',
    socials: [
      { label: 'X', url: '#' },
      { label: 'LinkedIn', url: '#' },
    ],
  },
  {
    id: 'author-2',
    name: 'Maya Chen',
    slug: 'maya-chen',
    role: 'editor',
    title: 'Science Editor',
    bio: 'Climate scientist turned science editor. Believes good explanation is a public service.',
    expertise: ['Climate science', 'Astronomy', 'Research methods'],
    joinedAt: '2026-02-14',
    socials: [{ label: 'LinkedIn', url: '#' }],
  },
  {
    id: 'author-3',
    name: 'Daniel Osei',
    slug: 'daniel-osei',
    role: 'author',
    title: 'Contributing Writer',
    bio: 'Software engineer and writer. Covers developer tools, open source, and practical guides.',
    expertise: ['Software engineering', 'Open source', 'Developer tools'],
    joinedAt: '2026-03-02',
    socials: [
      { label: 'X', url: '#' },
      { label: 'GitHub', url: '#' },
    ],
  },
  {
    id: 'author-4',
    name: 'Priya Sharma',
    slug: 'priya-sharma',
    role: 'author',
    title: 'Contributing Writer',
    bio: 'Business analyst writing about the economics of technology and the people behind the numbers.',
    expertise: ['Tech economics', 'Startups', 'Cloud computing'],
    joinedAt: '2026-04-19',
    socials: [{ label: 'LinkedIn', url: '#' }],
  },
];

const body = (blocks: ContentBlock[]): ContentBlock[] => blocks;

export const articles: Article[] = [
  {
    id: 'art-1',
    slug: 'quiet-revolution-in-edge-ai',
    title: 'The Quiet Revolution in Edge AI',
    subtitle: 'Small models are leaving the data center — and changing what computers can do',
    excerpt:
      'While the industry debates frontier models, a quieter shift is happening on phones, sensors, and embedded devices: AI that runs entirely offline, on hardware you already own.',
    contentType: 'analysis',
    categorySlug: 'ai',
    tagSlugs: ['edge-ai', 'open-source'],
    authorId: 'author-1',
    status: 'published',
    featured: true,
    editorsPick: true,
    breaking: false,
    publishedAt: '2026-11-20T08:00:00Z',
    readingMinutes: 8,
    body: body([
      { type: 'paragraph', text: 'For the last two years, conversations about artificial intelligence have centered on enormous models running in enormous data centers. But a second trajectory has been quietly maturing: models small enough to run on a phone, a laptop, or a microcontroller, with no network connection at all.' },
      { type: 'heading', level: 2, text: 'Why the edge matters' },
      { type: 'paragraph', text: 'Edge inference — running models on the device itself — eliminates round-trip latency, removes recurring cloud costs, and keeps personal data on the device. For applications from real-time translation to industrial sensors, those properties are not conveniences; they are requirements.' },
      { type: 'quote', text: 'The most important computer of the next decade may be the one you never notice running.', attribution: 'A commonly heard sentiment at embedded systems conferences' },
      { type: 'heading', level: 2, text: 'What changed' },
      { type: 'list', ordered: false, items: [
        'Quantization and distillation made competent models small enough for phones.',
        'On-device neural accelerators became standard in consumer chips.',
        'Open model licenses let manufacturers ship AI features without negotiating with a cloud vendor.',
      ] },
      { type: 'paragraph', text: 'None of these developments is a breakthrough on its own. Together, they move AI from a service you subscribe to toward a capability your hardware simply has.' },
      { type: 'heading', level: 3, text: 'What to watch next' },
      { type: 'paragraph', text: 'The open question is developer experience. Cloud APIs are easy; on-device toolchains are not. Whoever makes on-device deployment as simple as a fetch request will shape the next generation of applications.' },
    ]),
  },
  {
    id: 'art-2',
    slug: 'eu-advances-ai-liability-directive',
    title: 'EU Parliament Advances AI Liability Directive',
    subtitle: 'The committee vote moves the directive one step closer to becoming law',
    excerpt:
      'The legal affairs committee backed a revised liability framework for AI systems, setting up a plenary vote early next year. Here is what the text actually says.',
    contentType: 'news',
    categorySlug: 'ai',
    tagSlugs: ['policy'],
    authorId: 'author-1',
    status: 'published',
    featured: false,
    editorsPick: false,
    breaking: true,
    publishedAt: '2026-11-24T14:30:00Z',
    readingMinutes: 4,
    news: {
      eventDate: '2026-11-24',
      location: 'Brussels, Belgium',
      sources: [
        { name: 'European Parliament committee press release', url: '#' },
        { name: 'Draft text of the directive (consolidated version)', url: '#' },
      ],
    },
    body: body([
      { type: 'paragraph', text: 'The European Parliament\'s legal affairs committee has approved a revised version of the AI Liability Directive, clearing the way for a full plenary vote scheduled for early next year.' },
      { type: 'heading', level: 2, text: 'Key provisions' },
      { type: 'list', ordered: true, items: [
        'A rebuttable presumption of causality in cases involving high-risk AI systems.',
        'Extended disclosure obligations for providers of high-risk systems.',
        'Harmonized limitation periods for claims across member states.',
      ] },
      { type: 'paragraph', text: 'Industry groups have warned about compliance costs for smaller developers, while consumer organizations welcomed the disclosure rules. The final text may still change before the plenary vote.' },
      { type: 'quote', text: 'Liability rules are how regulation becomes real. Everything else is guidance.', attribution: 'Statement by a consumer rights coalition' },
      { type: 'paragraph', text: 'This report is based on the committee press release and the consolidated draft text. Figures and dates reflect the documents as published this week.' },
    ]),
  },
  {
    id: 'art-3',
    slug: 'webb-detects-carbon-dioxide-on-ocean-world-candidate',
    title: 'Webb Detects Carbon Dioxide on Ocean World Candidate',
    subtitle: 'A new analysis of transmission spectra strengthens the case for a water-rich exoplanet',
    excerpt:
      'Astronomers report a statistically significant carbon dioxide signature in the atmosphere of a sub-Neptune exoplanet, adding to the evidence that some small planets retain deep oceans.',
    contentType: 'news',
    categorySlug: 'science',
    tagSlugs: ['space', 'webb'],
    authorId: 'author-2',
    status: 'published',
    featured: false,
    editorsPick: true,
    breaking: false,
    publishedAt: '2026-11-22T16:00:00Z',
    readingMinutes: 5,
    news: {
      eventDate: '2026-11-22',
      location: 'Baltimore, USA',
      sources: [
        { name: 'Peer-reviewed study (preprint summary)', url: '#' },
        { name: 'Space telescope science institute announcement', url: '#' },
      ],
    },
    body: body([
      { type: 'paragraph', text: 'Using transmission spectroscopy during two transits, a research team has identified a carbon dioxide feature in the atmosphere of a sub-Neptune exoplanet, according to a study published this week.' },
      { type: 'heading', level: 2, text: 'Why carbon dioxide matters' },
      { type: 'paragraph', text: 'Carbon dioxide alone does not prove an ocean. But combined with previously reported methane depletion and a density estimate consistent with a high water fraction, it fits the profile of a volatile-rich world. The researchers are careful to call it a candidate ocean world, not a confirmed one.' },
      { type: 'quote', text: 'We are assembling a consistent picture, not a photograph. Each molecule is one more pixel.', attribution: 'Study co-author, at a press briefing' },
      { type: 'heading', level: 2, text: 'What comes next' },
      { type: 'paragraph', text: 'Additional observations at higher resolution are planned for next year, targeting wavelengths that could distinguish between a water-rich atmosphere and a hydrogen-dominated one.' },
    ]),
  },
  {
    id: 'art-4',
    slug: 'transformer-models-explained',
    title: 'Transformer Models, Explained Without the Math',
    subtitle: 'Attention, tokens, and context — the concepts behind modern language models',
    excerpt:
      'You do not need linear algebra to understand how large language models work. This explainer builds the intuition from first principles.',
    contentType: 'explainer',
    categorySlug: 'ai',
    tagSlugs: ['open-source'],
    authorId: 'author-3',
    status: 'published',
    featured: false,
    editorsPick: true,
    breaking: false,
    publishedAt: '2026-11-15T09:00:00Z',
    readingMinutes: 10,
    body: body([
      { type: 'paragraph', text: 'Every modern language model, from the smallest on-device assistant to the largest frontier system, is built on the same architectural idea: the transformer. Understanding it conceptually takes about ten minutes and zero mathematics.' },
      { type: 'heading', level: 2, text: 'Step 1: Text becomes tokens' },
      { type: 'paragraph', text: 'A model never sees words. Text is first split into tokens — chunks that are usually words, pieces of words, or punctuation. Each token is mapped to a list of numbers called an embedding, which represents its meaning as a position in a very large space of concepts.' },
      { type: 'heading', level: 2, text: 'Step 2: Attention connects them' },
      { type: 'paragraph', text: 'The transformer\'s core mechanism, attention, lets every token look at every other token and decide which ones matter for its own meaning. In the sentence "the bank was muddy," the word "bank" pulls information from "muddy" and shifts toward the riverside meaning.' },
      { type: 'quote', text: 'Attention is a lookup operation: ask a question about every token, weight the answers, and add up the results.' },
      { type: 'heading', level: 2, text: 'Step 3: Layers refine, prediction emerges' },
      { type: 'paragraph', text: 'Stack dozens of attention layers and each layer builds increasingly abstract relationships — syntax, then meaning, then discourse. Finally, the model outputs a probability for every possible next token. Sampling from that distribution, one token at a time, is generation.' },
      { type: 'list', ordered: false, items: [
        'Tokens: the vocabulary models read and write in.',
        'Embeddings: meaning as geometry.',
        'Attention: context-dependent weighting between tokens.',
        'Layers: abstraction built step by step.',
      ] },
      { type: 'paragraph', text: 'That is genuinely the whole skeleton. Everything else — size, training data, fine-tuning — changes how well the skeleton works, not what it is.' },
    ]),
  },
  {
    id: 'art-5',
    slug: 'personal-knowledge-system-guide',
    title: 'How to Build a Personal Knowledge System That Survives',
    subtitle: 'A practical guide to notes, links, and review — without buying more apps',
    excerpt:
      'Most note-taking systems fail for structural reasons, not because you picked the wrong tool. This guide fixes the structure first.',
    contentType: 'guide',
    categorySlug: 'education',
    tagSlugs: ['productivity'],
    authorId: 'author-3',
    status: 'published',
    featured: false,
    editorsPick: false,
    breaking: false,
    publishedAt: '2026-11-18T10:00:00Z',
    readingMinutes: 9,
    body: body([
      { type: 'paragraph', text: 'A personal knowledge system has one job: make sure the thing you learned six months ago is findable six months from now. Most systems fail this test, and the reason is almost never the software.' },
      { type: 'heading', level: 2, text: 'The three-folder rule' },
      { type: 'list', ordered: false, items: [
        'Inbox: everything lands here. No organization required.',
        'Notes: things you wrote or condensed yourself.',
        'Reference: things other people wrote that you may need again.',
      ] },
      { type: 'paragraph', text: 'Resist deeper hierarchies. A structure you maintain in five seconds per note survives; one that demands filing decisions does not.' },
      { type: 'heading', level: 2, text: 'Write notes for your future self' },
      { type: 'paragraph', text: 'A good note answers three questions on sight: what is this about, where did it come from, and what did I think at the time. Ten extra words now saves an hour of re-reading later.' },
      { type: 'quote', text: 'Your system should be boring. Excitement belongs in the content, not the workflow.' },
      { type: 'heading', level: 2, text: 'Review beats perfection' },
      { type: 'paragraph', text: 'Once a week, empty the inbox. Once a month, read two old notes at random. That is the entire maintenance schedule — and it is more than most systems ever get.' },
    ]),
  },
  {
    id: 'art-6',
    slug: 'framework-laptop-16-review',
    title: 'Review: Framework Laptop 16, Two Years In',
    subtitle: 'The upgradeable laptop is still the only one of its kind — and it shows its age in specific ways',
    excerpt:
      'After two years of daily use, one keyboard swap, and a GPU module upgrade, here is an honest assessment of what upgradeability costs and buys.',
    contentType: 'review',
    categorySlug: 'technology',
    tagSlugs: ['open-source'],
    authorId: 'author-3',
    status: 'published',
    featured: false,
    editorsPick: false,
    breaking: false,
    publishedAt: '2026-11-10T12:00:00Z',
    readingMinutes: 7,
    body: body([
      { type: 'paragraph', text: 'Two years ago I bought a Framework Laptop 16 on the promise that I would never need to buy a whole laptop again. Since then I have replaced the keyboard twice, upgraded the GPU module once, and moved to a higher-capacity battery. Here is how the experiment is going.' },
      { type: 'heading', level: 2, text: 'What worked' },
      { type: 'list', ordered: false, items: [
        'The GPU module swap took eleven minutes and genuinely extended the machine\'s gaming life.',
        'Input modules let me move to a numpad layout without replacing anything.',
        'Every internal component is labeled and documented.',
      ] },
      { type: 'heading', level: 2, text: 'What did not' },
      { type: 'paragraph', text: 'The chassis is thicker and heavier than conventional 16-inch machines, and the fan curve under sustained load is louder than I would like. Battery life remains merely average even after the upgrade.' },
      { type: 'quote', text: 'Upgradeability is not free — you pay for it in grams and decibels.' },
      { type: 'heading', level: 2, text: 'Verdict' },
      { type: 'paragraph', text: 'If you repair or tinker, nothing else comes close. If you want the thinnest machine with the best battery, this is not it. For me, the trade has been worth it every year at upgrade time.' },
    ]),
  },
  {
    id: 'art-7',
    slug: 'open-science-versus-paywalls',
    title: 'Open Science Is Winning Arguments and Losing Libraries',
    subtitle: 'An opinion on the strange equilibrium of academic publishing',
    excerpt:
      'Everyone agrees publicly funded research should be public. Two decades later, most of it still sits behind paywalls. What is actually holding the system together?',
    contentType: 'opinion',
    categorySlug: 'science',
    tagSlugs: ['policy', 'publishing'],
    authorId: 'author-2',
    status: 'published',
    featured: false,
    editorsPick: true,
    breaking: false,
    publishedAt: '2026-11-12T07:30:00Z',
    readingMinutes: 6,
    body: body([
      { type: 'paragraph', text: 'The argument for open access was won a long time ago. The public paid for the research, the public should be able to read it. And yet the majority of new papers in many fields still appear first behind a paywall. This is an opinion piece about why.' },
      { type: 'heading', level: 2, text: 'The evaluation treadmill' },
      { type: 'paragraph', text: 'Researchers are judged by where they publish. Prestigious journals are slow to change because their prestige is the product. Change the evaluation system and the publishing system follows; try it the other way and nothing moves.' },
      { type: 'quote', text: 'We keep asking publishers to change a game whose rules are written by promotion committees.' },
      { type: 'heading', level: 2, text: 'What would actually work' },
      { type: 'list', ordered: false, items: [
        'Funders requiring immediate open access, not embargoes.',
        'Hiring committees that read work instead of counting journal brands.',
        'Institutional support for diamond open access journals with no author fees.',
      ] },
      { type: 'paragraph', text: 'The pieces exist. What is missing is coordination — which is, historically, the last thing to arrive and the thing that changes everything when it does.' },
    ]),
  },
  {
    id: 'art-8',
    slug: 'interview-climate-modeling-maya-chen',
    title: 'Interview: How Climate Models Actually Get Built',
    subtitle: 'A conversation about grid cells, uncertainty, and communicating honestly with the public',
    excerpt:
      'We spoke with a working climate modeler about what the models can and cannot tell us, and why uncertainty is a feature of good science, not a failure of it.',
    contentType: 'interview',
    categorySlug: 'science',
    tagSlugs: ['climate'],
    authorId: 'author-2',
    status: 'published',
    featured: false,
    editorsPick: false,
    breaking: false,
    publishedAt: '2026-11-05T11:00:00Z',
    readingMinutes: 11,
    body: body([
      { type: 'paragraph', text: 'Climate models are among the most computationally expensive tools in science, and among the most misunderstood. This interview, lightly edited for length, was conducted over video call.' },
      { type: 'quote', text: 'A model is a hypothesis you can run. That is all it is, and that is everything.', attribution: 'Interviewee, on what a climate model is' },
      { type: 'heading', level: 2, text: 'On resolution' },
      { type: 'paragraph', text: '"People imagine we simulate every cloud. We simulate the statistics of clouds over grid cells a hundred kilometers wide. Then we test whether those statistics, run forward for a century, match what we observe. It is statistics all the way down."' },
      { type: 'heading', level: 2, text: 'On uncertainty' },
      { type: 'paragraph', text: '"When we give a range, that is honesty, not indecision. The range is the information. I would trust a forecaster who gives me a range far more than one who gives me a single number with a straight face."' },
      { type: 'heading', level: 2, text: 'On communication' },
      { type: 'paragraph', text: '"The hardest part of my job is not the physics. It is explaining that \'worse than we thought\' and \'better than we feared\' can both be true in the same report, for different regions, at the same time."' },
    ]),
  },
  {
    id: 'art-9',
    slug: 'notes-on-writing-every-day',
    title: 'Notes on Writing Every Day for One Year',
    subtitle: 'What a daily habit actually produces (spoiler: not masterpieces)',
    excerpt:
      'A year of writing something every single day taught me less about writing than about tolerating my own bad first drafts.',
    contentType: 'blog',
    categorySlug: 'lifestyle',
    tagSlugs: ['productivity', 'publishing'],
    authorId: 'author-1',
    status: 'published',
    featured: false,
    editorsPick: false,
    breaking: false,
    publishedAt: '2026-10-28T09:00:00Z',
    readingMinutes: 5,
    body: body([
      { type: 'paragraph', text: 'One year ago I committed to writing every day. Not publishing every day — writing. The distinction turned out to be the entire lesson.' },
      { type: 'heading', level: 2, text: 'The honest tally' },
      { type: 'list', ordered: false, items: [
        'About a third of the days produced something worth keeping.',
        'Three pieces I genuinely like started as throwaway paragraphs.',
        'The habit was easier to keep on busy days than bored ones.',
      ] },
      { type: 'quote', text: 'The draft you are ashamed of is the raw material for the paragraph you will be proud of.' },
      { type: 'paragraph', text: 'Would I recommend it? Yes, with a modification: write every day, but reread weekly. Production without review is just noise with momentum.' },
    ]),
  },
  {
    id: 'art-10',
    slug: 'economics-of-free-tier-cloud',
    title: 'The Economics of Free-Tier Cloud, Calculated',
    subtitle: 'What $0 actually buys you across the major platforms — and where the walls are',
    excerpt:
      'Free tiers are real and usable, but each has a specific breaking point. We map them out so your architecture does not discover them the hard way.',
    contentType: 'analysis',
    categorySlug: 'business',
    tagSlugs: ['cloud'],
    authorId: 'author-4',
    status: 'published',
    featured: false,
    editorsPick: false,
    breaking: false,
    publishedAt: '2026-11-08T08:00:00Z',
    readingMinutes: 8,
    body: body([
      { type: 'paragraph', text: 'Every major cloud platform now offers a genuinely usable free tier. The question for a bootstrapped project is not whether free tiers exist, but which constraint you will hit first — because you always hit one.' },
      { type: 'heading', level: 2, text: 'Three kinds of walls' },
      { type: 'list', ordered: true, items: [
        'Quota walls: hard limits that stop the service (requests per day, CPU milliseconds).',
        'Decay walls: services that pause or expire without activity (databases that sleep).',
        'Scale walls: limits you never hit until growth makes you hit them all at once.',
      ] },
      { type: 'paragraph', text: 'Quota walls are honest — you can monitor them. Decay walls are annoying but schedulable. Scale walls are the dangerous ones, because they arrive exactly when things are going well.' },
      { type: 'heading', level: 2, text: 'The practical playbook' },
      { type: 'paragraph', text: 'Design so the expensive path is the rare path: serve static assets from a CDN, cache aggressively, keep databases for the data that truly needs querying, and know your numbers. This publication itself runs on the architecture described here — it is a live case study.' },
    ]),
  },
  {
    id: 'art-11',
    slug: 'how-to-read-a-scientific-paper',
    title: 'A Beginner\'s Guide to Reading Scientific Papers',
    subtitle: 'The order you read a paper in is not the order it is written in',
    excerpt:
      'Scientists rarely read papers front to back. Here is the sequence that works, and the questions to hold in your head at each step.',
    contentType: 'guide',
    categorySlug: 'education',
    tagSlugs: ['productivity'],
    authorId: 'author-2',
    status: 'published',
    featured: false,
    editorsPick: false,
    breaking: false,
    publishedAt: '2026-10-20T10:00:00Z',
    readingMinutes: 7,
    body: body([
      { type: 'paragraph', text: 'A scientific paper is not written to be read the way it is written. Professionals have a working order, and once you adopt it, papers stop feeling like walls of jargon and start feeling like arguments with a standard shape.' },
      { type: 'heading', level: 2, text: 'The reading order' },
      { type: 'list', ordered: true, items: [
        'Abstract: what claim is being made?',
        'Figures: what does the evidence look like?',
        'Conclusion: what do the authors think it means?',
        'Methods: how was the evidence produced? (Now, and only now, the details.)',
      ] },
      { type: 'quote', text: 'Read the abstract for the claim, the figures for the proof, and the methods only when you doubt either.' },
      { type: 'heading', level: 2, text: 'Questions that keep you honest' },
      { type: 'paragraph', text: 'At every step ask: compared to what? A result means nothing without its control group, its baseline, or its confidence interval. If those are missing or unclear, you have learned something important about the paper — just not what its title promised.' },
    ]),
  },
];

/* ── Helpers (these become Supabase queries in Phase 3) ───────────────────── */

const published = () =>
  [...articles]
    .filter((a) => a.status === 'published')
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

export const getLatest = (limit = 10) => published().slice(0, limit);

export const getFeatured = () => articles.find((a) => a.featured && a.status === 'published');

export const getEditorsPicks = (limit = 4) =>
  published().filter((a) => a.editorsPick && !a.featured).slice(0, limit);

export const getByCategory = (slug: string, limit = 20) =>
  published().filter((a) => a.categorySlug === slug).slice(0, limit);

export const getByType = (type: Article['contentType'], limit = 20) =>
  published().filter((a) => a.contentType === type).slice(0, limit);

export const getByAuthor = (authorId: string) =>
  published().filter((a) => a.authorId === authorId);

export const getArticleBySlug = (slug: string) =>
  articles.find((a) => a.slug === slug && a.status === 'published');

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);

export const getAuthorBySlug = (slug: string) => authors.find((a) => a.slug === slug);

export const getAuthorById = (id: string) => authors.find((a) => a.id === id);

export const getRelated = (article: Article, limit = 3) =>
  published()
    .filter((a) => a.id !== article.id && (a.categorySlug === article.categorySlug || a.authorId === article.authorId))
    .slice(0, limit);

export const searchArticles = (query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return published().filter((a) => {
    const author = getAuthorById(a.authorId);
    const haystack = [a.title, a.subtitle, a.excerpt, author?.name ?? '', a.categorySlug, ...a.tagSlugs]
      .join(' ')
      .toLowerCase();
    return q.split(/\s+/).every((word) => haystack.includes(word));
  });
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
