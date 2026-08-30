import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [question, setQuestion] = React.useState('Please review a deduction for a retailer chargeback on a promotional claim.')
  const [answer, setAnswer] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [file, setFile] = React.useState(null)

  const askPipeline = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/chat', {
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
      const response = await fetch('http://localhost:8000/api/upload', {
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
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 42, marginBottom: 20 }}>Deduction Defender</h1>
      <p style={{ fontSize: 18, lineHeight: 1.6 }}>
        Consumer brand finance teams lose 1–2% of revenue to retailer chargebacks and unauthorized deductions.
        This prototype reviews remittances, agreements, shipment data, and retailer policies to detect invalid deductions,
        prepare dispute evidence, and escalate analyst-review exceptions.
      </p>

      <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', marginTop: 30 }}>
        <h2>Analyst review</h2>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={6}
          style={{ width: '100%', fontSize: 16, padding: 12, borderRadius: 8, border: '1px solid #cfd8dc' }}
        />
        <div style={{ marginTop: 12 }}>
          <button onClick={askPipeline} style={{ padding: '10px 18px', fontSize: 16, cursor: 'pointer', marginRight: 12 }}>
            {loading ? 'Reviewing...' : 'Run RocketRide pipeline'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', marginTop: 30 }}>
        <h2>Upload deduction evidence</h2>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ marginBottom: 12 }} />
        <div>
          <button onClick={uploadFile} style={{ padding: '10px 18px', fontSize: 16, cursor: 'pointer' }}>
            Upload and review
          </button>
        </div>
      </div>

      <div style={{ background: '#f0f4f8', padding: 20, borderRadius: 12, marginTop: 30 }}>
        <h3>Result</h3>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.6 }}>{answer || 'No result yet.'}</pre>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
