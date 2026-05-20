import { useEffect } from 'react'
import { STORY_CATEGORIES } from '../../lib/constants'
import { formatRelativeTime } from '../../lib/utils'
import useAuthStore from '../../store/useAuthStore'
import styles from './StoryModal.module.css'

function getCategoryLabel(value) {
  return STORY_CATEGORIES.find(c => c.value === value)?.label ?? value
}

function parseYoutubeEmbed(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  if (!match) return null
  return `https://www.youtube.com/embed/${match[1]}`
}

export default function StoryModal({ story, onClose, onEdit, onDelete }) {
  const { user, profile } = useAuthStore()

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!story) return null

  const embedSrc    = parseYoutubeEmbed(story.videoUrl)
  const isAuthor    = user?.uid === story.publishedBy
  const isAdmin     = profile?.role === 'admin'
  const canEdit     = !story.isStatic && (isAuthor || isAdmin)
  const timeStr     = story.createdAt ? formatRelativeTime(story.createdAt) : ''
  const catLabel    = getCategoryLabel(story.category)

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={story.title}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">✕</button>

        {/* Cover image */}
        {story.imageUrl && (
          <div
            className={styles.cover}
            style={{ backgroundImage: `url(${story.imageUrl})` }}
          />
        )}

        {/* YouTube embed */}
        {embedSrc && (
          <div className={styles.videoWrap}>
            <iframe
              src={embedSrc}
              className={styles.video}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={story.title}
            />
          </div>
        )}

        <div className={styles.body}>
          {/* Meta row */}
          <div className={styles.meta}>
            <span className={styles.catBadge}>{catLabel}</span>
            <span className={styles.publisher}>{story.publisherName}</span>
            {timeStr && <span className={styles.time}>· {timeStr}</span>}
          </div>

          <h2 className={styles.title}>{story.title}</h2>

          <p className={styles.content}>{story.content}</p>

          {story.sourceUrl && (
            <a
              href={story.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
            >
              🔗 Xem nguồn gốc
            </a>
          )}

          {canEdit && (
            <div className={styles.actions}>
              {isAuthor && (
                <button className={styles.editBtn} onClick={() => onEdit?.(story)}>
                  ✏️ Chỉnh sửa
                </button>
              )}
              <button className={styles.deleteBtn} onClick={() => onDelete?.(story.id)}>
                🗑 Xoá
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
