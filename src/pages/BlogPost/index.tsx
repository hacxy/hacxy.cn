import { useParams, Link } from "react-router";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Icon } from "@iconify/react";
import remarkIconify from "../../plugins/remark-iconify";
import classNames from "classnames";
import "../../styles/markdown.scss";
import PageTransition from "../../components/PageTransition";
import Sidebar from "../../components/Sidebar";
import TableOfContents from "../../components/TableOfContents";
import CodeBlock from "../../components/CodeBlock";
import AISummary from "../../components/AISummary";
import { getPostBySlug, parseFrontmatter } from "../../utils/posts";
import { extractHeadings } from "../../utils/headings";
import type { SidebarItemData } from "../../types/sidebar";
import styles from "./index.module.scss";
import common from "../../styles/common.module.scss";
import type { TocItem } from "../../utils/headings";
import blogConfig from "virtual:blog-config";

function MarkdownWithHeadings({ content, headings }: { content: string; headings: TocItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll("h2, h3, h4");
    els.forEach((el, i) => {
      if (headings[i]) el.id = headings[i].id;
    });
  }, [headings]);
  return (
    <div ref={ref}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkIconify]}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre: CodeBlock,
          iconify: (props: { icon?: string }) => <Icon icon={props.icon ?? ""} style={{ verticalAlign: "-0.125em" }} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
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
  const { "*": rawSlug } = useParams();
  const slug = rawSlug?.replace(/\/+$/, "");
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

  const post = slug ? getPostBySlug(slug) : undefined;

  if (!slug) return null;

  if (!post) {
    return (
      <PageTransition>
        <div className={common.pageContent}>
          <p style={{ opacity: 0.5 }}>Post not found.</p>
          <Link to="/" className={common.navLink} style={{ marginTop: "1rem", display: "inline-block" }}>
            ← Home
          </Link>
        </div>
      </PageTransition>
    );
  }

  const { content: rawBody, data } = parseFrontmatter(post.rawContent);
  const content = rawBody.replace(/^\s*#[^\n]*\n?/, "");
  const headings = extractHeadings(content);
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
          <TableOfContents headings={headings} onNavigate={closeDrawer} />
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
          <TableOfContents headings={headings} />
        </div>
        {mobileFab}
      </PageTransition>
    );
  }

  return (
    <>
      <div className={common.pageWithSidebar}>
        <Sidebar items={effectiveSidebar} currentPath={currentPath} />
        <div className={common.sidebarContent}>
          {renderContent()}
        </div>
        <TableOfContents headings={headings} />
      </div>
      {mobileFab}
    </>
  );

  function renderContent() {
    return (
      <>
        <article>
          <header
            className="slide-enter"
            style={{ "--enter-stage": 2, marginBottom: "2.5rem" } as React.CSSProperties}
          >
            {post!.series && (
              <Link to={`/posts?series=${encodeURIComponent(post!.series)}`} className={common.seriesTag}>
                {post!.series}
              </Link>
            )}
            {post!.date && (
              <time className={styles.postDate}>{post!.date}</time>
            )}
            <h1 className={styles.postTitle}>{post!.title}</h1>
            {tags.length > 0 && (
              <div className={styles.tagList}>
                {tags.map((tag) => (
                  <Link key={tag} to={`/posts?tag=${encodeURIComponent(tag)}`} className={common.tagChip}>
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
            <MarkdownWithHeadings content={content} headings={headings} />
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
