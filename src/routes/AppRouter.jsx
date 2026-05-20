import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute  from './ProtectedRoute'
import MainLayout      from '../mvc/views/MainLayout'
import AuthLayout      from '../mvc/views/AuthLayout'
import LoginPage       from '../features/auth/LoginPage'
import PendingPage     from '../features/auth/PendingPage'
import AdminPage       from '../features/admin/AdminPage'
import FeedPage        from '../features/feed/FeedPage'
import PostDetailPage  from '../features/post/PostDetailPage'
import LeaderboardPage from '../features/ranking/LeaderboardPage'
import ProfilePage     from '../features/profile/ProfilePage'
import SearchPage      from '../features/search/SearchPage'
import StoriesPage    from '../features/stories/StoriesPage'
import MembersPage   from '../features/members/MembersPage'
import useAuthStore    from '../store/useAuthStore'
import Spinner         from '../components/Spinner/Spinner'
import { ROLES }       from '../lib/constants'

function PendingGuard({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading || (user && !profile)) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size="lg" /></div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.role !== ROLES.PENDING_TEACHER) return <Navigate to="/" replace />
  return children
}

function TeacherGuard({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading || (user && !profile)) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size="lg" /></div>
  }
  if (!user) return <Navigate to="/login" replace />
  const allowed = [ROLES.TEACHER, ROLES.ADMIN]
  if (profile && !allowed.includes(profile.role)) return <Navigate to="/" replace />
  return children
}

function AdminGuard({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading || (user && !profile)) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size="lg" /></div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.role !== ROLES.ADMIN) return <Navigate to="/" replace />
  return children
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Pending teacher — chờ duyệt */}
        <Route path="/pending" element={<PendingGuard><PendingPage /></PendingGuard>} />

        {/* Admin — duyệt giáo viên */}
        <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />

        {/* Protected routes — student / teacher / admin */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index               element={<FeedPage />} />
          <Route path="leaderboard"  element={<LeaderboardPage />} />
          <Route path="search"       element={<SearchPage />} />
          <Route path="profile"      element={<ProfilePage />} />
          <Route path="profile/:uid" element={<ProfilePage />} />
          <Route path="post/:postId" element={<PostDetailPage />} />
          <Route path="stories"    element={<StoriesPage />} />
          <Route path="members"   element={<TeacherGuard><MembersPage /></TeacherGuard>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
