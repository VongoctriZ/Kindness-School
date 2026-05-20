import {
  collection, addDoc, doc, getDoc, updateDoc, deleteDoc,
  query, orderBy, where, limit,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { buildStoryDoc } from '../mvc/models/story.model'

export function subscribeToStories(callback, onError) {
  const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'))
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.error('[subscribeToStories]', err.code, err.message); onError?.(err) },
  )
}

export function subscribeToFeaturedStories(callback, onError) {
  const q = query(
    collection(db, 'stories'),
    where('isFeatured', '==', true),
    limit(6),
  )
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.error('[subscribeToFeaturedStories]', err.code, err.message); onError?.(err) },
  )
}

export async function createStory(uid, profile, data) {
  const payload = buildStoryDoc(uid, profile, data)
  const ref = await addDoc(collection(db, 'stories'), {
    ...payload,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateStory(storyId, uid, role, data) {
  const ref  = doc(db, 'stories', storyId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Story không tồn tại')
  const isAuthor = snap.data().publishedBy === uid
  const isAdmin  = role === 'admin'
  if (!isAuthor && !isAdmin) throw new Error('Không có quyền sửa')
  const { title, content, imageUrl, videoUrl, sourceUrl, category, isFeatured } = data
  await updateDoc(ref, {
    title, content, imageUrl, videoUrl, sourceUrl, category, isFeatured,
    editedAt: serverTimestamp(),
  })
}

export async function deleteStory(storyId, uid, role) {
  const snap = await getDoc(doc(db, 'stories', storyId))
  if (!snap.exists()) throw new Error('Story không tồn tại')
  const isAuthor = snap.data().publishedBy === uid
  const isAdmin  = role === 'admin'
  if (!isAuthor && !isAdmin) throw new Error('Không có quyền xoá')
  await deleteDoc(doc(db, 'stories', storyId))
}
