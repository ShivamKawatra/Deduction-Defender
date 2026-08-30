import React from 'react'
import ReactDOM from 'react-dom/client'

const stats = [
  { label: 'Revenue at risk', value: '$2.4M', tone: '#e8f3ff' },
  { label: 'Invalid deductions', value: '68%', tone: '#eafaf1' },
  { label: 'Auto-disputed', value: '312', tone: '#fff4d9' },
  { label: 'Analyst review', value: '24', tone: '#fce8e8' }
]

const queue = [
  { retailer: 'Target', amount: '$124,500', status: 'Needs review', risk: 'High' },
  { retailer: 'Walmart', amount: '$89,900', status: 'Auto-dispute', risk: 'Medium' },
  { retailer: 'CVS', amount: '$42,000', status: 'Approved', risk: 'Low' },
  { retailer: 'Costco', amount: '$203,700', status: 'Escalated', risk: 'High' }
]

const API_BASE = 'http://localhost:8001'

function App() {
  const [question, setQuestion] = React.useState('Please review a deduction for a retailer chargeback on a promotional claim.')
  const [answer, setAnswer] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [file, setFile] = React.useState(null)

  const askPipeline = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })

      const data = await response.json()
      setAnswer(data.answer || 'No answer available')
    } catch (error) {
      setAnswer('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('note', 'Review against remittance and policy terms')

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      setAnswer(data.message || 'Upload processed')
    } catch (error) {
      setAnswer('Upload error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#f4f7fb', minHeight: '100vh', fontFamily: 'Arial, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 14, letterSpacing: 1.5, color: '#4b5563', textTransform: 'uppercase', fontWeight: 700 }}>Finance operations</div>
            <h1 style={{ fontSize: 42, margin: '8px 0 0' }}>Deduction Defender</h1>
          </div>
          <button style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' }}>
            Export review summary
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 18, marginBottom: 28 }}>
          {stats.map((item) => (
            <div key={item.label} style={{ background: item.tone, borderRadius: 16, padding: 18, border: '1px solid rgba(15,23,42,0.05)' }}>
              <div style={{ color: '#475569', fontSize: 14 }}>{item.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 12 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 22, boxShadow: '0 10px 25px rgba(15,23,42,0.06)' }}>
            <h2 style={{ marginTop: 0 }}>Analyst review</h2>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={8}
              style={{ width: '100%', fontSize: 16, padding: 14, borderRadius: 12, border: '1px solid #dbe3ee', boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 12 }}>
              <button onClick={askPipeline} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' }}>
                {loading ? 'Reviewing...' : 'Run RocketRide analysis'}
              </button>
              <span style={{ color: '#64748b', fontSize: 13 }}>Uses Gemini-powered deduction analysis</span>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 18, padding: 22, boxShadow: '0 10px 25px rgba(15,23,42,0.06)' }}>
            <h2 style={{ marginTop: 0 }}>Review queue</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {queue.map((item) => (
                <div key={item.retailer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #edf2f7', borderRadius: 12, padding: '12px 14px' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.retailer}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{item.status}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{item.amount}</div>
                    <div style={{ fontSize: 12, color: item.risk === 'High' ? '#b91c1c' : item.risk === 'Medium' ? '#b45309' : '#166534' }}>{item.risk}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 22 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 22, boxShadow: '0 10px 25px rgba(15,23,42,0.06)' }}>
            <h2 style={{ marginTop: 0 }}>Upload evidence</h2>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ marginBottom: 12, width: '100%' }} />
            <button onClick={uploadFile} style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 18px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              Upload and review
            </button>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 18, padding: 22, boxShadow: '0 10px 25px rgba(15,23,42,0.06)' }}>
            <h2 style={{ marginTop: 0 }}>Decision output</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.7, margin: 0, color: '#0f172a' }}>{answer || 'No result yet. Run an analysis to review a deduction or upload evidence to evaluate the case.'}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
