import { useParams, Link } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../../styles/markdown.scss";
import PageTransition from "../../components/PageTransition";
import CodeBlock from "../../components/CodeBlock";
import AISummary from "../../components/AISummary";
import { getPostBySlug, parseFrontmatter, getAdjacentPosts } from "../../utils/posts";
import styles from "./index.module.scss";
import common from "../../styles/common.module.scss";

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
  const { prev, next } = getAdjacentPosts(slug);

  return (
    <PageTransition>
      <div className={common.pageContent}>
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

              components={{ pre: CodeBlock }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>

        {(prev || next) && (
          <nav className={styles.postNav}>
            <div className={styles.postNavItem}>
              {prev && (
                <Link to={`/posts/${prev.slug}`} className={styles.postNavLink}>
                  <span className={styles.postNavLabel}>← 上一篇</span>
                  <span className={styles.postNavTitle}>{prev.title}</span>
                </Link>
              )}
            </div>
            <div className={`${styles.postNavItem} ${styles.postNavItemRight}`}>
              {next && (
                <Link to={`/posts/${next.slug}`} className={`${styles.postNavLink} ${styles.postNavLinkRight}`}>
                  <span className={styles.postNavLabel}>下一篇 →</span>
                  <span className={styles.postNavTitle}>{next.title}</span>
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </PageTransition>
  );
}
