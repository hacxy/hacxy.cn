import { useParams, Link } from "react-router";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";import remarkGfm from "remark-gfm";
import { Icon } from "@iconify/react";
import classNames from "classnames";
import "../../styles/markdown.scss";
import PageTransition from "../../components/PageTransition";
import Sidebar from "../../components/Sidebar";
import TableOfContents from "../../components/TableOfContents";
import CodeBlock from "../../components/CodeBlock";
import AISummary from "../../components/AISummary";
import type { ReactNode, ElementType } from "react";
import { getPostBySlug, parseFrontmatter } from "../../utils/posts";
import { textToId } from "../../utils/slugify";
import type { SidebarItemData } from "../../types/sidebar";
import styles from "./index.module.scss";
import common from "../../styles/common.module.scss";
import blogConfig from "virtual:blog-config";

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
  const Tag = `h${level}` as ElementType;
  const id = textToId(extractText(children));
  return <Tag id={id}>{children}</Tag>;
}

function flattenSidebarLinks(items: SidebarItemData[]): string[] {
  const links: string[] = [];
  for (const item of items) {
    if (item.link) links.push(item.link);
    if (item.items) links.push(...flattenSidebarLinks(item.items));
  }
  return links;
}

function findIsolatedScope(items: SidebarItemData[], currentPath: string): SidebarItemData[] | null {
  for (const item of items) {
    if (!item.items) continue;
    if (item.isolated) {
      const links = flattenSidebarLinks(item.items);
      if (links.includes(currentPath)) return [item];
    }
    const nested = findIsolatedScope(item.items, currentPath);
    if (nested) return nested;
  }
  return null;
}

function getEffectiveSidebar(currentPath: string): SidebarItemData[] {
  const sidebar = blogConfig.sidebar;
  if (!sidebar || sidebar.length === 0) return [];
  return findIsolatedScope(sidebar, currentPath) ?? sidebar;
}

function getSidebarAdjacentPosts(slug: string) {
  const sidebar = getEffectiveSidebar(`/${slug}`);
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
  const [drawerState, setDrawerState] = useState<{ slug: string | undefined; open: "sidebar" | "toc" | null }>({ slug, open: null });

  const openDrawer = drawerState.slug === slug ? drawerState.open : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (openDrawer) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [openDrawer]);

  if (!slug) return null;

  const post = getPostBySlug(slug);

  if (!post) {
    return (
      <PageTransition>
        <div className={common.pageContent}>
          <p style={{ opacity: 0.5 }}>Post not found.</p>
          <Link to="/posts" className={common.navLink} style={{ marginTop: "1rem", display: "inline-block" }}>
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
  const effectiveSidebar = getEffectiveSidebar(currentPath);
  const sidebarLinks = flattenSidebarLinks(effectiveSidebar);
  const inSidebar = sidebarLinks.includes(currentPath);
  const hasSidebar = inSidebar && sidebarLinks.length > 0;
  const { prev, next } = getSidebarAdjacentPosts(slug);

  function closeDrawer() {
    setDrawerState({ slug, open: null });
  }

  const mobileFab = (
    <>
      {openDrawer && <div className={styles.drawerOverlay} onClick={closeDrawer} />}

      {/* 侧边栏抽屉（左侧） */}
      {hasSidebar && (
        <div className={classNames(styles.mobileDrawer, styles.mobileDrawerLeft, { [styles.mobileDrawerOpen]: openDrawer === "sidebar" })}>
          <div className={styles.mobileDrawerHeader}>
            <span className={styles.mobileDrawerTitle}>章节</span>
            <button className={styles.mobileDrawerClose} onClick={closeDrawer} aria-label="关闭">
              <Icon icon="lucide:x" width={18} height={18} />
            </button>
          </div>
          <div className={styles.mobileDrawerBody}>
            <Sidebar items={effectiveSidebar} currentPath={currentPath} onNavigate={closeDrawer} />
          </div>
        </div>
      )}

      {/* 目录抽屉（右侧） */}
      <div className={classNames(styles.mobileDrawer, styles.mobileDrawerRight, { [styles.mobileDrawerOpen]: openDrawer === "toc" })}>
        <div className={styles.mobileDrawerHeader}>
          <span className={styles.mobileDrawerTitle}>目录</span>
          <button className={styles.mobileDrawerClose} onClick={closeDrawer} aria-label="关闭">
            <Icon icon="lucide:x" width={18} height={18} />
          </button>
        </div>
        <div className={styles.mobileDrawerBody}>
          <TableOfContents content={content} onNavigate={closeDrawer} />
        </div>
      </div>

      {/* 固定按钮栏 */}
      <div className={styles.mobileFab}>
        {hasSidebar && (
          <button
            className={classNames(styles.mobileFabBtn, { [styles.mobileFabBtnActive]: openDrawer === "sidebar" })}
            onClick={() => setDrawerState((v) => ({ slug, open: v.open === "sidebar" ? null : "sidebar" }))}
            aria-label="章节导航"
          >
            <Icon icon="lucide:layout-list" width={17} height={17} />
          </button>
        )}
        <button
          className={classNames(styles.mobileFabBtn, { [styles.mobileFabBtnActive]: openDrawer === "toc" })}
          onClick={() => setDrawerState((v) => ({ slug, open: v.open === "toc" ? null : "toc" }))}
          aria-label="目录"
        >
          <Icon icon="lucide:list" width={17} height={17} />
        </button>
      </div>
    </>
  );

  if (!hasSidebar) {
    return (
      <PageTransition>
        <div className={common.pageWithSidebar}>
          <div className={common.sidebarContent}>
            {renderContent()}
          </div>
          <TableOfContents content={content} />
        </div>
        {mobileFab}
      </PageTransition>
    );
  }

  return (
    <>
      <div className={common.pageWithSidebar}>
        <Sidebar items={effectiveSidebar} currentPath={currentPath} />
        <PageTransition key={slug}>
          <div className={common.sidebarContent}>
            {renderContent()}
          </div>
        </PageTransition>
        <TableOfContents content={content} />
      </div>
      {mobileFab}
    </>
  );

  function renderContent() {
    return (
      <>
        <div
          className="slide-enter"
          style={{ "--enter-stage": 1, marginBottom: "2.5rem" } as React.CSSProperties}
        >
          <Link to="/posts" className={common.navLink} style={{ fontSize: "0.85rem" }}>
            ← Blog
          </Link>
        </div>

        <article>
          <header
            className="slide-enter"
            style={{ "--enter-stage": 2, marginBottom: "2.5rem" } as React.CSSProperties}
          >
            {post!.date && (
              <time className={styles.postDate}>{post!.date}</time>
            )}
            <h1 className={styles.postTitle}>{post!.title}</h1>
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
            <div className="slide-enter" style={{ "--enter-stage": 3 } as React.CSSProperties}>
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
