import { images } from '../data/images'

interface Props {
  className?: string
  decorative?: boolean
  loading?: 'eager' | 'lazy'
}

/** The single canonical Cafe In emblem asset used throughout the site and tools. */
export function CafeInLogo({ className = '', decorative = false, loading = 'lazy' }: Props) {
  return (
    <img
      src={images.brandLogo.src}
      alt={decorative ? '' : images.brandLogo.alt}
      width={images.brandLogo.width}
      height={images.brandLogo.height}
      loading={loading}
      decoding="async"
      className={`block h-full w-full object-contain ${className}`}
    />
  )
}
