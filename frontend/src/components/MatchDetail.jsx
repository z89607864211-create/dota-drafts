import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getHeroByName, getHeroImage } from '../utils/heroData'
import useSocket from '../hooks/useSocket'
import styles from './MatchDetail.module.css'

function HeroPick({ hero, type, side }) {
  const heroData = getHeroByName(hero)
  const img = getHeroImage(hero)
  return (
    <div className={`${styles.heroPick} ${styles[type]} ${styles[side]}`}>
      {img ? (
        <img src={img} alt={hero} className={styles.heroImg} loading="lazy" />
      ) : (
        <div className={styles.heroPlaceholder}>{heroData.icon}</div>
      )}
      <span className={styles.heroName}>{hero}</span>
    </div>
  )
}

export default function MatchDetail() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [matches, setMatches] = useState([])
  const [connected, setConnected] = useState(false)

  useSocket(setMatches, setConnected)

  useEffect(() => {
    const found = matches.find(m => m.id === id)
    if (found) setMatch(found)
  }, [matches, id])

  useEffect(() => {
    fetch(`/api/matches`)
      .then(r => r.json())
      .then(data => {
        setMatches(data)
        const found = data.find(m => m.id === id)
        if (found) setMatch(found)
      })
      .catch(console.error)
  }, [id])

  if (!match) {
    return (
      <div className={styles.container}>
        <Link to="/" className={styles.backLink}>← Back to matches</Link>
        <div className={styles.loading}>Loading match data...</div>
      </div>
    )
  }

  const { tournament, teamA, teamB, teamALogo, teamBLogo, bans, picks, status, format, matchTime, teamAScore, teamBScore, source } = match

  const statusLabels = {
    live: 'LIVE',
    upcoming: 'UPCOMING',
    tbd: 'TBD',
    drafting: 'DRAFTING',
    finished: 'FINISHED',
  }

  const teamAPicks = picks?.slice(0, Math.ceil(picks.length / 2)) || []
  const teamBPicks = picks?.slice(Math.ceil(picks.length / 2)) || []
  const teamABans = bans?.slice(0, Math.ceil(bans.length / 2)) || []
  const teamBBans = bans?.slice(Math.ceil(bans.length / 2)) || []

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.backLink}>← Back to matches</Link>
      
      <div className={styles.matchHeader}>
        <div className={styles.tournament}>{tournament}</div>
        {format && <div className={styles.format}>{format.toUpperCase()}</div>}
      </div>

      <div className={styles.scoreboard}>
        <div className={`${styles.team} ${styles.radiant}`}>
          {teamALogo && <img src={teamALogo} alt={teamA} className={styles.teamLogo} />}
          <div className={styles.teamInfo}>
            <div className={styles.teamName}>{teamA}</div>
            <div className={styles.side}>Radiant</div>
          </div>
          {teamAScore !== undefined && <div className={styles.score}>{teamAScore}</div>}
        </div>

        <div className={styles.vsSection}>
          <div className={`${styles.status} ${styles[status]}`}>
            {statusLabels[status] || status?.toUpperCase()}
          </div>
          <div className={styles.vs}>VS</div>
          {matchTime && <div className={styles.time}>{matchTime}</div>}
        </div>

        <div className={`${styles.team} ${styles.dire}`}>
          {teamBScore !== undefined && <div className={styles.score}>{teamBScore}</div>}
          <div className={styles.teamInfo}>
            <div className={styles.teamName}>{teamB}</div>
            <div className={styles.side}>Dire</div>
          </div>
          {teamBLogo && <img src={teamBLogo} alt={teamB} className={styles.teamLogo} />}
        </div>
      </div>

      {(picks?.length > 0 || bans?.length > 0) && (
        <div className={styles.draftSection}>
          <h2>Draft</h2>
          
          <div className={styles.draftGrid}>
            <div className={styles.draftColumn}>
              <h3>{teamA}</h3>
              
              {teamAPicks.length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Picks</span>
                  <div className={styles.heroList}>
                    {teamAPicks.map((hero, i) => (
                      <HeroPick key={`apick-${i}`} hero={hero} type="pick" side="radiant" />
                    ))}
                  </div>
                </div>
              )}
              
              {teamABans.length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Bans</span>
                  <div className={styles.heroList}>
                    {teamABans.map((hero, i) => (
                      <HeroPick key={`aban-${i}`} hero={hero} type="ban" side="radiant" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.draftDivider}></div>

            <div className={styles.draftColumn}>
              <h3>{teamB}</h3>
              
              {teamBPicks.length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Picks</span>
                  <div className={styles.heroList}>
                    {teamBPicks.map((hero, i) => (
                      <HeroPick key={`bpick-${i}`} hero={hero} type="pick" side="dire" />
                    ))}
                  </div>
                </div>
              )}
              
              {teamBBans.length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Bans</span>
                  <div className={styles.heroList}>
                    {teamBBans.map((hero, i) => (
                      <HeroPick key={`bban-${i}`} hero={hero} type="ban" side="dire" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        {source && <span className={styles.source}>Source: {source}</span>}
        <span className={styles.matchId}>Match ID: {match.id}</span>
      </div>
    </div>
  )
}
