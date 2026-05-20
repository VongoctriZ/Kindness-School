import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar          from '../../components/Navbar/Navbar'
import PostModal       from '../../features/feed/PostModal'
import OnboardingModal from '../../features/auth/OnboardingModal'
import useAuthStore    from '../../store/useAuthStore'
import styles from './MainLayout.module.css'

export default function MainLayout() {
  const [postModalOpen, setPostModalOpen] = useState(false)
  const needsOnboarding = useAuthStore(s => s.needsOnboarding)
  const { pathname } = useLocation()
  const hideFab = pathname.startsWith('/stories')

  return (
    <div className={styles.root}>
      <Navbar onPostClick={() => setPostModalOpen(true)} />

      <div className={styles.content}>
        <Outlet />
      </div>

      {!hideFab && <button
        className={styles.fab}
        onClick={() => setPostModalOpen(true)}
        title="Đăng bài mới"
      >
        ✏️ <span className={styles.fabLabel}>Đăng bài</span>
      </button>}

      {postModalOpen && (
        <PostModal onClose={() => setPostModalOpen(false)} />
      )}

      {needsOnboarding && <OnboardingModal />}
    </div>
  )
}
