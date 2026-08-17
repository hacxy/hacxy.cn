import classNames from 'classnames'
import { AnimatePresence } from 'motion/react'
import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router'

import styles from './App.module.scss'
import BackgroundDots from './components/BackgroundDots'
import Footer from './components/Footer'
import Header from './components/Header'
import PageMetaManager from './components/PageMetaManager'
import { getInitialTheme, applyTheme } from './utils/theme'

const Home = lazy(() => import('./pages/Home'))
const BlogList = lazy(() => import('./pages/BlogList'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const About = lazy(() => import('./pages/About'))
const Skills = lazy(() => import('./pages/Skills'))

export default function App() {
  const location = useLocation()

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <div className={classNames('app-wrapper', styles.appWrapper)}>
      <PageMetaManager />
      <BackgroundDots />
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Suspense>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname.split('/')[1] || '/'}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/posts" element={<BlogList />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/*" element={<BlogPost />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
