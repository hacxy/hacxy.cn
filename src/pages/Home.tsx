import { Link } from "react-router";
import { motion } from "motion/react";
import { Icon } from "@iconify/react";
import PageTransition from "../components/PageTransition";
import Typewriter from "../components/Typewriter";
import { getAllPosts } from "../utils/posts";
import projectsData from "virtual:github-projects";
import siteConfig from "../../site.config";

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 5);

  return (
    <PageTransition>
      <div className="page-content">
        <div
          className="home-intro slide-enter"
          style={{ "--enter-stage": 1 } as React.CSSProperties}
        >
          <h1>{siteConfig.author}</h1>
          <p>
            <Typewriter
              text={siteConfig.bio}
              speed={60}
              delay={300}
            />
          </p>
        </div>

        <div style={{ marginTop: "3rem" }}>
          <p
            className="section-heading slide-enter"
            style={{ "--enter-stage": 2 } as React.CSSProperties}
          >
            Recent Posts
          </p>
          <ul className="post-list">
            {recentPosts.map((post, i) => (
              <motion.li
                key={post.slug}
                className="post-list-item"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                {post.date && <time className="post-date">{post.date}</time>}
                <Link to={`/posts/${post.slug}`} className="post-link">
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
              <Link to="/posts" className="nav-link">
                All posts →
              </Link>
            </motion.div>
          )}
        </div>

        <div style={{ marginTop: "3rem" }}>
          <p
            className="section-heading slide-enter"
            style={{ "--enter-stage": 10 } as React.CSSProperties}
          >
            Projects
          </p>
          <ul className="project-list">
            {projectsData.map((project, i) => (
              <motion.li
                key={project.name}
                className="project-item"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <div className="project-item-top">
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link"
                  >
                    {project.name}
                  </a>
                  {project.stars > 0 && (
                    <span className="project-stars">★ {project.stars}</span>
                  )}
                </div>
                {project.description && (
                  <p className="project-desc">{project.description}</p>
                )}
              </motion.li>
            ))}
          </ul>
        </div>

        <div
          className="slide-enter"
          style={{ "--enter-stage": 11, marginTop: "3rem" } as React.CSSProperties}
        >
          <div className="social-links">
            <a
              href={`mailto:${siteConfig.email}`}
              className="nav-icon-link"
              aria-label="Email"
            >
              <Icon icon="lucide:mail" width={16} height={16} />
            </a>
            <a
              href={siteConfig.bilibili}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-icon-link"
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
