import React, { useMemo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

function GlobalCinematicBackground({ activeSection, reduceMotion = false }) {
  const { scrollYProgress } = useScroll()

  const chapter = {
    hero: {
      level: 0.26,
      hue: 0,
      gridTilt: -8,
      gridShiftX: 0,
      gridShiftY: -70,
      binaryBoost: 1.0,
      streakBoost: 0.8,
      baseOpacity: 0.88,
      orbScale: 1.0,
    },
    'what-we-do': {
      level: 0.42,
      hue: 12,
      gridTilt: -2,
      gridShiftX: 35,
      gridShiftY: -95,
      binaryBoost: 1.35,
      streakBoost: 1.0,
      baseOpacity: 0.92,
      orbScale: 1.06,
    },
    'how-it-works': {
      level: 0.56,
      hue: 22,
      gridTilt: 6,
      gridShiftX: 85,
      gridShiftY: -130,
      binaryBoost: 1.55,
      streakBoost: 1.2,
      baseOpacity: 0.95,
      orbScale: 1.1,
    },
    'why-choose-us': {
      level: 0.7,
      hue: 34,
      gridTilt: 14,
      gridShiftX: 130,
      gridShiftY: -165,
      binaryBoost: 1.75,
      streakBoost: 1.45,
      baseOpacity: 1,
      orbScale: 1.16,
    },
    'who-it-for': {
      level: 0.88,
      hue: 48,
      gridTilt: 20,
      gridShiftX: 175,
      gridShiftY: -220,
      binaryBoost: 2,
      streakBoost: 1.75,
      baseOpacity: 1,
      orbScale: 1.24,
    },
    'final-cta': {
      level: 0.76,
      hue: 38,
      gridTilt: 10,
      gridShiftX: 105,
      gridShiftY: -155,
      binaryBoost: 1.42,
      streakBoost: 1.25,
      baseOpacity: 0.96,
      orbScale: 1.12,
    },
  }[activeSection] ?? {
    level: 0.45,
    hue: 14,
    gridTilt: 0,
    gridShiftX: 40,
    gridShiftY: -90,
    binaryBoost: 1.2,
    streakBoost: 1,
    baseOpacity: 0.9,
    orbScale: 1.05,
  }

  const sectionLevel = chapter.level

  const hueRotateBase = useTransform(scrollYProgress, [0, 1], [-6, 34])
  const hueRotate = useTransform(hueRotateBase, (value) => value + chapter.hue)
  const hueFilter = useTransform(hueRotate, (value) => `hue-rotate(${value}deg)`)

  const gradientShiftX = useTransform(scrollYProgress, [0, 1], ['0%', '145%'])
  const gradientShiftY = useTransform(scrollYProgress, [0, 1], ['0%', '80%'])

  const gridOpacity = reduceMotion ? 0.18 : 0.35 + sectionLevel * 0.40
  const streakOpacity = reduceMotion ? 0.18 : 0.35 + sectionLevel * 0.45
  const streakSpeedBoost = reduceMotion ? 0 : chapter.streakBoost

  const binaryDigits = useMemo(() => {
    return Array.from({ length: 64 }, (_, index) => ({
      id: index,
      value: Math.random() > 0.5 ? '1' : '0',
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      driftX: (Math.random() - 0.5) * 110,
      delay: Math.random() * 6,
      duration: 4.4 + Math.random() * 6.2,
      travel: 90 + Math.random() * 190,
      scale: 0.7 + Math.random() * 0.95,
      opacity: 0.2 + Math.random() * 0.45,
      fontSize: 10 + Math.floor(Math.random() * 6),
      variant: Math.random() > 0.5 ? 'fall' : 'diagonal',
    }))
  }, [])

  const streaks = useMemo(() => {
    return Array.from({ length: 32 }, (_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      rotate: -20 + Math.random() * 40,
      delay: Math.random() * 4,
      duration: 1.1 + Math.random() * 2.2,
      length: 70 + Math.random() * 200,
      driftX: (Math.random() - 0.5) * 14,
    }))
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.div className="absolute inset-0" style={{ filter: hueFilter }}>
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1350px circle at 10% 8%, rgba(79,172,254,.34), transparent 50%), radial-gradient(1100px circle at 88% 14%, rgba(122,82,255,.30), transparent 56%), radial-gradient(1200px circle at 50% 92%, rgba(26,74,190,.35), transparent 62%), linear-gradient(165deg, #050913 0%, #091023 42%, #0a1126 100%)',
            backgroundPositionX: gradientShiftX,
            backgroundPositionY: gradientShiftY,
            opacity: chapter.baseOpacity,
          }}
        />

        <motion.div
          className="absolute inset-0"
          style={{
            opacity: gridOpacity,
            transform: `perspective(900px) rotateX(66deg) rotateZ(${chapter.gridTilt}deg)`,
            transformOrigin: 'center center',
            backgroundImage:
              'linear-gradient(rgba(132,184,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(132,184,255,0.95) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            backgroundPosition: 'center center',
          }}
          animate={
            reduceMotion
              ? undefined
              : {
                  backgroundPositionY: ['0px', `${chapter.gridShiftY}px`],
                  backgroundPositionX: ['0px', `${chapter.gridShiftX}px`],
                }
          }
          transition={{ duration: 5.4, repeat: Infinity, ease: 'linear' }}
        />

        <motion.div
          className="absolute inset-0"
          style={{
            opacity: 0.05 + sectionLevel * 0.12,
            background:
              'radial-gradient(ellipse at center, transparent 0%, rgba(34,82,180,.10) 45%, rgba(20,36,80,.35) 100%)',
          }}
          animate={reduceMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.12, 0.32, 0.18] }}
          transition={{ duration: 7.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {!reduceMotion && (
          <div className="absolute inset-0">
            {binaryDigits.map((digit) => (
              <motion.span
                key={digit.id}
                className="absolute font-semibold text-blue-200/90 select-none"
                style={{
                  left: digit.left,
                  top: digit.top,
                  fontSize: `${digit.fontSize}px`,
                  textShadow: '0 0 8px rgba(126,180,255,.55)',
                }}
                initial={{ opacity: 0, y: 0, scale: digit.scale }}
                animate={{
                  opacity: [0, Math.min(1, digit.opacity * chapter.binaryBoost * 1.4), 0],
                  y: [0, digit.variant === 'fall' ? digit.travel : digit.travel * 0.7],
                  x: [0, digit.variant === 'diagonal' ? digit.driftX : digit.driftX * 0.2],
                  scale: [digit.scale * 0.88, digit.scale * 1.14, digit.scale * 0.92],
                }}
                transition={{
                  delay: digit.delay,
                  duration: Math.max(2.8, digit.duration - chapter.binaryBoost * 0.55),
                  repeat: Infinity,
                  ease: 'easeIn',
                }}
              >
                {digit.value}
              </motion.span>
            ))}
          </div>
        )}

        {!reduceMotion && (
          <div className="absolute inset-0" style={{ opacity: streakOpacity }}>
            {streaks.map((streak) => (
              <motion.div
                key={streak.id}
                className="absolute top-[-24%] h-[2px] border-t border-dashed border-blue-100/80"
                style={{
                  left: streak.left,
                  width: `${streak.length}px`,
                  rotate: `${streak.rotate}deg`,
                  boxShadow: '0 0 10px rgba(138,186,255,.45)',
                }}
                initial={{ y: '-10vh', opacity: 0, scale: 0.35 }}
                animate={{
                  y: ['-12vh', '126vh'],
                  x: ['0vw', `${streak.driftX}vw`],
                  opacity: [0, 0.95, 0],
                  scaleX: [0.35, 1.2, 1.65],
                  scaleY: [0.8, 1.3, 1.9],
                }}
                transition={{
                  duration: Math.max(0.7, streak.duration - streakSpeedBoost * 0.24),
                  delay: streak.delay,
                  repeat: Infinity,
                  ease: 'easeIn',
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default GlobalCinematicBackground
