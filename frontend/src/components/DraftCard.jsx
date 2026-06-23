import React from 'react'
import { Link } from 'react-router-dom'
import { getHeroByName, getHeroImage } from '../utils/heroData'
import styles from './DraftCard.module.css'

function HeroPill({ hero, type }) {
  const heroData = getHeroByName(hero)
  const img = getHeroImage(hero)
  return (
    <div className={`${styles.hero} ${styles[type]}`}>
      {img ? (
        <img src={img} alt={hero} className={styles.heroImg} loading="lazy" />
      ) : (
        <span className={styles.heroIcon}>{heroData.icon}</span>
      )}
      <span className={styles.heroName}>{hero}</span>
    </div>
  )
}

export default function DraftCard({ match }) {
  const { id, tournament, teamA, teamB, teamALogo, teamBLogo, bans, picks, status, format, matchTime, teamAScore, teamBScore, source } = match

  const statusLabels = {
    live: 'LIVE',
    upcoming: 'UPCOMING',
    tbd: 'TBD',
    drafting: 'DRAFTING',
    finished: 'FINISHED',
  }

  return (
    <Link to={`/match/${id}`} className={`${styles.card} ${status === 'live' ? styles.cardLive : ''}`}>
      <div className={styles.header}>
        <span className={styles.tournament}>{tournament || 'Unknown Tournament'}</span>
        {format && <span className={styles.format}>{format.toUpperCase()}</span>}
      </div>
      
      <div className={styles.teams}>
        <div className={styles.team}>
          {teamALogo && <img src={teamALogo} alt={teamA} className={styles.teamLogo} loading="lazy" />}
          <span className={styles.teamName}>{teamA || 'TBD'}</span>
          {teamAScore !== undefined && <span className={styles.score}>{teamAScore}</span>}
        </div>
        <span className={styles.vs}>VS</span>
        <div className={styles.team}>
          {teamBLogo && <img src={teamBLogo} alt={teamB} className={styles.teamLogo} loading="lazy" />}
          <span className={styles.teamName}>{teamB || 'TBD'}</span>
          {teamBScore !== undefined && <span className={styles.score}>{teamBScore}</span>}
        </div>
      </div>
      
      {(bans?.length > 0 || picks?.length > 0) && (
        <div className={styles.draftSection}>
          {bans?.length > 0 && (
            <div className={styles.phase}>
              <span className={styles.phaseLabel}>Bans</span>
              <div className={styles.heroList}>
                {bans.map((hero, i) => <HeroPill key={`ban-${i}`} hero={hero} type="ban" />)}
              </div>
            </div>
          )}
          {picks?.length > 0 && (
            <div className={styles.phase}>
              <span className={styles.phaseLabel}>Picks</span>
              <div className={styles.heroList}>
                {picks.map((hero, i) => <HeroPill key={`pick-${i}`} hero={hero} type="pick" />)}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={styles.footer}>
        <div className={`${styles.status} ${styles[status] || styles.unknown}`}>
          {statusLabels[status] || status?.toUpperCase() || 'UNKNOWN'}
        </div>
        {matchTime && <span className={styles.time}>{matchTime}</span>}
        {source && <span className={styles.source}>{source}</span>}
      </div>
    </Link>
  )
}
