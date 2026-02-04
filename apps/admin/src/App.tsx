import { useMemo, useState } from 'react'
import './App.css'

function App() {
  const tabs = useMemo(
    () => [
      { id: 'daily-sadaqah', label: 'صدقة يومية (Sadaqah Yaumiyyah)' },
      { id: 'zakat', label: 'زكاة (Zakat)' },
      { id: 'ramadan-iftaar', label: 'إفطار رمضان (Ramadan Iftaar)' },
      { id: 'zakat-fitr', label: 'زكاة الفطر (Zakat al-Fitr)' },
      { id: 'special-appeals', label: 'نداءات خاصة (Special Appeals)' },
      { id: 'udhiyah', label: 'أضحية (Udhiyah)' },
      { id: 'other', label: 'أخرى (Other)' },
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

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Masjid Admin Portal</p>
          <h1>Al-Madani Masjid</h1>
          <p className="admin-subtitle">Manage tabs, causes, and kiosk settings in one place.</p>
        </div>
        <div className="admin-badge">TOTP Enabled</div>
      </header>

      <main className="admin-grid">
        <section className="admin-card">
          <h2>Tab visibility</h2>
          <p className="admin-note">
            Select which tabs are visible. Updates appear instantly on the kiosk when
            both screens are open.
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
        </section>

        <section className="admin-card">
          <h2>Daily Sadaqah amounts</h2>
          <p className="admin-note">Set the six preset tiles for صدقة يومية.</p>
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
            }}
          >
            Save Sadaqah amounts
          </button>
        </section>

        <section className="admin-card">
          <h2>Sadaqah quote</h2>
          <p className="admin-note">Update the Arabic quote, translation, and reference.</p>
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
            Save Sadaqah quote
          </button>
        </section>

        <section className="admin-card">
          <h2>Zakat quote</h2>
          <p className="admin-note">Update the Arabic quote, translation, and reference.</p>
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
            Save Zakat quote
          </button>
        </section>

        <section className="admin-card">
          <h2>Ramadan settings</h2>
          <p className="admin-note">Set the first day of Ramadan and a daily target.</p>
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
        </section>

        <section className="admin-card">
          <h2>Reporting</h2>
          <ul>
            <li>Daily, weekly, monthly, yearly totals</li>
            <li>Time-of-day and day-of-week insights</li>
            <li>Gift Aid opt-in counts</li>
            <li>Ramadan sponsorship progress</li>
          </ul>
        </section>

        <section className="admin-card">
          <h2>Integrations</h2>
          <ul>
            <li>SumUp Air pairing (Bluetooth)</li>
            <li>Gift Aid + recurring via KindLink</li>
            <li>Receipt prompt (SumUp)</li>
          </ul>
          <button className="admin-action">Connect SumUp (Later)</button>
        </section>

        <section className="admin-card">
          <h2>Configuration</h2>
          <ul>
            <li>Tabs and causes (Arabic + transliteration)</li>
            <li>Preset amounts and custom amount rules</li>
            <li>Ramadan Iftaar targets and schedules</li>
            <li>Zakat al-Fitr guidance (annual update)</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default App
