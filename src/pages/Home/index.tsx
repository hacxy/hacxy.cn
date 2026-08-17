import type React from 'react'

import { Icon } from '@iconify/react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import blogConfig from 'virtual:blog-config'
import pages from 'virtual:blog-pages'
import projectsData from 'virtual:github-projects'

import GitHubCalendar from '../../components/GitHubCalendar'
import PageTransition from '../../components/PageTransition'
import Typewriter from '../../components/Typewriter'
import styles from '../../styles/common.module.scss'
import { getAllPosts } from '../../utils/posts'
import { preloadSkills } from '../../utils/skills'
import { SOCIAL_META, getLinkHref, type SocialLink } from '../../utils/social'
import NotFound from '../NotFound'

function Row({
  index,
  children,
  style,
}: {
  index: number
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

preloadSkills()

export default function Home() {
  const homeData = pages.home?.[0]
  if (!homeData) {
    return <NotFound />
  }

  const bio = (homeData.bio as string | undefined) ?? blogConfig.bio ?? ''
  const contact = (homeData.contact as SocialLink[] | undefined) ?? []

  const allPosts = getAllPosts()
  const recentPosts = allPosts.slice(0, 5)

  const postsStart = 3
  const allPostsRow = postsStart + recentPosts.length
  const projectsHeadingRow = allPostsRow + 1
  const projectsStart = projectsHeadingRow + 1
  const projectsEnd = projectsStart + projectsData.length + 1
  const socialRow = projectsEnd

  return (
    <PageTransition>
      <div className={styles.pageContent}>
        <Row index={0} style={{ marginBottom: '3rem' }}>
          <div className={styles.homeIntro}>
            <p>
              <Typewriter text={bio} speed={60} delay={300} />
            </p>
          </div>
        </Row>

        <Row index={1} style={{ marginBottom: '3rem' }}>
          <p className={styles.sectionHeading}>Contributions</p>
          <GitHubCalendar />
        </Row>

        <div style={{ marginTop: '3rem' }}>
          <Row index={2}>
            <p className={styles.sectionHeading}>Recent Posts</p>
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
              </motion.li>
            ))}
          </ul>
          <Row index={allPostsRow} style={{ marginTop: '1.5rem' }}>
            <Link to="/posts" className={styles.navLink}>
              All posts →
            </Link>
          </Row>
        </div>

        {projectsData.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
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
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.projectItemTop}
                  >
                    <span className={styles.projectLink}>{project.name}</span>
                    {project.description && (
                      <span className={styles.projectDesc}>{project.description}</span>
                    )}
                    <span className={styles.projectStars}>{project.stars}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
            <Row index={projectsStart + projectsData.length} style={{ marginTop: '1.5rem' }}>
              <a
                href={`${(homeData.github as string) ?? ''}?tab=repositories`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.navLink}
              >
                All projects →
              </a>
            </Row>
          </div>
        )}

        {contact.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
            <Row index={socialRow}>
              <p className={styles.sectionHeading}>Contact</p>
            </Row>
            <Row index={socialRow + 1}>
              <div className={styles.socialLinks}>
                {contact.map((link) => (
                  <a
                    key={`${link.type}-${link.url}`}
                    href={getLinkHref(link)}
                    target={link.type === 'email' ? undefined : '_blank'}
                    rel={link.type === 'email' ? undefined : 'noopener noreferrer'}
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
  )
}
