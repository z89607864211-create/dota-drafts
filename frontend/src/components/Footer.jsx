import React from 'react'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p>Dota Drafts - Live Draft Viewer</p>
        <p className={styles.attribution}>
          Data sourced from dltv.org and hawk.live
        </p>
      </div>
    </footer>
  )
}