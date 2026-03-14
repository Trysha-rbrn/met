import { useState } from 'react'
import axios from 'axios'
import { Wallet, Mail, Lock, User, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import * as api from '../api/authApi'
import type { AuthUser } from '../api/authApi'

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
        setError(err.response?.data?.error || 'An unexpected error occurred.')
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl rounded-2xl border shadow-2xl shadow-black/5">
          <div className="p-8 lg:p-12">
            <div className="flex flex-col items-center text-center mb-8">
              <motion.div 
                className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/30 mb-5"
                whileHover={{ scale: 1.1, rotate: 10 }}
              >
                <Wallet size={28} />
              </motion.div>
              <h1 className="text-3xl font-black tracking-tighter mb-1">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-muted-foreground font-medium">
                {isLogin ? 'Enter your details to sign in' : 'Begin your financial journey'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && <AuthInput id="auth-name" name="name" type="text" placeholder="Full Name" value={name} onChange={setName} icon={User} />}
              <AuthInput id="auth-email" name="email" type="email" placeholder="Email Address" value={email} onChange={setEmail} icon={Mail} />
              <AuthInput id="auth-password" name="password" type="password" placeholder="Password" value={password} onChange={setPassword} icon={Lock} />

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm font-bold rounded-lg animate-shake text-center">
                  {error}
                </div>
              )}

              <motion.button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
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
          <div className="p-6 border-t bg-muted/30 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-muted-foreground font-bold hover:text-foreground transition-colors text-sm"
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
  placeholder: string
  value: string
  onChange: (value: string) => void
  icon: React.ComponentType<{ className?: string; size?: number }>
}

const AuthInput = ({ id, name, type, placeholder, value, onChange, icon: Icon }: AuthInputProps) => (
  <div className="relative group">
    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
    <input 
      id={id}
      name={name}
      type={type} 
      placeholder={placeholder} 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-12 pr-4 py-3 bg-muted/50 border-2 border-transparent focus:border-primary/50 rounded-lg outline-none transition-all font-semibold"
      required
    />
  </div>
)

export default AuthPage
