import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router";
import { AnimatePresence } from "motion/react";
import classNames from "classnames";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CodeStreamBg from "./components/CodeStreamBg";
import MusicPlayer from "./components/MusicPlayer";
import PageMetaManager from "./components/PageMetaManager";
import { getInitialTheme, applyTheme } from "./utils/theme";
import styles from "./App.module.scss";

const Home = lazy(() => import("./pages/Home"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Tags = lazy(() => import("./pages/Tags"));
const About = lazy(() => import("./pages/About"));
const Skills = lazy(() => import("./pages/Skills"));

export default function App() {
  const location = useLocation();

  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className={classNames("app-wrapper", styles.appWrapper)}>
      <PageMetaManager />
      <CodeStreamBg />
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Suspense>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/posts" element={<BlogList />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/tags/:tag" element={<BlogList />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/*" element={<BlogPost />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      <Footer />
      <MusicPlayer />
    </div>
  );
}
