import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import {
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

interface ArticleItem {
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
}

const ARTICLES: ArticleItem[] = [
  {
    id: 'art-1',
    title: 'How Vendora Escrow Protects Online Buyers Across Pakistan',
    excerpt: 'Traditional cash on delivery often leaves buyers vulnerable to brick-in-a-box scams. Here is how escrow milestone release protects buyers and sellers on every order.',
    category: 'Escrow & Security',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Oct 10, 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    featured: true,
  },
  {
    id: 'art-2',
    title: 'Flagship Audio Shootout: Ronin R-9 vs. Sony WH-1000XM5 in Active Noise Cancelling',
    excerpt: 'We tested the flagship wireless earbuds and headphones across Karachi\'s bustling urban transit to measure real-world hybrid ANC decibel attenuation.',
    category: 'Tech Reviews',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Oct 08, 2026',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'art-3',
    title: 'From Local Workshop to Nationwide Brand: How StudioCraft Scaled with 0% Listing Fees',
    excerpt: 'An inside look at how Lahore-based minimalist ergonomic furniture maker StudioCraft leveraged Vendora\'s micro-fulfillment hubs to deliver nationwide within 48 hours.',
    category: 'Merchant Spotlight',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Oct 04, 2026',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'art-4',
    title: 'Why Fast GaN Chargers Are Replacing Bulky Power Bricks for Pakistani Remote Workers',
    excerpt: 'Gallium Nitride charging architecture explained: why 65W and 100W PD chargers keep laptops and smartphones cool while slashing recharge times in half.',
    category: 'Tech Guides',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Sep 29, 2026',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'art-5',
    title: 'The Ultimate Guide to Safe Unboxing: Documenting Deliveries for Instant Dispute Approvals',
    excerpt: 'Step-by-step instructions on unboxing high-value electronics with uninterrupted video proof to support fast escrow refund decisions.',
    category: 'Buyer Guide',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Sep 22, 2026',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'art-6',
    title: 'How Local Rider Networks Cut Delivery Times in Karachi',
    excerpt: 'Real-time rider tracking and local hub stock are cutting the multi-day courier wait down to hours.',
    category: 'Logistics',
    author: 'Vendora Editorial',
    authorRole: 'Vendora Team',
    date: 'Sep 15, 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&auto=format&fit=crop&q=80',
  },
];

const CATEGORIES = ['All', 'Escrow & Security', 'Tech Reviews', 'Merchant Spotlight', 'Tech Guides', 'Buyer Guide', 'Logistics'];

export const BlogPage: React.FC = () => {
  useReveal();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredArticles = selectedCategory === 'All'
    ? ARTICLES
    : ARTICLES.filter((a) => a.category === selectedCategory);

  const featured = ARTICLES.find((a) => a.featured) || ARTICLES[0];

  return (
    <div className="relative min-h-screen font-sans selection:bg-sun-orange/20 selection:text-sun-orange pb-24">
      {/* Radiant ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-36 -left-28 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-sun-orange-200/60 via-sun-orange-100/65 to-sun-orange-200/35 blur-[130px] dark:from-sun-orange/10 pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-aqua-100/70 via-[#F1F5F9]/80 to-sun-orange-100/50 blur-[140px] dark:from-aqua/10 pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-sun-orange-100/70 via-aqua-100/50 to-[#F1F5F9] blur-[130px] dark:from-sun-orange/5 pointer-events-none" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 space-y-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-sun-orange transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">The Vendora Journal</span>
        </nav>

        {/* Header */}
        <div className="reveal max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 dark:border-orange-900/40 dark:bg-orange-950/30 px-3.5 py-1 text-xs font-bold text-sun-orange">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>The Vendora Journal &amp; Editorial</span>
          </div>

          <h1 className="font-outfit text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Insights on Modern Commerce, Escrow &amp; Technology
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Expert buying guides, deep-dives into multi-vendor logistics, verified merchant stories, and consumer escrow protection standards.
          </p>
        </div>

        {/* Featured Editorial Post */}
        <div className="reveal rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-7 relative h-72 lg:h-auto overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={featured.image}
              alt={featured.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-4 left-4 rounded-full bg-sun-orange text-white px-3 py-1 text-xs font-black tracking-wider uppercase shadow-md">
              Featured Story
            </div>
          </div>

          <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="font-bold text-aqua">{featured.category}</span>
                <span>•</span>
                <span>{featured.readTime}</span>
                <span>•</span>
                <span>{featured.date}</span>
              </div>

              <h2 className="font-outfit text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {featured.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {featured.excerpt}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 text-sun-orange flex items-center justify-center font-bold text-xs">
                  VE
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{featured.author}</div>
                  <div className="text-[10px] text-slate-400">{featured.authorRole}</div>
                </div>
              </div>

              <span className="text-xs font-bold text-sun-orange flex items-center gap-1">
                <span>Read Article</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={selectedCategory === cat}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-sun-orange text-white shadow-sm'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="reveal grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map((art) => (
            <article
              key={art.id}
              className="group rounded-3xl border border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-sm hover:shadow-xl hover:border-sun-orange/40 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-16/9 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/20">
                    {art.category}
                  </span>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    <span>{art.date}</span>
                    <span>•</span>
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    <span>{art.readTime}</span>
                  </div>

                  <h3 className="font-outfit text-base font-extrabold text-slate-900 dark:text-white group-hover:text-sun-orange transition-colors leading-snug line-clamp-2">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {art.excerpt}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  By {art.author}
                </span>
                <span className="font-bold text-sun-orange flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Read</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
