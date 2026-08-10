import { BrowserRouter, Route, Routes } from 'react-router'

import Layout from './components/Layout.tsx'
import About from './pages/About.tsx'
import Home from './pages/Home.tsx'
import NotFound from './pages/NotFound.tsx'
import PostPage from './pages/PostPage.tsx'

/** 路由定义（与路由环境解耦）：客户端由 BrowserRouter 包裹，构建期预渲染由 StaticRouter 包裹 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="posts/:slug" element={<PostPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
