import { useState, useEffect, useCallback } from 'react'
import {
  subscribeToStories, subscribeToFeaturedStories,
  createStory, updateStory, deleteStory,
} from '../../services/story.service'
import { uploadStoryCover } from '../../services/storage.service'
import useAuthStore from '../../store/useAuthStore'

export function useStoriesController() {
  const [stories,  setStories]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const { user, profile } = useAuthStore()

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeToStories(
      data => { setStories(data); setLoading(false) },
      err  => { setError(err.message); setLoading(false) },
    )
    return unsub
  }, [])

  const handleCreate = useCallback(async (data, coverFile) => {
    if (!user || !profile) throw new Error('Chưa đăng nhập')
    const storyId = await createStory(user.uid, profile, data)
    if (coverFile) {
      const url = await uploadStoryCover(storyId, coverFile)
      await updateStory(storyId, user.uid, profile.role, { ...data, imageUrl: url })
    }
    return storyId
  }, [user, profile])

  const handleUpdate = useCallback(async (storyId, data, coverFile) => {
    if (!user || !profile) throw new Error('Chưa đăng nhập')
    let finalData = { ...data }
    if (coverFile) {
      const url = await uploadStoryCover(storyId, coverFile)
      finalData = { ...finalData, imageUrl: url }
    }
    await updateStory(storyId, user.uid, profile.role, finalData)
  }, [user, profile])

  const handleDelete = useCallback(async (storyId) => {
    if (!user || !profile) throw new Error('Chưa đăng nhập')
    await deleteStory(storyId, user.uid, profile.role)
  }, [user, profile])

  return { stories, loading, error, handleCreate, handleUpdate, handleDelete }
}

export function useFeaturedStories() {
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    const unsub = subscribeToFeaturedStories(
      data => setFeatured(data),
      err  => console.error('[useFeaturedStories]', err.message),
    )
    return unsub
  }, [])

  return featured
}
