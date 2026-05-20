import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLeaderboard, useAllUsersRanked, useUserStats } from '../../mvc/controllers/usePointsController'
import useAuthStore from '../../store/useAuthStore'
import { getKindnessTitle, extractGradeBlock, derivePointsDisplay, formatNumber } from '../../lib/utils'
import { GRADE_BLOCKS } from '../../lib/constants'
import { getWeeklyRanking } from '../../services/ranking.service'
import Avatar   from '../../components/Avatar/Avatar'
import Spinner  from '../../components/Spinner/Spinner'
import styles from './LeaderboardPage.module.css'

const TIME_FILTERS  = ['Tuần này', 'Tháng này', 'Năm học', 'Tất cả']
const CLASS_FILTERS = ['Tất cả', ...GRADE_BLOCKS.map(k => `Khối ${k}`)]

const GRADE_COLORS = ['#6B6FD8','#7B6FD4','#8B6FCE','#9B70C6','#AB72BE','#BB74B6','#22C55E']

export default function LeaderboardPage() {
  const { users: allUsers, loading } = useAllUsersRanked()
  const { user, profile }   = useAuthStore()
  const { stats }           = useUserStats()

  // top 50 cho sidebar FeedPage vẫn dùng useLeaderboard — ở đây dùng toàn bộ
  const users = allUsers
  const [timeFilter,  setTimeFilter]  = useState('Tháng này')
  const [classFilter, setClassFilter] = useState('Tất cả')
  const [search,      setSearch]      = useState('')
  const [weeklyData,  setWeeklyData]  = useState([])
  const [weeklyLoading, setWeeklyLoading] = useState(false)

  const isWeekly = timeFilter === 'Tuần này'

  useEffect(() => {
    if (!isWeekly) return
    setWeeklyLoading(true)
    getWeeklyRanking(50)
      .then(rows => {
        // Merge với user profiles đã có trong users list
        const profileMap = {}
        users.forEach(u => { profileMap[u.uid] = u })
        const merged = rows
          .map(r => ({ ...profileMap[r.uid], uid: r.uid, weeklyPoints: r.weeklyPoints }))
          .filter(r => r.displayName)  // bỏ uid không có profile trong top-50 list
        setWeeklyData(merged)
      })
      .catch(e => console.error('[weeklyRanking]', e))
      .finally(() => setWeeklyLoading(false))
  }, [isWeekly, users])

  // Nguồn data theo mode
  const sourceUsers = isWeekly ? weeklyData : users
  const getPts      = u => !u ? 0 : isWeekly ? (u.weeklyPoints ?? 0) : (u.totalPoints ?? 0)

  const filtered = sourceUsers.filter(u => {
    const matchClass  = classFilter === 'Tất cả'
      || extractGradeBlock(u.grade) === parseInt(classFilter.replace('Khối ', ''), 10)
    const matchSearch = !search || u.displayName?.toLowerCase().includes(search.toLowerCase())
      || u.grade?.toLowerCase().includes(search.toLowerCase())
    return matchClass && matchSearch
  })

  const top3        = filtered.slice(0, 3)
  const maxPts      = filtered.length > 0 ? (getPts(filtered[0]) || 1) : 1
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3
  const myRank      = isWeekly
    ? weeklyData.findIndex(u => u.uid === user?.uid) + 1
    : users.findIndex(u => u.uid === user?.uid) + 1
  const myWeeklyPts = isWeekly ? (weeklyData.find(u => u.uid === user?.uid)?.weeklyPoints ?? 0) : null

  const isLoading = loading || (isWeekly && weeklyLoading)

  return (
    <div className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>🏆 Bảng xếp hạng Kindness Points</div>
        <h1 className={styles.heroTitle}>Những tấm lòng<br />tử tế nhất</h1>
        <p className={styles.heroDesc}>Những ngôi sao đang dẫn đầu bảng xếp hạng tháng này. Bạn có trong danh sách không?</p>

        {profile && (
          <div className={styles.myRank}>
            <div>
              <div className={styles.myRankNum}>#{myRank || '—'}</div>
              <div className={styles.myRankLbl}>{isWeekly ? 'Hạng tuần này' : 'Hạng của bạn'}</div>
            </div>
            <div className={styles.divider} />
            <div>
              <div className={styles.myPts}>⭐ {isWeekly ? (myWeeklyPts ?? 0) : (profile.totalPoints ?? 0)}</div>
              <div className={styles.myPtsLbl}>{isWeekly ? 'Điểm tuần này' : 'Kindness Points'}</div>
            </div>
          </div>
        )}
      </section>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterIn}>
          <span className={styles.filterLbl}>Thời gian:</span>
          <div className={styles.pills}>
            {TIME_FILTERS.map(f => (
              <button key={f}
                className={`${styles.pill} ${timeFilter === f ? styles.pillActive : ''}`}
                onClick={() => setTimeFilter(f)}
              >{f}</button>
            ))}
          </div>
          <div className={styles.sep} />
          <span className={styles.filterLbl}>Lớp:</span>
          <div className={styles.pills}>
            {CLASS_FILTERS.map(f => (
              <button key={f}
                className={`${styles.pill} ${classFilter === f ? styles.pillActive : ''}`}
                onClick={() => setClassFilter(f)}
              >{f}</button>
            ))}
          </div>
          <div className={styles.searchWrap}>
            <span className={styles.searchIco}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Tìm học sinh..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Community Stats */}
      {stats && (
        <div className={styles.statsSection}>
          {/* 4 stat cards */}
          <div className={styles.statCards}>
            <div className={`${styles.statCard} ${styles.statCardBlue}`}>
              <div className={styles.statIcon}>👩‍🎓</div>
              <div className={styles.statNum}>{formatNumber(stats.totalStudents)}</div>
              <div className={styles.statLbl}>Học sinh</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardGreen}`}>
              <div className={styles.statIcon}>👨‍🏫</div>
              <div className={styles.statNum}>{formatNumber(stats.totalTeachers)}</div>
              <div className={styles.statLbl}>Giáo viên</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardYellow}`}>
              <div className={styles.statIcon}>👥</div>
              <div className={styles.statNum}>{formatNumber(stats.total)}</div>
              <div className={styles.statLbl}>Tổng thành viên</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardOrange}`}>
              <div className={styles.statIcon}>⭐</div>
              <div className={styles.statNum}>{formatNumber(stats.totalPoints)}</div>
              <div className={styles.statLbl}>Kindness Points</div>
            </div>
          </div>

          {/* Grade breakdown */}
          <div className={styles.gradeCard}>
            <div className={styles.gradeTitle}>📊 Thống kê học sinh theo khối</div>
            <div className={styles.gradeChart}>
              {GRADE_BLOCKS.map((g, i) => {
                const count  = stats.byGrade[g] ?? 0
                const maxVal = Math.max(...Object.values(stats.byGrade), 1)
                const pct    = Math.round((count / stats.totalStudents) * 100) || 0
                return (
                  <div key={g} className={styles.gradeRow}>
                    <div className={styles.gradeLabel}>Khối {g}</div>
                    <div className={styles.gradeBarWrap}>
                      <div
                        className={styles.gradeBar}
                        style={{
                          width: `${(count / maxVal) * 100}%`,
                          background: GRADE_COLORS[i],
                        }}
                      />
                    </div>
                    <div className={styles.gradeCount}>
                      <span className={styles.gradeNum}>{count}</span>
                      <span className={styles.gradePct}>({pct}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isLoading
        ? <div className={styles.center}><Spinner size="lg" /></div>
        : (
          <div className={styles.content}>

            {isWeekly && (
              <div className={styles.weeklyBanner}>
                📅 Điểm tích lũy từ thứ Hai tuần này — cập nhật mỗi khi có hành động mới
              </div>
            )}

            {/* Podium top 3 */}
            {top3.length === 3 && (
              <div className={styles.podiumSection}>
                <div className={styles.podium}>
                  {podiumOrder.map((u, idx) => {
                    const rank   = filtered.indexOf(u) + 1
                    const pts    = getPts(u)
                    const heights = [90, 120, 70]
                    const colors  = [
                      'linear-gradient(135deg,#9CA3AF,#D1D5DB)',
                      'linear-gradient(135deg,#F59E0B,#FBBF24)',
                      'linear-gradient(135deg,#F97316,#FB923C)',
                    ]
                    return (
                      <Link key={u.uid} to={`/profile/${u.uid}`} className={styles.podiumItem}>
                        <div className={styles.podiumBadge}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</div>
                        <Avatar src={u.photoURL} name={u.displayName} uid={u.uid}
                          size={rank === 1 ? 'xxl' : 'xl'} />
                        <div className={styles.podiumName}>{u.displayName}</div>
                        <div className={styles.podiumClass}>{u.grade}</div>
                        <div className={styles.podiumPts}>⭐ {pts}</div>
                        <div className={styles.podiumTitle}>{getKindnessTitle(derivePointsDisplay(u).cyclePoints).icon} {getKindnessTitle(derivePointsDisplay(u).cyclePoints).title}</div>
                        <div className={styles.podiumStand}
                          style={{ height: heights[idx], background: colors[idx] }}>
                          {rank}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Full table */}
            <div className={styles.tableSection}>
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>🏆 Bảng xếp hạng đầy đủ · {timeFilter}</h3>
                  <span className={styles.tableCount}>{filtered.length} thành viên</span>
                </div>

                {filtered.length === 0 && (
                  <div className={styles.emptyTable}>
                    {isWeekly ? 'Chưa có hoạt động nào tuần này.' : 'Không tìm thấy kết quả.'}
                  </div>
                )}

                {filtered.map((u, i) => {
                  const isMe = u.uid === user?.uid
                  const pts  = getPts(u)
                  return (
                    <Link key={u.uid} to={`/profile/${u.uid}`}
                      className={`${styles.row} ${i < 3 ? styles.top3Row : ''} ${isMe ? styles.meRow : ''}`}>
                      <div className={`${styles.rankCol} ${i < 3 ? styles.rankEmoji : styles.rankNum}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </div>
                      <Avatar src={u.photoURL} name={u.displayName} uid={u.uid} size="medium" />
                      <div className={styles.info}>
                        <div className={styles.name}>
                          {u.displayName}
                          {isMe && <span className={styles.meTag}>● bạn</span>}
                        </div>
                        <div className={styles.sub}>
                          {u.grade}
                          <span className={styles.kindTag}>{getKindnessTitle(derivePointsDisplay(u).cyclePoints).icon} {getKindnessTitle(derivePointsDisplay(u).cyclePoints).title}</span>
                        </div>
                      </div>
                      <div className={styles.barWrap}>
                        <div className={styles.bar}>
                          <div className={styles.barFill} style={{ width: `${(pts / maxPts) * 100}%` }} />
                        </div>
                      </div>
                      <div className={`${styles.pts} ${isMe ? styles.mePts : ''}`}>
                        ⭐ {pts}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}
