type MetLogoProps = {
  compact?: boolean
}

function MetLogo({ compact = false }: MetLogoProps) {
  return (
    <div className={`flex items-center ${compact ? 'gap-0' : 'gap-2'}`}>
      <div
        className="h-9 w-9 rounded-[11px] border border-[#ff9eff]/25"
        style={{
          background: 'linear-gradient(150deg,#1c0d32 0%,#2e1850 50%,#5c2878 100%)',
          boxShadow: '0 0 0 1px rgba(255,158,255,0.06), inset 0 1px 0 rgba(255,255,255,0.07)'
        }}
      >
        <svg width="36" height="36" viewBox="0 0 100 100" fill="none" className="h-full w-full p-2">
          <defs>
            <linearGradient id="metLogoGradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fce3f7" />
              <stop offset="50%" stopColor="#ff9eff" />
              <stop offset="100%" stopColor="#dc89e1" />
            </linearGradient>
          </defs>
          <path
            d="M12,84 L12,20 L46,53 L50,58 L54,53 L88,12 L88,84"
            stroke="url(#metLogoGradient)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="50" cy="58" r="5.5" fill="#ff9eff" />
          <circle cx="50" cy="58" r="2.5" fill="#fce3f7" />
        </svg>
      </div>
      {!compact && <span className="text-xl font-bold tracking-tighter text-[#f1f5f9]">MET</span>}
    </div>
  )
}

export default MetLogo
