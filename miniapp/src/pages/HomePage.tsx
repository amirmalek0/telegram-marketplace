import { useState, useEffect, useRef } from 'react'
import { useTelegramAuth } from '../hooks/useTelegramAuth'
import { ApiClient } from '../api/client'

interface UserResponse {
  id: string
  first_name: string
  last_name: string
  username: string
  telegram_id: number
  phone_number: string
  has_active_plan: boolean
  active_plan_id?: string
  wallet_balance: number
  plan_expire_at?: string
  referred_by?: number
  is_banned: boolean
  created_at: string
}

export default function HomePage() {
  const { user, initDataRaw, isAvailable } = useTelegramAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserResponse | null>(null)
  const initialized = useRef(false)

  const api = new ApiClient({ initDataRaw: initDataRaw || undefined })

  useEffect(() => {
    if (!user || !initDataRaw || initialized.current) return
    initialized.current = true

    const init = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await api.post<UserResponse>('/users', {
          first_name: user.firstName,
          last_name: user.lastName || '',
          username: user.username || '',
          telegram_id: user.id,
        })
        setUserData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize user')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [user, initDataRaw])

  if (!isAvailable) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.error}>
            Telegram WebApp is not available. Please open this page inside Telegram.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome</h1>

      {loading && (
        <div style={styles.card}>
          <p style={styles.muted}>Loading...</p>
        </div>
      )}

      {error && (
        <div style={styles.card}>
          <p style={styles.error}>{error}</p>
        </div>
      )}

      {userData && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>User Information</h2>
          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={styles.label}>ID</td>
                <td style={styles.value}>{userData.id}</td>
              </tr>
              <tr>
                <td style={styles.label}>First Name</td>
                <td style={styles.value}>{userData.first_name}</td>
              </tr>
              <tr>
                <td style={styles.label}>Last Name</td>
                <td style={styles.value}>{userData.last_name || '—'}</td>
              </tr>
              <tr>
                <td style={styles.label}>Username</td>
                <td style={styles.value}>{userData.username ? `@${userData.username}` : '—'}</td>
              </tr>
              <tr>
                <td style={styles.label}>Telegram ID</td>
                <td style={styles.value}>{userData.telegram_id}</td>
              </tr>
              <tr>
                <td style={styles.label}>Phone</td>
                <td style={styles.value}>{userData.phone_number || '—'}</td>
              </tr>
              <tr>
                <td style={styles.label}>Wallet Balance</td>
                <td style={styles.value}>{userData.wallet_balance}</td>
              </tr>
              <tr>
                <td style={styles.label}>Has Active Plan</td>
                <td style={styles.value}>{userData.has_active_plan ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style={styles.label}>Is Banned</td>
                <td style={styles.value}>{userData.is_banned ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style={styles.label}>Created At</td>
                <td style={styles.value}>{new Date(userData.created_at).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: 16,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    color: '#333',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  label: {
    padding: '6px 8px',
    fontWeight: 600,
    color: '#666',
    fontSize: 13,
    borderBottom: '1px solid #f0f0f0',
    width: '35%',
  },
  value: {
    padding: '6px 8px',
    fontSize: 14,
    color: '#111',
    borderBottom: '1px solid #f0f0f0',
  },
  muted: {
    color: '#999',
    fontSize: 14,
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    color: '#dc3545',
    fontWeight: 500,
  },
}
