/**
 * The Vendora Journal — editorial articles, shared by the journal index
 * (/blog) and the article page (/blog/:slug).
 *
 * Content rule (same as the rest of the storefront): every article describes
 * how Vendora actually works or gives general buying/selling guidance. The
 * escrow-vault and invented-merchant stories an earlier version carried were
 * fiction and are gone.
 */
export interface BlogArticle {
  /** URL slug, also the route param for /blog/:slug. */
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  image: string;
  featured?: boolean;
  body: string[];
}

export const BLOG_CATEGORIES = [
  'All',
  'Buyer Guide',
  'Tech Reviews',
  'Seller Guide',
  'Tech Guides',
  'Logistics',
];

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'shop-safely-on-vendora',
    title: 'How to Shop Safely on Vendora: Tracking, Delivery Codes and Disputes',
    excerpt:
      'Online shopping is safest when you know the checkpoints. Here is how ordering on Vendora protects you at every step — from live tracking to the delivery code you only share when the parcel is in your hands.',
    category: 'Buyer Guide',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Oct 10, 2026',
    readTime: '5 min read',
    image:
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    featured: true,
    body: [
      'Every Vendora order has a paper trail. From the moment you check out, the order in your account shows its live status — confirmed, packed, dispatched and out for delivery — so you never have to message a seller to ask where your parcel is.',
      'The most important checkpoint is the delivery code. When your parcel arrives, the rider may ask for the code shown on your order. That code is how the system confirms a completed delivery, so share it only when the parcel is physically in your hands and you have checked the outside of the package.',
      'If something is wrong — a damaged item, the wrong product, or a parcel that never arrived — open the order in your account and file a dispute with the details and photos. Our team reviews both sides and resolves the case, including a refund where the claim is valid.',
      'Finally, keep communication inside Vendora. Orders, messages and payments that stay on the platform are the ones we can see, verify and help you with.',
    ],
  },
  {
    id: 'ronin-r9-vs-sony-xm5',
    title: 'Flagship Audio Compared: Ronin R-9 vs. Sony WH-1000XM5 Noise Cancelling',
    excerpt:
      'Two of the most searched audio products on Vendora, compared on the things that actually matter: noise cancelling, battery life, comfort and price in PKR.',
    category: 'Tech Reviews',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Oct 08, 2026',
    readTime: '6 min read',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    body: [
      'The Sony WH-1000XM5 is an over-ear headphone built for long listening: large drivers, a sealed fit that blocks a lot of noise before the electronics even switch on, and battery life that comfortably covers a working week of commutes.',
      'The Ronin R-9 takes the opposite approach — a compact in-ear design that disappears into a pocket, charges fast, and costs a fraction of the Sony. Its noise cancelling cannot match a sealed over-ear, but for calls, gym sessions and short trips it covers what most people actually need.',
      'Comfort decides more purchases than specifications do. Over-ears spread pressure and stay stable for hours; in-ears are lighter but fit varies with ear tips, so try the included sizes before judging the sound.',
      'Our take: choose the Sony if noise cancelling and long-session comfort are the priority, and the Ronin if you want everyday portability at a friendlier price. Both are listed by official stores on Vendora, so compare the live listings for the current PKR prices.',
    ],
  },
  {
    id: 'selling-on-vendora-first-steps',
    title: 'Selling on Vendora: From Application to Your First Order',
    excerpt:
      'Thinking of opening a store? The path is simpler than most sellers expect: apply, get reviewed, list your products, and manage everything from one dashboard.',
    category: 'Seller Guide',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Oct 04, 2026',
    readTime: '4 min read',
    image:
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
    body: [
      'It starts with the Become a Seller application. Tell us about your business and what you plan to sell; every application is reviewed by our team, because buyers trust stores that have been checked.',
      'Once approved, your vendor dashboard opens. Add products with clear photos and honest descriptions, set your prices in PKR, and keep stock up to date — accurate listings are the difference between smooth orders and disputes.',
      'When an order arrives you pack and dispatch it, and the buyer tracks it from their account just like any other order. Your earnings build in the dashboard as orders complete, and payouts are requested and followed from the Payouts page.',
      'The sellers who do best treat the dashboard as a daily habit: answer messages quickly, dispatch on time, and keep listings accurate. The tools are all there — consistency is the strategy.',
    ],
  },
  {
    id: 'gan-chargers-explained',
    title: 'Why Fast GaN Chargers Are Replacing Bulky Power Bricks',
    excerpt:
      'Gallium Nitride charging explained in plain language: why 65W and 100W PD chargers run cooler, charge faster, and fit in a pocket your old brick never could.',
    category: 'Tech Guides',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Sep 29, 2026',
    readTime: '4 min read',
    image:
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    body: [
      'Traditional chargers use silicon switches that waste energy as heat, which is why old laptop bricks are big, heavy and warm. Gallium Nitride (GaN) switches handle higher voltages more efficiently, so the same charging power fits in a much smaller body.',
      'The wattage on the box is the ceiling, not a guarantee. A 65W USB-C PD charger can fast-charge most phones at their full speed and run most thin laptops; 100W models cover hungrier machines and can split power across two devices at once.',
      'Heat is the enemy of battery health, so a charger that runs cool is doing your phone a quiet favour. Look for USB-C PD support, foldable pins for travel, and a braided cable rated for the wattage you are buying.',
      'One good GaN charger can replace the pile of bricks in your bag — check the chargers category on Vendora and match the wattage to the biggest device you own.',
    ],
  },
  {
    id: 'safe-unboxing-guide',
    title: 'The Safe Unboxing Guide: Documenting Deliveries for Easier Disputes',
    excerpt:
      'A two-minute habit that makes any dispute dramatically easier: film the unboxing. Here is exactly what to capture, and why it helps our team resolve your case faster.',
    category: 'Buyer Guide',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Sep 22, 2026',
    readTime: '3 min read',
    image:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    body: [
      'For high-value items — phones, headphones, watches — start recording before you open the parcel. Capture the sealed package, the shipping label, and the moment the seal breaks, in one uncut clip where possible.',
      'Show the product from all sides as it comes out, including any accessories and paperwork in the box. If something is damaged or missing, the video timestamps the condition at delivery, which is exactly the evidence a dispute review needs.',
      'Only share your delivery code once you are satisfied the parcel is correct — the code confirms delivery, and disputes are simpler when the order state matches what actually happened.',
      'If you do need to file, attach the video and photos to the dispute from your order page. Clear evidence is the single biggest factor in how fast a case gets resolved.',
    ],
  },
  {
    id: 'how-rider-delivery-works',
    title: 'How Rider Delivery Works on Vendora, Step by Step',
    excerpt:
      'From the moment a seller hands over your parcel to the delivery code at your door — the journey your order takes, and where you can follow it.',
    category: 'Logistics',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Sep 15, 2026',
    readTime: '5 min read',
    image:
      'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&auto=format&fit=crop&q=80',
    body: [
      'When a seller marks your order ready, it enters the delivery queue. A rider is assigned to the order and picks the parcel up from the seller — you can watch the status change from your account as each step happens.',
      'While the parcel is moving, the order status in your account is the source of truth: dispatched means it has left the seller, and out for delivery means the rider is on the route with it.',
      'At your door, the rider may ask for the delivery code shown on your order. That code closes the loop — it tells the system the parcel reached you, which is why it should only be shared when the parcel is in your hands.',
      'Paying by Cash on Delivery? The rider collects payment at the same moment. Card orders are already paid, so the handover is just the code and the parcel.',
    ],
  },
];

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.id === slug);
}
