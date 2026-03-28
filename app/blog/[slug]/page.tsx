import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPostSlugs, getPostBySlug } from '@/lib/blog';
import GlobalFooter from '@/app/components/GlobalFooter';

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(slug);
    return {
      title: `${post.title} \u2014 HabitQuest Blog`,
      description: post.description,
      openGraph: {
        title: post.title,
        description: post.description,
        url: `https://habitquest.dev/blog/${slug}`,
        siteName: 'HabitQuest',
        type: 'article',
        publishedTime: post.date,
        authors: [post.author],
        tags: post.tags,
      },
      twitter: { card: 'summary_large_image', title: post.title, description: post.description },
    };
  } catch {
    return { title: 'Post Not Found \u2014 HabitQuest Blog' };
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="pt-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-amber-400 hover:text-amber-300 transition-colors">
            \u2694\uFE0F HabitQuest
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/blog" className="text-gray-300 hover:text-white transition-colors">Blog</Link>
            <Link href="/signup" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors">
              Start Free \u2192
            </Link>
          </nav>
        </div>
      </header>

      <article className="pt-12 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-amber-400 hover:text-amber-300 text-sm mb-6 inline-block transition-colors">
            \u2190 All Posts
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-gray-400 mb-8 pb-8 border-b border-gray-700/50">
            <span>{formatDate(post.date)}</span>
            <span>\u00B7</span>
            <span>{post.author}</span>
          </div>

          <div
            className="prose prose-invert prose-lg max-w-none prose-headings:text-amber-400 prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-300 prose-p:leading-relaxed prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-li:text-gray-300 prose-blockquote:border-amber-500/50 prose-blockquote:text-gray-400 prose-code:text-amber-300 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          <div className="mt-16 p-8 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center">
            <h3 className="text-2xl font-bold text-amber-400 mb-2">Ready to make your habits epic?</h3>
            <p className="text-gray-400 mb-6">HabitQuest turns your daily tasks into RPG quests \u2014 with AI storytelling, character progression, and zero guilt.</p>
            <Link href="/signup" className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-8 py-3 rounded-lg transition-colors text-lg">
              Start Free \u2192
            </Link>
          </div>
        </div>
      </article>

      <GlobalFooter />
    </div>
  );
}
