import { useMemo, useState } from 'react'
import './App.css'

const SUPER_ADMIN_USERNAME = 'Sajib143'
const SUPER_ADMIN_PASSWORD = 'N@ureen9620'

type Masjid = {
  id: string
  name: string
  location: string
  status: 'healthy' | 'attention' | 'offline'
  features: string[]
  admins: string[]
}

const defaultMasjids: Masjid[] = [
  {
    id: 'al-madani',
    name: 'Al-Madani Masjid',
    location: 'Slough, Berkshire',
    status: 'healthy',
    features: ['Sadaqah', 'Zakat', 'Ramadan Iftaar'],
    admins: ['masjid@al-madani.org'],
  },
  {
    id: 'east-end',
    name: 'East End Masjid',
    location: 'London',
    status: 'attention',
    features: ['Sadaqah'],
    admins: ['admin@eastendmasjid.org'],
  },
]

function App() {
  const [masjidList, setMasjidList] = useState<Masjid[]>(() => {
    const stored = window.localStorage.getItem('superAdminMasjids')
    if (!stored) return defaultMasjids
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    } catch (error) {
      return defaultMasjids
    }
    return defaultMasjids
  })
  const [selectedMasjid, setSelectedMasjid] = useState<Masjid | null>(masjidList[0])
  const [inviteEmail, setInviteEmail] = useState('')
  const [registrationLink, setRegistrationLink] = useState('')
  const [showRegistration, setShowRegistration] = useState(false)
  const [isAuthed, setIsAuthed] = useState(() => {
    return window.sessionStorage.getItem('superAdminAuthed') === 'true'
  })
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginError, setLoginError] = useState('')
  const [formError, setFormError] = useState('')
  const [formValues, setFormValues] = useState({
    masjidName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    charityNumber: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
  })

  const saveMasjids = (next: Masjid[]) => {
    setMasjidList(next)
    window.localStorage.setItem('superAdminMasjids', JSON.stringify(next))
  }

  const featuresLabel = useMemo(() => ['Sadaqah'], [])

  const handleLogin = () => {
    if (loginUser.trim() === SUPER_ADMIN_USERNAME && loginPass === SUPER_ADMIN_PASSWORD) {
      window.sessionStorage.setItem('superAdminAuthed', 'true')
      setIsAuthed(true)
      setLoginError('')
      setLoginPass('')
      return
    }
    setLoginError('Invalid username or password.')
  }

  const handleGenerateLink = () => {
    if (!inviteEmail) return
    const token = Math.random().toString(36).slice(2)
    setRegistrationLink(`https://ijtihadlabs.org/register?email=${inviteEmail}&token=${token}`)
    setFormValues((current) => ({ ...current, adminEmail: inviteEmail }))
    setShowRegistration(true)
  }

  if (!isAuthed) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="super-eyebrow">Super Admin</p>
          <h1>Masjid Kiosk Platform</h1>
          <p className="super-subtitle">Enter your super admin credentials to continue.</p>
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
          <p className="auth-note">Super admin access is restricted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="super-shell">
      <header className="super-header">
        <div>
          <p className="super-eyebrow">Super Admin</p>
          <h1>Masjid Kiosk Platform</h1>
          <p className="super-subtitle">
            Register masjids, manage admins, and monitor system health.
          </p>
        </div>
        <div className="super-badge">
          <span>Authenticated</span>
          <button
            className="ghost"
            onClick={() => {
              window.sessionStorage.removeItem('superAdminAuthed')
              setIsAuthed(false)
              setLoginUser('')
              setLoginPass('')
              setLoginError('')
            }}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="super-grid">
        <section className="super-card span-2">
          <div className="card-header">
            <h2>Masjid overview</h2>
            <button className="admin-action" onClick={() => setSelectedMasjid(null)}>
              Add new masjid
            </button>
          </div>
          <div className="masjid-grid">
            {masjidList.map((masjid) => (
              <button
                key={masjid.id}
                className={`masjid-tile ${selectedMasjid?.id === masjid.id ? 'active' : ''}`}
                onClick={() => setSelectedMasjid(masjid)}
              >
                <div>
                  <h3>{masjid.name}</h3>
                  <p>{masjid.location}</p>
                </div>
                <span className={`status-pill ${masjid.status}`}>{masjid.status}</span>
                <div className="feature-tags">
                  {masjid.features.map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="super-card">
          <h2>Admin actions</h2>
          <div className="admin-actions">
            <button className="admin-action">Add admin</button>
            <button className="admin-action">Edit admin</button>
            <button className="ghost">Reset password</button>
            <button className="ghost">Disable admin</button>
          </div>
          {selectedMasjid && (
            <div className="admin-list">
              <p>Admins for {selectedMasjid.name}</p>
              <ul>
                {selectedMasjid.admins.map((admin) => (
                  <li key={admin}>{admin}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="super-card">
          <h2>Send registration link</h2>
          <label className="form-field">
            Admin email
            <input
              type="email"
              placeholder="admin@masjid.org"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
          </label>
          <button className="admin-action" onClick={handleGenerateLink}>
            Generate link
          </button>
          {registrationLink && (
            <div className="link-box">
              <p>Registration link</p>
              <code>{registrationLink}</code>
            </div>
          )}
        </section>

        {showRegistration && (
          <section className="super-card span-2">
            <h2>Masjid registration (from link)</h2>
            <p className="admin-note">
              This form is completed by the masjid admin. Submitting will create a new masjid tile.
            </p>
            <div className="form-grid">
              <label className="form-field">
                Masjid name
                <input
                  type="text"
                  placeholder="Masjid name"
                  value={formValues.masjidName}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, masjidName: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Address
                <input
                  type="text"
                  placeholder="Street, City, Postcode"
                  value={formValues.address}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, address: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Phone
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={formValues.phone}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Email
                <input
                  type="email"
                  placeholder="Masjid email"
                  value={formValues.email}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Website (optional)
                <input
                  type="url"
                  placeholder="https://"
                  value={formValues.website}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, website: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Charity number
                <input
                  type="text"
                  placeholder="Charity number"
                  value={formValues.charityNumber}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, charityNumber: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Main admin name
                <input
                  type="text"
                  placeholder="Full name"
                  value={formValues.adminName}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, adminName: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Admin login email
                <input type="email" value={formValues.adminEmail} disabled />
              </label>
              <label className="form-field">
                Password
                <input
                  type="password"
                  placeholder="Create password"
                  value={formValues.password}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Confirm password
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={formValues.confirmPassword}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                />
              </label>
            </div>
            {formError && <p className="form-error">{formError}</p>}
            <button
              className="admin-action"
              onClick={() => {
                if (
                  !formValues.masjidName ||
                  !formValues.address ||
                  !formValues.phone ||
                  !formValues.email ||
                  !formValues.charityNumber ||
                  !formValues.adminName ||
                  !formValues.password ||
                  !formValues.confirmPassword
                ) {
                  setFormError('Please complete all required fields.')
                  return
                }
                if (formValues.password !== formValues.confirmPassword) {
                  setFormError('Passwords do not match.')
                  return
                }
                const newMasjid: Masjid = {
                  id: formValues.masjidName.toLowerCase().replace(/\s+/g, '-'),
                  name: formValues.masjidName,
                  location: formValues.address,
                  status: 'healthy',
                  features: featuresLabel,
                  admins: [formValues.adminEmail],
                }
                const next = [newMasjid, ...masjidList]
                saveMasjids(next)
                setSelectedMasjid(newMasjid)
                setFormError('')
              }}
            >
              Submit registration
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
