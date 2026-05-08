import { useParams, Link } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import "../../styles/markdown.scss";
import PageTransition from "../../components/PageTransition";
import CodeBlock from "../../components/CodeBlock";
import { getPostBySlug, parseFrontmatter } from "../../utils/posts";
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

          <div
            className="markdown-body slide-enter"
            style={{ "--enter-stage": 3 } as React.CSSProperties}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{ pre: CodeBlock }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </PageTransition>
  );
}
