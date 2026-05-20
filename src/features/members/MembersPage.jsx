import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAllUsersRanked } from '../../mvc/controllers/usePointsController'
import { formatRelativeTime, extractGradeBlock, getRoleLabel } from '../../lib/utils'
import { GRADE_BLOCKS, ROLES } from '../../lib/constants'
import Avatar  from '../../components/Avatar/Avatar'
import Spinner from '../../components/Spinner/Spinner'
import styles  from './MembersPage.module.css'

const TABS = ['Học sinh', 'Giáo viên']

export default function MembersPage() {
  const { users, loading } = useAllUsersRanked()

  const [tab,         setTab]         = useState('Học sinh')
  const [search,      setSearch]      = useState('')
  const [gradeFilter, setGradeFilter] = useState('Tất cả')
  const [sortBy,      setSortBy]      = useState('points') // 'points' | 'name' | 'joined'

  const students = useMemo(() =>
    users.filter(u => u.role === ROLES.STUDENT || !u.role),
  [users])

  const teachers = useMemo(() =>
    users.filter(u => u.role === ROLES.TEACHER || u.role === ROLES.ADMIN),
  [users])

  const displayList = useMemo(() => {
    let list = tab === 'Học sinh' ? students : teachers

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.displayName?.toLowerCase().includes(q) ||
        u.grade?.toLowerCase().includes(q)
      )
    }

    if (tab === 'Học sinh' && gradeFilter !== 'Tất cả') {
      const block = parseInt(gradeFilter.replace('Khối ', ''), 10)
      list = list.filter(u => extractGradeBlock(u.grade) === block)
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'points') return (b.totalPoints ?? 0) - (a.totalPoints ?? 0)
      if (sortBy === 'name')   return (a.displayName ?? '').localeCompare(b.displayName ?? '', 'vi')
      if (sortBy === 'joined') {
        const ta = a.createdAt?.toDate?.() ?? new Date(0)
        const tb = b.createdAt?.toDate?.() ?? new Date(0)
        return tb - ta
      }
      return 0
    })
  }, [tab, students, teachers, search, gradeFilter, sortBy])

  function handleTabChange(t) {
    setTab(t)
    setSearch('')
    setGradeFilter('Tất cả')
    setSortBy(t === 'Học sinh' ? 'points' : 'name')
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <section className={styles.hero}>
        <div className={styles.heroIn}>
          <div className={styles.heroBadge}>👥 Quản lý thành viên</div>
          <h1 className={styles.heroTitle}>Danh sách thành viên</h1>
          <p className={styles.heroDesc}>
            Xem và tra cứu thông tin học sinh, giáo viên tham gia Kindness School.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>{students.length}</span>
              <span className={styles.heroStatLbl}>Học sinh</span>
            </div>
            <div className={styles.heroStatDiv} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>{teachers.length}</span>
              <span className={styles.heroStatLbl}>Giáo viên / Admin</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs + toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarIn}>
          {/* Tabs */}
          <div className={styles.tabs}>
            {TABS.map(t => (
              <button
                key={t}
                className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                onClick={() => handleTabChange(t)}
              >
                {t === 'Học sinh' ? `👩‍🎓 Học sinh (${students.length})` : `👨‍🏫 Giáo viên (${teachers.length})`}
              </button>
            ))}
          </div>

          <div className={styles.controls}>
            {/* Grade filter — chỉ hiện tab Học sinh */}
            {tab === 'Học sinh' && (
              <select
                className={styles.select}
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
              >
                <option>Tất cả</option>
                {GRADE_BLOCKS.map(g => <option key={g}>Khối {g}</option>)}
              </select>
            )}

            {/* Sort */}
            <select
              className={styles.select}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              {tab === 'Học sinh' && <option value="points">Sắp xếp: Điểm cao</option>}
              <option value="name">Sắp xếp: Tên A–Z</option>
              <option value="joined">Sắp xếp: Mới nhất</option>
            </select>

            {/* Search */}
            <div className={styles.searchWrap}>
              <span className={styles.searchIco}>🔍</span>
              <input
                className={styles.searchInput}
                placeholder={tab === 'Học sinh' ? 'Tìm học sinh...' : 'Tìm giáo viên...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.center}><Spinner size="lg" /></div>
        ) : (
          <div className={styles.tableWrap}>
            <div className={styles.tableHeader}>
              <span className={styles.tableTitle}>
                {tab === 'Học sinh'
                  ? `${gradeFilter === 'Tất cả' ? 'Tất cả học sinh' : gradeFilter}`
                  : 'Tất cả giáo viên'}
              </span>
              <span className={styles.tableCount}>{displayList.length} người</span>
            </div>

            {displayList.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔍</div>
                <p>Không tìm thấy kết quả.</p>
              </div>
            ) : tab === 'Học sinh' ? (
              /* ── Student table ── */
              <>
                <div className={styles.colHeader}>
                  <span className={styles.colRank}>#</span>
                  <span className={styles.colName}>Học sinh</span>
                  <span className={styles.colGrade}>Lớp</span>
                  <span className={styles.colPts}>Điểm</span>
                  <span className={styles.colJoined}>Tham gia</span>
                </div>
                {displayList.map((u, i) => (
                  <Link key={u.uid} to={`/profile/${u.uid}`} className={styles.row}>
                    <span className={styles.colRank}>{i + 1}</span>
                    <span className={styles.colName}>
                      <Avatar src={u.photoURL} name={u.displayName} uid={u.uid} size="small" />
                      <span className={styles.name}>{u.displayName}</span>
                    </span>
                    <span className={styles.colGrade}>
                      <span className={styles.gradeBadge}>{u.grade || '—'}</span>
                    </span>
                    <span className={styles.colPts}>⭐ {u.totalPoints ?? 0}</span>
                    <span className={styles.colJoined}>
                      {u.createdAt ? formatRelativeTime(u.createdAt) : '—'}
                    </span>
                  </Link>
                ))}
              </>
            ) : (
              /* ── Teacher table ── */
              <>
                <div className={styles.colHeader}>
                  <span className={styles.colRank}>#</span>
                  <span className={styles.colName}>Giáo viên</span>
                  <span className={styles.colRole}>Vai trò</span>
                  <span className={styles.colJoined}>Tham gia</span>
                </div>
                {displayList.map((u, i) => (
                  <Link key={u.uid} to={`/profile/${u.uid}`} className={styles.row}>
                    <span className={styles.colRank}>{i + 1}</span>
                    <span className={styles.colName}>
                      <Avatar src={u.photoURL} name={u.displayName} uid={u.uid} size="small" />
                      <span className={styles.name}>{u.displayName}</span>
                    </span>
                    <span className={styles.colRole}>
                      <span className={`${styles.roleBadge} ${u.role === ROLES.ADMIN ? styles.roleAdmin : styles.roleTeacher}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </span>
                    <span className={styles.colJoined}>
                      {u.createdAt ? formatRelativeTime(u.createdAt) : '—'}
                    </span>
                  </Link>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
