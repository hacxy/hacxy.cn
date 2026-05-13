import { Link, useSearchParams } from "react-router";
import PageTransition from "../../components/PageTransition";
import { getAllPosts, getAllTags, getAllSeries } from "../../utils/posts";
import styles from "../../styles/common.module.scss";

const POSTS_PER_PAGE = 10;

export default function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get("tag") ?? null;
  const activeSeries = searchParams.get("series") ?? null;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const allTags = getAllTags();
  const allSeries = getAllSeries();

  let filtered = getAllPosts();
  if (activeTag) filtered = filtered.filter((p) => p.tags.includes(activeTag));
  if (activeSeries) filtered = filtered.filter((p) => p.series === activeSeries);

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagePosts = filtered.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  const yearGroups: { year: string; posts: typeof pagePosts }[] = [];
  for (const post of pagePosts) {
    const year = post.date ? post.date.slice(0, 4) : "—";
    const group = yearGroups.find((g) => g.year === year);
    if (group) group.posts.push(post);
    else yearGroups.push({ year, posts: [post] });
  }

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  function buildPageLink(p: number): string {
    const next = new URLSearchParams(searchParams);
    if (p <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(p));
    }
    return `/posts?${next.toString()}`;
  }

  let counter = 0;

  return (
    <PageTransition>
      <div className={styles.pageContent}>
        <div
          className="slide-enter"
          style={{ "--enter-stage": 0, marginBottom: "1.5rem" } as React.CSSProperties}
        >
          <Link to="/" className={styles.navLink} style={{ fontSize: "0.85rem" }}>
            ← Home
          </Link>
        </div>

        {/* Filter chips */}
        {(allTags.length > 0 || allSeries.length > 0) && (
          <div
            className="slide-enter"
            style={{ "--enter-stage": 1, marginBottom: "2rem" } as React.CSSProperties}
          >
            {allSeries.length > 0 && (
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Series</span>
                <div className={styles.filterChips}>
                  {allSeries.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.filterChip} ${activeSeries === s ? styles.filterChipActive : ""}`}
                      onClick={() => setFilter("series", activeSeries === s ? null : s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {allTags.length > 0 && (
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Tags</span>
                <div className={styles.filterChips}>
                  {allTags.map(({ tag, count }) => (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.filterChip} ${activeTag === tag ? styles.filterChipActive : ""}`}
                      onClick={() => setFilter("tag", activeTag === tag ? null : tag)}
                    >
                      {tag}
                      <span className={styles.filterCount}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(activeTag || activeSeries) && (
              <button
                type="button"
                className={styles.filterClear}
                onClick={() => setSearchParams({})}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Post list by year */}
        <div className={styles.postListScroll}>
        {yearGroups.map(({ year, posts }) => {
          const yearStage = ++counter + 1;
          return (
            <div key={year} className={styles.yearGroup}>
              <div
                className={`${styles.yearHeading} slide-enter`}
                style={{ "--enter-stage": yearStage } as React.CSSProperties}
              >
                {year}
              </div>
              <ul className={styles.postList}>
                {posts.map((post) => {
                  const stage = ++counter + 1;
                  return (
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
                  );
                })}
              </ul>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>No posts found.</p>
        )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className={styles.pagination}>
            {currentPage > 1 ? (
              <Link to={buildPageLink(currentPage - 1)} className={styles.pageBtn}>
                ← 上一页
              </Link>
            ) : (
              <span className={styles.pageBtnDisabled}>← 上一页</span>
            )}
            <span className={styles.pageInfo}>
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link to={buildPageLink(currentPage + 1)} className={styles.pageBtn}>
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
