import { Link } from "react-router";
import { motion } from "motion/react";
import { Icon } from "@iconify/react";
import PageTransition from "../../components/PageTransition";
import Typewriter from "../../components/Typewriter";
import { getAllPosts } from "../../utils/posts";
import projectsData from "virtual:github-projects";
import siteConfig from "../../../site.config";
import styles from "../../styles/common.module.scss";

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 5);

  return (
    <PageTransition>
      <div className={styles.pageContent}>
        <div
          className={`${styles.homeIntro} slide-enter`}
          style={{ "--enter-stage": 1 } as React.CSSProperties}
        >
          <h1>{siteConfig.author}</h1>
          <p>
            <Typewriter text={siteConfig.bio} speed={60} delay={300} />
          </p>
        </div>

        <div style={{ marginTop: "3rem" }}>
          <p
            className={`${styles.sectionHeading} slide-enter`}
            style={{ "--enter-stage": 2 } as React.CSSProperties}
          >
            Recent Posts
          </p>
          <ul className={styles.postList}>
            {recentPosts.map((post, i) => (
              <motion.li
                key={post.slug}
                className={styles.postListItem}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                {post.date && <time className={styles.postDate}>{post.date}</time>}
                <Link to={`/posts/${post.slug}`} className={styles.postLink}>
                  {post.title}
                </Link>
              </motion.li>
            ))}
          </ul>
          {recentPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10px" }}
              transition={{ duration: 0.5, delay: recentPosts.length * 0.06 }}
              style={{ marginTop: "1.5rem" }}
            >
              <Link to="/posts" className={styles.navLink}>
                All posts →
              </Link>
            </motion.div>
          )}
        </div>

        <div style={{ marginTop: "3rem" }}>
          <p
            className={`${styles.sectionHeading} slide-enter`}
            style={{ "--enter-stage": 10 } as React.CSSProperties}
          >
            Projects
          </p>
          <ul className={styles.projectList}>
            {projectsData.map((project, i) => (
              <motion.li
                key={project.name}
                className={styles.projectItem}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <div className={styles.projectItemTop}>
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.projectLink}
                  >
                    {project.name}
                  </a>
                  {project.description && (
                    <span className={styles.projectDesc}>{project.description}</span>
                  )}
                  <span className={styles.projectStars}>★ {project.stars}</span>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        <div
          className="slide-enter"
          style={{ "--enter-stage": 11, marginTop: "3rem" } as React.CSSProperties}
        >
          <div className={styles.socialLinks}>
            <a
              href={`mailto:${siteConfig.email}`}
              className={styles.navLink}
              aria-label="Email"
            >
              <Icon icon="lucide:mail" width={16} height={16} />
            </a>
            <a
              href={siteConfig.bilibili}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navLink}
              aria-label="BiliBili"
            >
              <Icon icon="simple-icons:bilibili" width={16} height={16} />
            </a>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
