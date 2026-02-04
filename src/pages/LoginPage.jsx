import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()

  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.email || !form.password) {
      toast.error('Preencha email e senha')
      return
    }

    if (!isLogin && !form.name) {
      toast.error('Preencha seu nome')
      return
    }

    setLoading(true)

    if (isLogin) {
      const { error } = await signIn(form.email, form.password)
      setLoading(false)

      if (!error) {
        navigate('/dashboard', { replace: true })
      }
    } else {
      const { error } = await signUp(
        form.email,
        form.password,
        { name: form.name }
      )

      setLoading(false)

      if (!error) {
        setIsLogin(true)
        setForm({ email: '', password: '', name: '' })
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-5">
      <div className="w-full max-w-md">
        <div className="mb-16 flex justify-center">
          <Logo size="large" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              name="name"
              placeholder="NOME COMPLETO"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          )}

          <input
            name="email"
            type="email"
            placeholder="EMAIL"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="input"
          />

          <input
            name="password"
            type="password"
            placeholder="SENHA"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="input"
          />

          <button disabled={loading} className="btn">
            {loading ? 'PROCESSANDO...' : isLogin ? 'ENTRAR' : 'CRIAR CONTA'}
          </button>

          <button type="button" onClick={() => setIsLogin(!isLogin)} className="link">
            {isLogin ? 'CRIAR CONTA' : 'FAZER LOGIN'}
          </button>
        </form>
      </div>
    </div>
  )
}
