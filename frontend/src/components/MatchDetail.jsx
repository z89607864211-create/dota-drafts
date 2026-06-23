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

function formatGameTime(seconds) {
  if (!seconds || seconds <= 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function MiniMap({ radiantTowers, direTowers, teamA, teamB }) {
  const parseTowers = (state) => {
    const bits = state.toString(2).padStart(32, '0')
    return {
      topT1: bits[0] === '1',
      topT2: bits[1] === '1',
      topT3: bits[2] === '1',
      midT1: bits[3] === '1',
      midT2: bits[4] === '1',
      midT3: bits[5] === '1',
      botT1: bits[6] === '1',
      botT2: bits[7] === '1',
      botT3: bits[8] === '1',
      raxTop: bits[9] === '1',
      raxMid: bits[10] === '1',
      raxBot: bits[11] === '1',
      ancient: bits[12] === '1'
    }
  }

  const r = parseTowers(radiantTowers)
  const d = parseTowers(direTowers)

  const Tower = ({ alive, className }) => (
    <div className={`${styles.mapTower} ${alive ? styles.alive : styles.dead} ${className || ''}`}>
      {alive ? '▲' : '×'}
    </div>
  )

  const Barracks = ({ alive }) => (
    <div className={`${styles.mapRax} ${alive ? styles.alive : styles.dead}`}>
      {alive ? '■' : '×'}
    </div>
  )

  return (
    <div className={styles.miniMap}>
      <div className={styles.mapLabel}>{teamA} (Radiant)</div>
      
      <div className={styles.mapRow}>
        <div className={styles.mapLane}>
          <span className={styles.laneName}>TOP</span>
          <div className={styles.towerLine}>
            <Tower alive={r.topT1} />
            <Tower alive={r.topT2} />
            <Tower alive={r.topT3} />
            <Barracks alive={r.raxTop} />
          </div>
        </div>
        
        <div className={styles.mapLane}>
          <span className={styles.laneName}>MID</span>
          <div className={styles.towerLine}>
            <Tower alive={r.midT1} />
            <Tower alive={r.midT2} />
            <Tower alive={r.midT3} />
            <Barracks alive={r.raxMid} />
          </div>
        </div>
        
        <div className={styles.mapLane}>
          <span className={styles.laneName}>BOT</span>
          <div className={styles.towerLine}>
            <Tower alive={r.botT1} />
            <Tower alive={r.botT2} />
            <Tower alive={r.botT3} />
            <Barracks alive={r.raxBot} />
          </div>
        </div>
      </div>

      <div className={styles.ancientRow}>
        <span className={styles.ancientLabel}>ANCIENT</span>
        <div className={`${styles.ancient} ${r.ancient ? styles.alive : styles.dead}`}>
          {r.ancient ? '◆' : '×'}
        </div>
      </div>

      <div className={styles.mapDivider}></div>

      <div className={styles.ancientRow}>
        <span className={styles.ancientLabel}>ANCIENT</span>
        <div className={`${styles.ancient} ${d.ancient ? styles.alive : styles.dead}`}>
          {d.ancient ? '◆' : '×'}
        </div>
      </div>

      <div className={styles.mapRow}>
        <div className={styles.mapLane}>
          <span className={styles.laneName}>TOP</span>
          <div className={styles.towerLine}>
            <Barracks alive={d.raxTop} />
            <Tower alive={d.topT3} />
            <Tower alive={d.topT2} />
            <Tower alive={d.topT1} />
          </div>
        </div>
        
        <div className={styles.mapLane}>
          <span className={styles.laneName}>MID</span>
          <div className={styles.towerLine}>
            <Barracks alive={d.raxMid} />
            <Tower alive={d.midT3} />
            <Tower alive={d.midT2} />
            <Tower alive={d.midT1} />
          </div>
        </div>
        
        <div className={styles.mapLane}>
          <span className={styles.laneName}>BOT</span>
          <div className={styles.towerLine}>
            <Barracks alive={d.raxBot} />
            <Tower alive={d.botT3} />
            <Tower alive={d.botT2} />
            <Tower alive={d.botT1} />
          </div>
        </div>
      </div>

      <div className={styles.mapLabel}>{teamB} (Dire)</div>
      
      <div className={styles.mapLegend}>
        <span><span className={`${styles.legendIcon} ${styles.alive}`}>▲</span> Tower</span>
        <span><span className={`${styles.legendIcon} ${styles.alive}`}>■</span> Barracks</span>
        <span><span className={`${styles.legendIcon} ${styles.alive}`}>◆</span> Ancient</span>
        <span><span className={`${styles.legendIcon} ${styles.dead}`}>×</span> Destroyed</span>
      </div>
    </div>
  )
}

function WinPrediction({ match }) {
  const { teamA, teamB, picks, teamAPicks, teamBPicks, radiantScore, direScore, gameTime, radiantLead, towerState } = match
  
  const aPicks = teamAPicks || picks?.slice(0, Math.ceil((picks?.length || 0) / 2)) || []
  const bPicks = teamBPicks || picks?.slice(Math.ceil((picks?.length || 0) / 2)) || []
  
  const calculateScore = (heroPicks) => {
    let score = 50
    const heroes = heroPicks.map(h => getHeroByName(h))
    
    let str = 0, agi = 0, int = 0
    heroes.forEach(h => {
      if (h.attribute === 'str') str++
      if (h.attribute === 'agi') agi++
      if (h.attribute === 'int') int++
    })
    
    if (str > 0 && agi > 0 && int > 0) score += 5
    if (heroPicks.length >= 5) score += 3
    
    return score
  }
  
  let teamAScore = calculateScore(aPicks)
  let teamBScore = calculateScore(bPicks)
  
  if (gameTime > 0) {
    if (radiantScore > direScore) teamAScore += (radiantScore - direScore) * 2
    if (direScore > radiantScore) teamBScore += (direScore - radiantScore) * 2
    if (radiantLead > 0) teamAScore += Math.min(radiantLead / 1000, 10)
    if (radiantLead < 0) teamBScore += Math.min(Math.abs(radiantLead) / 1000, 10)
  }
  
  const total = teamAScore + teamBScore
  const teamAPercent = Math.round((teamAScore / total) * 100)
  const teamBPercent = 100 - teamAPercent
  
  const leading = teamAPercent > teamBPercent ? teamA : teamB
  const leadingPercent = Math.max(teamAPercent, teamBPercent)
  
  const reasons = []
  if (aPicks.length >= 5 && bPicks.length < 5) reasons.push(`${teamA} has complete draft`)
  if (bPicks.length >= 5 && aPicks.length < 5) reasons.push(`${teamB} has complete draft`)
  if (radiantScore > direScore) reasons.push(`${teamA} leads in kills (${radiantScore}-${direScore})`)
  if (direScore > radiantScore) reasons.push(`${teamB} leads in kills (${direScore}-${radiantScore})`)
  if (radiantLead > 2000) reasons.push(`${teamA} has ${Math.abs(radiantLead).toLocaleString()} NW advantage`)
  if (radiantLead < -2000) reasons.push(`${teamB} has ${Math.abs(radiantLead).toLocaleString()} NW advantage`)
  if (reasons.length === 0) reasons.push('Drafts are balanced')
  
  return (
    <div className={styles.prediction}>
      <div className={styles.predictionHeader}>
        <span className={styles.predictionIcon}>📊</span>
        <span className={styles.predictionTitle}>Win Prediction</span>
      </div>
      
      <div className={styles.predictionBar}>
        <div className={`${styles.barLeft} ${teamAPercent > teamBPercent ? styles.leading : ''}`}
             style={{ width: `${teamAPercent}%` }}>
          {teamAPercent}%
        </div>
        <div className={`${styles.barRight} ${teamBPercent > teamAPercent ? styles.leading : ''}`}
             style={{ width: `${teamBPercent}%` }}>
          {teamBPercent}%
        </div>
      </div>
      
      <div className={styles.predictionTeams}>
        <span>{teamA}</span>
        <span>{teamB}</span>
      </div>
      
      <div className={styles.predictionResult}>
        <span className={styles.winnerLabel}>Favored:</span>
        <span className={styles.winnerName}>{leading}</span>
        <span className={styles.winnerPercent}>({leadingPercent}%)</span>
      </div>
      
      <div className={styles.predictionReasons}>
        {reasons.map((reason, i) => (
          <div key={i} className={styles.reason}>• {reason}</div>
        ))}
      </div>
      
      <div className={styles.predictionDisclaimer}>
        Draft-based prediction. For reference only.
      </div>
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
    fetch('/api/matches')
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

  const { tournament, teamA, teamB, teamALogo, teamBLogo, bans, picks, status, format, matchTime, teamAScore, teamBScore, source, gameTime, radiantScore, direScore, radiantLead, towerState, teamAPicks, teamBPicks, teamABans, teamBBans } = match

  const statusLabels = {
    live: 'LIVE',
    upcoming: 'UPCOMING',
    tbd: 'TBD',
    drafting: 'DRAFTING',
    finished: 'FINISHED',
  }

  const isLive = status === 'live' || (gameTime > 0)
  const showBans = !isLive || (bans?.length > 0 && gameTime < 120)

  const rScore = radiantScore ?? teamAScore ?? 0
  const dScore = direScore ?? teamBScore ?? 0

  const nwAbs = Math.abs(radiantLead || 0)
  const nwLeadingTeam = radiantLead > 0 ? teamA : (radiantLead < 0 ? teamB : null)

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
          <div className={styles.score}>{rScore}</div>
        </div>

        <div className={styles.vsSection}>
          <div className={`${styles.status} ${styles[status]}`}>
            {statusLabels[status] || status?.toUpperCase()}
          </div>
          <div className={styles.gameTime}>
            {gameTime > 0 ? formatGameTime(gameTime) : (status === 'drafting' ? 'Draft' : '—')}
          </div>
          {isLive && nwLeadingTeam && (
            <div className={styles.nwIndicator}>
              <span className={styles.nwLabel}>NET WORTH</span>
              <span className={`${styles.nwValue} ${radiantLead > 0 ? styles.positive : styles.negative}`}>
                +{nwAbs.toLocaleString()}
              </span>
              <span className={styles.nwTeam}>{nwLeadingTeam}</span>
            </div>
          )}
          {matchTime && <div className={styles.time}>{matchTime}</div>}
        </div>

        <div className={`${styles.team} ${styles.dire}`}>
          <div className={styles.score}>{dScore}</div>
          <div className={styles.teamInfo}>
            <div className={styles.teamName}>{teamB}</div>
            <div className={styles.side}>Dire</div>
          </div>
          {teamBLogo && <img src={teamBLogo} alt={teamB} className={styles.teamLogo} />}
        </div>
      </div>

      {towerState && (towerState.radiant > 0 || towerState.dire > 0) && (
        <div className={styles.towerSection}>
          <h2>Tower Status</h2>
          <MiniMap radiantTowers={towerState.radiant} direTowers={towerState.dire} teamA={teamA} teamB={teamB} />
        </div>
      )}

      {(picks?.length > 0) && (
        <div className={styles.draftSection}>
          <h2>Draft</h2>
          
          <div className={styles.draftGrid}>
            <div className={styles.draftColumn}>
              <h3>{teamA}</h3>
              
              {(teamAPicks || picks?.slice(0, Math.ceil(picks.length / 2)) || []).length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Picks</span>
                  <div className={styles.heroList}>
                    {(teamAPicks || picks?.slice(0, Math.ceil(picks.length / 2)) || []).map((hero, i) => (
                      <HeroPick key={`apick-${i}`} hero={hero} type="pick" side="radiant" />
                    ))}
                  </div>
                </div>
              )}
              
              {showBans && (teamABans || bans?.slice(0, Math.ceil(bans.length / 2)) || []).length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Bans</span>
                  <div className={styles.heroList}>
                    {(teamABans || bans?.slice(0, Math.ceil(bans.length / 2)) || []).map((hero, i) => (
                      <HeroPick key={`aban-${i}`} hero={hero} type="ban" side="radiant" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.draftDivider}></div>

            <div className={styles.draftColumn}>
              <h3>{teamB}</h3>
              
              {(teamBPicks || picks?.slice(Math.ceil(picks.length / 2)) || []).length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Picks</span>
                  <div className={styles.heroList}>
                    {(teamBPicks || picks?.slice(Math.ceil(picks.length / 2)) || []).map((hero, i) => (
                      <HeroPick key={`bpick-${i}`} hero={hero} type="pick" side="dire" />
                    ))}
                  </div>
                </div>
              )}
              
              {showBans && (teamBBans || bans?.slice(Math.ceil(bans.length / 2)) || []).length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Bans</span>
                  <div className={styles.heroList}>
                    {(teamBBans || bans?.slice(Math.ceil(bans.length / 2)) || []).map((hero, i) => (
                      <HeroPick key={`bban-${i}`} hero={hero} type="ban" side="dire" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <WinPrediction match={match} />

      <div className={styles.footer}>
        {source && <span className={styles.source}>Source: {source}</span>}
        <span className={styles.matchId}>Match ID: {match.id}</span>
      </div>
    </div>
  )
}
