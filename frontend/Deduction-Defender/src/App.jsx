import React from 'react'

const API_BASE = 'http://localhost:8001'

const STORAGE_VIEW_KEY = 'dd_active_view'
const STORAGE_THEME_KEY = 'dd_theme'

const defaultStats = [
  { key: 'cases', label: 'Cases Analyzed', value: '0', meta: 'Live data' },
  { key: 'invalid', label: 'Potentially Invalid', value: '0', meta: 'Live data' },
  { key: 'recovery', label: 'Potential Recovery', value: '$0', meta: 'Live data' },
  { key: 'review', label: 'Needs Review', value: '0', meta: 'Live data' }
]

// NOTE: previously seeded with sample rows (Target/$500, Retailer B/$750,
// etc.) that displayed as if they were real cases before any analysis had
// run. Starts empty now; real entries are added by updateDashboardFromAnalysis
// once an actual analysis completes.
const defaultQueue = []

const evidenceItems = ['Agreement', 'Invoice', 'Remittance', 'Shipment POD', 'Policy Manual']

const suggestedQuestions = [
  'Why was this deduction flagged?',
  'Explain the deduction reasoning.',
  'What evidence supports this decision?',
  'Draft a dispute response.'
]

const navItems = [
  { key: 'Overview', label: 'Overview' },
  { key: 'Analyze', label: 'Analyze' },
  { key: 'AI Assistant', label: 'AI Assistant' },
  { key: 'Workflow', label: 'Workflow' }
]

// Design tokens for light/dark. Everything visual reads from this object so
// the whole app can switch instantly without per-component branching.
const palettes = {
  light: {
    mode: 'light',
    bg: '#F6F4EF',
    surface: '#FFFFFF',
    surfaceAlt: '#FBFAF7',
    border: 'rgba(20, 26, 33, 0.09)',
    text: '#161F2B',
    textMuted: '#5B6472',
    accent: '#1F3A5B',
    accentText: '#FFFFFF',
    accentSoft: '#E7EEF6',
    amber: '#A9701E',
    amberSoft: '#FBF1DE',
    danger: '#AE3B3B',
    dangerSoft: '#FBE9E9',
    success: '#2C7A52',
    successSoft: '#E7F5EC',
    review: '#6C4F9C',
    reviewSoft: '#F1EAFB',
    shadow: '0 12px 30px rgba(22, 31, 43, 0.06)',
    cardTone: ['#EEF3F9', '#FBECEC', '#EAF6EF', '#F3EEFB']
  },
  dark: {
    mode: 'dark',
    bg: '#0D141C',
    surface: '#131C27',
    surfaceAlt: '#0F1720',
    border: 'rgba(231, 237, 243, 0.09)',
    text: '#E7EDF3',
    textMuted: '#8E9BAA',
    accent: '#7FA8D6',
    accentText: '#0D141C',
    accentSoft: 'rgba(127, 168, 214, 0.14)',
    amber: '#E0A94D',
    amberSoft: 'rgba(224, 169, 77, 0.14)',
    danger: '#E17575',
    dangerSoft: 'rgba(225, 117, 117, 0.14)',
    success: '#5FBE8B',
    successSoft: 'rgba(95, 190, 139, 0.14)',
    review: '#B29AE8',
    reviewSoft: 'rgba(178, 154, 232, 0.14)',
    shadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
    cardTone: ['rgba(127,168,214,0.10)', 'rgba(225,117,117,0.10)', 'rgba(95,190,139,0.10)', 'rgba(178,154,232,0.10)']
  }
}

function App() {
  // Persisted UI state -------------------------------------------------
  // FIXED: activeView and theme now read from localStorage on first render
  // and are written back on every change, so reloading the page (or
  // navigating away and back) keeps you on the same tab and theme instead
  // of snapping back to "Overview" / light mode.
  const [activeView, setActiveView] = React.useState(() => {
    if (typeof window === 'undefined') return 'Overview'
    const saved = window.localStorage.getItem(STORAGE_VIEW_KEY)
    return navItems.some((n) => n.key === saved) ? saved : 'Overview'
  })

  const [theme, setTheme] = React.useState(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = window.localStorage.getItem(STORAGE_THEME_KEY)
    return saved === 'dark' ? 'dark' : 'light'
  })

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_VIEW_KEY, activeView)
  }, [activeView])

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_THEME_KEY, theme)
  }, [theme])

  const isDark = theme === 'dark'
  const t = palettes[theme]

  // NOTE: previously pre-filled with sample values (Target, $1,500, etc.)
  // which looked like a real, already-analyzed case on first load. These
  // now start blank; inputs show grey placeholder text instead.
  const [retailer, setRetailer] = React.useState('')
  const [invoice, setInvoice] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [details, setDetails] = React.useState('')
  const [question, setQuestion] = React.useState('Please review this retailer deduction for unsupported markdown and chargeback claims.')
  const [chatInput, setChatInput] = React.useState('')
  const [chatAnswer, setChatAnswer] = React.useState('')
  const [answer, setAnswer] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [chatLoading, setChatLoading] = React.useState(false)
  const [dashboardStats, setDashboardStats] = React.useState(defaultStats)
  const [reviewQueue, setReviewQueue] = React.useState(defaultQueue)
  const [file, setFile] = React.useState(null)
  const [note, setNote] = React.useState('Review against remittance, shipment evidence, and retailer policy terms.')
  const [selectedEvidence, setSelectedEvidence] = React.useState(['Agreement', 'Invoice', 'Remittance'])

  // Values actually extracted from the latest AI analysis, shown in the
  // "AI Decision" card. Kept separate from the form's `amount` state so the
  // card reflects the *result* of an analysis, not whatever the Overview
  // form currently happens to contain.
  const [displayAmount, setDisplayAmount] = React.useState(null)
  const [displayRecovery, setDisplayRecovery] = React.useState(null)

  const parseCurrency = (value) => {
    const numeric = Number(String(value).replace(/[$,]/g, '').trim()) || 0
    return Number.isFinite(numeric) ? numeric : 0
  }

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)

  const parseApiResponse = async (response) => {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.detail || `Request failed with status ${response.status}`)
    }
    return data
  }

  const getStatusFromAnswer = (text) => {
    const tt = (text || '').toLowerCase()
    if (tt.startsWith('upload error') || tt.startsWith('error:') || tt.startsWith('request error')) return 'ERROR'
    if (tt.includes('invalid') || tt.includes('dispute') || tt.includes('potentially invalid')) return 'POTENTIALLY INVALID'
    if (tt.includes('review') || tt.includes('analyst')) return 'ANALYST REVIEW'
    if (tt.includes('valid') || tt.includes('approved')) return 'VALID'
    return 'ANALYST REVIEW'
  }

  // Pull a dollar figure out of the AI's free-text report by looking for one
  // of several candidate labels near a "$1,234.56"-style number. The label
  // can appear either BEFORE the number ("Total deduction: $500") or AFTER
  // it ("$500 in total deductions" / "$500** total deductions"), since the
  // AI report phrases things both ways. Markdown bold markers (**) around
  // either side are tolerated. Returns null if nothing matches.
  const extractAmount = (text, labels) => {
    if (!text) return null
    const amountToken = '\\$([0-9][0-9,]*(?:\\.[0-9]{1,2})?)'

    for (const label of labels) {
      const before = new RegExp(`${label}\\W{0,40}${amountToken}`, 'i')
      const beforeMatch = text.match(before)
      if (beforeMatch) return `$${beforeMatch[1]}`

      const after = new RegExp(`${amountToken}\\**\\W{0,40}${label}`, 'i')
      const afterMatch = text.match(after)
      if (afterMatch) return `$${afterMatch[1]}`
    }
    return null
  }

  // Fallback: if none of the labeled patterns hit, just grab the largest
  // dollar figure mentioned anywhere in the text. Rough, but better than N/A
  // when the report uses phrasing we didn't anticipate.
  const extractLargestAmount = (text) => {
    if (!text) return null
    const matches = [...text.matchAll(/\$([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g)]
    if (!matches.length) return null
    const values = matches.map((m) => Number(m[1].replace(/,/g, '')))
    const max = Math.max(...values)
    const idx = values.indexOf(max)
    return `$${matches[idx][1]}`
  }

  // Given a finished analysis' text, figure out what to show in the
  // "Deduction Amount" / "Potential Recovery" tiles. Falls back to the form
  // amount / a placeholder when the report doesn't contain a parseable figure.
  const updateDisplayFigures = (resultText, fallbackAmount) => {
    const parsedAmount = extractAmount(resultText, [
      'total deduction[s]?',
      'deduction amount',
      'gross deduction[s]?',
      'net remittance(?: received)?',
      'audit target',
      'amount in dispute'
    ])
    const parsedRecovery = extractAmount(resultText, [
      'potential recovery',
      'recoverable amount',
      'recovery amount',
      'estimated recovery',
      'recommended recovery'
    ])

    setDisplayAmount(parsedAmount || fallbackAmount || extractLargestAmount(resultText) || null)
    setDisplayRecovery(parsedRecovery || null)
  }

  const updateDashboardFromAnalysis = (resultText, caseAmount = amount, retailerName = retailer) => {
    const status = getStatusFromAnswer(resultText)
    if (status === 'ERROR') return
    const amountValue = parseCurrency(caseAmount)

    setDashboardStats((prev) => {
      const previousCases = Number(String(prev[0].value).replace(/[^0-9]/g, '')) || 0
      const previousInvalid = Number(String(prev[1].value).replace(/[^0-9]/g, '')) || 0
      const previousReview = Number(String(prev[3].value).replace(/[^0-9]/g, '')) || 0
      const previousRecovery = parseCurrency(prev[2].value)

      const updatedCases = previousCases + 1
      const updatedInvalid = previousInvalid + (status === 'POTENTIALLY INVALID' ? 1 : 0)
      const updatedReview = previousReview + (status === 'ANALYST REVIEW' ? 1 : 0)
      const recoveryBoost = status === 'POTENTIALLY INVALID' ? amountValue : Math.round(amountValue * 0.4)

      return [
        { ...prev[0], value: String(updatedCases), meta: 'Live update' },
        { ...prev[1], value: String(updatedInvalid), meta: 'Live update' },
        { ...prev[2], value: formatCurrency(previousRecovery + recoveryBoost), meta: 'Live update' },
        { ...prev[3], value: String(updatedReview), meta: 'Live update' }
      ]
    })

    setReviewQueue((prev) => [{
      retailer: retailerName,
      caseName: reason || 'New deduction review',
      amount: caseAmount || '$0',
      status: status === 'POTENTIALLY INVALID' ? 'Potentially Invalid' : status === 'VALID' ? 'Valid' : 'Needs Review',
      risk: status === 'POTENTIALLY INVALID' ? 'red' : status === 'VALID' ? 'green' : 'amber'
    }, ...prev].slice(0, 4))
  }

  const askPipeline = async () => {
    if (!retailer.trim() || !amount.trim()) {
      setAnswer('Please fill in at least Retailer and Deduction Amount before running an analysis.')
      setActiveView('Analyze')
      return
    }

    const submission = [
      `Retailer: ${retailer}`,
      `Invoice / Reference: ${invoice}`,
      `Deduction Amount: ${amount}`,
      `Deduction Reason: ${reason}`,
      `Additional Details: ${details}`
    ].join('\n')

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: `${submission}\n\n${question}` })
      })

      const data = await parseApiResponse(response)
      const resultText = data.answer || data.message || 'No answer available'
      setAnswer(resultText)
      updateDisplayFigures(resultText, amount)
      updateDashboardFromAnalysis(resultText, amount, retailer)
      setActiveView('Analyze')
    } catch (error) {
      const message = error instanceof TypeError && error.message === 'Failed to fetch'
        ? 'Request error: backend is not reachable on http://localhost:8001. Start the FastAPI backend and try again.'
        : `Error: ${error.message}`
      setAnswer(message)
      setDisplayAmount(null)
      setDisplayRecovery(null)
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async () => {
    if (!file) {
      setAnswer('Please choose an evidence file before uploading.')
      setActiveView('Analyze')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('note', note)

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await parseApiResponse(response)
      const detailText = data.answer || data.message || 'Upload processed'
      const metadataText = data.metadata && data.metadata.file_name
        ? `\n\nFile: ${data.metadata.file_name}\nStatus: ${JSON.stringify(data.metadata.status, null, 2)}`
        : ''
      const resultText = detailText + metadataText
      setAnswer(resultText)
      // Upload flow has no reliable "amount" from the form, so pass null as
      // the fallback — if the report doesn't contain a parseable figure,
      // the tile will show a placeholder instead of stale form state.
      updateDisplayFigures(resultText, null)
      updateDashboardFromAnalysis(resultText, amount, retailer)
      setActiveView('Analyze')
    } catch (error) {
      const message = error instanceof TypeError && error.message === 'Failed to fetch'
        ? 'Upload error: backend is not reachable on http://localhost:8001. Start the FastAPI backend and try again.'
        : `Upload error: ${error.message}`
      setAnswer(message)
      setDisplayAmount(null)
      setDisplayRecovery(null)
    } finally {
      setLoading(false)
    }
  }

  const askAssistant = async () => {
    if (!chatInput.trim()) return
    setChatLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chatInput })
      })
      const data = await parseApiResponse(response)
      setChatAnswer(data.answer || data.message || 'No answer available')
      setChatInput('')
    } catch (error) {
      setChatAnswer(error instanceof TypeError && error.message === 'Failed to fetch'
        ? 'AI Assistant error: backend is not reachable on http://localhost:8001.'
        : `AI Assistant error: ${error.message}`)
    } finally {
      setChatLoading(false)
    }
  }

  const toggleEvidence = (item) => {
    setSelectedEvidence((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    )
  }

  const statusColor = {
    VALID: t.successSoft,
    'POTENTIALLY INVALID': t.dangerSoft,
    'ANALYST REVIEW': t.amberSoft,
    ERROR: t.border
  }

  const statusTextColor = {
    VALID: t.success,
    'POTENTIALLY INVALID': t.danger,
    'ANALYST REVIEW': t.amber,
    ERROR: t.textMuted
  }

  const detectionStatus = answer ? getStatusFromAnswer(answer) : 'ANALYST REVIEW'

  // Shared style helpers, all theme-aware ------------------------------
  const buttonStyle = {
    background: t.accent,
    color: t.accentText,
    border: 'none',
    borderRadius: 10,
    padding: '12px 18px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    transition: 'opacity 120ms ease'
  }

  const ghostButtonStyle = {
    background: 'transparent',
    color: t.text,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'Inter, Segoe UI, sans-serif'
  }

  const cardStyle = {
    background: t.surface,
    borderRadius: 18,
    padding: 22,
    border: `1px solid ${t.border}`,
    boxShadow: t.shadow
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    boxSizing: 'border-box',
    fontSize: 15,
    background: t.surfaceAlt,
    color: t.text,
    fontFamily: 'Inter, Segoe UI, sans-serif'
  }

  const labelStyle = { display: 'block', marginBottom: 8, fontWeight: 700, color: t.textMuted, fontSize: 13, letterSpacing: '0.01em' }

  const pageStyle = {
    background: t.bg,
    minHeight: '100vh',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    color: t.text,
    padding: '24px 20px 48px',
    transition: 'background 160ms ease, color 160ms ease'
  }

  const headingFont = { fontFamily: '"Source Serif 4", Georgia, serif' }

  // Small sun / moon glyphs drawn as inline SVG so the toggle doesn't rely
  // on emoji rendering.
  const SunIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="1.5" x2="12" y2="4.5" />
        <line x1="12" y1="19.5" x2="12" y2="22.5" />
        <line x1="1.5" y1="12" x2="4.5" y2="12" />
        <line x1="19.5" y1="12" x2="22.5" y2="12" />
        <line x1="4.5" y1="4.5" x2="6.6" y2="6.6" />
        <line x1="17.4" y1="17.4" x2="19.5" y2="19.5" />
        <line x1="4.5" y1="19.5" x2="6.6" y2="17.4" />
        <line x1="17.4" y1="6.6" x2="19.5" y2="4.5" />
      </g>
    </svg>
  )

  const MoonIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 1 0 10.5 10.5Z" fill="currentColor" />
    </svg>
  )

  const renderThemeToggle = () => (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        width: 56,
        height: 30,
        borderRadius: 999,
        border: `1px solid ${t.border}`,
        background: isDark ? '#1B2632' : '#E7EEF6',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: isDark ? 28 : 3,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: isDark ? t.accent : '#FFFFFF',
          color: isDark ? '#0D141C' : t.amber,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          transition: 'left 160ms ease, background 160ms ease'
        }}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  )

  const renderHeader = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${t.accent}, ${t.review})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, ...headingFont, fontSize: 20 }}>D</div>
        <div>
          <div style={{ ...headingFont, fontSize: 20, fontWeight: 700, color: t.text }}>Deduction Defender</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>AI-powered retail deduction recovery</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: t.accentSoft, color: t.accent, padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: t.success, display: 'inline-block' }} /> Prototype
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: t.reviewSoft, color: t.review, padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: t.review, display: 'inline-block' }} /> RocketRide Connected
        </span>
        {renderThemeToggle()}
      </div>
    </div>
  )

  const renderNavigation = () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
      {navItems.map((item) => (
        <button
          key={item.key}
          onClick={() => setActiveView(item.key)}
          style={{
            background: activeView === item.key ? t.accent : t.surface,
            color: activeView === item.key ? t.accentText : t.text,
            border: `1px solid ${activeView === item.key ? t.accent : t.border}`,
            borderRadius: 10,
            padding: '10px 16px',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: activeView === item.key ? t.shadow : 'none'
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )

  const renderOverview = () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
        {dashboardStats.map((item, idx) => (
          <div key={item.key} style={{ background: t.cardTone[idx], borderRadius: 16, padding: 18, border: `1px solid ${t.border}`, minHeight: 110 }}>
            <div style={{ color: t.textMuted, fontSize: 13, fontWeight: 600 }}>{item.label}</div>
            <div style={{ ...headingFont, fontSize: 32, fontWeight: 700, marginTop: 14, color: t.text }}>{item.value}</div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 8 }}>{item.meta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 22 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 26, ...headingFont }}>Analyze a Deduction</h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted }}>Input → RocketRide → Gemini → Decision</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>Retailer</label>
              <input value={retailer} onChange={(e) => setRetailer(e.target.value)} placeholder="e.g. Target" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Invoice / Reference</label>
              <input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="e.g. INV-10452" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Deduction Amount</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. $1,500" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Deduction Reason</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Unsupported markdown deduction" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Additional Details</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Any extra context for the analysis..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={askPipeline} style={{ ...buttonStyle, minWidth: 180, opacity: loading ? 0.8 : 1 }}>
              {loading ? 'Running analysis...' : 'Run AI Analysis'}
            </button>
            <div style={{ color: t.textMuted, fontSize: 13, fontWeight: 600 }}>Powered by Gemini + RocketRide</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 18, ...headingFont, fontSize: 20 }}>Review Queue</h3>
          {reviewQueue.length === 0 && (
            <div style={{ color: t.textMuted, lineHeight: 1.8, fontSize: 14 }}>
              No cases analyzed yet. Run an analysis to add one here.
            </div>
          )}
          <div style={{ display: 'grid', gap: 12 }}>
            {reviewQueue.map((item) => (
              <div key={`${item.retailer}-${item.caseName}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px 14px' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.retailer}</div>
                  <div style={{ color: t.textMuted, fontSize: 12, marginTop: 4 }}>{item.caseName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{item.amount}</div>
                  <div style={{ marginTop: 5 }}>
                    <span style={{
                      display: 'inline-flex',
                      padding: '5px 8px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 800,
                      background: item.risk === 'red' ? t.dangerSoft : item.risk === 'amber' ? t.amberSoft : t.successSoft,
                      color: item.risk === 'red' ? t.danger : item.risk === 'amber' ? t.amber : t.success
                    }}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderAnalyze = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: 22, alignItems: 'start' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, ...headingFont, fontSize: 24 }}>Upload Deduction Evidence</h2>
          <span style={{ color: t.textMuted, fontSize: 12, fontWeight: 600 }}>Document → .pipe Workflow → Gemini → Result</span>
        </div>

        <div style={{ border: `2px dashed ${t.accent}55`, borderRadius: 18, background: t.accentSoft, padding: '28px 20px', textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Drop a remittance, invoice, agreement or evidence file here</div>
          <div style={{ color: t.textMuted, marginBottom: 10 }}>or browse files</div>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'block', margin: '0 auto', maxWidth: 240, color: t.text }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Analyst note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <button onClick={uploadFile} style={{ ...buttonStyle, width: '100%', opacity: loading ? 0.8 : 1 }}>
          {loading ? 'Analyzing...' : 'Analyze with RocketRide'}
        </button>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 16, ...headingFont, fontSize: 20 }}>AI Decision</h3>
        {answer ? (
          <>
            <div style={{ display: 'inline-flex', padding: '7px 10px', borderRadius: 999, background: statusColor[detectionStatus], color: statusTextColor[detectionStatus], fontWeight: 800, fontSize: 12, marginBottom: 14 }}>
              {detectionStatus}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div style={{ background: t.surfaceAlt, borderRadius: 12, padding: 12, border: `1px solid ${t.border}` }}>
                <div style={{ color: t.textMuted, fontSize: 12 }}>Deduction Amount</div>
                {/* Uses the figure parsed from this analysis' own report,
                    falling back to the form amount only for the chat-based flow. */}
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{displayAmount || 'N/A'}</div>
              </div>
              <div style={{ background: t.surfaceAlt, borderRadius: 12, padding: 12, border: `1px solid ${t.border}` }}>
                <div style={{ color: t.textMuted, fontSize: 12 }}>Potential Recovery</div>
                {/* Uses the figure parsed from this analysis' report rather
                    than a hardcoded placeholder. */}
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{displayRecovery || 'N/A'}</div>
              </div>
            </div>

            <div style={{ color: t.text, lineHeight: 1.9, fontSize: 15, whiteSpace: 'pre-wrap' }}>{answer}</div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Supporting Evidence</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedEvidence.map((item) => (
                  <span key={item} style={{ background: t.accentSoft, color: t.accent, padding: '7px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>{item}</span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: t.textMuted, lineHeight: 1.8 }}>
            Run an analysis to see the AI decision.
          </div>
        )}
      </div>
    </div>
  )

  const renderAssistant = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)', gap: 22 }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, ...headingFont, fontSize: 24 }}>Deduction AI Assistant</h2>
        <div style={{ color: t.textMuted, marginBottom: 16 }}>Ask questions about a deduction, agreement, or analysis.</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => setChatInput(q)}
              style={{ textAlign: 'left', background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 12, padding: '10px 12px', cursor: 'pointer', color: t.text, fontWeight: 600 }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, ...headingFont, fontSize: 24 }}>Conversation</h2>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted }}>Powered by Gemini + RocketRide</span>
        </div>

        <div style={{ background: t.surfaceAlt, borderRadius: 14, minHeight: 240, border: `1px solid ${t.border}`, padding: 14, whiteSpace: 'pre-wrap', color: t.text, lineHeight: 1.8 }}>
          {chatAnswer || 'Ask a question to review the deduction logic, evidence, or dispute reasoning.'}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask a question about the deduction..."
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
          <button onClick={askAssistant} style={{ ...buttonStyle, minWidth: 120, opacity: chatLoading ? 0.8 : 1 }}>
            {chatLoading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderWorkflow = () => (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, ...headingFont, fontSize: 24 }}>RocketRide Workflow</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
          {[
            { label: 'Upload', tone: t.cardTone[0] },
            { label: 'Webhook', tone: t.cardTone[3] },
            { label: 'Prompt', tone: t.cardTone[3] },
            { label: 'Gemini', tone: t.cardTone[3] },
            { label: 'Decision', tone: t.cardTone[2] },
            { label: 'Dispute Draft', tone: t.cardTone[1] }
          ].map((node, index) => (
            <React.Fragment key={node.label}>
              <div style={{ minWidth: 120, textAlign: 'center', background: node.tone, borderRadius: 12, padding: '12px 14px', border: `1px solid ${t.border}`, fontWeight: 700 }}>{node.label}</div>
              {index < 5 && <div style={{ fontSize: 22, color: t.textMuted }}>→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22 }}>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, ...headingFont, fontSize: 19 }}>Upload Pipeline</h3>
          <div style={{ color: t.textMuted, lineHeight: 1.8 }}>
            Upload → Webhook → Prompt → Gemini → Response
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, ...headingFont, fontSize: 19 }}>Chat Pipeline</h3>
          <div style={{ color: t.textMuted, lineHeight: 1.8 }}>
            Chat → Prompt → Gemini → Response
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={pageStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap');
        html, body, #root { margin: 0; padding: 0; min-height: 100%; background: ${t.bg}; }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${t.textMuted}; opacity: 0.8; }
        input, textarea { outline: none; }
        input:focus, textarea:focus { border-color: ${t.accent}; }
        button:focus-visible { outline: 2px solid ${t.accent}; outline-offset: 2px; }
      `}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {renderHeader()}
        {renderNavigation()}

        {activeView === 'Overview' && renderOverview()}
        {activeView === 'Analyze' && renderAnalyze()}
        {activeView === 'AI Assistant' && renderAssistant()}
        {activeView === 'Workflow' && renderWorkflow()}
      </div>
    </div>
  )
}

export default App