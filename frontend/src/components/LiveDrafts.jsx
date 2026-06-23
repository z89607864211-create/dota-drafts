import React, { useMemo, useState } from 'react'
import DraftCard from './DraftCard'
import styles from './LiveDrafts.module.css'

const STATUS_ORDER = { live: 0, drafting: 1, upcoming: 2, tbd: 3, finished: 4 }

function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 5
    const sb = STATUS_ORDER[b.status] ?? 5
    if (sa !== sb) return sa - sb
    if (a.matchTime && b.matchTime) return a.matchTime.localeCompare(b.matchTime)
    return 0
  })
}

function SkeletonCard() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`}>
      <div className={styles.skelLine} style={{ width: '60%' }} />
      <div className={styles.skelTeams}>
        <div className={styles.skelCircle} />
        <div className={styles.skelLine} style={{ width: 40 }} />
        <div className={styles.skelCircle} />
      </div>
      <div className={styles.skelLine} style={{ width: '100%' }} />
      <div className={styles.skelLine} style={{ width: '80%' }} />
    </div>
  )
}

export default function LiveDrafts({ matches }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const sorted = useMemo(() => {
    if (!matches || matches.length === 0) return []
    let filtered = sortMatches(matches)

    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(m =>
        m.teamA?.toLowerCase().includes(q) ||
        m.teamB?.toLowerCase().includes(q) ||
        m.tournament?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [matches, statusFilter, searchQuery])

  const liveCount = matches?.filter(m => m.status === 'live').length || 0
  const draftingCount = matches?.filter(m => m.status === 'drafting').length || 0
  const upcomingCount = matches?.filter(m => m.status === 'upcoming').length || 0

  if (!matches) {
    return (
      <div className={styles.container}>
        <h2>Live Drafts</h2>
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>
          {liveCount > 0 ? (
            <><span className={styles.liveIndicator} /> Live ({liveCount})</>
          ) : (
            <>Matches ({matches.length})</>
          )}
        </h2>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search teams or tournament..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.statusFilters}>
          <button
            className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.active : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({matches.length})
          </button>
          {liveCount > 0 && (
            <button
              className={`${styles.filterBtn} ${styles.liveBtn} ${statusFilter === 'live' ? styles.active : ''}`}
              onClick={() => setStatusFilter('live')}
            >
              Live ({liveCount})
            </button>
          )}
          {draftingCount > 0 && (
            <button
              className={`${styles.filterBtn} ${styles.draftingBtn} ${statusFilter === 'drafting' ? styles.active : ''}`}
              onClick={() => setStatusFilter('drafting')}
            >
              Drafting ({draftingCount})
            </button>
          )}
          {upcomingCount > 0 && (
            <button
              className={`${styles.filterBtn} ${styles.upcomingBtn} ${statusFilter === 'upcoming' ? styles.active : ''}`}
              onClick={() => setStatusFilter('upcoming')}
            >
              Upcoming ({upcomingCount})
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎮</div>
          <p>No matches{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}{searchQuery ? ` matching "${searchQuery}"` : ''}</p>
          <p className={styles.hint}>{searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Matches will appear here when they start'}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {sorted.map(match => (
            <DraftCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}
