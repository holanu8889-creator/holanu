'use client'

interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  title?: string
  height?: number
}

export function BarChart({ data, title, height = 200 }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="space-y-4" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          return (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-24 text-sm text-gray-600 truncate">
                {item.label}
              </div>
              <div className="flex-1">
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className={`h-6 rounded-full transition-all duration-500 ${
                        item.color || 'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {item.value}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface LineChartProps {
  data: { label: string; value: number }[]
  title?: string
  height?: number
}

export function LineChart({ data, title, height = 200 }: LineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 50
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line x1="0" y1="20" x2="100" y2="20" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="40" x2="100" y2="40" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="60" x2="100" y2="60" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="80" x2="100" y2="80" stroke="#e5e7eb" strokeWidth="0.5" />

          {/* Line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={points}
          />

          {/* Points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100
            const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 50
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill="#3b82f6"
              />
            )
          })}
        </svg>

        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
          {data.map((item, index) => (
            <span key={index} className="text-center">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: string
}

export function StatCard({ title, value, change, changeType = 'neutral', icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${
              changeType === 'positive' ? 'text-green-600' :
              changeType === 'negative' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-4xl">{icon}</div>
        )}
      </div>
    </div>
  )
}