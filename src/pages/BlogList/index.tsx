import { Link, useParams, useSearchParams } from "react-router";
import PageTransition from "../../components/PageTransition";
import NotFound from "../NotFound";
import { getPostsByTag, getAllPosts } from "../../utils/posts";
import pages from "virtual:blog-pages";
import styles from "../../styles/common.module.scss";

const POSTS_PER_PAGE = 10;

export default function BlogList() {
  const { tag } = useParams<{ tag?: string }>();
  const [searchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  if (!pages.posts?.length) {
    return <NotFound />;
  }

  if (tag) {
    const posts = getPostsByTag(tag);
    return (
      <PageTransition>
        <div className={styles.pageContent}>
          <div
            className="slide-enter"
            style={{ "--enter-stage": 0, marginBottom: "2rem" } as React.CSSProperties}
          >
            <Link to="/" className={styles.navLink} style={{ fontSize: "0.85rem" }}>
              ← Home
            </Link>
          </div>
          <p
            className={`${styles.sectionHeading} slide-enter`}
            style={{ "--enter-stage": 1 } as React.CSSProperties}
          >
            Tag: {tag}
          </p>
          <ul className={styles.postList}>
            {posts.map((post, i) => (
              <li
                key={post.slug}
                className={`${styles.postListItem} slide-enter`}
                style={{ "--enter-stage": i + 2 } as React.CSSProperties}
              >
                {post.date && <time className={styles.postDate}>{post.date}</time>}
                <Link to={`/${post.slug}`} className={styles.postLink}>
                  {post.title}
                </Link>
                {post.series && <span className={styles.seriesTag}>{post.series}</span>}
              </li>
            ))}
          </ul>
          {posts.length === 0 && (
            <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>No posts found.</p>
          )}
        </div>
      </PageTransition>
    );
  }

  const allPosts = getAllPosts();
  const totalPages = Math.max(1, Math.ceil(allPosts.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const pagePosts = allPosts.slice(start, start + POSTS_PER_PAGE);

  const groups = new Map<string, typeof pagePosts>();
  for (const post of pagePosts) {
    const year = post.date ? post.date.slice(0, 4) : "—";
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(post);
  }
  const yearGroups = Array.from(groups.entries())
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => b.year.localeCompare(a.year));

  let counter = 0;
  const staged = yearGroups.map(({ year, posts }) => ({
    year,
    yearStage: ++counter,
    items: posts.map((post) => ({ post, stage: ++counter })),
  }));

  return (
    <PageTransition>
      <div className={styles.pageContent}>
        <div
          className="slide-enter"
          style={{ "--enter-stage": 0, marginBottom: "2rem" } as React.CSSProperties}
        >
          <Link to="/" className={styles.navLink} style={{ fontSize: "0.85rem" }}>
            ← Home
          </Link>
        </div>
        {staged.map(({ year, yearStage, items }) => (
          <div key={year} className={styles.yearGroup}>
            <div
              className={`${styles.yearHeading} slide-enter`}
              style={{ "--enter-stage": yearStage } as React.CSSProperties}
            >
              {year}
            </div>
            <ul className={styles.postList}>
              {items.map(({ post, stage }) => (
                <li
                  key={post.slug}
                  className={`${styles.postListItem} slide-enter`}
                  style={{ "--enter-stage": stage } as React.CSSProperties}
                >
                  {post.date && (
                    <time className={styles.postDate}>{post.date.slice(5)}</time>
                  )}
                  <Link to={`/${post.slug}`} className={styles.postLink}>
                    {post.title}
                  </Link>
                  {post.series && <span className={styles.seriesTag}>{post.series}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {totalPages > 1 && (
          <nav className={styles.pagination}>
            {currentPage > 1 ? (
              <Link
                to={currentPage === 2 ? "/posts" : `/posts?page=${currentPage - 1}`}
                className={styles.pageBtn}
              >
                ← 上一页
              </Link>
            ) : (
              <span className={styles.pageBtnDisabled}>← 上一页</span>
            )}
            <span className={styles.pageInfo}>
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link to={`/posts?page=${currentPage + 1}`} className={styles.pageBtn}>
                下一页 →
              </Link>
            ) : (
              <span className={styles.pageBtnDisabled}>下一页 →</span>
            )}
          </nav>
        )}
      </div>
    </PageTransition>
  );
}
