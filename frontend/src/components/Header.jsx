import React from 'react'
import { useTheme } from '../contexts/ThemeContext'
import styles from './Header.module.css'

export default function Header({ connected }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.icon}>🎮</span>
        <h1>Dota Drafts</h1>
      </div>
      <nav className={styles.nav}>
        <a href="/" className={styles.active}>Live</a>
        <a href="/history" className={styles.disabled}>History</a>
      </nav>
      <div className={styles.rightSection}>
        <button onClick={toggleTheme} className={styles.themeToggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className={styles.status}>
          <span className={`${styles.dot} ${connected ? styles.online : styles.offline}`}></span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </header>
  )
}
