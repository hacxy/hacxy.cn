import { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router";
import { AnimatePresence } from "motion/react";
import classNames from "classnames";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import Tags from "./pages/Tags";
import About from "./pages/About";
import styles from "./App.module.scss";

export default function App() {
  const location = useLocation();

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className={classNames("app-wrapper", styles.appWrapper)}>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/posts" element={<BlogList />} />
            <Route path="/posts/*" element={<BlogPost />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/tags/:tag" element={<BlogList />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
