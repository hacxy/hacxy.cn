import blogConfig from "virtual:blog-config";
import styles from "./index.module.scss";

export default function Footer() {
  return (
    <footer>
      <div className={styles.footer}>
        <span>{blogConfig.copyright}</span>
      </div>
    </footer>
  );
}
