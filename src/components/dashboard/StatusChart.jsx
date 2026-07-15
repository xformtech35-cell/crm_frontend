import { useMemo } from 'react'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import Icon from '../Icon'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#3b82f6',
  '#14b8a6','#f97316','#a855f7','#84cc16',
]

export default function StatusChart({ title, type = 'doughnut', items = [] }) {
  const chartData = useMemo(() => ({
    labels: items.map((i) => i.label),
    datasets: [{
      data: items.map((i) => i.value),
      backgroundColor: COLORS.slice(0, items.length),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverBorderWidth: 3,
      borderRadius: type === 'bar' ? 6 : 0,
    }],
  }), [items, type])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10, boxHeight: 10, borderRadius: 3,
          font: { size: 11, family: 'Inter' }, color: '#6b7280',
          padding: 12, usePointStyle: true, pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#cbd5e1',
        padding: 10, cornerRadius: 10, borderWidth: 0,
      },
    },
    ...(type === 'bar' && {
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9ca3af', font: { size: 11 } }, grid: { color: '#f1f5f9' } },
        x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { display: false } },
      },
    }),
  }), [type])

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-gradient-to-b from-indigo-600 to-blue-500 rounded-full" />
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 font-medium">
          {items.length} items
        </span>
      </div>
      <div className="p-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Icon name="mdi:chart-donut" className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs">No data available</p>
          </div>
        ) : (
          <div style={{ position: 'relative', height: '210px' }}>
            {type === 'bar' ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <Doughnut data={chartData} options={chartOptions} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

s