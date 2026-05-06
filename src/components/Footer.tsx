import siteConfig from "../../site.config";

export default function Footer() {
  return (
    <footer>
      <div className="site-footer">
        <span>{siteConfig.copyright}</span>
      </div>
    </footer>
  )
}
