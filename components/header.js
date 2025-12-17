import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import AuthModal from './AuthModal'

export default function Header() {
  const [user, setUser] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'white', zIndex: 40, padding: '12px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Empty left side to balance */}
        <div></div>
        
        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span>{user.email}</span>
              <button onClick={handleSignOut} style={{ background: '#dc2626', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none' }}>
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              style={{ background: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '700', fontSize: '16px' }}
            >
              Sign Up / Sign In
            </button>
          )}
        </div>
      </header>

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
