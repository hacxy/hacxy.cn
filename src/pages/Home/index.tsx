import type React from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Icon } from "@iconify/react";
import PageTransition from "../../components/PageTransition";
import Typewriter from "../../components/Typewriter";
import NotFound from "../NotFound";
import { getAllPosts } from "../../utils/posts";
import { preloadSkills } from "../../utils/skills";
import { SOCIAL_META, getLinkHref, type SocialLink } from "../../utils/social";
import projectsData from "virtual:github-projects";
import blogConfig from "virtual:blog-config";
import pages from "virtual:blog-pages";
import styles from "../../styles/common.module.scss";

function Row({ index, children, style }: { index: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

preloadSkills();

export default function Home() {
  const homeData = pages.home?.[0];
  if (!homeData) {
    return <NotFound />;
  }

  const name = (homeData.name as string | undefined) ?? blogConfig.author;
  const bio = (homeData.bio as string | undefined) ?? blogConfig.bio ?? '';
  const contact = (homeData.contact as SocialLink[] | undefined) ?? [];

  const recentPosts = getAllPosts();

  const postsStart = 2;
  const projectsHeadingRow = postsStart + recentPosts.length;
  const projectsStart = projectsHeadingRow + 1;
  const socialRow = projectsStart + projectsData.length;

  return (
    <PageTransition>
      <div className={styles.pageContent}>
        <Row index={0} style={{ marginBottom: "3rem" }}>
          <div className={styles.homeIntro}>
            <h1>{name}</h1>
            <p>
              <Typewriter text={bio} speed={60} delay={300} />
            </p>
          </div>
        </Row>

        <div style={{ marginTop: "3rem" }}>
          <Row index={1}>
            <p className={styles.sectionHeading}>Posts</p>
          </Row>
          <ul className={styles.postList}>
            {recentPosts.map((post, i) => (
              <motion.li
                key={post.slug}
                className={styles.postListItem}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: (postsStart + i) * 0.07 }}
              >
                {post.date && <time className={styles.postDate}>{post.date}</time>}
                <Link to={`/${post.slug}`} className={styles.postLink}>
                  {post.title}
                </Link>
                {post.series && <span className={styles.seriesTag}>{post.series}</span>}
              </motion.li>
            ))}
          </ul>
        </div>

        {projectsData.length > 0 && (
          <div style={{ marginTop: "3rem" }}>
            <Row index={projectsHeadingRow}>
              <p className={styles.sectionHeading}>Projects</p>
            </Row>
            <ul className={styles.projectList}>
              {projectsData.map((project, i) => (
                <motion.li
                  key={project.name}
                  className={styles.projectItem}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: (projectsStart + i) * 0.07 }}
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
                    <span className={styles.projectStars}>{project.stars}</span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {contact.length > 0 && (
          <div style={{ marginTop: "3rem" }}>
            <Row index={socialRow}>
              <p className={styles.sectionHeading}>Contact</p>
            </Row>
            <Row index={socialRow + 1}>
              <div className={styles.socialLinks}>
                {contact.map((link) => (
                  <a
                    key={`${link.type}-${link.url}`}
                    href={getLinkHref(link)}
                    target={link.type === 'email' ? undefined : "_blank"}
                    rel={link.type === 'email' ? undefined : "noopener noreferrer"}
                    className={styles.navLink}
                    aria-label={link.label ?? SOCIAL_META[link.type].label}
                  >
                    <Icon icon={SOCIAL_META[link.type].icon} width={16} height={16} />
                  </a>
                ))}
              </div>
            </Row>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
