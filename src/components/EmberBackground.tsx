import type { CSSProperties } from 'react'

const EMBERS = [
  { left: '7%', size: 2, duration: 21, delay: -13, drift: '24px', glow: 0.4 },
  { left: '18%', size: 3, duration: 25, delay: -4, drift: '-18px', glow: 0.34 },
  { left: '31%', size: 2, duration: 18, delay: -9, drift: '14px', glow: 0.3 },
  { left: '43%', size: 4, duration: 27, delay: -19, drift: '-25px', glow: 0.38 },
  { left: '57%', size: 2, duration: 22, delay: -7, drift: '20px', glow: 0.32 },
  { left: '68%', size: 3, duration: 19, delay: -15, drift: '-13px', glow: 0.4 },
  { left: '79%', size: 2, duration: 26, delay: -2, drift: '17px', glow: 0.3 },
  { left: '91%', size: 3, duration: 23, delay: -11, drift: '-20px', glow: 0.36 },
]

type EmberStyle = CSSProperties & {
  '--ember-left': string
  '--ember-size': string
  '--ember-duration': string
  '--ember-delay': string
  '--ember-drift': string
  '--ember-glow': number
}

export function EmberBackground({ strength = 'subtle' }: { strength?: 'subtle' | 'warm' }) {
  const boost = strength === 'warm' ? 1.22 : 1
  return (
    <div className="hero-ember-layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {EMBERS.map((ember, index) => (
        <span
          key={index}
          className={`hero-ember${strength === 'warm' ? ' hero-ember--warm' : ''}`}
          style={{
            '--ember-left': ember.left,
            '--ember-size': `${ember.size * boost}px`,
            '--ember-duration': `${ember.duration}s`,
            '--ember-delay': `${ember.delay}s`,
            '--ember-drift': ember.drift,
            '--ember-glow': Math.min(0.5, ember.glow * boost),
          } as EmberStyle}
        />
      ))}
    </div>
  )
}
