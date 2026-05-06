import { Link } from "react-router";
import PageTransition from "../components/PageTransition";
import Typewriter from "../components/Typewriter";
import { getAllPosts } from "../utils/posts";

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 5);

  return (
    <PageTransition>
      <div className="page-content">
        <div
          className="home-intro slide-enter"
          style={{ "--enter-stage": 1 } as React.CSSProperties}
        >
          <h1>Hacxy</h1>
          <p>
            <Typewriter
              text="前端开发者，热衷于开源、工具链和 Web 应用构建，记录学习与思考。"
              speed={60}
              delay={300}
            />
          </p>
        </div>

        <div>
          <p
            className="section-heading slide-enter"
            style={{ "--enter-stage": 2 } as React.CSSProperties}
          >
            Recent Posts
          </p>
          <ul className="post-list">
            {recentPosts.map((post, i) => (
              <li
                key={post.slug}
                className="post-list-item slide-enter"
                style={{ "--enter-stage": i + 3 } as React.CSSProperties}
              >
                {post.date && <time className="post-date">{post.date}</time>}
                <Link to={`/posts/${post.slug}`} className="post-link">
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
          {recentPosts.length > 0 && (
            <div
              className="slide-enter"
              style={
                {
                  "--enter-stage": recentPosts.length + 3,
                  marginTop: "1.5rem",
                } as React.CSSProperties
              }
            >
              <Link to="/posts" className="nav-link">
                All posts →
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
