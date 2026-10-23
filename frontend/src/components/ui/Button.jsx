import { Link } from 'react-router'

const VARIANTS = {
  primary: 'bg-forest text-cream hover:bg-forest-700 focus-visible:outline-forest',
  accent: 'bg-lime text-forest hover:bg-lime-300 focus-visible:outline-forest',
  outline: 'border border-forest/25 bg-white text-forest hover:border-forest/50 hover:bg-cream focus-visible:outline-forest',
  ghost: 'text-forest hover:bg-forest/5 focus-visible:outline-forest',
  danger: 'border border-danger/30 bg-white text-danger hover:bg-danger-soft focus-visible:outline-danger',
}

const SIZES = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(' ')
}

export default function Button({ to, variant, size, className, type = 'button', ...props }) {
  const classes = buttonClasses({ variant, size, className })
  if (to) return <Link to={to} className={classes} {...props} />
  return <button type={type} className={classes} {...props} />
}
