import { useRef, useState } from 'react'
import { getRoleLabel, derivePointsDisplay, KINDNESS_TITLES } from '../../lib/utils'
import { Link }   from 'react-router-dom'
import { useFeedController }    from '../../mvc/controllers/useFeedController'
import { useLeaderboard }       from '../../mvc/controllers/usePointsController'
import { useFeaturedStories }   from '../../mvc/controllers/useStoriesController'
import useAuthStore     from '../../store/useAuthStore'
import PostCard         from '../../components/PostCard/PostCard'
import Avatar           from '../../components/Avatar/Avatar'
import Spinner          from '../../components/Spinner/Spinner'
import KindnessProgress from '../../components/KindnessProgress/KindnessProgress'
import HeroCarousel     from '../../components/HeroCarousel/HeroCarousel'
import StoryModal       from '../stories/StoryModal'
import { STATIC_HERO_SLIDES } from '../../lib/constants'
import { SAMPLE_STORIES }     from '../../lib/sampleStories'
import styles from './FeedPage.module.css'

const POINTS_RULES = [
  { icon: '📝', label: 'Đăng bài viết',   pts: '+10' },
  { icon: '💬', label: 'Bình luận',        pts: '+5'  },
  { icon: '❤️', label: 'Nhận like',         pts: '+2'  },
  { icon: '🎉', label: 'Đăng ký lần đầu', pts: '+20' },
]

export default function FeedPage() {
  const { posts, likedPosts, loading, handleLike, handleDelete, loadMore, hasMore } = useFeedController()
  const { users: topUsers } = useLeaderboard(5)
  const { user, profile }   = useAuthStore()
  const featured            = useFeaturedStories()
  const [heroStory, setHeroStory] = useState(null)

  const featuredSlides = featured.map(s => ({
    imageUrl: s.imageUrl ?? STATIC_HERO_SLIDES[0].imageUrl,
    title:    s.title,
    caption:  s.content ? s.content.slice(0, 80) + (s.content.length > 80 ? '…' : '') : '',
    storyId:  s.id,
  }))

  // Khi chưa có featured story trong Firestore, dùng sample stories nổi bật
  const sampleFeaturedSlides = featured.length === 0
    ? SAMPLE_STORIES
        .filter(s => s.isFeatured)
        .map(s => ({ imageUrl: s.imageUrl, title: s.title, caption: s.content.slice(0, 60), storyId: null }))
    : []

  const carouselSlides = [...featuredSlides, ...sampleFeaturedSlides, ...STATIC_HERO_SLIDES]

  return (
    <div className={styles.page}>
      {/* HERO CAROUSEL */}
      <section className={styles.heroWrap}>
        <HeroCarousel
          slides={carouselSlides}
          onSlideClick={storyId => {
            const story = featured.find(s => s.id === storyId)
            if (story) setHeroStory(story)
          }}
        />
      </section>

      {heroStory && (
        <StoryModal story={heroStory} onClose={() => setHeroStory(null)} />
      )}

      {/* MAIN GRID */}
      <div className={styles.main}>

        {/* FEED COLUMN */}
        <div className={styles.feed}>
          {loading
            ? <div className={styles.center}><Spinner size="lg" /></div>
            : posts.length === 0
              ? <div className={styles.empty}>Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ! 🌱</div>
              : posts.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isLiked={likedPosts.has(post.id)}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    currentUid={user?.uid}
                    currentUserRole={profile?.role}
                    delay={i < 3 ? `d${i + 1}` : ''}
                  />
                ))
          }
          {!loading && hasMore && (
            <button className={styles.loadMoreBtn} onClick={loadMore}>
              Xem thêm bài viết
            </button>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className={styles.sidebar}>

          {/* User card */}
          {profile && (
            <div className={styles.userCard}>
              <div className={styles.ucBanner} />
              <Link to="/profile" className={styles.ucAvatar}>
                <Avatar src={profile.photoURL} name={profile.displayName} uid={user?.uid} size="xl" online />
              </Link>
              <div className={styles.ucName}>{profile.displayName}</div>
              <div className={styles.ucSub}>{profile.grade} · {getRoleLabel(profile.role)}</div>
              <div className={styles.ucProgressWrap}>
                <KindnessProgress
                points={profile.totalPoints ?? 0}
                cyclePoints={derivePointsDisplay(profile).cyclePoints}
                matureTreeCount={derivePointsDisplay(profile).matureTreeCount}
                compact
              />
              </div>
            </div>
          )}

          {/* Mini leaderboard */}
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>
              🏆 Bảng xếp hạng
              <Link to="/leaderboard" className={styles.sideTitleLink}>Xem tất cả →</Link>
            </div>
            {topUsers.map((u, i) => (
              <Link key={u.uid} to={`/profile/${u.uid}`} className={styles.lbRow}>
                <span className={`${styles.lbRank} ${styles[`r${i + 1}`] ?? styles.rx}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <Avatar src={u.photoURL} name={u.displayName} uid={u.uid} size="small" />
                <div className={styles.lbInfo}>
                  <div className={styles.lbName}>{u.displayName}</div>
                  <div className={styles.lbSub}>{u.grade}</div>
                </div>
                <div className={styles.lbPts}>⭐ {u.totalPoints}</div>
              </Link>
            ))}
          </div>

          {/* Points rules */}
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>✨ Cách kiếm điểm</div>
            {POINTS_RULES.map(r => (
              <div key={r.label} className={styles.prRow}>
                <span>{r.icon} {r.label}</span>
                <span className={styles.prBadge}>{r.pts}</span>
              </div>
            ))}
          </div>

          {/* Milestone levels */}
          {profile && (() => {
            const { cyclePoints } = derivePointsDisplay(profile)
            return (
              <div className={styles.sideCard}>
                <div className={styles.sideTitle}>🏅 Cấp độ điểm mốc</div>
                {KINDNESS_TITLES.map((tier, i) => {
                  const next = KINDNESS_TITLES[i + 1]
                  const isCurrent = cyclePoints >= tier.min && (next == null || cyclePoints < next.min)
                  return (
                    <div key={tier.title} className={`${styles.msRow} ${isCurrent ? styles.msCurrent : ''}`}>
                      <span className={styles.msIcon}>{tier.icon}</span>
                      <span className={styles.msTitle}>{tier.title}</span>
                      <span className={styles.msPts}>{tier.min === 0 ? 'Bắt đầu' : `${tier.min} đ`}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}

        </aside>
      </div>
    </div>
  )
}
