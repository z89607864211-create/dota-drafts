import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Header from './components/Header'
import Footer from './components/Footer'
import LiveDrafts from './components/LiveDrafts'
import MatchDetail from './components/MatchDetail'
import useSocket from './hooks/useSocket'
import styles from './App.module.css'

function App() {
  const [matches, setMatches] = useState([])
  const [connected, setConnected] = useState(false)
  
  useSocket(setMatches, setConnected)
  
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className={styles.app}>
          <Header connected={connected} />
          <main className={styles.main}>
            <Routes>
              <Route path="/" element={<LiveDrafts matches={matches} />} />
              <Route path="/match/:id" element={<MatchDetail />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
