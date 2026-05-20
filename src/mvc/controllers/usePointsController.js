import { useState, useEffect } from 'react'
import { subscribeToLeaderboard, subscribeToAllUsersRanked, getUserRank, getUserStats } from '../../services/user.service'
import useAuthStore from '../../store/useAuthStore'

export function useLeaderboard(n = 10) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToLeaderboard(
      data => { setUsers(data); setLoading(false) },
      ()   => setLoading(false),
      n,
    )
    return unsub
  }, [n])

  return { users, loading }
}

export function useAllUsersRanked() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToAllUsersRanked(
      data => { setUsers(data); setLoading(false) },
      ()   => setLoading(false),
    )
    return unsub
  }, [])

  return { users, loading }
}

export function useUserStats() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserStats()
      .then(setStats)
      .catch(e => console.error('[useUserStats]', e))
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}

export function useMyRank() {
  const { user } = useAuthStore()
  const [rank,    setRank]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserRank(user.uid)
      .then(setRank)
      .finally(() => setLoading(false))
  }, [user?.uid])

  return { rank, loading }
}
