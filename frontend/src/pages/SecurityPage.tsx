import { Link } from 'react-router-dom'

function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-16 text-[#f1f5f9]">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Security</h1>
        <p className="mt-2 text-sm text-[#94a3b8]">Last updated: March 21, 2026</p>

        <div className="mt-8 space-y-5 text-sm leading-7 text-[#cbd5e1]">
          <p>Authentication uses JWT-based sessions and hashed passwords.</p>
          <p>Server access is restricted by environment configuration and CORS allowlists.</p>
          <p>Platform-level metrics are shared in aggregate only and exclude personal identifiers.</p>
          <p>Potential vulnerabilities can be reported privately to support@met.app.</p>
        </div>

        <div className="mt-10">
          <Link to="/" className="text-sm font-semibold text-[#ff9eff] hover:text-[#f1f5f9]">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SecurityPage
