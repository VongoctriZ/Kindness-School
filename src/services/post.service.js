import {
  collection, addDoc, setDoc, doc, getDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, limit, where,
  onSnapshot, serverTimestamp, increment, runTransaction, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { buildPostDoc } from '../mvc/models/post.model'
import { buildCommentDoc } from '../mvc/models/comment.model'
import { POINTS, FEED_PAGE_SIZE } from '../lib/constants'
import { addPoints, getUserById } from './user.service'
import { createNotification } from './notification.service'

export async function createPost(uid, profile, content, mediaUrl = null, mediaType = null) {
  const data = buildPostDoc(uid, profile, content, mediaUrl, mediaType)
  const ref  = await addDoc(collection(db, 'posts'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  // Non-fatal: post đã tạo thành công dù points bị lỗi (VD: rules chưa deploy)
  addPoints(uid, POINTS.POST, 'post', ref.id).catch(e => console.error('[createPost] addPoints:', e.message))
  return ref.id
}

export function subscribeToPosts(callback, onError, n = FEED_PAGE_SIZE) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(n))
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.error('[subscribeToPosts]', err.code, err.message); onError?.(err) },
  )
}

export function subscribeToUserPosts(uid, callback, onError) {
  const q = query(
    collection(db, 'posts'),
    where('authorId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.error('[subscribeToUserPosts]', err.code, err.message); onError?.(err) },
  )
}

export async function toggleLike(postId, uid) {
  const likeRef  = doc(db, 'posts', postId, 'likes', uid)
  const likeSnap = await getDoc(likeRef)
  const postRef  = doc(db, 'posts', postId)

  let nowLiked    = false
  let authorId    = null
  let postContent = null

  await runTransaction(db, async tx => {
    const postSnap = await tx.get(postRef)
    if (!postSnap.exists()) throw new Error('Bài viết không tồn tại')

    const data  = postSnap.data()
    authorId    = data.authorId
    postContent = data.content

    if (likeSnap.exists()) {
      tx.delete(likeRef)
      tx.update(postRef, { likeCount: increment(-1) })
      nowLiked = false
    } else {
      tx.set(likeRef, { uid, createdAt: serverTimestamp() })
      tx.update(postRef, { likeCount: increment(1) })
      nowLiked = true
    }
  })

  // Sau transaction — tránh nested transaction khi gọi addPoints
  if (nowLiked && authorId && authorId !== uid) {
    addPoints(authorId, POINTS.LIKE_RECEIVED, 'like_received', postId)
      .catch(e => console.error('[toggleLike] addPoints:', e.message))
    getUserById(uid).then(liker => {
      createNotification(authorId, {
        type:         'like',
        fromUid:      uid,
        fromName:     liker?.displayName ?? 'Ai đó',
        fromPhotoURL: liker?.photoURL ?? null,
        postId,
        postSnippet:  postContent,
      })
    })
  }

  return nowLiked
}

export async function isLikedByUser(postId, uid) {
  const snap = await getDoc(doc(db, 'posts', postId, 'likes', uid))
  return snap.exists()
}

export async function getPostById(postId) {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export function subscribeToPost(postId, callback, onError) {
  return onSnapshot(doc(db, 'posts', postId),
    snap => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    err  => { console.error('[subscribeToPost]', err.code, err.message); onError?.(err) },
  )
}

export async function updatePost(postId, uid, content, mediaUrl = undefined, mediaType = undefined) {
  const ref  = doc(db, 'posts', postId)
  const snap = await getDoc(ref)
  if (!snap.exists() || snap.data().authorId !== uid) throw new Error('Không có quyền sửa')
  const changes = { content, editedAt: serverTimestamp() }
  if (mediaUrl  !== undefined) changes.mediaUrl  = mediaUrl
  if (mediaType !== undefined) changes.mediaType = mediaType
  await updateDoc(ref, changes)
}

export async function deletePost(postId, uid, role) {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) throw new Error('Bài viết không tồn tại')
  const isAuthor     = snap.data().authorId === uid
  const isPrivileged = role === 'teacher' || role === 'admin'
  if (!isAuthor && !isPrivileged) throw new Error('Không có quyền xoá')
  await deleteDoc(doc(db, 'posts', postId))
}

export async function deleteAllPostsByUser(targetUid) {
  const snap = await getDocs(
    query(collection(db, 'posts'), where('authorId', '==', targetUid))
  )
  if (snap.empty) return 0
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
  return snap.size
}

export async function deleteComment(commentId, postId) {
  await deleteDoc(doc(db, 'comments', commentId))
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) })
}

export async function isCommentLikedByUser(commentId, uid) {
  const snap = await getDoc(doc(db, 'comments', commentId, 'likes', uid))
  return snap.exists()
}

export async function toggleCommentLike(commentId, uid) {
  const likeRef    = doc(db, 'comments', commentId, 'likes', uid)
  const likeSnap   = await getDoc(likeRef)
  const commentRef = doc(db, 'comments', commentId)
  if (likeSnap.exists()) {
    await deleteDoc(likeRef)
    await updateDoc(commentRef, { likeCount: increment(-1) })
    return false
  } else {
    await setDoc(likeRef, { uid, createdAt: serverTimestamp() })
    await updateDoc(commentRef, { likeCount: increment(1) })
    return true
  }
}

export async function addComment(postId, uid, profile, content, parentId = null) {
  const data = buildCommentDoc(postId, uid, profile, content, parentId)
  const commentRef = await addDoc(collection(db, 'comments'), { ...data, createdAt: serverTimestamp() })
  const postSnap = await getDoc(doc(db, 'posts', postId))
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) })
  await addPoints(uid, POINTS.COMMENT, 'comment', commentRef.id)
  if (postSnap.exists()) {
    const postData  = postSnap.data()
    const authorId  = postData.authorId
    createNotification(authorId, {
      type:         'comment',
      fromUid:      uid,
      fromName:     profile.displayName ?? 'Ai đó',
      fromPhotoURL: profile.photoURL ?? null,
      postId,
      postSnippet:  postData.content,
    })
  }
}

export function subscribeToComments(postId, callback, onError, limitCount = null) {
  const constraints = [
    where('postId', '==', postId),
    orderBy('createdAt', 'asc'),
  ]
  if (limitCount != null) constraints.push(limit(limitCount))
  const q = query(collection(db, 'comments'), ...constraints)
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => { console.error('[subscribeToComments]', err.code, err.message); onError?.(err) },
  )
}
