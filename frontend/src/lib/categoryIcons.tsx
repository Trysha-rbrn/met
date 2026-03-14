import type { ComponentType } from 'react'
import {
  Tag,
  Wallet,
  ShoppingCart,
  Car,
  House,
  HeartHandshake,
  Sparkles,
  UtensilsCrossed,
  Briefcase,
  Gamepad2,
  Plane,
  GraduationCap,
  PiggyBank
} from 'lucide-react'

export const CATEGORY_ICON_MAP = {
  Tag,
  Wallet,
  ShoppingCart,
  Car,
  House,
  HeartHandshake,
  Sparkles,
  UtensilsCrossed,
  Briefcase,
  Gamepad2,
  Plane,
  GraduationCap,
  PiggyBank
} as const

export type CategoryIconKey = keyof typeof CATEGORY_ICON_MAP

export const CATEGORY_ICON_OPTIONS: Array<{ key: CategoryIconKey; label: string }> = [
  { key: 'Tag', label: 'Tag' },
  { key: 'Wallet', label: 'Wallet' },
  { key: 'ShoppingCart', label: 'Shopping' },
  { key: 'Car', label: 'Transport' },
  { key: 'House', label: 'Home' },
  { key: 'HeartHandshake', label: 'Family' },
  { key: 'Sparkles', label: 'Bonus' },
  { key: 'UtensilsCrossed', label: 'Food' },
  { key: 'Briefcase', label: 'Work' },
  { key: 'Gamepad2', label: 'Fun' },
  { key: 'Plane', label: 'Travel' },
  { key: 'GraduationCap', label: 'Education' },
  { key: 'PiggyBank', label: 'Savings' }
]

export const getCategoryIconComponent = (iconKey?: string): ComponentType<{ size?: number; className?: string }> => {
  if (!iconKey) return Tag
  return CATEGORY_ICON_MAP[iconKey as CategoryIconKey] || Tag
}

export const renderCategoryIcon = (iconKey?: string, size = 16, className?: string) => {
  switch (iconKey) {
    case 'Wallet': return <Wallet size={size} className={className} />
    case 'ShoppingCart': return <ShoppingCart size={size} className={className} />
    case 'Car': return <Car size={size} className={className} />
    case 'House': return <House size={size} className={className} />
    case 'HeartHandshake': return <HeartHandshake size={size} className={className} />
    case 'Sparkles': return <Sparkles size={size} className={className} />
    case 'UtensilsCrossed': return <UtensilsCrossed size={size} className={className} />
    case 'Briefcase': return <Briefcase size={size} className={className} />
    case 'Gamepad2': return <Gamepad2 size={size} className={className} />
    case 'Plane': return <Plane size={size} className={className} />
    case 'GraduationCap': return <GraduationCap size={size} className={className} />
    case 'PiggyBank': return <PiggyBank size={size} className={className} />
    default: return <Tag size={size} className={className} />
  }
}
