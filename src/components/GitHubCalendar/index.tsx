import { useEffect, useState } from 'react'
import { ActivityCalendar } from 'react-activity-calendar'

import { fetchGitHubContributions, transformContributionsForCalendar } from '../../utils/github'
import styles from './index.module.scss'

interface CalendarData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined'
      ? (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light'
      : 'light',
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme') as 'light' | 'dark'
      if (t) setTheme(t)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return theme
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 480 : false,
  )

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 480)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

export default function GitHubCalendar() {
  const [data, setData] = useState<CalendarData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const theme = useTheme()

  useEffect(() => {
    const loadContributions = async () => {
      try {
        setLoading(true)
        const contributions = await fetchGitHubContributions()
        const transformed = transformContributionsForCalendar(contributions)
        setData(transformed)
      } catch (err) {
        setError('Failed to load contributions')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadContributions()
  }, [])

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>Loading contributions...</div>
      </div>
    )
  }

  if (error || data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.error}>Unable to load contributions</div>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.calendarWrapper}>
        <ActivityCalendar
          data={data}
          theme={{
            light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
            dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
          }}
          colorScheme={theme}
          blockSize={11}
          blockMargin={3}
          blockRadius={2}
          fontSize={14}
          labels={{
            totalCount: isMobile
              ? '{{count}} contributions'
              : '{{count}} contributions in the last year',
            legend: {
              less: 'Less',
              more: 'More',
            },
          }}
          showWeekdayLabels={false}
          showColorLegend={true}
          showMonthLabels={true}
          showTotalCount={true}
          weekStart={0}
        />
      </div>
    </div>
  )
}
