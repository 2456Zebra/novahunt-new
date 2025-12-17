import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    let error
    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      error = signUpError
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      error = signInError
    }

    if (error) {
      setMessage(error.message)
    } else {
      setMessage(isSignUp ? 'Check your email for confirmation!' : 'Welcome back!')
      setTimeout(() => {
        onClose()
        window.location.reload()
      }, 1500)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '16px', padding: '32px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: '800', marginBottom: '24px' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '12px', fontSize: '16px' }}
          />

          <input
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
            style={{ padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '12px', fontSize: '16px' }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '18px' }}
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {message && <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '16px' }}>{message}</p>}

        <p style={{ textAlign: 'center', marginTop: '24px' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#2563eb', fontWeight: '700', background: 'none', border: 'none' }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

        <button onClick={onClose} style={{ width: '100%', marginTop: '24px', color: '#6b7280' }}>
          Close
        </button>
      </div>
    </div>
  )
}
