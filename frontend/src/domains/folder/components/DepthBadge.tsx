import React from 'react'

interface DepthBadgeProps {
  level: number
}

const DepthBadge: React.FC<DepthBadgeProps> = ({ level }) => {
  let badgeClass = ''

  if (level === 1) {
    // Red/Rose Theme for Level 1 (D1)
    badgeClass = 'bg-rose-50 text-rose-600 border-rose-200'
  } else if (level === 2) {
    // Blue Theme for Level 2 (D2)
    badgeClass = 'bg-blue-50 text-blue-600 border-blue-200'
  } else {
    // Gray/Slate Theme for Level 3 (D3)
    badgeClass = 'bg-slate-100 text-slate-500 border-slate-200'
  }

  return (
    <span className={`text-[9px] px-1.5 py-0.5 border rounded font-mono font-semibold shrink-0 select-none ${badgeClass}`}>
      D{level}
    </span>
  )
}

export default DepthBadge
