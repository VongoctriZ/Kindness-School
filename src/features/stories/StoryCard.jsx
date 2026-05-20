import { useRef } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { STORY_CATEGORIES } from '../../lib/constants'
import { formatRelativeTime } from '../../lib/utils'
import styles from './StoryCard.module.css'

const CATEGORY_COLORS = {
  kindness:    '#F59E0B',
  community:   '#6B6FD8',
  school:      '#22C55E',
  environment: '#10B981',
  other:       '#9CA3AF',
}

const GRADIENT_FALLBACKS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
]

function getCategoryLabel(value) {
  return STORY_CATEGORIES.find(c => c.value === value)?.label ?? value
}

export default function StoryCard({ story, onClick, delay = '' }) {
  const ref = useRef(null)
  useScrollReveal(ref)

  const catColor   = CATEGORY_COLORS[story.category] ?? '#9CA3AF'
  const gradient   = GRADIENT_FALLBACKS[Math.abs(story.id?.charCodeAt(0) ?? 0) % GRADIENT_FALLBACKS.length]
  const snippet    = story.content?.slice(0, 80) + (story.content?.length > 80 ? '…' : '')
  const timeStr    = story.createdAt?.toDate ? formatRelativeTime(story.createdAt.toDate()) : ''

  return (
    <div
      ref={ref}
      className={`${styles.card} reveal ${delay ? `d${delay}` : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
    >
      <div
        className={styles.cover}
        style={story.imageUrl
          ? { backgroundImage: `url(${story.imageUrl})` }
          : { background: gradient }
        }
      >
        {!story.imageUrl && <span className={styles.coverIcon}>📖</span>}
        {story.isFeatured && <span className={styles.featuredBadge}>⭐ Nổi bật</span>}
      </div>

      <div className={styles.body}>
        <span
          className={styles.catBadge}
          style={{ background: catColor + '22', color: catColor }}
        >
          {getCategoryLabel(story.category)}
        </span>

        <h3 className={styles.title}>{story.title}</h3>
        <p className={styles.snippet}>{snippet}</p>

        <div className={styles.meta}>
          <span className={styles.publisher}>{story.publisherName}</span>
          {timeStr && <span className={styles.time}>{timeStr}</span>}
        </div>
      </div>
    </div>
  )
}
