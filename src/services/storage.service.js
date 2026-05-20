import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'
import { MAX_FILE_SIZE, ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES } from '../lib/constants'

export function validateFile(file) {
  const accepted = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES]
  if (!accepted.includes(file.type)) throw new Error('Định dạng không hỗ trợ (JPEG, PNG, GIF, WebP, MP4, WebM)')
  if (file.size > MAX_FILE_SIZE)     throw new Error('File quá lớn (tối đa 10 MB)')
  return ACCEPTED_IMAGE_TYPES.includes(file.type) ? 'image' : 'video'
}

function firebaseUpload(file, path, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path)
    const task       = uploadBytesResumable(storageRef, file)

    task.on(
      'state_changed',
      snapshot => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        onProgress?.(pct)
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve(url)
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}

export function uploadAvatar(uid, file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG, GIF, WebP')
  if (file.size > MAX_FILE_SIZE)                 throw new Error('Ảnh quá lớn (tối đa 10 MB)')
  return firebaseUpload(file, `avatars/${uid}/avatar`)
}

export function uploadCover(uid, file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG, GIF, WebP')
  if (file.size > MAX_FILE_SIZE)                 throw new Error('Ảnh quá lớn (tối đa 10 MB)')
  return firebaseUpload(file, `covers/${uid}/cover`)
}

export function uploadStoryCover(storyId, file, onProgress) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG, GIF, WebP')
  if (file.size > MAX_FILE_SIZE)                 throw new Error('Ảnh quá lớn (tối đa 10 MB)')
  return firebaseUpload(file, `stories/${storyId}/cover`, onProgress)
}

export async function uploadPostMedia(uid, file, onProgress) {
  const mediaType = validateFile(file)
  const ext       = file.name.split('.').pop()
  const path      = `posts/${uid}/${Date.now()}.${ext}`
  const url       = await firebaseUpload(file, path, onProgress)
  return { url, mediaType }
}
