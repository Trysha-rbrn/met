import { DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

function Dashboard() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Overview of your financial situation.
        </p>
      </header>

      {/* Stats Cards Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          title="Total Balance" 
          amount="$0.00" 
          icon={<DollarSign size={24} />} 
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
        />
        <Card 
          title="Total Income" 
          amount="$0.00" 
          icon={<ArrowUpCircle size={24} />} 
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
        />
        <Card 
          title="Total Expenses" 
          amount="$0.00" 
          icon={<ArrowDownCircle size={24} />} 
          color="bg-rose-100 text-rose-600 dark:bg-rose-900/30"
        />
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <p className="text-slate-500 dark:text-slate-400">No recent transactions to display.</p>
      </section>
    </div>
  )
}

function Card({ title, amount, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <span className="text-slate-500 dark:text-slate-400 font-medium">{title}</span>
        <div className={`p-2 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold">{amount}</div>
    </div>
  )
}

export default Dashboard
