import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import masjidLogo from './assets/al-madani-masjid.svg'
import './App.css'

type Tab = {
  id: string
  label: string
  subtitle: string
  amounts: number[]
}

type Stage = 'home' | 'processing' | 'success' | 'declined'

const baseTabs: Tab[] = [
  {
    id: 'daily-sadaqah',
    label: 'صدقة يومية (Sadaqah Yaumiyyah)',
    subtitle: 'Daily giving for the masjid and local needs.',
    amounts: [5, 10, 20, 30, 50, 100],
  },
  {
    id: 'zakat',
    label: 'زكاة (Zakat)',
    subtitle: 'Obligatory charity distributed to eligible recipients.',
    amounts: [25, 50, 100, 200, 500, 1000],
  },
  {
    id: 'ramadan-iftaar',
    label: 'إفطار رمضان (Ramadan Iftaar)',
    subtitle:
      '“Whoever feeds a fasting person will have a reward like theirs.” (Tirmidhi)',
    amounts: [25, 50, 75, 100, 150, 200],
  },
  {
    id: 'zakat-fitr',
    label: 'زكاة الفطر (Zakat al-Fitr)',
    subtitle: 'Per person guidance updated annually by the masjid.',
    amounts: [5, 10, 15, 20, 25, 30],
  },
  {
    id: 'special-appeals',
    label: 'نداءات خاصة (Special Appeals)',
    subtitle: 'Emergency and community appeals as needed.',
    amounts: [10, 25, 50, 75, 100, 150],
  },
  {
    id: 'udhiyah',
    label: 'أضحية (Udhiyah)',
    subtitle: 'Name required for processing.',
    amounts: [75, 100, 150, 200, 250, 300],
  },
  {
    id: 'other',
    label: 'أخرى (Other)',
    subtitle: 'Masjid-admin curated causes.',
    amounts: [5, 10, 25, 50, 100, 200],
  },
]

const masjid = {
  name: 'Al-Madani Masjid',
  address: '1 Whittle Parkway, Slough, Berkshire, SL1 6FE, United Kingdom',
  phone: '01628 669756',
  email: 'masjid@al-madani.org',
  charityNumber: '1079416',
  location: 'Slough, United Kingdom',
}

function formatAmount(amount: number) {
  return `£${amount}`
}

function App() {
  const [visibleTabIds, setVisibleTabIds] = useState<string[]>([
    'daily-sadaqah',
    'zakat',
    'ramadan-iftaar',
  ])
  const [activeTabId, setActiveTabId] = useState(baseTabs[0].id)
  const [stage, setStage] = useState<Stage>('home')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [zakatAmount, setZakatAmount] = useState('')
  const [receiptCountdown, setReceiptCountdown] = useState(20)
  const [receiptPaused, setReceiptPaused] = useState(false)
  const [receiptEmail, setReceiptEmail] = useState('')
  const [receiptPhone, setReceiptPhone] = useState('')
  const [receiptMessage, setReceiptMessage] = useState('')
  const [declineCountdown, setDeclineCountdown] = useState(12)
  const [ramadanStartDate, setRamadanStartDate] = useState<Date>(() => new Date())
  const [ramadanDailyTarget, setRamadanDailyTarget] = useState(300)
  const [ramadanProgress, setRamadanProgress] = useState<number[]>(() =>
    Array.from({ length: 30 }, () => 0)
  )
  const [ramadanSponsorPeople, setRamadanSponsorPeople] = useState<number | null>(null)
  const [ramadanSponsorItems, setRamadanSponsorItems] = useState<string[]>([])
  const [sadaqahAmounts, setSadaqahAmounts] = useState<number[] | null>(null)
  const [sadaqahQuoteArabic, setSadaqahQuoteArabic] = useState('')
  const [sadaqahQuoteTranslation, setSadaqahQuoteTranslation] = useState(
    'The example of those who spend their wealth in the way of Allah is like a seed which grows seven ears; in every ear is a hundred grains.'
  )
  const [sadaqahQuoteRef, setSadaqahQuoteRef] = useState('Quran 2:261')
  const [zakatQuoteArabic, setZakatQuoteArabic] = useState(
    'خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِمْ بِهَا'
  )
  const [zakatQuoteTranslation, setZakatQuoteTranslation] = useState(
    'Take from their wealth a charity by which you purify them and cause them to grow.'
  )
  const [zakatQuoteRef, setZakatQuoteRef] = useState('Quran 9:103')
  const [selectedRamadanDays, setSelectedRamadanDays] = useState<number[]>([])
  const [ramadanAmount, setRamadanAmount] = useState('')
  const [pendingRamadanContribution, setPendingRamadanContribution] = useState<
    { allocations: { dayIndex: number; amount: number }[] } | null
  >(null)
  const tabRowRef = useRef<HTMLDivElement | null>(null)

  const applyVisibility = useCallback((visibleIds: string[]) => {
    const nextIds = visibleIds.length > 0 ? visibleIds : [baseTabs[0].id]
    setVisibleTabIds(nextIds)
    setActiveTabId((current) => (nextIds.includes(current) ? current : nextIds[0]))
  }, [])

  useEffect(() => {
    const loadFromStorage = () => {
      const stored = window.localStorage.getItem('kioskTabVisibility')
      if (!stored) return
      try {
        const parsed = JSON.parse(stored)
        const visibleIds = Array.isArray(parsed) ? parsed : parsed?.visibleTabs
        if (!Array.isArray(visibleIds) || visibleIds.length === 0) return
        applyVisibility(visibleIds)
      } catch (error) {
        console.warn('Failed to parse kioskTabVisibility', error)
      }
    }

    loadFromStorage()

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'kioskTabVisibility' || !event.newValue) return
      try {
        const parsed = JSON.parse(event.newValue)
        const visibleIds = Array.isArray(parsed) ? parsed : parsed?.visibleTabs
        if (!Array.isArray(visibleIds) || visibleIds.length === 0) return
        applyVisibility(visibleIds)
      } catch (error) {
        console.warn('Failed to parse kioskTabVisibility', error)
      }
    }

    const channel = new BroadcastChannel('kiosk-config')
    const handleBroadcast = (event: MessageEvent) => {
      const visibleIds = event.data?.visibleTabs
      if (Array.isArray(visibleIds) && visibleIds.length > 0) {
        applyVisibility(visibleIds)
      }
      const startDate = event.data?.ramadanStartDate
      if (startDate) {
        const parsed = new Date(startDate)
        if (!Number.isNaN(parsed.getTime())) {
          setRamadanStartDate(parsed)
        }
      }
      const target = event.data?.ramadanDailyTarget
      if (Number.isFinite(target) && target > 0) {
        setRamadanDailyTarget(target)
      }
      const people = event.data?.ramadanSponsorPeople
      if (Number.isFinite(people) && people > 0) {
        setRamadanSponsorPeople(people)
      }
      const items = event.data?.ramadanSponsorItems
      if (Array.isArray(items)) {
        setRamadanSponsorItems(items.filter((item) => typeof item === 'string'))
      }
      const incomingSadaqah = event.data?.sadaqahAmounts
      if (Array.isArray(incomingSadaqah) && incomingSadaqah.length === 6) {
        const parsed = incomingSadaqah.map((value) => Number(value) || 0)
        if (parsed.every((value) => value > 0)) {
          setSadaqahAmounts(parsed)
        }
      }
      if (typeof event.data?.sadaqahQuoteArabic === 'string') {
        setSadaqahQuoteArabic(event.data.sadaqahQuoteArabic)
      }
      if (typeof event.data?.sadaqahQuoteTranslation === 'string') {
        setSadaqahQuoteTranslation(event.data.sadaqahQuoteTranslation)
      }
      if (typeof event.data?.sadaqahQuoteRef === 'string') {
        setSadaqahQuoteRef(event.data.sadaqahQuoteRef)
      }
      if (typeof event.data?.zakatQuoteArabic === 'string') {
        setZakatQuoteArabic(event.data.zakatQuoteArabic)
      }
      if (typeof event.data?.zakatQuoteTranslation === 'string') {
        setZakatQuoteTranslation(event.data.zakatQuoteTranslation)
      }
      if (typeof event.data?.zakatQuoteRef === 'string') {
        setZakatQuoteRef(event.data.zakatQuoteRef)
      }
      const progress = event.data?.ramadanProgress
      if (Array.isArray(progress) && progress.length === 30) {
        setRamadanProgress(progress.map((value) => Number(value) || 0))
      }
    }

    window.addEventListener('storage', handleStorage)
    channel.addEventListener('message', handleBroadcast)

    return () => {
      window.removeEventListener('storage', handleStorage)
      channel.removeEventListener('message', handleBroadcast)
      channel.close()
    }
  }, [applyVisibility])

  useEffect(() => {
    const storedStart = window.localStorage.getItem('ramadanStartDate')
    if (storedStart) {
      const parsed = new Date(storedStart)
      if (!Number.isNaN(parsed.getTime())) {
        setRamadanStartDate(parsed)
      }
    }
    const storedTarget = window.localStorage.getItem('ramadanDailyTarget')
    if (storedTarget) {
      const target = Number.parseInt(storedTarget, 10)
      if (Number.isFinite(target) && target > 0) {
        setRamadanDailyTarget(target)
      }
    }
    const storedProgress = window.localStorage.getItem('ramadanProgress')
    if (storedProgress) {
      try {
        const parsed = JSON.parse(storedProgress)
        if (Array.isArray(parsed) && parsed.length === 30) {
          setRamadanProgress(parsed.map((value) => Number(value) || 0))
        }
      } catch (error) {
        console.warn('Failed to parse ramadanProgress', error)
      }
    }
    const storedPeople = window.localStorage.getItem('ramadanSponsorPeople')
    if (storedPeople) {
      const parsed = Number.parseInt(storedPeople, 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        setRamadanSponsorPeople(parsed)
      }
    }
    const storedItems = window.localStorage.getItem('ramadanSponsorItems')
    if (storedItems) {
      try {
        const parsed = JSON.parse(storedItems)
        if (Array.isArray(parsed)) {
          setRamadanSponsorItems(parsed.filter((item) => typeof item === 'string'))
        }
      } catch (error) {
        console.warn('Failed to parse ramadanSponsorItems', error)
      }
    }
    const storedSadaqah = window.localStorage.getItem('sadaqahAmounts')
    if (storedSadaqah) {
      try {
        const parsed = JSON.parse(storedSadaqah)
        if (Array.isArray(parsed) && parsed.length === 6) {
          const normalized = parsed.map((value) => Number(value) || 0)
          if (normalized.every((value) => value > 0)) {
            setSadaqahAmounts(normalized)
          }
        }
      } catch (error) {
        console.warn('Failed to parse sadaqahAmounts', error)
      }
    }
    const storedSadaqahArabic = window.localStorage.getItem('sadaqahQuoteArabic')
    const storedSadaqahTranslation = window.localStorage.getItem('sadaqahQuoteTranslation')
    const storedSadaqahRef = window.localStorage.getItem('sadaqahQuoteRef')
    if (storedSadaqahArabic) setSadaqahQuoteArabic(storedSadaqahArabic)
    if (storedSadaqahTranslation) setSadaqahQuoteTranslation(storedSadaqahTranslation)
    if (storedSadaqahRef) setSadaqahQuoteRef(storedSadaqahRef)
    const storedArabic = window.localStorage.getItem('zakatQuoteArabic')
    const storedTranslation = window.localStorage.getItem('zakatQuoteTranslation')
    const storedRef = window.localStorage.getItem('zakatQuoteRef')
    if (storedArabic) setZakatQuoteArabic(storedArabic)
    if (storedTranslation) setZakatQuoteTranslation(storedTranslation)
    if (storedRef) setZakatQuoteRef(storedRef)
  }, [])

  const tabs = useMemo(() => {
    return baseTabs.map((tab) => {
      if (tab.id === 'daily-sadaqah' && sadaqahAmounts) {
        return { ...tab, amounts: sadaqahAmounts }
      }
      return tab
    })
  }, [sadaqahAmounts])

  const visibleTabs = useMemo(() => {
    const filtered = tabs.filter((tab) => visibleTabIds.includes(tab.id))
    return filtered.length > 0 ? filtered : [tabs[0]]
  }, [tabs, visibleTabIds])

  const activeTab = useMemo(
    () => visibleTabs.find((tab) => tab.id === activeTabId) ?? visibleTabs[0],
    [activeTabId, visibleTabs]
  )

  useEffect(() => {
    if (stage !== 'success') return
    setReceiptCountdown(20)
    setReceiptPaused(false)
    setReceiptMessage('')
    const interval = window.setInterval(() => {
      setReceiptCountdown((value) => {
        if (receiptPaused || receiptEmail || receiptPhone) return value
        if (value <= 1) {
          setStage('home')
          setSelectedAmount(null)
          setCustomAmount('')
          setReceiptEmail('')
          setReceiptPhone('')
          setReceiptMessage('')
          return 20
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [stage, receiptPaused, receiptEmail, receiptPhone])

  useEffect(() => {
    if (stage !== 'success' || !pendingRamadanContribution) return
    setRamadanProgress((current) => {
      const next = [...current]
      pendingRamadanContribution.allocations.forEach(({ dayIndex, amount }) => {
        next[dayIndex] = Math.min(ramadanDailyTarget, (next[dayIndex] || 0) + amount)
      })
      window.localStorage.setItem('ramadanProgress', JSON.stringify(next))
      return next
    })
    setPendingRamadanContribution(null)
  }, [stage, pendingRamadanContribution, ramadanDailyTarget])

  useEffect(() => {
    if (stage !== 'declined') return
    setDeclineCountdown(12)
    const interval = window.setInterval(() => {
      setDeclineCountdown((value) => {
        if (value <= 1) {
          completeFlow()
          return 12
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [stage])

  const resetReceiptTimer = () => {
    setReceiptCountdown(20)
    setReceiptPaused(true)
  }

  const resumeReceiptTimer = () => {
    if (receiptEmail || receiptPhone) return
    setReceiptPaused(false)
  }

  const completeFlow = () => {
    setStage('home')
    setSelectedAmount(null)
    setCustomAmount('')
    setReceiptEmail('')
    setReceiptPhone('')
    setReceiptMessage('')
    setPendingRamadanContribution(null)
    setSelectedRamadanDays([])
    setRamadanAmount('')
  }

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const isValidUkPhone = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '')
    if (cleaned.startsWith('+44')) {
      return /^\+44\d{9,10}$/.test(cleaned)
    }
    if (cleaned.startsWith('0')) {
      return /^0\d{10}$/.test(cleaned)
    }
    return false
  }

  const hasReceiptInput = Boolean(receiptEmail.trim() || receiptPhone.trim())
  const emailValid = receiptEmail ? isValidEmail(receiptEmail) : false
  const phoneValid = receiptPhone ? isValidUkPhone(receiptPhone) : false
  const showEmailError = Boolean(receiptEmail) && !emailValid
  const showPhoneError = Boolean(receiptPhone) && !phoneValid
  const canSendReceipt = emailValid || phoneValid

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setStage('processing')
  }

  const handleCustomSubmit = () => {
    const normalized = Number.parseInt(customAmount, 10)
    if (!Number.isFinite(normalized) || normalized <= 0) return
    handleAmountSelect(normalized)
  }

  const handleZakatSubmit = () => {
    const normalized = Number.parseInt(zakatAmount, 10)
    if (!Number.isFinite(normalized) || normalized <= 0) return
    handleAmountSelect(normalized)
  }

  const ramadanDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(ramadanStartDate)
      date.setDate(date.getDate() + index)
      return {
        index,
        label: `Ramadan Day ${index + 1}`,
        dateLabel: date.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        }),
      }
    })
  }, [ramadanStartDate])

  const ramadanSponsoredCount = useMemo(() => {
    return ramadanProgress.filter((value) => value >= ramadanDailyTarget).length
  }, [ramadanProgress, ramadanDailyTarget])

  const ramadanTotalRaised = useMemo(() => {
    return ramadanProgress.reduce((total, value) => total + value, 0)
  }, [ramadanProgress])

  const ramadanSponsorLine = useMemo(() => {
    if (!ramadanSponsorPeople || ramadanSponsorItems.length === 0) return ''
    const items = ramadanSponsorItems.join(', ')
    return `The daily target will feed ${ramadanSponsorPeople} people with: ${items}.`
  }, [ramadanSponsorItems, ramadanSponsorPeople])

  const allocateRamadanAmount = useCallback(
    (amount: number, selectedDays: number[]) => {
      const allocations: { dayIndex: number; amount: number }[] = []
      if (amount <= 0) return allocations

      const sortedSelected = [...selectedDays].sort((a, b) => a - b)
      const remainingDays = Array.from({ length: 30 }, (_, index) => index).filter(
        (index) => !sortedSelected.includes(index)
      )
      const candidateDays = [...sortedSelected, ...remainingDays]

      let remaining = amount
      candidateDays.forEach((dayIndex) => {
        if (remaining <= 0) return
        const currentRaised = ramadanProgress[dayIndex] || 0
        const capacity = Math.max(0, ramadanDailyTarget - currentRaised)
        if (capacity <= 0) return
        const applied = Math.min(remaining, capacity)
        allocations.push({ dayIndex, amount: applied })
        remaining -= applied
      })

      return allocations
    },
    [ramadanProgress, ramadanDailyTarget]
  )

  const ramadanAllocationPreview = useMemo(() => {
    const normalized = Number.parseInt(ramadanAmount, 10)
    if (!Number.isFinite(normalized) || normalized <= 0) return []
    if (selectedRamadanDays.length === 0) return []
    return allocateRamadanAmount(normalized, selectedRamadanDays)
  }, [allocateRamadanAmount, ramadanAmount, selectedRamadanDays])

  return (
    <div className="kiosk-shell">
      <header className="kiosk-header">
        <div className="brand">
          <img src={masjidLogo} className="brand-logo" alt="Al-Madani Masjid" />
          <div>
            <p className="brand-eyebrow">بِسْمِ ٱللَّٰهِ (Bismillah)</p>
            <h1>{masjid.name}</h1>
          </div>
        </div>
        <div className="status-pill">Ready for contactless</div>
      </header>

      <div className="tab-strip">
        <button
          className="tab-scroll"
          aria-label="Scroll tabs left"
          onClick={() => {
            tabRowRef.current?.scrollBy({ left: -160, behavior: 'smooth' })
          }}
        >
          ‹
        </button>
        <nav className="tab-row" aria-label="Giving categories" ref={tabRowRef}>
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <button
          className="tab-scroll"
          aria-label="Scroll tabs"
          onClick={() => {
            tabRowRef.current?.scrollBy({ left: 160, behavior: 'smooth' })
          }}
        >
          ›
        </button>
      </div>

      <main className="kiosk-content">
        {activeTabId === 'ramadan-iftaar' ? (
          <section className="ramadan-top">
            <div>
              <h2>{activeTab.label}</h2>
              <div className="quote-card ramadan-quote">
                <p className="quote">
                  “Whoever feeds a fasting person will have a reward like theirs.”
                  <span className="quote-ref">Tirmidhi</span>
                </p>
              </div>
              {ramadanSponsorLine && (
                <div className="ramadan-note-inline">
                  <p className="ramadan-note-title">Daily Iftaar plan</p>
                  <p className="ramadan-note-text">{ramadanSponsorLine}</p>
                </div>
              )}
            </div>
            <div className="ramadan-amount-inline">
              <p className="custom-title">Sponsor an Iftaar day</p>
              <p className="custom-note">
                Select a day below and enter your amount.
              </p>
              <p className="custom-note">Selected: {selectedRamadanDays.length || 0}</p>
              <div className="ramadan-input">
                <span className="currency">£</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter amount"
                  value={ramadanAmount}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^0-9]/g, '')
                    setRamadanAmount(value)
                  }}
                />
                <button
                  className="custom-submit"
                  onClick={() => {
                    const normalized = Number.parseInt(ramadanAmount, 10)
                    if (!Number.isFinite(normalized) || normalized <= 0) return
                    if (selectedRamadanDays.length === 0) return
                    const allocations = allocateRamadanAmount(
                      normalized,
                      selectedRamadanDays
                    )
                    if (allocations.length === 0) return
                    setPendingRamadanContribution({ allocations })
                    handleAmountSelect(normalized)
                  }}
                >
                  Proceed
                </button>
              </div>
              {ramadanAllocationPreview.length > 0 && (
                <p className="ramadan-allocation">
                  Allocation: {ramadanAllocationPreview
                    .slice(0, 4)
                    .map((item) => `Day ${item.dayIndex + 1} £${item.amount}`)
                    .join(', ')}
                  {ramadanAllocationPreview.length > 4 ? ' …' : ''}
                </p>
              )}
            </div>
            <div className="ramadan-summary">
              Sponsored {ramadanSponsoredCount}/30 · Raised {formatAmount(ramadanTotalRaised)} ·
              Target £{ramadanDailyTarget}/day
            </div>
          </section>
        ) : (
          <section className="cause-panel">
            <div>
              <h2>{activeTab.label}</h2>
              <p className="cause-subtitle">{activeTab.subtitle}</p>
            </div>
          </section>
        )}

        {activeTabId === 'zakat' ? (
          <>
            <section className="zakat-amount" aria-label="Zakat amount">
              <p className="custom-title">زكاة (Zakat) amount</p>
              <p className="custom-note">Enter your calculated zakat amount.</p>
              <div className="zakat-input">
                <span className="currency">£</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter zakat amount"
                  value={zakatAmount}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^0-9]/g, '')
                    setZakatAmount(value)
                  }}
                />
                <button className="custom-submit" onClick={handleZakatSubmit}>
                  Proceed
                </button>
              </div>
            </section>
            <section className="zakat-notes">
              <div className="quote-card">
                <p className="quote">
                  <span className="quote-arabic">{zakatQuoteArabic}</span>
                  <span className="quote-translation">({zakatQuoteTranslation})</span>
                  <span className="quote-ref">{zakatQuoteRef}</span>
                </p>
              </div>
              <p className="zakat-footnote">
                Zakat is calculated on eligible assets above the nisab and held for one
                lunar year. Please consult your local scholars for guidance.
              </p>
            </section>
          </>
        ) : activeTabId === 'ramadan-iftaar' ? (
          <>
            <section className="ramadan-grid" aria-label="Ramadan iftaar days">
              {ramadanDays.map((day) => {
                const raised = ramadanProgress[day.index] || 0
                const percent = Math.min(100, Math.round((raised / ramadanDailyTarget) * 100))
                return (
                  <button
                    key={day.index}
                    className={`ramadan-card ${
                      selectedRamadanDays.includes(day.index) ? 'active' : ''
                    }`}
                    onClick={() => {
                      setSelectedRamadanDays((current) =>
                        current.includes(day.index)
                          ? current.filter((value) => value !== day.index)
                          : [...current, day.index]
                      )
                    }}
                  >
                    <div className="ramadan-fill" style={{ width: `${percent}%` }} />
                    <div className="ramadan-card-top">
                      <p className="ramadan-day">{day.label}</p>
                      <p className="ramadan-date">{day.dateLabel}</p>
                    </div>
                    <span className="ramadan-percent">{percent}%</span>
                  </button>
                )
              })}
            </section>
          </>
        ) : (
          <>
            <section className="amount-grid" aria-label="Preset amounts">
              {activeTab.amounts.map((amount) => (
                <button
                  key={amount}
                  className="amount-tile"
                  onClick={() => handleAmountSelect(amount)}
                >
                  <span className="amount-value">{formatAmount(amount)}</span>
                  <span className="amount-label">Tap to give</span>
                </button>
              ))}
            </section>

            <section className="sadaqah-actions" aria-label="Other amount">
              <div className="quote-card sadaqah-quote">
                <p className="quote">
                  {sadaqahQuoteArabic && (
                    <span className="quote-arabic">{sadaqahQuoteArabic}</span>
                  )}
                  <span className="quote-translation">({sadaqahQuoteTranslation})</span>
                  <span className="quote-ref">{sadaqahQuoteRef}</span>
                </p>
              </div>
              <div className="custom-amount">
                <div>
                  <p className="custom-title">مبلغ آخر (Other amount)</p>
                  <p className="custom-note">Whole pounds only.</p>
                </div>
                <div className="custom-input">
                  <span className="currency">£</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Other amount"
                    value={customAmount}
                    onChange={(event) => {
                      const value = event.target.value.replace(/[^0-9]/g, '')
                      setCustomAmount(value)
                    }}
                  />
                  <button className="custom-submit" onClick={handleCustomSubmit}>
                    Proceed
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="kiosk-footer">
        <div className="footer-left">
          <p className="footer-subtitle">
            Payments go directly to the masjid account. Charity no. {masjid.charityNumber}.
          </p>
          <p className="footer-credit">
            Built with love by{' '}
            <a href="https://ijtihadlabs.org" target="_blank" rel="noreferrer">
              Ijtihad Labs
            </a>
          </p>
        </div>
        <div className="footer-right">
          <p className="footer-location">{masjid.address}</p>
          <p className="footer-location">{masjid.phone} · {masjid.email}</p>
        </div>
      </footer>

      {stage !== 'home' && (
        <div className="overlay" role="dialog" aria-live="polite">
          <div className="overlay-card">
            {stage === 'processing' && (
              <>
                <p className="overlay-label">Processing</p>
                <h3>Please tap your card</h3>
                <p>Amount: {selectedAmount ? formatAmount(selectedAmount) : '£0'}</p>
                <div className="pulse-ring" />
                <div className="post-buttons">
                  <button className="ghost" onClick={completeFlow}>
                    Cancel
                  </button>
                  <button className="primary" onClick={() => setStage('success')}>
                    Simulate payment success
                  </button>
                  <button className="ghost" onClick={() => setStage('declined')}>
                    Simulate decline
                  </button>
                </div>
              </>
            )}
            {stage === 'declined' && (
              <>
                <p className="overlay-label">Not completed</p>
                <h3>Payment declined</h3>
                <p>No charge was made. Please try again or use another card.</p>
                <div className="post-buttons">
                  <button className="primary" onClick={() => setStage('processing')}>
                    Try again
                  </button>
                  <button className="ghost" onClick={completeFlow}>
                    Choose another amount ({declineCountdown}s)
                  </button>
                </div>
              </>
            )}
            {stage === 'success' && (
              <>
                <button className="overlay-exit" onClick={completeFlow}>
                  Return to home
                </button>
                <p className="overlay-label">Accepted</p>
                <h3>جزاك الله خيرا (JazakAllahu Khayran)</h3>
                <p className="overlay-amount">
                  {selectedAmount ? formatAmount(selectedAmount) : '£0'} received
                </p>
                <div className="post-actions highlight">
                  <div>
                    <h4>Gift Aid & Regular Giving</h4>
                    <p className="quote">
                      “When a person dies, their deeds end except three: ongoing charity
                      (sadaqah jariyah), beneficial knowledge, or a righteous child who prays
                      for them.”
                      <span className="quote-ref">Sahih Muslim</span>
                    </p>
                    <p>Support ongoing sadaqah jariyah through regular giving or Gift Aid.</p>
                  </div>
                  <div className="post-buttons">
                    <button className="primary prominent">Gift Aid</button>
                    <button className="primary prominent">Regular giving</button>
                  </div>
                </div>
                <div className="receipt-panel">
                  <div>
                    <h4>Receipt (SumUp)</h4>
                    <p>Enter email or mobile to receive a receipt.</p>
                  </div>
                  <div className="receipt-inputs">
                    <input
                      type="email"
                      placeholder="Email"
                      value={receiptEmail}
                      onFocus={resetReceiptTimer}
                      onBlur={resumeReceiptTimer}
                      onChange={(event) => {
                        setReceiptEmail(event.target.value)
                        resetReceiptTimer()
                      }}
                      className={showEmailError ? 'input-error' : undefined}
                    />
                    <input
                      type="tel"
                      placeholder="Mobile"
                      value={receiptPhone}
                      onFocus={resetReceiptTimer}
                      onBlur={resumeReceiptTimer}
                      onChange={(event) => {
                        setReceiptPhone(event.target.value)
                        resetReceiptTimer()
                      }}
                      className={showPhoneError ? 'input-error' : undefined}
                    />
                  </div>
                  <div className="receipt-actions">
                    <button
                      className="primary"
                      disabled={!canSendReceipt}
                      onClick={() => {
                        if (!canSendReceipt) {
                          return
                        }
                        setReceiptMessage('Receipt requested. Please check your inbox or SMS.')
                        setReceiptPaused(true)
                      }}
                    >
                      Send receipt
                    </button>
                    <button
                      className={hasReceiptInput ? 'ghost' : 'primary'}
                      onClick={completeFlow}
                    >
                      {hasReceiptInput
                        ? 'Skip receipt'
                        : `Skip receipt (${receiptCountdown}s)`}
                    </button>
                  </div>
                  {showEmailError && (
                    <p className="receipt-error">Enter a valid email address.</p>
                  )}
                  {showPhoneError && (
                    <p className="receipt-error">Enter a valid UK mobile number.</p>
                  )}
                  {receiptMessage && <p className="receipt-message">{receiptMessage}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="orientation-lock" role="status" aria-live="polite">
        <div className="orientation-card">
          <p className="overlay-label">Rotate Device</p>
          <h3>Please use portrait mode</h3>
          <p>For phones, the kiosk is designed for portrait orientation.</p>
        </div>
      </div>
    </div>
  )
}

export default App
