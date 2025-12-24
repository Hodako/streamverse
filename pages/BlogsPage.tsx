import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBlogs, type Blog } from '../lib/api';
import { Calendar, User, Search } from 'lucide-react';

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await listBlogs();
        const mapped = (response.blogs || []).map((b: any) => {
          // Ensure dates are ISO strings
          const createdAt = b.createdAt || b.created_at;
          const updatedAt = b.updatedAt || b.updated_at;
          
          return {
            ...b,
            createdAt: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
            updatedAt: typeof updatedAt === 'string' ? updatedAt : new Date(updatedAt).toISOString(),
          };
        });
        setBlogs(mapped);
        setFilteredBlogs(mapped);
      } catch (err) {
        setError('Failed to load blogs');
        console.error('Error loading blogs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = blogs.filter((blog) => {
      const title = blog.title?.toLowerCase() || '';
      const content = (blog.content || '').toLowerCase();
      const author = (blog.author_name || '').toLowerCase();
      return title.includes(query) || content.includes(query) || author.includes(query);
    });
    setFilteredBlogs(filtered);
  }, [searchQuery, blogs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-yt-bg text-yt-text">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-8">Blog</h1>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-yt-bgSec rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-yt-bg/50 rounded mb-3 w-3/4"></div>
                <div className="h-4 bg-yt-bg/50 rounded mb-3 w-full"></div>
                <div className="h-4 bg-yt-bg/50 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-yt-bg text-yt-text">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-8">Blog</h1>
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-6">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yt-bg text-yt-text">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Blog</h1>
            <div className="w-72 relative">
              <Search className="absolute left-3 top-3 text-yt-textSec" size={18} />
              <input
                type="text"
                placeholder="Search blog posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-yt-bgSec text-yt-text rounded-lg border border-yt-textSec/20 focus:outline-none focus:border-yt-textSec/50 transition"
              />
            </div>
          </div>

          {filteredBlogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-yt-textSec text-lg">
                {blogs.length === 0 ? 'No blog posts yet' : 'No blog posts found matching your search'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Featured */}
              <div className="md:col-span-2">
                {filteredBlogs[0] && (
                  <Link to={`/blog/${filteredBlogs[0].slug}`} className="block bg-yt-bgSec rounded-lg p-6 hover:shadow-lg transition">
                    <h2 className="text-3xl font-bold mb-3">{filteredBlogs[0].title}</h2>
                    <div className="flex items-center gap-4 text-sm text-yt-textSec mb-4">
                      {filteredBlogs[0].author_name && (
                        <div className="flex items-center gap-1">
                          <User size={16} />
                          <span>{filteredBlogs[0].author_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>{new Date(filteredBlogs[0].createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="text-yt-textSec max-w-full" dangerouslySetInnerHTML={{ __html: String(filteredBlogs[0].content).slice(0, 800) }} />
                  </Link>
                )}
                {/* Other posts list */}
                <div className="mt-6 space-y-4">
                  {filteredBlogs.slice(1).map((blog) => (
                    <Link key={blog.id} to={`/blog/${blog.slug}`} className="block bg-yt-bgSec rounded-lg p-4 hover:bg-yt-bgSec/80 transition">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{blog.title}</h3>
                          <div className="text-yt-textSec text-sm line-clamp-2">{String(blog.content).replace(/<[^>]*>/g, '').slice(0, 220)}</div>
                        </div>
                        <div className="text-right text-yt-textSec text-sm whitespace-nowrap">
                          <div>{blog.author_name || 'Anonymous'}</div>
                          <div>{new Date(blog.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Sidebar / Recent list */}
              <aside className="hidden md:block">
                <div className="bg-yt-bgSec rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Recent Posts</h4>
                  <div className="space-y-2">
                    {filteredBlogs.slice(0, 6).map((b) => (
                      <Link key={b.id} to={`/blog/${b.slug}`} className="block text-yt-textSec hover:text-yt-text">
                        <div className="text-sm">{b.title}</div>
                        <div className="text-yt-textSec text-xs">{new Date(b.createdAt).toLocaleDateString()}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
