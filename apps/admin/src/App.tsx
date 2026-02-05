import { useEffect, useMemo, useState } from 'react'
import './App.css'

type MasjidConfig = {
  slug: string
  aliases?: string[]
  name: string
}

type MasjidConfigResponse = {
  masjids: MasjidConfig[]
}

type ReportTransaction = {
  id: string
  tabId: string
  tabLabel: string
  amount: number
  timestamp: string
  meta?: Record<string, string | number | string[]>
}

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'Preank@143'

const readTransactions = (): ReportTransaction[] => {
  const stored = window.localStorage.getItem('kioskTransactions')
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

const filterTransactions = (
  transactions: ReportTransaction[],
  tabId: string,
  startDate: string,
  endDate: string
) => {
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null
  const end = endDate ? new Date(`${endDate}T23:59:59`) : null
  return transactions.filter((tx) => {
    if (tabId && tx.tabId !== tabId) return false
    const ts = new Date(tx.timestamp)
    if (start && ts < start) return false
    if (end && ts > end) return false
    return true
  })
}

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const resetAllTransactions = () => {
  window.localStorage.setItem('kioskTransactions', JSON.stringify([]))
  window.localStorage.setItem('specialAppealProgress', '0')
  const reset = Array.from({ length: 30 }, () => 0)
  window.localStorage.setItem('ramadanProgress', JSON.stringify(reset))
  const channel = new BroadcastChannel('kiosk-config')
  channel.postMessage({ specialAppealProgress: 0, ramadanProgress: reset })
  channel.close()
}

const resetCategoryTransactions = (tabId: string) => {
  const stored = window.localStorage.getItem('kioskTransactions')
  if (!stored) return
  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return
    const filtered = parsed.filter((tx) => tx?.tabId !== tabId)
    window.localStorage.setItem('kioskTransactions', JSON.stringify(filtered))
    const channel = new BroadcastChannel('kiosk-config')
    if (tabId === 'special-appeals') {
      window.localStorage.setItem('specialAppealProgress', '0')
      channel.postMessage({ specialAppealProgress: 0 })
    }
    if (tabId === 'ramadan-iftaar') {
      const reset = Array.from({ length: 30 }, () => 0)
      window.localStorage.setItem('ramadanProgress', JSON.stringify(reset))
      channel.postMessage({ ramadanProgress: reset })
    }
    channel.close()
  } catch (error) {
    console.warn('Failed to reset category transactions', error)
  }
}

const formatReportRows = (rows: ReportTransaction[]) => {
  return rows.map((tx) => {
    const date = new Date(tx.timestamp)
    const people = typeof tx.meta?.people === 'number' ? tx.meta.people : ''
    const perPerson = typeof tx.meta?.perPerson === 'number' ? tx.meta.perPerson : ''
    const allocations = Array.isArray(tx.meta?.allocations)
      ? tx.meta?.allocations.join(' | ')
      : Array.isArray(tx.meta?.days)
        ? tx.meta?.days.join(' | ')
        : ''
    const appeal = typeof tx.meta?.appealName === 'string' ? tx.meta.appealName : ''
    const notes = tx.meta
      ? Object.entries(tx.meta)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' | ') : value}`)
          .join(' | ')
      : ''
    return {
      date: date.toLocaleDateString('en-GB'),
      time: date.toLocaleTimeString('en-GB'),
      amount: tx.amount,
      tab: tx.tabLabel,
      people,
      perPerson,
      allocations,
      appeal,
      notes,
    }
  })
}


const resolveMasjidSlug = () => {
  const params = new URLSearchParams(window.location.search)
  const querySlug = params.get('masjid')
  if (querySlug) return querySlug.toLowerCase()

  const hostname = window.location.hostname.toLowerCase()
  const baseDomain = 'masjid-kiosk.ijtihadlabs.org'
  if (!hostname.endsWith(baseDomain)) return null
  if (hostname === baseDomain) return null
  const slug = hostname.replace(`.${baseDomain}`, '')
  return slug || null
}

const findMasjidConfig = (configs: MasjidConfig[], slug: string | null) => {
  if (!slug) return null
  const normalized = slug.toLowerCase()
  return (
    configs.find((masjid) => masjid.slug.toLowerCase() === normalized) ||
    configs.find((masjid) =>
      masjid.aliases?.some((alias) => alias.toLowerCase() === normalized)
    ) ||
    null
  )
}

function App() {
  const previewBypass =
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'masjid-kiosk.ijtihadlabs.org') &&
    window.location.pathname.startsWith('/admin')
  const [masjidName, setMasjidName] = useState('Masjid Kiosk')
  const [isAuthed, setIsAuthed] = useState(() => {
    return previewBypass || window.sessionStorage.getItem('adminAuthed') === 'true'
  })
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginError, setLoginError] = useState('')
  const tabs = useMemo(
    () => [
      { id: 'daily-sadaqah', label: 'صدقة يومية (Sadaqah Yaumiyyah)' },
      { id: 'zakat', label: 'زكاة (Zakat)' },
      { id: 'ramadan-iftaar', label: 'إفطار رمضان (Ramadan Iftaar)' },
      { id: 'zakat-fitr', label: 'زكاة الفطر (Zakat al-Fitr)' },
      { id: 'special-appeals', label: 'نداءات خاصة (Special Appeals)' },
    ],
    []
  )
  const [enabledTabs, setEnabledTabs] = useState<string[]>(() => {
    const stored = window.localStorage.getItem('kioskTabVisibility')
    if (!stored) return ['daily-sadaqah']
    try {
      const parsed = JSON.parse(stored)
      const visibleIds = Array.isArray(parsed) ? parsed : parsed?.visibleTabs
      if (Array.isArray(visibleIds) && visibleIds.length > 0) return visibleIds
    } catch (error) {
      console.warn('Failed to parse kioskTabVisibility', error)
    }
    return ['daily-sadaqah']
  })
  const [copied, setCopied] = useState(false)

  const visibilityConfig = useMemo(
    () => JSON.stringify({ visibleTabs: enabledTabs }, null, 2),
    [enabledTabs]
  )
  const [ramadanStart, setRamadanStart] = useState(() => {
    return window.localStorage.getItem('ramadanStartDate') ?? ''
  })
  const [ramadanTarget, setRamadanTarget] = useState(() => {
    return window.localStorage.getItem('ramadanDailyTarget') ?? '300'
  })
  const [ramadanPeople, setRamadanPeople] = useState(() => {
    return window.localStorage.getItem('ramadanSponsorPeople') ?? ''
  })
  const [ramadanItemInput, setRamadanItemInput] = useState('')
  const [ramadanItems, setRamadanItems] = useState<string[]>(() => {
    const stored = window.localStorage.getItem('ramadanSponsorItems')
    if (!stored) return []
    try {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
    } catch (error) {
      return []
    }
  })
  const [sadaqahAmounts, setSadaqahAmounts] = useState<number[]>(() => {
    const stored = window.localStorage.getItem('sadaqahAmounts')
    if (!stored) return [5, 10, 20, 30, 50, 100]
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length === 6) {
        return parsed.map((value) => Number(value) || 0)
      }
    } catch (error) {
      return [5, 10, 20, 30, 50, 100]
    }
    return [5, 10, 20, 30, 50, 100]
  })
  const [sadaqahQuoteArabic, setSadaqahQuoteArabic] = useState(() => {
    return window.localStorage.getItem('sadaqahQuoteArabic') ?? ''
  })
  const [sadaqahQuoteTranslation, setSadaqahQuoteTranslation] = useState(() => {
    return (
      window.localStorage.getItem('sadaqahQuoteTranslation') ??
      'The example of those who spend their wealth in the way of Allah is like a seed which grows seven ears; in every ear is a hundred grains.'
    )
  })
  const [sadaqahQuoteRef, setSadaqahQuoteRef] = useState(() => {
    return window.localStorage.getItem('sadaqahQuoteRef') ?? 'Quran 2:261'
  })
  const [zakatQuoteArabic, setZakatQuoteArabic] = useState(() => {
    return (
      window.localStorage.getItem('zakatQuoteArabic') ??
      'خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِمْ بِهَا'
    )
  })
  const [zakatQuoteTranslation, setZakatQuoteTranslation] = useState(() => {
    return (
      window.localStorage.getItem('zakatQuoteTranslation') ??
      'Take from their wealth a charity by which you purify them and cause them to grow.'
    )
  })
  const [zakatQuoteRef, setZakatQuoteRef] = useState(() => {
    return window.localStorage.getItem('zakatQuoteRef') ?? 'Quran 9:103'
  })
  const [zakatFitrAmount, setZakatFitrAmount] = useState(() => {
    return window.localStorage.getItem('zakatFitrAmount') ?? '5'
  })
  const [zakatFitrQuoteArabic, setZakatFitrQuoteArabic] = useState(() => {
    return (
      window.localStorage.getItem('zakatFitrQuoteArabic') ??
      'طُهْرَةٌ لِلصَّائِمِ مِنَ اللَّغْوِ وَالرَّفَثِ، وَطُعْمَةٌ لِلْمَسَاكِينِ'
    )
  })
  const [zakatFitrQuoteTranslation, setZakatFitrQuoteTranslation] = useState(() => {
    return (
      window.localStorage.getItem('zakatFitrQuoteTranslation') ??
      'A purification for the fasting person from idle talk and obscenity, and a meal for the poor.'
    )
  })
  const [zakatFitrQuoteRef, setZakatFitrQuoteRef] = useState(() => {
    return window.localStorage.getItem('zakatFitrQuoteRef') ?? 'Sunan Abi Dawud'
  })
  const [specialAppealName, setSpecialAppealName] = useState(() => {
    return window.localStorage.getItem('specialAppealName') ?? 'Special Appeal'
  })
  const [specialAppealTarget, setSpecialAppealTarget] = useState(() => {
    return window.localStorage.getItem('specialAppealTarget') ?? '15000'
  })
  const [specialAppealAmounts, setSpecialAppealAmounts] = useState<number[]>(() => {
    const stored = window.localStorage.getItem('specialAppealAmounts')
    if (!stored) return [50, 100, 250]
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length === 3) {
        return parsed.map((value) => Number(value) || 0)
      }
    } catch (error) {
      return [50, 100, 250]
    }
    return [50, 100, 250]
  })
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [reportTab, setReportTab] = useState('all')
  const [reportTick, setReportTick] = useState(0)
  const [configTabId, setConfigTabId] = useState('daily-sadaqah')

  useEffect(() => {
    const loadMasjidName = async () => {
      const slug = resolveMasjidSlug()
      if (!slug) return
      try {
        const response = await fetch('/masjids.json')
        if (!response.ok) return
        const data = (await response.json()) as MasjidConfigResponse
        const match = findMasjidConfig(data.masjids || [], slug)
        if (match?.name) {
          setMasjidName(match.name)
        }
      } catch (error) {
        console.warn('Failed to load masjid config', error)
      }
    }

    loadMasjidName()
  }, [])

  const portalTitle =
    masjidName === 'Masjid Kiosk' ? 'Masjid Kiosk Portal' : `${masjidName} Admin Portal`

  useEffect(() => {
    if (enabledTabs.includes(configTabId)) return
    setConfigTabId(enabledTabs[0] ?? 'daily-sadaqah')
  }, [configTabId, enabledTabs])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReportTick((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const reportRows = useMemo(() => {
    const transactions = readTransactions()
    if (reportTab === 'all') {
      return filterTransactions(transactions, '', reportStartDate, reportEndDate)
    }
    return filterTransactions(transactions, reportTab, reportStartDate, reportEndDate)
  }, [reportEndDate, reportStartDate, reportTab, reportTick])

  const reportFormatted = useMemo(() => formatReportRows(reportRows), [reportRows])
  const reportTotal = useMemo(
    () => reportRows.reduce((sum, tx) => sum + tx.amount, 0),
    [reportRows]
  )

  const reportCsvLines = [
    ['Date', 'Time', 'Category', 'Amount', 'People', 'Per person', 'Allocations', 'Appeal', 'Notes'].join(','),
    ...reportFormatted.map((row) =>
      [
        row.date,
        row.time,
        row.tab,
        row.amount,
        row.people,
        row.perPerson,
        row.allocations,
        row.appeal,
        row.notes,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    ),
    ['', '', '', `Total: ${reportTotal}`, '', '', '', '', ''].join(','),
  ]
  const reportCsvContent = reportCsvLines.join('\n')
  const reportExcelTable = `
    <table border="1" cellspacing="0" cellpadding="6">
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Category</th>
          <th>Amount</th>
          <th>People</th>
          <th>Per person</th>
          <th>Allocations</th>
          <th>Appeal</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${reportFormatted
          .map(
            (row) =>
              `<tr><td>${row.date}</td><td>${row.time}</td><td>${row.tab}</td><td>${row.amount}</td><td>${row.people}</td><td>${row.perPerson}</td><td>${row.allocations}</td><td>${row.appeal}</td><td>${row.notes}</td></tr>`
          )
          .join('')}
        <tr><td></td><td></td><td></td><td>Total: ${reportTotal}</td><td></td><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
  `.trim()

  const handleLogin = () => {
    if (loginUser.trim() === ADMIN_USERNAME && loginPass === ADMIN_PASSWORD) {
      window.sessionStorage.setItem('adminAuthed', 'true')
      setIsAuthed(true)
      setLoginError('')
      setLoginPass('')
      return
    }
    setLoginError('Invalid username or password.')
  }

  const handleToggle = (id: string) => {
    setEnabledTabs((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
      if (next.length === 0) return current
      const payload = JSON.stringify({ visibleTabs: next })
      window.localStorage.setItem('kioskTabVisibility', payload)
      const channel = new BroadcastChannel('kiosk-config')
      channel.postMessage({ visibleTabs: next })
      channel.close()
      return next
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(visibilityConfig)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy config', error)
    }
  }

  if (!previewBypass && !isAuthed) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="admin-eyebrow">{portalTitle}</p>
          <h1>Admin Sign In</h1>
          <p className="admin-subtitle">Enter your portal credentials to continue.</p>
          <label className="auth-field">
            Username
            <input
              type="text"
              value={loginUser}
              onChange={(event) => setLoginUser(event.target.value)}
              placeholder="Username"
              autoComplete="username"
            />
          </label>
          <label className="auth-field">
            Password
            <input
              type="password"
              value={loginPass}
              onChange={(event) => setLoginPass(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
            />
          </label>
          {loginError && <p className="auth-error">{loginError}</p>}
          <div className="auth-actions">
            <button className="admin-action" onClick={handleLogin}>
              Sign in
            </button>
          </div>
          <p className="auth-note">Access is restricted to authorized masjid admins.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">{portalTitle}</p>
          <h1>{masjidName}</h1>
          <p className="admin-subtitle">Manage tabs, causes, and kiosk settings in one place.</p>
        </div>
        <div className="admin-badge">
          <span>Authenticated</span>
          {!previewBypass && (
            <button
              className="ghost"
              onClick={() => {
                window.sessionStorage.removeItem('adminAuthed')
                setIsAuthed(false)
                setLoginUser('')
                setLoginPass('')
                setLoginError('')
              }}
            >
              Log out
            </button>
          )}
        </div>
      </header>

      <main className="admin-grid">
        <section className="admin-card span-2 config-panel">
          <div className="config-layout">
            <div className="config-left">
              <h2>Configuration Panel</h2>
              <p className="admin-note">
                Select which tabs are visible and configure one tab at a time.
              </p>
              <div className="tab-toggle-list">
                {tabs.map((tab) => (
                  <label key={tab.id} className="tab-toggle">
                    <input
                      type="checkbox"
                      checked={enabledTabs.includes(tab.id)}
                      onChange={() => handleToggle(tab.id)}
                    />
                    <span>{tab.label}</span>
                  </label>
                ))}
              </div>
              <div className="config-box">
                <pre>{visibilityConfig}</pre>
              </div>
              <button className="admin-action" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy visibility config'}
              </button>
              <label className="config-select">
                Configure tab
                <select
                  value={configTabId}
                  onChange={(event) => setConfigTabId(event.target.value)}
                >
                  {tabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="config-right">
              {!enabledTabs.includes(configTabId) ? (
                <p className="admin-note">Enable this tab to edit its settings.</p>
              ) : null}
              {configTabId === 'daily-sadaqah' && enabledTabs.includes('daily-sadaqah') && (
                <div className="config-section">
                  <h3>Daily Sadaqah</h3>
                  <p className="admin-note">Set preset tiles and the quote.</p>
                  <div className="amount-grid-admin">
                    {sadaqahAmounts.map((value, index) => (
                      <label key={`sadaqah-${index}`}>
                        Amount {index + 1}
                        <input
                          type="number"
                          min="1"
                          value={value}
                          onChange={(event) => {
                            const next = [...sadaqahAmounts]
                            next[index] = Number.parseInt(event.target.value, 10) || 0
                            setSadaqahAmounts(next)
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="zakat-quote-fields">
                    <label>
                      Arabic quote (optional)
                      <textarea
                        value={sadaqahQuoteArabic}
                        onChange={(event) => setSadaqahQuoteArabic(event.target.value)}
                      />
                    </label>
                    <label>
                      Translation
                      <textarea
                        value={sadaqahQuoteTranslation}
                        onChange={(event) => setSadaqahQuoteTranslation(event.target.value)}
                      />
                    </label>
                    <label>
                      Reference
                      <input
                        type="text"
                        value={sadaqahQuoteRef}
                        onChange={(event) => setSadaqahQuoteRef(event.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    className="admin-action"
                    onClick={() => {
                      const normalized = sadaqahAmounts
                        .map((value) => Number(value) || 0)
                        .filter((value) => value > 0)
                      if (normalized.length === 6) {
                        window.localStorage.setItem('sadaqahAmounts', JSON.stringify(normalized))
                        const channel = new BroadcastChannel('kiosk-config')
                        channel.postMessage({ sadaqahAmounts: normalized })
                        channel.close()
                      }
                      window.localStorage.setItem('sadaqahQuoteArabic', sadaqahQuoteArabic)
                      window.localStorage.setItem(
                        'sadaqahQuoteTranslation',
                        sadaqahQuoteTranslation
                      )
                      window.localStorage.setItem('sadaqahQuoteRef', sadaqahQuoteRef)
                      const channel = new BroadcastChannel('kiosk-config')
                      channel.postMessage({
                        sadaqahQuoteArabic,
                        sadaqahQuoteTranslation,
                        sadaqahQuoteRef,
                      })
                      channel.close()
                    }}
                  >
                    Save Daily Sadaqah
                  </button>
                </div>
              )}
              {configTabId === 'zakat' && enabledTabs.includes('zakat') && (
                <div className="config-section">
                  <h3>Zakat</h3>
                  <div className="zakat-quote-fields">
                    <label>
                      Arabic quote
                      <textarea
                        value={zakatQuoteArabic}
                        onChange={(event) => setZakatQuoteArabic(event.target.value)}
                      />
                    </label>
                    <label>
                      Translation
                      <textarea
                        value={zakatQuoteTranslation}
                        onChange={(event) => setZakatQuoteTranslation(event.target.value)}
                      />
                    </label>
                    <label>
                      Reference
                      <input
                        type="text"
                        value={zakatQuoteRef}
                        onChange={(event) => setZakatQuoteRef(event.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    className="admin-action"
                    onClick={() => {
                      window.localStorage.setItem('zakatQuoteArabic', zakatQuoteArabic)
                      window.localStorage.setItem('zakatQuoteTranslation', zakatQuoteTranslation)
                      window.localStorage.setItem('zakatQuoteRef', zakatQuoteRef)
                      const channel = new BroadcastChannel('kiosk-config')
                      channel.postMessage({
                        zakatQuoteArabic,
                        zakatQuoteTranslation,
                        zakatQuoteRef,
                      })
                      channel.close()
                    }}
                  >
                    Save Zakat
                  </button>
                </div>
              )}
              {configTabId === 'ramadan-iftaar' && enabledTabs.includes('ramadan-iftaar') && (
                <div className="config-section">
                  <h3>Ramadan Iftaar</h3>
                  <div className="ramadan-settings">
                    <label>
                      Ramadan start date
                      <input
                        type="date"
                        value={ramadanStart}
                        onChange={(event) => setRamadanStart(event.target.value)}
                      />
                    </label>
                    <label>
                      Daily target (£)
                      <input
                        type="number"
                        min="1"
                        value={ramadanTarget}
                        onChange={(event) => setRamadanTarget(event.target.value)}
                      />
                    </label>
                    <label>
                      People served per day
                      <input
                        type="number"
                        min="1"
                        value={ramadanPeople}
                        onChange={(event) => setRamadanPeople(event.target.value)}
                      />
                    </label>
                    <label>
                      Food items per person
                      <div className="ramadan-items">
                        <input
                          type="text"
                          value={ramadanItemInput}
                          onChange={(event) => setRamadanItemInput(event.target.value)}
                          placeholder="e.g., Dates"
                        />
                        <button
                          type="button"
                          className="admin-action"
                          onClick={() => {
                            const trimmed = ramadanItemInput.trim()
                            if (!trimmed) return
                            setRamadanItems((current) => [...current, trimmed])
                            setRamadanItemInput('')
                          }}
                        >
                          Add
                        </button>
                      </div>
                      {ramadanItems.length > 0 && (
                        <ul className="ramadan-item-list">
                          {ramadanItems.map((item, index) => (
                            <li key={`${item}-${index}`}>
                              {item}
                              <button
                                type="button"
                                onClick={() =>
                                  setRamadanItems((current) =>
                                    current.filter((_, idx) => idx !== index)
                                  )
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </label>
                  </div>
                  <button
                    className="admin-action"
                    onClick={() => {
                      if (ramadanStart) {
                        window.localStorage.setItem('ramadanStartDate', ramadanStart)
                      }
                      const target = Number.parseInt(ramadanTarget, 10)
                      if (Number.isFinite(target) && target > 0) {
                        window.localStorage.setItem('ramadanDailyTarget', String(target))
                      }
                      const people = Number.parseInt(ramadanPeople, 10)
                      if (Number.isFinite(people) && people > 0) {
                        window.localStorage.setItem('ramadanSponsorPeople', String(people))
                      }
                      window.localStorage.setItem(
                        'ramadanSponsorItems',
                        JSON.stringify(ramadanItems)
                      )
                      const channel = new BroadcastChannel('kiosk-config')
                      channel.postMessage({
                        ramadanStartDate: ramadanStart,
                        ramadanDailyTarget: target,
                        ramadanSponsorPeople: people,
                        ramadanSponsorItems: ramadanItems,
                      })
                      channel.close()
                    }}
                  >
                    Save Ramadan settings
                  </button>
                  <button
                    className="admin-action"
                    onClick={() => {
                      const reset = Array.from({ length: 30 }, () => 0)
                      window.localStorage.setItem('ramadanProgress', JSON.stringify(reset))
                      const channel = new BroadcastChannel('kiosk-config')
                      channel.postMessage({ ramadanProgress: reset })
                      channel.close()
                    }}
                  >
                    Reset Ramadan progress
                  </button>
                </div>
              )}
              {configTabId === 'zakat-fitr' && enabledTabs.includes('zakat-fitr') && (
                <div className="config-section">
                  <h3>Zakat al-Fitr</h3>
                  <label className="zakat-fitr-field">
                    Amount per person (£)
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={zakatFitrAmount}
                      onChange={(event) => setZakatFitrAmount(event.target.value)}
                    />
                  </label>
                  <div className="zakat-quote-fields">
                    <label>
                      Arabic quote
                      <textarea
                        value={zakatFitrQuoteArabic}
                        onChange={(event) => setZakatFitrQuoteArabic(event.target.value)}
                      />
                    </label>
                    <label>
                      Translation
                      <textarea
                        value={zakatFitrQuoteTranslation}
                        onChange={(event) => setZakatFitrQuoteTranslation(event.target.value)}
                      />
                    </label>
                    <label>
                      Reference
                      <input
                        type="text"
                        value={zakatFitrQuoteRef}
                        onChange={(event) => setZakatFitrQuoteRef(event.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    className="admin-action"
                    onClick={() => {
                      const normalized = Number.parseFloat(zakatFitrAmount)
                      if (Number.isFinite(normalized) && normalized > 0) {
                        window.localStorage.setItem('zakatFitrAmount', String(normalized))
                      }
                      window.localStorage.setItem('zakatFitrQuoteArabic', zakatFitrQuoteArabic)
                      window.localStorage.setItem(
                        'zakatFitrQuoteTranslation',
                        zakatFitrQuoteTranslation
                      )
                      window.localStorage.setItem('zakatFitrQuoteRef', zakatFitrQuoteRef)
                      const channel = new BroadcastChannel('kiosk-config')
                      channel.postMessage({
                        zakatFitrAmount: Number.parseFloat(zakatFitrAmount),
                        zakatFitrQuoteArabic,
                        zakatFitrQuoteTranslation,
                        zakatFitrQuoteRef,
                      })
                      channel.close()
                    }}
                  >
                    Save Zakat al-Fitr
                  </button>
                </div>
              )}
              {configTabId === 'special-appeals' && enabledTabs.includes('special-appeals') && (
                <div className="config-section">
                  <h3>Special Appeal</h3>
                  <label className="zakat-fitr-field">
                    Appeal name
                    <input
                      type="text"
                      value={specialAppealName}
                      onChange={(event) => setSpecialAppealName(event.target.value)}
                    />
                  </label>
                  <label className="zakat-fitr-field">
                    Target amount (£)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={specialAppealTarget}
                      onChange={(event) => setSpecialAppealTarget(event.target.value)}
                    />
                  </label>
                  <div className="amount-grid-admin">
                    {specialAppealAmounts.map((value, index) => (
                      <label key={`appeal-${index}`}>
                        Preset {index + 1}
                        <input
                          type="number"
                          min="1"
                          value={value}
                          onChange={(event) => {
                            const next = [...specialAppealAmounts]
                            next[index] = Number.parseInt(event.target.value, 10) || 0
                            setSpecialAppealAmounts(next)
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="admin-action"
                    onClick={() => {
                      const target = Number.parseInt(specialAppealTarget, 10)
                      const normalized = specialAppealAmounts
                        .map((value) => Number(value) || 0)
                        .filter((value) => value > 0)
                      if (!Number.isFinite(target) || target <= 0) return
                      if (normalized.length !== 3) return
                      window.localStorage.setItem('specialAppealName', specialAppealName.trim())
                      window.localStorage.setItem('specialAppealTarget', String(target))
                      window.localStorage.setItem('specialAppealAmounts', JSON.stringify(normalized))
                      const channel = new BroadcastChannel('kiosk-config')
                      channel.postMessage({
                        specialAppealName: specialAppealName.trim(),
                        specialAppealTarget: target,
                        specialAppealAmounts: normalized,
                      })
                      channel.close()
                    }}
                  >
                    Save Special Appeal
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="admin-card report-card">
          <h2>Reporting</h2>
          <p className="admin-note">Live transactions across all tabs.</p>
          <div className="report-filters">
            <label>
              Start date
              <input
                type="date"
                value={reportStartDate}
                onChange={(event) => setReportStartDate(event.target.value)}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={reportEndDate}
                onChange={(event) => setReportEndDate(event.target.value)}
              />
            </label>
            <label>
              Category
              <select value={reportTab} onChange={(event) => setReportTab(event.target.value)}>
                <option value="all">All tabs</option>
                <option value="daily-sadaqah">Daily Sadaqah</option>
                <option value="zakat">Zakat</option>
                <option value="ramadan-iftaar">Ramadan Iftaar</option>
                <option value="zakat-fitr">Zakat al-Fitr</option>
                <option value="special-appeals">Special Appeal</option>
              </select>
            </label>
          </div>
          <div className="report-actions">
            <button
              className="admin-action"
              onClick={() =>
                downloadFile(
                  reportCsvContent,
                  `report-${reportTab}.csv`,
                  'text/csv;charset=utf-8;'
                )
              }
            >
              Download CSV
            </button>
            <button
              className="admin-action"
              onClick={() =>
                downloadFile(
                  reportExcelTable,
                  `report-${reportTab}.xls`,
                  'application/vnd.ms-excel'
                )
              }
            >
              Download Excel
            </button>
            <button
              className="ghost"
              onClick={() => {
                const win = window.open('', '_blank')
                if (!win) return
                win.document.write(`
                  <html>
                    <head><title>Report</title></head>
                    <body>
                      <h2>Report</h2>
                      <p>Total: ${reportTotal}</p>
                      ${reportExcelTable}
                    </body>
                  </html>
                `)
                win.document.close()
                win.focus()
                win.print()
              }}
            >
              Print / PDF
            </button>
            <button
              className="ghost warn"
              disabled={reportTab === 'all'}
              onClick={() => {
                if (reportTab === 'all') return
                const ok = window.confirm('Reset selected category transactions?')
                if (!ok) return
                resetCategoryTransactions(reportTab)
              }}
            >
              Reset category
            </button>
            <button
              className="ghost danger"
              onClick={() => {
                const ok = window.confirm('Reset all transactions?')
                if (!ok) return
                resetAllTransactions()
              }}
            >
              Reset all data
            </button>
          </div>
          <div className="report-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>People</th>
                  <th>Per person</th>
                  <th>Allocations</th>
                  <th>Appeal</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {reportFormatted.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No transactions yet.</td>
                  </tr>
                ) : (
                  reportFormatted.map((row, index) => (
                    <tr key={`${row.date}-${row.time}-${index}`}>
                      <td>{row.date}</td>
                      <td>{row.time}</td>
                      <td>{row.tab}</td>
                      <td>£{row.amount}</td>
                      <td>{row.people}</td>
                      <td>{row.perPerson}</td>
                      <td>{row.allocations}</td>
                      <td>{row.appeal}</td>
                      <td>{row.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td>£{reportTotal}</td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

      </main>
    </div>
  )
}

export default App
