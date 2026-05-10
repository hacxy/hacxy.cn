import { Link } from "react-router";
import PageTransition from "../../components/PageTransition";
import NotFound from "../NotFound";
import { getAllTags } from "../../utils/posts";
import pages from "virtual:blog-pages";
import styles from "../../styles/common.module.scss";

export default function Tags() {
  if (!pages.tags?.length) {
    return <NotFound />;
  }
  const tags = getAllTags();

  return (
    <PageTransition>
      <div className={styles.pageContent}>
        <p
          className={`${styles.sectionHeading} slide-enter`}
          style={{ "--enter-stage": 1 } as React.CSSProperties}
        >
          Tags
        </p>
        <ul className={styles.tagsList}>
          {tags.map((item, i) => (
            <li
              key={item.tag}
              className="slide-enter"
              style={{ "--enter-stage": i + 2 } as React.CSSProperties}
            >
              <Link to={`/tags/${item.tag}`} className={styles.tagItemLink}>
                <span>{item.tag}</span>
                <span className={styles.tagCount}>{item.count}</span>
              </Link>
            </li>
          ))}
        </ul>
        {tags.length === 0 && (
          <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>No tags yet.</p>
        )}
      </div>
    </PageTransition>
  );
}
