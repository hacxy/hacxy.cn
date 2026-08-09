import { BrowserRouter, Route, Routes } from 'react-router'

import Layout from './components/Layout.tsx'
import About from './pages/About.tsx'
import Home from './pages/Home.tsx'
import NotFound from './pages/NotFound.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
