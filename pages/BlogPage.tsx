import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBlogBySlug, type Blog } from '../lib/api';
import { Calendar, User, ArrowLeft } from 'lucide-react';

export default function BlogPage() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!slug) return;

      try {
        const response = await getBlogBySlug(slug);
        setBlog(response.blog);
      } catch (err) {
        setError('Failed to load blog post');
        console.error('Error loading blog:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-yt-bg text-yt-text">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link to="/blogs" className="inline-flex items-center gap-2 text-yt-textSec hover:text-yt-text mb-6">
            <ArrowLeft size={20} />
            Back to Blog
          </Link>
          <div className="bg-yt-bgSec rounded-lg p-8 animate-pulse">
            <div className="h-8 bg-yt-bg/50 rounded mb-4"></div>
            <div className="h-6 bg-yt-bg/50 rounded mb-6 w-1/2"></div>
            <div className="space-y-3">
              <div className="h-4 bg-yt-bg/50 rounded"></div>
              <div className="h-4 bg-yt-bg/50 rounded"></div>
              <div className="h-4 bg-yt-bg/50 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-yt-bg text-yt-text">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link to="/blogs" className="inline-flex items-center gap-2 text-yt-textSec hover:text-yt-text mb-6">
            <ArrowLeft size={20} />
            Back to Blog
          </Link>
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-6">
            <p className="text-red-400">{error || 'Blog post not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yt-bg text-yt-text">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/blogs" className="inline-flex items-center gap-2 text-yt-textSec hover:text-yt-text mb-6">
          <ArrowLeft size={20} />
          Back to Blog
        </Link>

        <article className="bg-yt-bgSec rounded-lg p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-4">{blog.title}</h1>
            <div className="flex items-center gap-4 text-sm text-yt-textSec">
              <div className="flex items-center gap-1">
                <User size={16} />
                <span>{blog.author_name || 'Anonymous'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </header>

          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        </article>
      </div>
    </div>
  );
}
