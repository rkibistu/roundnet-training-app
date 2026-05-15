import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import ShellLayout from './components/ShellLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'

function SessionsPage() { return <main><h1>Sessions</h1></main> }
function LibraryPage() { return <main><h1>Library</h1></main> }
function LeaderboardPage() { return <main><h1>Leaderboard</h1></main> }
function ProfilePage() { return <main><h1>Profile</h1></main> }

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<ShellLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
