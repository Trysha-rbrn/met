import { useEffect, useMemo, useState } from 'react'
import MetLogo from './MetLogo'

interface MetLoadingOverlayProps {
  isOpen: boolean
  statusMessages?: string[]
}

function MetLoadingOverlay({
  isOpen,
  statusMessages = ['Initializing your workspace...', 'Loading your finances...', 'Almost there...']
}: MetLoadingOverlayProps) {
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) return

    const timers = statusMessages.slice(1).map((_, index) => (
      window.setTimeout(() => {
        setStatusIndex(index + 1)
      }, 520 * (index + 1))
    ))

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [isOpen, statusMessages])

  const activeStatus = useMemo(
    () => statusMessages[Math.min(statusIndex, statusMessages.length - 1)] || '',
    [statusIndex, statusMessages]
  )

  if (!isOpen) return null

  return (
    <>
      <style>{`
        @keyframes metLoaderFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes metLoaderScaleIn {
          0% { transform: scale(0.58); opacity: 0; }
          68% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes metLoaderFloat {
          from { transform: scale(1); }
          to { transform: scale(1.16); }
        }
        @keyframes metLoaderLetter {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes metLoaderBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes metLoaderGlow {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.92); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.14); }
        }
      `}</style>
      <div className="fixed inset-0 z-[220] overflow-hidden bg-[#0a0a0a]" style={{ animation: 'metLoaderFadeIn 220ms ease-out forwards' }}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div
          className="absolute left-1/2 top-1/2 h-[360px] w-[360px] rounded-full"
          style={{
            animation: 'metLoaderGlow 1.8s ease-in-out infinite',
            background: 'radial-gradient(circle, rgba(255,158,255,0.13) 0%, transparent 60%)'
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 h-[420px] w-[420px] rounded-full blur-[120px]"
          style={{ animation: 'metLoaderFloat 4s ease-in-out infinite alternate', background: '#6a4d8b', opacity: 0.08 }}
        />
        <div
          className="absolute right-10 top-10 h-[320px] w-[320px] rounded-full blur-[100px]"
          style={{ animation: 'metLoaderFloat 4s ease-in-out infinite alternate-reverse', background: '#ff9eff', opacity: 0.06 }}
        />

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div style={{ animation: 'metLoaderScaleIn 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div className="rounded-[24px] border border-[#ff9eff]/25 bg-[linear-gradient(150deg,#1c0d32_0%,#2e1850_45%,#5c2878_100%)] p-5 shadow-[0_0_32px_rgba(255,158,255,0.18),0_12px_40px_rgba(0,0,0,0.7)]">
              <MetLogo compact />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-1 text-[44px] font-extrabold tracking-[-0.05em] text-slate-100">
            {['M', 'E', 'T'].map((letter, index) => (
              <span
                key={letter}
                className="inline-block opacity-0"
                style={{ animation: `metLoaderLetter 400ms cubic-bezier(0.16, 1, 0.3, 1) ${220 + index * 80}ms forwards` }}
              >
                {letter}
              </span>
            ))}
          </div>

          <p className="mt-2 text-[13px] uppercase tracking-[0.16em] text-slate-500">
            Your wealth, clearly.
          </p>

          <div className="mt-12 flex w-full max-w-[200px] flex-col items-center gap-4">
            <div className="relative h-[2px] w-full overflow-visible rounded-full bg-white/10">
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  animation: 'metLoaderBar 1.35s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                  background: 'linear-gradient(90deg, #6a4d8b, #dc89e1, #ff9eff)'
                }}
              >
                <span className="absolute -right-[3px] -top-[3px] h-2 w-2 rounded-full bg-[#ff9eff] shadow-[0_0_8px_#ff9eff,0_0_18px_rgba(255,158,255,0.45)]" />
              </div>
            </div>
            <p className="min-h-[1.4em] text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              {activeStatus}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default MetLoadingOverlay
