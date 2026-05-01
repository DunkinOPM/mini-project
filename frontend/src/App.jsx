import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import UploadPage from './pages/UploadPage'
import LearningPage from './pages/LearningPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ink-900)' }}>
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/learn" element={<LearningPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  )
}
