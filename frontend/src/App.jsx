import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import LiveDrafts from './components/LiveDrafts'
import useSocket from './hooks/useSocket'
import styles from './App.module.css'

function App() {
  const [matches, setMatches] = useState([])
  const [connected, setConnected] = useState(false)
  
  useSocket(setMatches, setConnected)
  
  return (
    <div className={styles.app}>
      <Header connected={connected} />
      <main className={styles.main}>
        <LiveDrafts matches={matches} />
      </main>
      <Footer />
    </div>
  )
}

export default App