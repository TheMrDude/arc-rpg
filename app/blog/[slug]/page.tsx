import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPostSlugs, getPostBySlug, getAllPosts } from '@/lib/blog';
import GlobalFooter from '@/app/components/GlobalFooter';
import EmailCapture from '@/app/components/EmailCapture';

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(slug);
    return {
      title: `${post.title} | HabitQuest Blog`,
      description: post.description,
      alternates: { canonical: `/blog/${slug}` },
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
    return { title: 'Post Not Found | HabitQuest Blog' };
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: "Dan", url: "https://habitquest.dev" },
    publisher: { "@type": "Organization", name: "HabitQuest", url: "https://habitquest.dev" },
    description: post.description || post.title,
    mainEntityOfPage: `https://habitquest.dev/blog/${slug}`,
  };

  return (
    <div className="kidquest min-h-screen bg-cream text-navy">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="pt-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl kq-display font-bold text-hero-blue hover:text-navy transition-colors">
            ⚔️ HabitQuest
          </Link>
          <nav className="flex gap-4 items-center text-sm">
            <Link href="/blog" className="text-navy/70 hover:text-navy transition-colors">Blog</Link>
            <Link href="/signup" className="kq-btn kq-btn-gold">
              Start Free →
            </Link>
          </nav>
        </div>
      </header>

      <article className="pt-12 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-hero-blue hover:text-navy text-sm mb-6 inline-block transition-colors">
            ← All Posts
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag: string) => (
              <span key={tag} className="kq-chip text-xs px-2 py-1 bg-gold/15 text-navy border border-gold/30">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="kq-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-navy">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-navy/60 mb-8 pb-8 border-b border-stone">
            <span>{formatDate(post.date)}</span>
            <span>·</span>
            <span>{post.author}</span>
          </div>

          <div
            className="prose prose-lg max-w-none prose-headings:text-navy prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-navy/80 prose-p:leading-relaxed prose-a:text-hero-blue prose-a:no-underline hover:prose-a:underline prose-strong:text-navy prose-li:text-navy/80 prose-blockquote:border-coral/50 prose-blockquote:text-navy/60 prose-code:text-coral prose-code:bg-coral/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-img:rounded-candy"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          <div className="mt-12 mb-12">
            <EmailCapture
              source={`blog-${slug}`}
              title="Join the Quest"
              description="Get weekly habit science, productivity tactics, and exclusive HabitQuest updates. Level up your life. No spam, ever."
              buttonText="Join Now"
            />
          </div>

          {/* Related Posts */}
          {(() => {
            const allPosts = getAllPosts();
            const currentTags = new Set(post.tags.map((t: string) => t.toLowerCase()));
            const otherPosts = allPosts.filter((p: { slug: string }) => p.slug !== slug);
            const scored = otherPosts.map((p: { tags: string[]; slug: string; title: string; description: string }) => ({
              ...p,
              score: p.tags.filter((t: string) => currentTags.has(t.toLowerCase())).length,
            }));
            scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
            const related = scored.slice(0, 3);
            return related.length > 0 ? (
              <div className="mt-16 mb-12">
                <h3 className="kq-display text-2xl font-bold text-navy mb-6">Related Posts</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map((rp: { slug: string; title: string; description: string }) => (
                    <Link
                      key={rp.slug}
                      href={`/blog/${rp.slug}`}
                      className="kq-card kq-card-hover group block p-5"
                    >
                      <h4 className="text-base font-bold text-navy group-hover:text-hero-blue transition-colors mb-2 leading-snug">
                        {rp.title}
                      </h4>
                      <p className="text-sm text-navy/60 leading-relaxed line-clamp-2">{rp.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          <div className="mt-16 p-8 rounded-candy bg-gradient-to-r from-gold/15 to-coral/15 border-2 border-gold/30 text-center">
            <h3 className="kq-display text-2xl font-bold text-navy mb-2">Ready to make your habits epic?</h3>
            <p className="text-navy/70 mb-6">HabitQuest turns your daily tasks into fun quests, with AI storytelling, character progression, and zero guilt.</p>
            <Link href="/signup" className="kq-btn kq-btn-gold text-lg">
              Start Free →
            </Link>
          </div>
        </div>
      </article>

      <GlobalFooter />
    </div>
  );
}
