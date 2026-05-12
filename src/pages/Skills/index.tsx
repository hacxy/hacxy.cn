import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Icon } from "@iconify/react";
import classNames from "classnames";
import "../../styles/markdown.scss";
import PageTransition from "../../components/PageTransition";
import CodeBlock from "../../components/CodeBlock";
import styles from "./Skills.module.scss";

interface SkillData {
  name: string;
  description: string;
  markdownBody: string;
  url: string;
}

interface SkillListItem {
  name: string;
  description: string;
  files: string[];
}

const REPO = "hacxy/skills";
const SKILLS_API = "https://skills-manager.hacxy.cn/api/public";

function stripFrontmatter(raw: string): string {
  const match = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n?([\s\S]*)$/);
  return match ? match[1] : raw;
}

function extractFirstSentence(text: string): string {
  if (!text) return "";
  const match = text.match(/^[^.!?。！？]+[.!?。！？]/);
  return match ? match[0] : text.slice(0, 80) + (text.length > 80 ? "..." : "");
}

async function fetchSkills(): Promise<SkillData[]> {
  const res = await fetch(`${SKILLS_API}/skills`);
  if (!res.ok) throw new Error(`Skills API ${res.status}`);
  const list: SkillListItem[] = await res.json();

  const skills = await Promise.all(
    list.map(async (item): Promise<SkillData> => {
      let markdownBody = "";
      try {
        const fileRes = await fetch(`${SKILLS_API}/file/${item.name}/SKILL.md`);
        if (fileRes.ok) {
          markdownBody = stripFrontmatter(await fileRes.text());
        }
      } catch { /* use empty body */ }
      return {
        name: item.name,
        description: item.description,
        markdownBody,
        url: `https://github.com/${REPO}/tree/main/skills/${item.name}`,
      };
    })
  );

  return skills;
}

export default function Skills() {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchSkills()
      .then((data) => {
        setSkills(data);
        if (data.length > 0) setSelected(data[0].name);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const activeSkill = skills.find((s) => s.name === selected);

  return (
    <PageTransition>
      <div className={styles.wrapper}>
        <aside className={styles.sidebar}>
          <motion.div
            className={styles.sidebarHeader}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1>Skills</h1>
            <p>Agent skills for AI coding assistants</p>
          </motion.div>

          {loading && (
            <div className={styles.skeletonSidebar}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.skeletonCard} />
              ))}
            </div>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}

          {!loading && !error && (
            <>
              <ul className={styles.skillList}>
                {skills.map((skill, i) => (
                  <motion.li
                    key={skill.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: (i + 1) * 0.08 }}
                  >
                    <button
                      type="button"
                      className={classNames(styles.skillCard, {
                        [styles.active]: selected === skill.name,
                      })}
                      onClick={() => setSelected(skill.name)}
                    >
                      <span className={styles.skillCardName}>
                        <span className={styles.skillCardIndex}>
                          {String(i).padStart(2, "0")}
                        </span>
                        {skill.name}
                      </span>
                      {skill.description && (
                        <span className={styles.skillCardDesc}>
                          {extractFirstSentence(skill.description)}
                        </span>
                      )}
                    </button>
                  </motion.li>
                ))}
              </ul>

              <div className={styles.sidebarFooter}>
                <a
                  href={`https://github.com/${REPO}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sidebarGithub}
                >
                  <Icon icon="lucide:github" width={13} height={13} />
                  {REPO}
                  <span className={styles.skillCount}>{skills.length} skills</span>
                </a>
              </div>
            </>
          )}
        </aside>

        <div className={styles.content}>
          {loading && (
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonLine} style={{ width: "90%" }} />
              <div className={styles.skeletonLine} style={{ width: "75%" }} />
              <div className={styles.skeletonLine} style={{ width: "85%" }} />
              <div className={styles.skeletonLine} style={{ width: "60%" }} />
            </div>
          )}

          {!loading && !error && !activeSkill && (
            <div className={styles.emptyState}>
              <span>{"// select a skill from the list"}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeSkill && (
              <motion.div
                key={activeSkill.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <div className={styles.contentHeader}>
                  <h2 className={styles.contentTitle}>{activeSkill.name}</h2>
                  {activeSkill.description && (
                    <p className={styles.contentDesc}>{activeSkill.description}</p>
                  )}
                  <div className={styles.contentMeta}>
                    <span className={styles.installCmd}>
                      <code>npx skills add {REPO} --skill {activeSkill.name}</code>
                    </span>
                    <a
                      href={activeSkill.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.githubLink}
                    >
                      <Icon icon="lucide:github" width={14} height={14} />
                      Source
                    </a>
                  </div>
                </div>

                <hr className={styles.divider} />

                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>
                    {activeSkill.markdownBody}
                  </ReactMarkdown>
                </div>

                <div className={styles.repoLink}>
                  <a
                    href={`https://github.com/${REPO}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.githubLink}
                  >
                    <Icon icon="lucide:github" width={14} height={14} />
                    View all skills on GitHub &rarr;
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
