import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, ChevronRight, Clock } from 'lucide-react';
import { BLOG_ARTICLES, getBlogArticle } from '../data/blog-articles';

/**
 * The Journal article page (/blog/:slug). Articles live in
 * `src/data/blog-articles.ts` and describe how Vendora actually works; an
 * unknown slug gets an honest not-found state that routes back to the index
 * instead of inventing a post.
 */
export const BlogPostPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const article = getBlogArticle(slug);

  if (!article) {
    return (
      <div className="mx-auto flex min-h-[55vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-sun-orange">
          The Vendora Journal
        </span>
        <h1 className="mt-3 font-outfit text-3xl font-black text-slate-900 dark:text-white">
          Article not found
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          The article you are looking for does not exist or has been moved. Browse the
          journal for buying guides, seller guides and tech explainers.
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-sun-orange px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-sun-orange-600 active:scale-95 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the Journal
        </Link>
      </div>
    );
  }

  const related = BLOG_ARTICLES.filter(
    (a) => a.id !== article.id && a.category === article.category,
  )
    .concat(BLOG_ARTICLES.filter((a) => a.id !== article.id && a.category !== article.category))
    .slice(0, 3);

  return (
    <div className="pb-20 pt-4 sm:pt-6">
      <article className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          <Link to="/" className="transition-colors hover:text-sun-orange">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
          <Link to="/blog" className="transition-colors hover:text-sun-orange">
            The Vendora Journal
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900 dark:text-white">{article.category}</span>
        </nav>

        {/* Header */}
        <header className="mt-8 space-y-4">
          <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sun-orange dark:bg-orange-950/40">
            {article.category}
          </span>
          <h1 className="font-outfit text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {article.title}
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {article.excerpt}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-slate-200/70 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-sun-orange">
                VE
              </span>
              <span>
                <span className="block font-bold text-slate-900 dark:text-white">
                  {article.author}
                </span>
                <span className="block text-[10px]">{article.authorRole}</span>
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {article.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {article.readTime}
            </span>
          </div>
        </header>

        {/* Hero image */}
        <div className="mt-6 overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800">
          <img
            src={article.image}
            alt={article.title}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>

        {/* Body */}
        <div className="mt-8 space-y-5">
          {article.body.map((paragraph, i) => (
            <p
              key={i}
              className="text-[15px] leading-[1.85] text-slate-700 dark:text-slate-200"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-200/70 pt-6 dark:border-white/10">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-xs font-bold text-sun-orange hover:underline sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All articles
          </Link>
        </div>
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="mx-auto mt-14 w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <h2 className="font-outfit text-2xl font-black text-slate-900 dark:text-white">
            Keep reading
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
            {related.map((rel) => (
              <Link
                key={rel.id}
                to={`/blog/${rel.id}`}
                className="group overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/80"
              >
                <div className="aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={rel.image}
                    alt={rel.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="space-y-2 p-5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sun-orange">
                    {rel.category}
                  </span>
                  <h3 className="line-clamp-2 font-outfit text-base font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-sun-orange dark:text-white">
                    {rel.title}
                  </h3>
                  <span className="flex items-center gap-1 pt-1 text-xs font-bold text-sun-orange">
                    Read
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BlogPostPage;
