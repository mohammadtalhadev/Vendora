import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export const CategorySlugRedirect: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (slug) {
      navigate(`/products?category=${encodeURIComponent(slug.toLowerCase())}`, { replace: true });
    } else {
      navigate('/products', { replace: true });
    }
  }, [slug, navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF7A1A] border-t-transparent mb-3" />
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading {slug || 'Category'}...</span>
    </div>
  );
};
