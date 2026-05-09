import { Icon } from "@iconify/react";
import PageTransition from "../../components/PageTransition";
import blogConfig from "virtual:blog-config";
import styles from "../../styles/common.module.scss";

export default function About() {
  return (
    <PageTransition>
      <div className={styles.pageContent}>
        <div
          className={`${styles.homeIntro} slide-enter`}
          style={{ "--enter-stage": 1 } as React.CSSProperties}
        >
          <h1>{blogConfig.author}</h1>
          <p>{blogConfig.bio}</p>
        </div>

        {blogConfig.techStack && blogConfig.techStack.length > 0 && (
          <div
            className="slide-enter"
            style={{ "--enter-stage": 2 } as React.CSSProperties}
          >
            <p className={styles.sectionHeading}>技术栈</p>
            <div className={styles.techStack}>
              {blogConfig.techStack.map((group) => (
                <div key={group.category} className={styles.techGroup}>
                  <p className={styles.sectionHeading}>{group.category}</p>
                  <ul className={styles.techList}>
                    {group.items.map((item) => (
                      <li key={item.name} className={styles.techItem}>
                        <Icon
                          icon={item.icon}
                          width={18}
                          height={18}
                          style={"color" in item ? { color: item.color } : undefined}
                        />
                        <span>{item.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
