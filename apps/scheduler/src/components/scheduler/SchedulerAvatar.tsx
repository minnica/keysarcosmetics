'use client'

import { useState } from 'react'
import { cn } from '@cosmetics/ui'
import { getProfessionalInitials } from './scheduler-utils'

interface SchedulerAvatarProps {
  name: string
  shortName?: string
  avatar?: string
  accent: string
  size?: 'sidebar' | 'header'
  imageClassName?: string
  className?: string
}

export function SchedulerAvatar({
  name,
  shortName,
  avatar,
  accent,
  size = 'sidebar',
  imageClassName,
  className,
}: SchedulerAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const initials = getProfessionalInitials(shortName || name)
  const wrapperClassName =
    size === 'header' ? 'scheduler-professional-avatar' : 'scheduler-sidebar-avatar'

  if (avatar && !hasImageError) {
    return (
      <div
        className={cn(wrapperClassName, className)}
        style={{ background: `linear-gradient(135deg, ${accent}22, rgba(255,255,255,0.98))` }}
      >
        <img
          alt={name}
          className={cn(
            size === 'header' ? 'h-10 w-10 rounded-full object-cover ring-2 ring-white' : 'h-11 w-11 rounded-2xl object-cover',
            imageClassName,
          )}
          onError={() => setHasImageError(true)}
          src={avatar}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(wrapperClassName, 'text-sm font-semibold text-white', className)}
      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }}
    >
      {initials}
    </div>
  )
}
