import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';

const postsDirectory = path.join(process.cwd(), 'content/blog');

// Fallback publish date for posts whose frontmatter omits `date`.
// (New SEO cornerstone posts ship without a date; keep this stable so
// JSON-LD datePublished / sitemap lastModified don't drift on rebuilds.)
const DEFAULT_DATE = '2026-07-24';

// Normalize frontmatter across both schemas the repo uses:
//  - legacy posts:  title, date, author, tags, description
//  - SEO posts:     title, meta_description, target_keyword,
//                   secondary_keywords, cluster, internal_links
function normalizeMeta(data, slug) {
  const description = data.meta_description || data.description || '';
  const tags = data.tags || data.secondary_keywords || [];
  const date = data.date
    ? new Date(data.date).toISOString()
    : new Date(DEFAULT_DATE).toISOString();
  const dateModified = (data.dateModified || data.updated)
    ? new Date(data.dateModified || data.updated).toISOString()
    : date;

  const keywords = [
    ...(data.target_keyword ? [data.target_keyword] : []),
    ...(Array.isArray(data.secondary_keywords) ? data.secondary_keywords : []),
    ...(Array.isArray(data.tags) ? data.tags : []),
  ];

  return {
    slug,
    title: data.title || slug,
    date,
    dateModified,
    description,
    tags,
    keywords,
    author: data.author || 'HabitQuest Team',
    image: data.image || null,
    cluster: data.cluster || null,
  };
}

export function getAllPostSlugs() {
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''));
}

export function getAllPosts() {
  const slugs = getAllPostSlugs();
  const posts = slugs
    .map((slug) => {
      const fullPath = path.join(postsDirectory, `${slug}.md`);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      return normalizeMeta(data, slug);
    })
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  return posts;
}

export async function getPostBySlug(slug) {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  // The template renders the frontmatter title as the page's single <h1>.
  // Strip a duplicate leading H1 from the body so the document has exactly
  // one H1 and the body's own sections start at H2 (no skipped levels).
  // Only a real H1 is removed; "##"/"###" are untouched. The \s+ and (\r?\n|$)
  // also cover "#\tTitle" and a post whose H1 has no trailing newline.
  const body = content.replace(/^\s*#\s+.*(\r?\n|$)/, '');

  // remark-gfm parses tables (and other GitHub-flavored markdown) that the
  // posts rely on; remark-html then serializes those nodes to HTML.
  const processedContent = await remark().use(gfm).use(html).process(body);
  const contentHtml = processedContent.toString();

  return {
    ...normalizeMeta(data, slug),
    contentHtml,
  };
}
