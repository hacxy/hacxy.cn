import siteConfig from "../../../site.config";
import styles from "./index.module.scss";

export default function Footer() {
  return (
    <footer>
      <div className={styles.footer}>
        <span>{siteConfig.copyright}</span>
      </div>
    </footer>
  );
}
