import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ChartPoint {
  dayKey: string
  income: number
  expenses: number
  runningBalance: number
}

interface DashboardChartsProps {
  chartData: ChartPoint[]
  loading: boolean
  showCharts: boolean
  formatTooltipCurrency: (value: unknown) => string
}

function DashboardCharts({ chartData, loading, showCharts, formatTooltipCurrency }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 min-w-0">
      <div className="bg-card border rounded-2xl p-5 md:p-6 min-w-0">
        <h3 className="text-lg font-bold mb-4">Balance Trend</h3>
        <div className="h-64 sm:h-72 min-h-[16rem] sm:min-h-[18rem] min-w-0">
          {loading ? (
            <ChartSkeleton />
          ) : showCharts ? (
            <ResponsiveContainer width="100%" height={256} minWidth={1} minHeight={256} debounce={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="dayKey"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatDayLabelFromKey(String(value))}
                />
                <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={formatTooltipCurrency}
                  labelFormatter={(label) => formatFullDateLabelFromKey(String(label))}
                />
                <Area type="monotone" dataKey="runningBalance" stroke="#3b82f6" fill="url(#balanceFill)" strokeWidth={2.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartSkeleton />
          )}
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-5 md:p-6 min-w-0">
        <h3 className="text-lg font-bold mb-4">Income vs Expenses</h3>
        <div className="h-64 sm:h-72 min-h-[16rem] sm:min-h-[18rem] min-w-0">
          {loading ? (
            <ChartSkeleton />
          ) : showCharts ? (
            <ResponsiveContainer width="100%" height={256} minWidth={1} minHeight={256} debounce={120}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="dayKey"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatDayLabelFromKey(String(value))}
                />
                <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={formatTooltipCurrency}
                  labelFormatter={(label) => formatFullDateLabelFromKey(String(label))}
                />
                <Legend />
                <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartSkeleton />
          )}
        </div>
      </div>
    </div>
  )
}

const ChartSkeleton = () => (
  <div className="h-full w-full rounded-xl bg-muted/60 animate-pulse" />
)

function formatDayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDayLabelFromKey(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return formatDayLabel(parsed)
}

function formatFullDateLabelFromKey(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

export default DashboardCharts
