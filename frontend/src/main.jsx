import React from 'react'
import ReactDOM from 'react-dom/client'

const API_BASE = 'http://localhost:8001'

const defaultStats = [
  { label: 'Cases Analyzed', value: '0', meta: 'Live data', tone: '#e8f3ff' },
  { label: 'Potentially Invalid', value: '0', meta: 'Live data', tone: '#fef2f2' },
  { label: 'Potential Recovery', value: '$0', meta: 'Live data', tone: '#edfdf5' },
  { label: 'Needs Review', value: '0', meta: 'Live data', tone: '#f3e8ff' }
]

const defaultQueue = [
  { retailer: 'Target', caseName: 'Promotion deduction', amount: '$500', status: 'Needs Review', risk: 'amber' },
  { retailer: 'Retailer B', caseName: 'Pricing deduction', amount: '$750', status: 'Potentially Invalid', risk: 'red' },
  { retailer: 'Retailer C', caseName: 'Shipment deduction', amount: '$1,200', status: 'Needs Review', risk: 'amber' },
  { retailer: 'Retailer D', caseName: 'Damage claim', amount: '$960', status: 'Valid', risk: 'green' }
]

const evidenceItems = ['Agreement', 'Invoice', 'Remittance', 'Shipment POD', 'Policy Manual']

const suggestedQuestions = [
  'Why was this deduction flagged?',
  'Explain the deduction reasoning.',
  'What evidence supports this decision?',
  'Draft a dispute response.'
]

const navItems = ['Overview', 'Analyze', 'AI Assistant', 'Workflow']

function App() {
  const [activeView, setActiveView] = React.useState('Overview')
  const [retailer, setRetailer] = React.useState('Target')
  const [invoice, setInvoice] = React.useState('INV-10452')
  const [amount, setAmount] = React.useState('$1,500')
  const [reason, setReason] = React.useState('Unsupported markdown deduction')
  const [details, setDetails] = React.useState('Deduction exceeds promotional allowance and lacks retailer approval evidence.')
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
    const t = (text || '').toLowerCase()
    if (t.includes('invalid') || t.includes('dispute') || t.includes('potentially invalid')) return 'POTENTIALLY INVALID'
    if (t.includes('review') || t.includes('analyst')) return 'ANALYST REVIEW'
    if (t.includes('valid') || t.includes('approved')) return 'VALID'
    return 'ANALYST REVIEW'
  }

  const updateDashboardFromAnalysis = (resultText, caseAmount = amount, retailerName = retailer) => {
    const status = getStatusFromAnswer(resultText)
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
      updateDashboardFromAnalysis(resultText, amount, retailer)
      setActiveView('Analyze')
    } catch (error) {
      const message = error instanceof TypeError && error.message === 'Failed to fetch'
        ? 'Request error: backend is not reachable on http://localhost:8001. Start the FastAPI backend and try again.'
        : `Error: ${error.message}`
      setAnswer(message)
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
      updateDashboardFromAnalysis(resultText, amount, retailer)
      setActiveView('Analyze')
    } catch (error) {
      const message = error instanceof TypeError && error.message === 'Failed to fetch'
        ? 'Upload error: backend is not reachable on http://localhost:8001. Start the FastAPI backend and try again.'
        : `Upload error: ${error.message}`
      setAnswer(message)
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
    VALID: '#dcfce7',
    'POTENTIALLY INVALID': '#fee2e2',
    'ANALYST REVIEW': '#fef3c7'
  }

  const statusTextColor = {
    VALID: '#166534',
    'POTENTIALLY INVALID': '#b91c1c',
    'ANALYST REVIEW': '#b45309'
  }

  const detectionStatus = answer ? getStatusFromAnswer(answer) : 'ANALYST REVIEW'

  const buttonStyle = {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 18px',
    fontWeight: 700,
    cursor: 'pointer'
  }

  const cardStyle = {
    background: '#fff',
    borderRadius: 18,
    padding: 22,
    border: '1px solid rgba(17, 24, 39, 0.05)',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)'
  }

  const pageStyle = {
    background: '#F5F7FB',
    minHeight: '100vh',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    color: '#111827',
    padding: '24px 20px 40px'
  }

  const renderHeader = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>D</div>
        <div>
          <div style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>Deduction Defender</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>AI-powered retail deduction recovery</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eef2ff', color: '#4338ca', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#16a34a', display: 'inline-block' }} /> Prototype
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ecfeff', color: '#0f766e', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#06b6d4', display: 'inline-block' }} /> RocketRide Connected
        </span>
      </div>
    </div>
  )

  const renderNavigation = () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
      {navItems.map((item) => (
        <button
          key={item}
          onClick={() => setActiveView(item)}
          style={{
            background: activeView === item ? '#0f172a' : '#fff',
            color: activeView === item ? '#fff' : '#111827',
            border: '1px solid rgba(17, 24, 39, 0.08)',
            borderRadius: 10,
            padding: '10px 16px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: activeView === item ? '0 8px 18px rgba(15, 23, 42, 0.18)' : 'none'
          }}
        >
          {item}
        </button>
      ))}
    </div>
  )

  const renderOverview = () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 18 }}>
        {dashboardStats.map((item) => (
          <div key={item.label} style={{ background: item.tone, borderRadius: 16, padding: 18, border: '1px solid rgba(17,24,39,0.06)', minHeight: 110 }}>
            <div style={{ color: '#6B7280', fontSize: 13, fontWeight: 600 }}>{item.label}</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginTop: 14 }}>{item.value}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>{item.meta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 28 }}>Analyze a Deduction</h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Input → RocketRide → Gemini → Decision</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#374151' }}>Retailer</label>
              <input value={retailer} onChange={(e) => setRetailer(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #dbe3ee', boxSizing: 'border-box', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#374151' }}>Invoice / Reference</label>
              <input value={invoice} onChange={(e) => setInvoice(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #dbe3ee', boxSizing: 'border-box', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#374151' }}>Deduction Amount</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #dbe3ee', boxSizing: 'border-box', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#374151' }}>Deduction Reason</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #dbe3ee', boxSizing: 'border-box', fontSize: 15 }} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#374151' }}>Additional Details</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} style={{ width: '100%', borderRadius: 12, border: '1px solid #dbe3ee', padding: '12px 14px', fontSize: 15, boxSizing: 'border-box', resize: 'vertical' }} />
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={askPipeline} style={{ ...buttonStyle, minWidth: 180, opacity: loading ? 0.8 : 1 }}>
              {loading ? 'Running analysis...' : 'Run AI Analysis'}
            </button>
            <div style={{ color: '#6B7280', fontSize: 13, fontWeight: 600 }}>Powered by Gemini + RocketRide</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 18 }}>Review Queue</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {reviewQueue.map((item) => (
              <div key={`${item.retailer}-${item.caseName}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #edf2f7', borderRadius: 12, padding: '12px 14px' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.retailer}</div>
                  <div style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>{item.caseName}</div>
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
                      background: item.risk === 'red' ? '#fee2e2' : item.risk === 'amber' ? '#fef3c7' : '#dcfce7',
                      color: item.risk === 'red' ? '#b91c1c' : item.risk === 'amber' ? '#b45309' : '#166534'
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
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 22, alignItems: 'start' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Upload Deduction Evidence</h2>
          <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 600 }}>Document → .pipe Workflow → Gemini → Result</span>
        </div>

        <div style={{ border: '2px dashed #bfd3ff', borderRadius: 18, background: '#f8fbff', padding: '28px 20px', textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Drop a remittance, invoice, agreement or evidence file here</div>
          <div style={{ color: '#6B7280', marginBottom: 10 }}>or browse files</div>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'block', margin: '0 auto', maxWidth: 220 }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>Analyst note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} style={{ width: '100%', borderRadius: 12, border: '1px solid #dbe3ee', padding: '12px 14px', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>

        <button onClick={uploadFile} style={{ ...buttonStyle, width: '100%', opacity: loading ? 0.8 : 1 }}>
          {loading ? 'Analyzing...' : 'Analyze with RocketRide'}
        </button>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>AI Decision</h3>
        {answer ? (
          <>
            <div style={{ display: 'inline-flex', padding: '7px 10px', borderRadius: 999, background: statusColor[detectionStatus], color: statusTextColor[detectionStatus], fontWeight: 800, fontSize: 12, marginBottom: 14 }}>
              {detectionStatus}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12 }}>
                <div style={{ color: '#6B7280', fontSize: 12 }}>Deduction Amount</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{amount}</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12 }}>
                <div style={{ color: '#6B7280', fontSize: 12 }}>Potential Recovery</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>$500</div>
              </div>
            </div>

            <div style={{ color: '#111827', lineHeight: 1.9, fontSize: 15, whiteSpace: 'pre-wrap' }}>{answer}</div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Supporting Evidence</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedEvidence.map((item) => (
                  <span key={item} style={{ background: '#eef2ff', color: '#4338ca', padding: '7px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>{item}</span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: '#6B7280', lineHeight: 1.8 }}>
            Run an analysis to see the AI decision.
          </div>
        )}
      </div>
    </div>
  )

  const renderAssistant = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 22 }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Deduction AI Assistant</h2>
        <div style={{ color: '#6B7280', marginBottom: 16 }}>Ask questions about a deduction, agreement, or analysis.</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => setChatInput(q)}
              style={{ textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', color: '#111827', fontWeight: 600 }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Conversation</h2>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Powered by Gemini + RocketRide</span>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 14, minHeight: 240, border: '1px solid #e2e8f0', padding: 14, whiteSpace: 'pre-wrap', color: '#111827', lineHeight: 1.8 }}>
          {chatAnswer || 'Ask a question to review the deduction logic, evidence, or dispute reasoning.'}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask a question about the deduction..."
            style={{ flex: 1, borderRadius: 12, border: '1px solid #dbe3ee', padding: '12px 14px', fontSize: 15 }}
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
        <h2 style={{ marginTop: 0 }}>RocketRide Workflow</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
          {[{ label: 'Upload', tone: '#dbeafe' }, { label: 'Webhook', tone: '#e0e7ff' }, { label: 'Prompt', tone: '#ede9fe' }, { label: 'Gemini', tone: '#f3e8ff' }, { label: 'Decision', tone: '#dcfce7' }, { label: 'Dispute Draft', tone: '#fefce8' }].map((node, index) => (
            <React.Fragment key={node.label}>
              <div style={{ minWidth: 120, textAlign: 'center', background: node.tone, borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(17,24,39,0.05)', fontWeight: 700 }}>{node.label}</div>
              {index < 5 && <div style={{ fontSize: 24, color: '#94a3b8' }}>→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Upload Pipeline</h3>
          <div style={{ color: '#4b5563', lineHeight: 1.8 }}>
            Upload → Webhook → Prompt → Gemini → Response
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Chat Pipeline</h3>
          <div style={{ color: '#4b5563', lineHeight: 1.8 }}>
            Chat → Prompt → Gemini → Response
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={pageStyle}>
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
