import { Icon } from "@iconify/react";
import PageTransition from "../../components/PageTransition";
import { SOCIAL_META, getLinkHref, type SocialLink } from "../../utils/social";
import blogConfig from "virtual:blog-config";
import pages from "virtual:blog-pages";
import common from "../../styles/common.module.scss";
import styles from "./index.module.scss";

const allTechItems = (blogConfig.techStack ?? []).flatMap((g) => g.items);

export default function About() {
  const homeData = pages.home?.[0];
  const contact = (homeData?.contact as SocialLink[] | undefined) ?? [];

  return (
    <PageTransition>
      <div className={common.pageContent}>
        <div
          className={`${common.homeIntro} slide-enter`}
          style={{ "--enter-stage": 1 } as React.CSSProperties}
        >
          <h1>{blogConfig.author}</h1>
          <p>前端开发者 / 开源爱好者</p>
        </div>

        <section
          className={`${styles.section} slide-enter`}
          style={{ "--enter-stage": 2 } as React.CSSProperties}
        >
          <p className={common.sectionHeading}>关于我</p>
          <div className={styles.bio}>
            <p>
              前端开发者，热衷开源。写代码之外最大的乐趣就是把东西分享出去，看到有人用会很开心。
            </p>
            <p>
              目前在维护的开源项目：
              <a href="https://github.com/hacxy/l2d-widget" target="_blank" rel="noopener noreferrer">l2d-widget</a>（网页 Live2D 看板娘）、
              <a href="https://github.com/hacxy/l2d" target="_blank" rel="noopener noreferrer">l2d</a>（Live2D 模型加载库）、
              <a href="https://github.com/hacxy/l2d-models" target="_blank" rel="noopener noreferrer">l2d-models</a>（Live2D 模型仓库）。
            </p>
            <p>
              最近在系统地学习 AI 相关知识，同时也在搭建自己的 AI 工作流，
              尝试把 AI 融入开发的各个环节。
            </p>
          </div>
        </section>

        {allTechItems.length > 0 && (
          <section
            className={`${styles.section} slide-enter`}
            style={{ "--enter-stage": 3 } as React.CSSProperties}
          >
            <p className={common.sectionHeading}>技术栈</p>
            <div className={styles.techGrid}>
              {allTechItems.map((item) => {
                const Tag = item.url ? "a" : "span";
                const linkProps = item.url ? { href: item.url, target: "_blank", rel: "noopener noreferrer" } : {};
                return (
                  <Tag key={item.name} className={styles.techTag} {...linkProps}>
                    <Icon
                      icon={item.icon}
                      width={16}
                      height={16}
                      style={item.color ? { color: item.color } : undefined}
                    />
                    {item.name}
                  </Tag>
                );
              })}
            </div>
          </section>
        )}

        <section
          className={`${styles.section} slide-enter`}
          style={{ "--enter-stage": 4 } as React.CSSProperties}
        >
          <p className={common.sectionHeading}>兴趣爱好</p>
          <div className={styles.hobbyList}>
            <span className={styles.hobbyItem}>
              <Icon icon="lucide:music" width={15} height={15} />
              周杰伦、陶喆
            </span>
            <span className={styles.hobbyItem}>
              <Icon icon="lucide:book-open" width={15} height={15} />
              三体
            </span>
            <span className={styles.hobbyItem}>
              <Icon icon="lucide:bike" width={15} height={15} />
              骑行
            </span>
          </div>
        </section>

        {contact.length > 0 && (
          <section
            className={`${styles.section} slide-enter`}
            style={{ "--enter-stage": 5 } as React.CSSProperties}
          >
            <p className={common.sectionHeading}>联系我</p>
            <div className={styles.contactList}>
              {contact.map((link) => (
                <a
                  key={`${link.type}-${link.url}`}
                  href={getLinkHref(link)}
                  target={link.type === "email" ? undefined : "_blank"}
                  rel={link.type === "email" ? undefined : "noopener noreferrer"}
                  className={styles.contactLink}
                >
                  <Icon icon={SOCIAL_META[link.type].icon} width={16} height={16} />
                  <span>{link.label ?? SOCIAL_META[link.type].label}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
