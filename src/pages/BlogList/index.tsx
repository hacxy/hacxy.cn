import { Link, useParams } from "react-router";
import PageTransition from "../../components/PageTransition";
import NotFound from "../NotFound";
import { getPostsGroupedByYear, getPostsByTag } from "../../utils/posts";
import pages from "virtual:blog-pages";
import styles from "../../styles/common.module.scss";

export default function BlogList() {
  const { tag } = useParams<{ tag?: string }>();

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

  const groups = getPostsGroupedByYear();

  const groupsWithStages = groups.map(({ year, posts }) => {
    const items = posts.map((post) => ({ post }));
    return { year, items };
  });

  let counter = 0;
  const staged = groupsWithStages.map(({ year, items }) => ({
    year,
    yearStage: ++counter,
    items: items.map(({ post }) => ({ post, stage: ++counter })),
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
      </div>
    </PageTransition>
  );
}
