import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import MetLogo from '../components/MetLogo'

interface NotFoundPageProps {
  isAuthenticated: boolean
}

function NotFoundPage({ isAuthenticated }: NotFoundPageProps) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-5 py-10 text-[#f1f5f9]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />
      <div className="absolute h-[400px] w-[400px] animate-[pulse_5s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(255,158,255,0.05)_0%,transparent_70%)] blur-[60px]" />

      <div className="relative z-10 w-full max-w-[440px] text-center">
        <div className="mx-auto mb-8 flex h-[120px] w-[120px] animate-[float_4s_ease-in-out_infinite] items-center justify-center">
          <MetLogo />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <h1 className="mb-4 text-5xl font-[800] tracking-tighter">404</h1>
          <h2 className="mb-4 text-xl font-bold text-[#f1f5f9]">Balance Not Found</h2>
          <p className="mb-8 text-[14px] leading-relaxed text-[#64748b]">
            The asset you&apos;re looking for has been moved or liquidated. Our charts can&apos;t find this specific data point.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              to={isAuthenticated ? '/' : '/'}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#dc89e1] to-[#ff9eff] py-3.5 text-sm font-extrabold text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,158,255,0.3)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <a href="mailto:support@met.app" className="w-full rounded-xl border border-white/10 py-3.5 text-sm transition-all hover:bg-white/5">
              Contact Support
            </a>
          </div>

          <p className="mt-6 font-mono text-xs tracking-[0.1em] text-[#64748b]">ERR_DATA_REF_NULL // INSTANCE_LOST</p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-[linear-gradient(150deg,#1c0d32_0%,#2e1850_50%,#5c2878_100%)]">
            <MetLogo compact />
          </div>
          <span className="text-[12px] font-bold text-[#64748b]">MET Technologies</span>
        </div>
      </div>
    </section>
  )
}

export default NotFoundPage
