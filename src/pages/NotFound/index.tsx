import PageTransition from "../../components/PageTransition";
import styles from "../../styles/common.module.scss";

export default function NotFound() {
  return (
    <PageTransition>
      <div className={styles.pageContent}>
        <div className={styles.homeIntro}>
          <h1>404</h1>
          <p>页面不存在</p>
        </div>
      </div>
    </PageTransition>
  );
}
