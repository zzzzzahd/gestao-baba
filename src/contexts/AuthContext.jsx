import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    if (!userId) return setProfile(null)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    setProfile(data ?? null)
  }

  useEffect(() => {
    let active = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) await fetchProfile(currentUser.id)

      setLoading(false)
    }

    init()

    const { data } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!active) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          await fetchProfile(currentUser.id)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('Email ou senha incorretos')
      return { error }
    }

    // 🔑 SETA USUÁRIO IMEDIATAMENTE
    setUser(data.user)
    await fetchProfile(data.user.id)

    toast.success('Bem-vindo!')
    return { user: data.user }
  }

  const signUp = async (email, password, metadata = {}) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })

    if (error) {
      toast.error(error.message)
      return { error }
    }

    toast.success('Conta criada!')
    return {}
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile: () => fetchProfile(user?.id),
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
