import { useState, useEffect, useRef } from 'react'
import styles from './HeroCarousel.module.css'

export default function HeroCarousel({ slides = [], onSlideClick }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const timer = setInterval(
      () => setActive(i => (i + 1) % slides.length),
      5000,
    )
    return () => clearInterval(timer)
  }, [slides.length, paused])

  // Reset active index khi slides thay đổi số lượng
  useEffect(() => {
    if (active >= slides.length) setActive(0)
  }, [slides.length])

  function prev() {
    setActive(i => (i - 1 + slides.length) % slides.length)
  }
  function next() {
    setActive(i => (i + 1) % slides.length)
  }

  if (!slides.length) return null

  const current = slides[active] ?? slides[0]

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={i}
          className={`${styles.slide} ${i === active ? styles.active : ''} ${s.storyId ? styles.clickable : ''}`}
          style={{ backgroundImage: `url(${s.imageUrl})` }}
          onClick={() => s.storyId && onSlideClick?.(s.storyId)}
        />
      ))}

      <div className={styles.overlay} />

      <div className={styles.text}>
        <div className={styles.badge}>📖 Kindness Stories</div>
        <h1 className={styles.title}>{current.title}</h1>
        <p className={styles.caption}>{current.caption}</p>
      </div>

      <div className={styles.dots}>
        {slides.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
            onClick={() => setActive(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      <button className={`${styles.arrow} ${styles.prev}`} onClick={prev} aria-label="Trước">‹</button>
      <button className={`${styles.arrow} ${styles.next}`} onClick={next} aria-label="Tiếp">›</button>
    </div>
  )
}
