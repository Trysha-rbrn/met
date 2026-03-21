import { Link } from 'react-router-dom'

function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-16 text-[#f1f5f9]">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#94a3b8]">Last updated: March 21, 2026</p>

        <div className="mt-8 space-y-5 text-sm leading-7 text-[#cbd5e1]">
          <p>By using MET, you agree to use the platform lawfully and keep account credentials secure.</p>
          <p>Free and paid tiers may include feature and usage limits that can change over time.</p>
          <p>You are responsible for data imported into your account and actions executed under your profile.</p>
          <p>Support is available through support@met.app for billing and platform questions.</p>
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

export default TermsPage
