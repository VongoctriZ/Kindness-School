import { useState, useRef, useEffect } from 'react'
import { STORY_CATEGORIES, ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '../../lib/constants'
import useAuthStore from '../../store/useAuthStore'
import Spinner from '../../components/Spinner/Spinner'
import styles from './StoryComposer.module.css'

const EMPTY_FORM = {
  title:       '',
  content:     '',
  imageUrl:    '',
  videoUrl:    '',
  sourceUrl:   '',
  category:    'kindness',
  isFeatured:  false,
}

export default function StoryComposer({ initial = null, onSubmit, onClose }) {
  const { profile } = useAuthStore()
  const isAdmin     = profile?.role === 'admin'
  const isTeacher   = profile?.role === 'teacher'

  const [form,       setForm]       = useState(initial ? { ...EMPTY_FORM, ...initial } : EMPTY_FORM)
  const [coverFile,  setCoverFile]  = useState(null)
  const [preview,    setPreview]    = useState(initial?.imageUrl ?? null)
  const [uploading,  setUploading]  = useState(false)
  const [error,      setError]      = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleCoverChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPEG, PNG, GIF, WebP')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Ảnh quá lớn (tối đa 10 MB)')
      return
    }
    setCoverFile(file)
    setPreview(URL.createObjectURL(file))
    setError(null)
  }

  function removeCover() {
    setCoverFile(null)
    setPreview(null)
    set('imageUrl', '')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setError('Tiêu đề và nội dung không được bỏ trống')
      return
    }
    setError(null)
    setUploading(true)
    try {
      await onSubmit(form, coverFile)
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const isEdit = !!initial

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            {isEdit ? '✏️ Chỉnh sửa Story' : '📖 Đăng Story mới'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <form className={styles.body} onSubmit={handleSubmit}>
          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label}>Tiêu đề <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              maxLength={100}
              placeholder="Tên câu chuyện..."
              required
            />
            <span className={styles.charCount}>{form.title.length}/100</span>
          </div>

          {/* Content */}
          <div className={styles.field}>
            <label className={styles.label}>Nội dung <span className={styles.req}>*</span></label>
            <textarea
              className={styles.textarea}
              value={form.content}
              onChange={e => set('content', e.target.value)}
              maxLength={2000}
              placeholder="Kể câu chuyện của bạn..."
              rows={5}
              required
            />
            <span className={styles.charCount}>{form.content.length}/2000</span>
          </div>

          {/* Cover image */}
          <div className={styles.field}>
            <label className={styles.label}>Ảnh bìa</label>
            {preview ? (
              <div className={styles.coverPreview}>
                <img src={preview} alt="Preview" className={styles.coverImg} />
                <button type="button" className={styles.removeCover} onClick={removeCover}>✕</button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileRef.current?.click()}
              >
                📷 Chọn ảnh bìa
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className={styles.fileInput}
              onChange={handleCoverChange}
            />
          </div>

          {/* Video URL */}
          <div className={styles.field}>
            <label className={styles.label}>Video YouTube (tuỳ chọn)</label>
            <input
              className={styles.input}
              value={form.videoUrl}
              onChange={e => set('videoUrl', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          {/* Source URL */}
          <div className={styles.field}>
            <label className={styles.label}>Nguồn / Link gốc (tuỳ chọn)</label>
            <input
              className={styles.input}
              value={form.sourceUrl}
              onChange={e => set('sourceUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Category */}
          <div className={styles.field}>
            <label className={styles.label}>Danh mục</label>
            <select
              className={styles.select}
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              {STORY_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* isFeatured — teacher + admin */}
          {(isAdmin || isTeacher) && (
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={form.isFeatured}
                onChange={e => set('isFeatured', e.target.checked)}
              />
              <span>⭐ Hiển thị ở Hero Carousel (trang chủ)</span>
            </label>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Huỷ</button>
            <button type="submit" className={styles.submitBtn} disabled={uploading}>
              {uploading ? <Spinner size="sm" /> : isEdit ? 'Lưu thay đổi' : 'Đăng Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
