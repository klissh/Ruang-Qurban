'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [visible, setVisible]   = useState(false)
  const [width, setWidth]       = useState(0)
  const prevPathname = useRef(pathname)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef   = useRef<ReturnType<typeof setTimeout>  | null>(null)

  // Deteksi klik pada link → mulai animasi progress
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      // Skip: anchor link, external link, link ke halaman yang sama
      if (!href || href.startsWith('#') || href.startsWith('http') || href === pathname) return

      // Reset timer sebelumnya
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current)  clearTimeout(timeoutRef.current)

      setVisible(true)
      setWidth(12)

      // Crawl pelan menuju 85% — tidak pernah 100% sampai navigasi selesai
      let current = 12
      intervalRef.current = setInterval(() => {
        current = current + (88 - current) * 0.12
        setWidth(Math.min(current, 85))
      }, 120)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  // Pathname berubah → navigasi selesai, complete bar lalu fade out
  useEffect(() => {
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname

    if (intervalRef.current) clearInterval(intervalRef.current)

    setWidth(100)
    timeoutRef.current = setTimeout(() => {
      setVisible(false)
      setWidth(0)
    }, 400)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position:   'fixed',
        top:        0,
        left:       0,
        height:     3,
        width:      `${width}%`,
        zIndex:     99999,
        background: 'linear-gradient(90deg, #10b981 0%, #34d399 60%, #6ee7b7 100%)',
        boxShadow:  '0 0 10px rgba(16,185,129,0.7), 0 0 4px rgba(52,211,153,0.5)',
        transition: width === 100
          ? 'width 0.25s ease-out'
          : 'width 0.5s ease-out',
        borderRadius: '0 2px 2px 0',
      }}
    />
  )
}
