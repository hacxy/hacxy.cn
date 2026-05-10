import { useParams, Link } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../../styles/markdown.scss";
import PageTransition from "../../components/PageTransition";
import Sidebar from "../../components/Sidebar";
import TableOfContents from "../../components/TableOfContents";
import CodeBlock from "../../components/CodeBlock";
import AISummary from "../../components/AISummary";
import type { ReactNode } from "react";
import { getPostBySlug, parseFrontmatter } from "../../utils/posts";
import blogConfig from "virtual:blog-config";

function textToId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-");
}

function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children.props as { children?: ReactNode }).children);
  }
  return "";
}

function Heading({ level, children }: { level: number; children?: ReactNode }) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const id = textToId(extractText(children));
  return <Tag id={id}>{children}</Tag>;
}
import styles from "./index.module.scss";
import common from "../../styles/common.module.scss";

interface SidebarItemData {
  text: string;
  link?: string;
  items?: SidebarItemData[];
}

function flattenSidebarLinks(items: SidebarItemData[]): string[] {
  const links: string[] = [];
  for (const item of items) {
    if (item.link) links.push(item.link);
    if (item.items) links.push(...flattenSidebarLinks(item.items));
  }
  return links;
}

function getSidebarAdjacentPosts(slug: string) {
  const sidebar = blogConfig.sidebar;
  if (!sidebar || sidebar.length === 0) return { prev: null, next: null };

  const links = flattenSidebarLinks(sidebar);
  const currentLink = `/${slug}`;
  const idx = links.indexOf(currentLink);
  if (idx === -1) return { prev: null, next: null };

  const prevLink = links[idx - 1] ?? null;
  const nextLink = links[idx + 1] ?? null;

  const prevSlug = prevLink?.replace(/^\//, "");
  const nextSlug = nextLink?.replace(/^\//, "");

  return {
    prev: prevSlug ? getPostBySlug(prevSlug) ?? null : null,
    next: nextSlug ? getPostBySlug(nextSlug) ?? null : null,
  };
}

export default function BlogPost() {
  const { "*": slug } = useParams();

  if (!slug) return null;

  const post = getPostBySlug(slug);

  if (!post) {
    return (
      <PageTransition>
        <div className={common.pageContent}>
          <p style={{ opacity: 0.5 }}>Post not found.</p>
          <Link
            to="/posts"
            className={common.navLink}
            style={{ marginTop: "1rem", display: "inline-block" }}
          >
            ← All posts
          </Link>
        </div>
      </PageTransition>
    );
  }

  const { content: rawBody, data } = parseFrontmatter(post.rawContent);
  const content = rawBody.replace(/^\s*#[^\n]*\n?/, "");
  const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const summary = typeof data.summary === "string" ? data.summary : "";
  const currentPath = `/${slug}`;
  const sidebarLinks = blogConfig.sidebar ? flattenSidebarLinks(blogConfig.sidebar) : [];
  const inSidebar = sidebarLinks.includes(currentPath);
  const hasSidebar = inSidebar && sidebarLinks.length > 0;
  const { prev, next } = getSidebarAdjacentPosts(slug);

  if (!hasSidebar) {
    return (
      <PageTransition>
        <div className={common.pageWithSidebar}>
          <div className={common.sidebarContent}>
            {renderContent()}
          </div>
          <TableOfContents content={content} />
        </div>
      </PageTransition>
    );
  }

  return (
    <div className={common.pageWithSidebar}>
      <Sidebar currentPath={currentPath} />
      <PageTransition key={slug}>
        <div className={common.sidebarContent}>
          {renderContent()}
        </div>
      </PageTransition>
      <TableOfContents content={content} />
    </div>
  );

  function renderContent() {
    return (
      <>
        <div
          className="slide-enter"
          style={{ "--enter-stage": 1 } as React.CSSProperties}
        >
          <Link
            to="/posts"
            className={common.navLink}
            style={{ fontSize: "0.85rem", marginBottom: "2.5rem", display: "inline-block" }}
          >
            ← Blog
          </Link>
        </div>

        <article>
          <header
            className="slide-enter"
            style={{ "--enter-stage": 2, marginBottom: "2.5rem" } as React.CSSProperties}
          >
            {post.date && (
              <time className={styles.postDate}>{post.date}</time>
            )}
            <h1 className={styles.postTitle}>{post.title}</h1>
            {tags.length > 0 && (
              <div className={styles.tagList}>
                {tags.map((tag) => (
                  <Link key={tag} to={`/tags/${tag}`} className={common.tagChip}>
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </header>

          <hr className={styles.divider} />

          {summary && (
            <div
              className="slide-enter"
              style={{ "--enter-stage": 3 } as React.CSSProperties}
            >
              <AISummary text={summary} />
            </div>
          )}

          <div
            className="markdown-body slide-enter"
            style={{ "--enter-stage": summary ? 4 : 3 } as React.CSSProperties}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre: CodeBlock,
                h2: ({ children }) => <Heading level={2}>{children}</Heading>,
                h3: ({ children }) => <Heading level={3}>{children}</Heading>,
                h4: ({ children }) => <Heading level={4}>{children}</Heading>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>

        {(prev || next) && (
          <nav className={styles.postNav}>
            <div className={styles.postNavItem}>
              {prev && (
                <Link to={`/${prev.slug}`} className={styles.postNavLink}>
                  <span className={styles.postNavLabel}>← 上一篇</span>
                  <span className={styles.postNavTitle}>{prev.title}</span>
                </Link>
              )}
            </div>
            <div className={`${styles.postNavItem} ${styles.postNavItemRight}`}>
              {next && (
                <Link to={`/${next.slug}`} className={`${styles.postNavLink} ${styles.postNavLinkRight}`}>
                  <span className={styles.postNavLabel}>下一篇 →</span>
                  <span className={styles.postNavTitle}>{next.title}</span>
                </Link>
              )}
            </div>
          </nav>
        )}
      </>
    );
  }
}
