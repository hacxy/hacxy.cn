import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Icon } from "@iconify/react";
import classNames from "classnames";
import "../../styles/markdown.scss";
import PageTransition from "../../components/PageTransition";
import CodeBlock from "../../components/CodeBlock";
import TerminalDemo from "./TerminalDemo";
import { getSkills, REPO, type SkillData } from "../../utils/skills";
import styles from "./Skills.module.scss";

function CopyCommand({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: user-select: all on code */ }
  }, [text]);

  return (
    <span className={styles.installCmd}>
      <code>{text}</code>
      <button type="button" className={styles.copyBtn} onClick={copy} aria-label="Copy">
        <Icon icon={copied ? "lucide:check" : "lucide:copy"} width={13} height={13} />
      </button>
    </span>
  );
}

function extractFirstSentence(text: string): string {
  if (!text) return "";
  const match = text.match(/^[^.!?。！？]+[.!?。！？]/);
  return match ? match[0] : text.slice(0, 80) + (text.length > 80 ? "..." : "");
}

export default function Skills() {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"demo" | "docs">("demo");

  useEffect(() => {
    getSkills()
      .then((data) => {
        setSkills(data);
        if (data.length > 0) setSelected(data[0].name);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const activeSkill = skills.find((s) => s.name === selected);

  function selectSkill(name: string) {
    setSelected(name);
    setMobileTab("demo");
  }

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
                      onClick={() => selectSkill(skill.name)}
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
                    <CopyCommand text={`npx skills add ${REPO} --skill ${activeSkill.name}`} />
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

                {/* Mobile tab switcher */}
                <div className={styles.tabBar}>
                  <button
                    type="button"
                    className={classNames(styles.tab, { [styles.tabActive]: mobileTab === "demo" })}
                    onClick={() => setMobileTab("demo")}
                  >
                    <Icon icon="lucide:terminal" width={14} height={14} />
                    Demo
                  </button>
                  <button
                    type="button"
                    className={classNames(styles.tab, { [styles.tabActive]: mobileTab === "docs" })}
                    onClick={() => setMobileTab("docs")}
                  >
                    <Icon icon="lucide:file-text" width={14} height={14} />
                    Docs
                  </button>
                </div>

                {/* Desktop: show both; Mobile: show based on tab */}
                <div className={classNames(styles.demoSection, { [styles.mobileHidden]: mobileTab !== "demo" })}>
                  <TerminalDemo skillName={activeSkill.name} />
                </div>

                <div className={classNames(styles.docsSection, { [styles.mobileHidden]: mobileTab !== "docs" })}>
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
