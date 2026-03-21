import { useState } from 'react'
import axios from 'axios'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import * as api from '../api/authApi'
import type { AuthUser } from '../api/authApi'
import MetLogo from '../components/MetLogo'

interface AuthPageProps {
  onLogin: (user: AuthUser, token: string) => void
}

function AuthPage({ onLogin }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const data = isLogin 
        ? await api.login({ email, password })
        : await api.register({ email, password, name })
      onLogin(data.user, data.token)
    } catch (err: unknown) {
      if (axios.isAxiosError<{ error?: string }>(err)) {
        if (!err.response) {
          setError('Cannot reach server. Check backend, CORS and network (phone + laptop must be on same Wi-Fi).')
        } else {
          setError(err.response.data?.error || 'An unexpected error occurred.')
        }
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="met-app-bg h-full w-full flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-[#ff9eff]/20 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/3 right-[15%] w-[28rem] h-[28rem] bg-[#a569b0]/20 rounded-full blur-3xl -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="w-full max-w-md"
      >
        <div className="met-card rounded-2xl shadow-2xl shadow-black/30">
          <div className="p-8 lg:p-12">
            <div className="flex flex-col items-center text-center mb-8">
              <motion.div whileHover={{ scale: 1.03 }} className="mb-5">
                <MetLogo />
              </motion.div>
              <h1 className="text-3xl font-black tracking-tighter mb-1 text-slate-100">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-slate-400 font-medium">
                {isLogin ? 'Enter your details to sign in' : 'Begin your financial journey'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && <AuthInput id="auth-name" name="name" type="text" autoComplete="name" placeholder="Full Name" value={name} onChange={setName} icon={User} />}
              <AuthInput id="auth-email" name="email" type="email" autoComplete="email" placeholder="Email Address" value={email} onChange={setEmail} icon={Mail} />
              <AuthInput id="auth-password" name="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="Password" value={password} onChange={setPassword} icon={Lock} />

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm font-bold rounded-lg animate-shake text-center">
                  {error}
                </div>
              )}

              <motion.button
                type="submit" 
                disabled={loading}
                className="w-full bg-[#ff9eff] text-[#1c0d32] font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-[#ff9eff]/25 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Processing...' : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
          <div className="p-6 border-t border-white/10 bg-black/10 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-slate-400 font-bold hover:text-slate-100 transition-colors text-sm"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

interface AuthInputProps {
  id: string
  name: string
  type: React.HTMLInputTypeAttribute
  autoComplete?: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  icon: React.ComponentType<{ className?: string; size?: number }>
}

const AuthInput = ({ id, name, type, autoComplete, placeholder, value, onChange, icon: Icon }: AuthInputProps) => (
  <div className="relative group">
    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#ff9eff] transition-colors" size={20} />
    <input 
      id={id}
      name={name}
      type={type} 
      autoComplete={autoComplete}
      placeholder={placeholder} 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 focus:border-[#ff9eff]/50 rounded-lg outline-none transition-all font-semibold text-slate-100 placeholder:text-slate-500"
      required
    />
  </div>
)

export default AuthPage
