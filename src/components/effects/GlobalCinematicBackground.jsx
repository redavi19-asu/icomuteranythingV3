import React, { useMemo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const binaryPalette = [
  { color: 'rgba(103, 232, 249, 1)', glow: 'rgba(34, 211, 238, 0.68)' },
  { color: 'rgba(110, 231, 183, 1)', glow: 'rgba(16, 185, 129, 0.66)' },
  { color: 'rgba(251, 191, 36, 1)', glow: 'rgba(245, 158, 11, 0.64)' },
  { color: 'rgba(248, 113, 113, 1)', glow: 'rgba(185, 28, 28, 0.66)' },
  { color: 'rgba(196, 181, 253, 1)', glow: 'rgba(139, 92, 246, 0.65)' },
  { color: 'rgba(147, 197, 253, 1)', glow: 'rgba(59, 130, 246, 0.64)' },
]

function GlobalCinematicBackground({ activeSection, reduceMotion = false }) {
  const { scrollYProgress } = useScroll()

  const sectionLevels = {
    hero: 0.26,
    'what-we-do': 0.42,
    'how-it-works': 0.56,
    'why-choose-us': 0.7,
    software: 0.76,
    'ica-projects': 0.82,
    'meet-the-lead-tech': 0.78,
    'who-it-for': 0.88,
    'final-cta': 0.76,
  }

  const sectionLevel = sectionLevels[activeSection] ?? 0.45
  const gradientShiftX = useTransform(scrollYProgress, [0, 1], ['0%', '120%'])
  const gradientShiftY = useTransform(scrollYProgress, [0, 1], ['0%', '72%'])
  const gridShiftX = useTransform(scrollYProgress, [0, 1], ['0px', '160px'])
  const gridShiftY = useTransform(scrollYProgress, [0, 1], ['0px', '-210px'])
  const gridRotate = useTransform(scrollYProgress, [0, 1], [-5, 8])
  const binaryLayerOpacity = useTransform(scrollYProgress, [0, 0.45, 1], [1, 0.96, 0.88])

  const binaryDigits = useMemo(() => Array.from({ length: 50 }, (_, index) => {
    const palette = binaryPalette[index % binaryPalette.length]
    return {
      id: index,
      value: Math.random() > 0.5 ? '1' : '0',
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      driftX: (Math.random() - 0.5) * 110,
      delay: Math.random() * 6,
      duration: 5.4 + Math.random() * 7.2,
      travel: 90 + Math.random() * 190,
      scale: 0.7 + Math.random() * 0.95,
      opacity: 0.30 + Math.random() * 0.34,
      fontSize: 10 + Math.floor(Math.random() * 6),
      variant: Math.random() > 0.5 ? 'fall' : 'diagonal',
      color: palette.color,
      glow: palette.glow,
    }
  }), [])

  const streaks = useMemo(() => Array.from({ length: 18 }, (_, index) => {
    const palette = binaryPalette[index % binaryPalette.length]
    return {
      id: index,
      left: `${Math.random() * 100}%`,
      rotate: -20 + Math.random() * 40,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3.2,
      length: 70 + Math.random() * 200,
      driftX: (Math.random() - 0.5) * 14,
      color: palette.color,
      glow: palette.glow,
    }
  }), [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1100px circle at 12% 8%, rgba(34,211,238,.13), transparent 50%), radial-gradient(900px circle at 88% 14%, rgba(139,92,246,.10), transparent 58%), radial-gradient(850px circle at 50% 90%, rgba(16,185,129,.08), transparent 58%), linear-gradient(165deg, #040a16 0%, #081122 44%, #0a1628 100%)',
            backgroundPositionX: gradientShiftX,
            backgroundPositionY: gradientShiftY,
            opacity: 0.94,
          }}
        />

        <motion.div
          className="absolute -inset-[18%]"
          style={{
            opacity: reduceMotion ? 0.12 : 0.14 + sectionLevel * 0.12,
            x: gridShiftX,
            y: gridShiftY,
            rotateZ: gridRotate,
            transformPerspective: 1000,
            rotateX: 64,
            transformOrigin: 'center center',
            backgroundImage:
              'linear-gradient(rgba(34,211,238,.42) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,183,.30) 1px, transparent 1px), linear-gradient(135deg, rgba(245,158,11,.10), transparent 34%, rgba(185,28,28,.09) 64%, rgba(139,92,246,.12))',
            backgroundSize: '74px 74px, 74px 74px, 100% 100%',
          }}
        />

        <motion.div
          className="absolute inset-0"
          style={{
            opacity: 0.03 + sectionLevel * 0.045,
            background:
              'radial-gradient(ellipse at center, transparent 16%, rgba(34,211,238,.08) 46%, rgba(139,92,246,.07) 68%, rgba(16,34,64,.18) 100%)',
          }}
          animate={reduceMotion ? undefined : { scale: [1, 1.025, 1], opacity: [0.07, 0.12, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {!reduceMotion && (
          <motion.div className="absolute inset-0" style={{ opacity: binaryLayerOpacity }}>
            {binaryDigits.map((digit) => (
              <motion.span
                key={digit.id}
                className="absolute font-semibold select-none"
                style={{
                  left: digit.left,
                  top: digit.top,
                  fontSize: `${digit.fontSize}px`,
                  color: digit.color,
                  textShadow: `0 0 7px ${digit.glow}, 0 0 15px ${digit.glow}, 0 0 24px ${digit.glow}`,
                }}
                initial={{ opacity: 0, y: 0, scale: digit.scale }}
                animate={{
                  opacity: [0, Math.min(0.88, digit.opacity * 1.12), 0],
                  y: [0, digit.variant === 'fall' ? digit.travel : digit.travel * 0.7],
                  x: [0, digit.variant === 'diagonal' ? digit.driftX : digit.driftX * 0.2],
                  scale: [digit.scale * 0.88, digit.scale * 1.12, digit.scale * 0.92],
                }}
                transition={{ delay: digit.delay, duration: digit.duration, repeat: Infinity, ease: 'easeIn' }}
              >
                {digit.value}
              </motion.span>
            ))}
          </motion.div>
        )}

        {!reduceMotion && (
          <div className="absolute inset-0" style={{ opacity: 0.11 + sectionLevel * 0.08 }}>
            {streaks.map((streak) => (
              <motion.div
                key={streak.id}
                className="absolute top-[-24%] h-[2px] border-t border-dashed"
                style={{
                  left: streak.left,
                  width: `${streak.length}px`,
                  rotate: `${streak.rotate}deg`,
                  borderColor: streak.color,
                  boxShadow: `0 0 6px ${streak.glow}`,
                }}
                initial={{ y: '-10vh', opacity: 0, scale: 0.35 }}
                animate={{
                  y: ['-12vh', '126vh'],
                  x: ['0vw', `${streak.driftX}vw`],
                  opacity: [0, 0.42, 0],
                  scaleX: [0.35, 1.02, 1.18],
                }}
                transition={{ duration: streak.duration, delay: streak.delay, repeat: Infinity, ease: 'linear' }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default GlobalCinematicBackground
