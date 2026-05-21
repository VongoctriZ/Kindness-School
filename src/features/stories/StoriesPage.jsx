import { useState } from 'react'
import { STORY_CATEGORIES, ROLES } from '../../lib/constants'
import { SAMPLE_STORIES } from '../../lib/sampleStories'
import { useStoriesController } from '../../mvc/controllers/useStoriesController'
import useAuthStore from '../../store/useAuthStore'
import Spinner    from '../../components/Spinner/Spinner'
import StoryCard   from './StoryCard'
import StoryModal  from './StoryModal'
import StoryComposer from './StoryComposer'
import styles from './StoriesPage.module.css'

const ALL_FILTER = { value: 'all', label: '🌟 Tất cả' }
const FILTERS    = [ALL_FILTER, ...STORY_CATEGORIES]

export default function StoriesPage() {
  const { stories, loading, handleCreate, handleUpdate, handleDelete } = useStoriesController()
  const { profile } = useAuthStore()

  const [filter,    setFilter]    = useState('all')
  const [selected,  setSelected]  = useState(null)   // story đang xem
  const [editing,   setEditing]   = useState(null)   // story đang sửa
  const [composing, setComposing] = useState(false)  // tạo mới

  const canPost = profile?.role === ROLES.TEACHER || profile?.role === ROLES.ADMIN

  // Luôn gộp stories thật + sample, stories thật hiện trước
  const allStories = [...stories, ...SAMPLE_STORIES]

  const filtered = filter === 'all'
    ? allStories
    : allStories.filter(s => s.category === filter)

  async function handleCreate_(data, file) {
    await handleCreate(data, file)
    setComposing(false)
  }

  async function handleUpdate_(data, file) {
    if (!editing) return
    await handleUpdate(editing.id, data, file)
    setEditing(null)
    setSelected(null)
  }

  async function handleDelete_(storyId) {
    if (!window.confirm('Xoá story này?')) return
    await handleDelete(storyId)
    setSelected(null)
  }

  function openEdit(story) {
    setSelected(null)
    setEditing(story)
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroIn}>
          <div className={styles.heroBadge}>📖 Kindness Stories</div>
          <h1 className={styles.heroTitle}>Những câu chuyện truyền cảm hứng</h1>
          <p className={styles.heroDesc}>
            Khám phá các câu chuyện, hình ảnh và video về lòng tốt từ cộng đồng học đường.
          </p>
        </div>
      </section>

      {/* Filter pills */}
      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`${styles.pill} ${filter === f.value ? styles.pillActive : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className={styles.wrap}>
        {loading ? (
          <div className={styles.center}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <p>Không có story nào trong danh mục này.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((story, i) => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={() => setSelected(story)}
                delay={i < 6 ? (i % 3) + 1 : 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB — teacher / admin only */}
      {canPost && (
        <button
          className={styles.fab}
          onClick={() => setComposing(true)}
          aria-label="Đăng story mới"
        >
          +
        </button>
      )}

      {/* Story detail modal */}
      {selected && (
        <StoryModal
          story={selected}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onDelete={handleDelete_}
        />
      )}

      {/* Edit composer */}
      {editing && (
        <StoryComposer
          initial={editing}
          onSubmit={handleUpdate_}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Create composer */}
      {composing && (
        <StoryComposer
          onSubmit={handleCreate_}
          onClose={() => setComposing(false)}
        />
      )}
    </div>
  )
}
