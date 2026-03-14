import { Link } from 'react-router-dom'
import { Compass, Home, ShieldAlert } from 'lucide-react'

interface NotFoundPageProps {
  isAuthenticated: boolean
}

function NotFoundPage({ isAuthenticated }: NotFoundPageProps) {
  return (
    <section className="min-h-[60vh] w-full flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl border bg-card/90 p-8 sm:p-10 text-center shadow-xl shadow-black/5">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#a569b0] to-[#6a4d8b] text-white">
          <ShieldAlert size={26} />
        </div>
        <p className="text-sm font-black tracking-[0.25em] text-muted-foreground">ERROR 404</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tighter text-foreground">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          The page you requested does not exist or was moved.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={isAuthenticated ? '/' : '/'}
            className="min-h-11 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"
          >
            <Home size={17} />
            Go to Home
          </Link>
          <Link
            to={isAuthenticated ? '/transactions' : '/'}
            className="min-h-11 px-5 py-2.5 rounded-xl border font-bold inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Compass size={17} />
            {isAuthenticated ? 'Open Transactions' : 'Back to Login'}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default NotFoundPage
