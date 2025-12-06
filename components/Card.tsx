interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-gray-200' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}