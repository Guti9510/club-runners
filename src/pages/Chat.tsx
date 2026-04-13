import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredAuth, clearAuth, isTokenValid, getAllActivities } from '../lib/strava'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const suggestions = [
  'How many runs over 2 hours have I had?',
  'What is my longest run ever?',
  'How many km have I run this year?',
  'What is my best 5K pace?',
  'How many runs do I average per week?',
  'What day of the week do I run the most?',
]

export default function Chat() {
  const navigate = useNavigate()
  const { accessToken } = getStoredAuth()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hey! Ask me anything about your running history. I have access to all your Strava activities.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [activities, setActivities] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isTokenValid()) { clearAuth(); navigate('/'); return }
    getAllActivities(accessToken!).then(acts => {
      setActivities(acts)
      setLoadingActivities(false)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const ask = async (question: string) => {
    if (!question.trim() || loading || loadingActivities) return
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, activities }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.answer ?? data.error ?? 'Something went wrong.',
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Failed to get a response. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto', fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: '800' }}>Running Assistant</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          {loadingActivities ? 'Loading your activities...' : `Powered by Claude · ${activities.length} activities loaded`}
        </p>
      </div>

      {/* Chat Window */}
      <div style={{ ...cardStyle, marginBottom: '16px', minHeight: '400px', maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#FC4C02' : 'rgba(255,255,255,0.08)',
              color: 'white',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.08)', color: '#64748b', fontSize: '0.9rem' }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={loadingActivities}
              style={{
                padding: '6px 12px',
                background: 'rgba(252,76,2,0.1)',
                border: '1px solid rgba(252,76,2,0.3)',
                borderRadius: '20px',
                color: '#FC4C02',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(input)}
          placeholder={loadingActivities ? 'Loading activities...' : 'Ask about your runs...'}
          disabled={loadingActivities || loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
        <button
          onClick={() => ask(input)}
          disabled={!input.trim() || loading || loadingActivities}
          style={{
            padding: '12px 20px',
            background: input.trim() && !loading && !loadingActivities ? '#FC4C02' : 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontWeight: '700',
            cursor: input.trim() && !loading && !loadingActivities ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            transition: 'all 0.15s',
          }}
        >
          Ask
        </button>
      </div>
    </div>
  )
}
