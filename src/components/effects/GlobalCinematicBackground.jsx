import React, { useMemo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

function GlobalCinematicBackground({ activeSection, reduceMotion = false }) {
  const { scrollYProgress } = useScroll()

  const hueRotate = useTransform(scrollYProgress, [0, 1], [0, 22])
  const gradientShift = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  const orbDriftA = useTransform(scrollYProgress, [0, 1], [0, -180])
  const orbDriftB = useTransform(scrollYProgress, [0, 1], [0, 220])
  const orbDriftC = useTransform(scrollYProgress, [0, 1], [0, -120])

  const sectionMultiplier = {
    hero: 0.28,
    'what-we-do': 0.36,
    'how-it-works': 0.46,
    'why-choose-us': 0.56,
    'who-it-for': 0.66,
    'final-cta': 0.8,
  }[activeSection] ?? 0.4

  const gridOpacity = 0.06 + sectionMultiplier * 0.08
  const streakOpacity = 0.12 + sectionMultiplier * 0.2
  const streakSpeed = reduceMotion ? 0 : 3 + sectionMultiplier * 3
  const gridTilt = reduceMotion ? 0 : -8 + sectionMultiplier * 16

  const binaryDigits = useMemo(() => {
    return Array.from({ length: 34 }, (_, index) => ({
      id: index,
      value: Math.random() > 0.5 ? '1' : '0',
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 7,
      duration: 5 + Math.random() * 7,
      travel: 25 + Math.random() * 75,
      scale: 0.75 + Math.random() * 0.7,
      opacity: 0.12 + Math.random() * 0.25,
    }))
  }, [])

  const streaks = useMemo(() => {
    return Array.from({ length: 20 }, (_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 4,
      duration: 1.4 + Math.random() * 2.5,
      length: 50 + Math.random() * 130,
    }))
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{ filter: useTransform(hueRotate, (v) => `hue-rotate(${v}deg)`) }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1200px circle at 12% 12%, rgba(79,172,254,.20), transparent 55%), radial-gradient(900px circle at 85% 16%, rgba(98,70,234,.18), transparent 60%), radial-gradient(1000px circle at 50% 85%, rgba(24,32,58,.55), transparent 70%), linear-gradient(165deg, #070b14 0%, #090f1f 45%, #0a1021 100%)',
            backgroundPositionX: gradientShift,
          }}
        />

        <motion.div
          className="absolute -top-32 -left-20 w-[32rem] h-[32rem] rounded-full blur-3xl"
          style={{
            y: orbDriftA,
            opacity: 0.18 + sectionMultiplier * 0.2,
            background: 'radial-gradient(circle, rgba(79,172,254,.55) 0%, rgba(79,172,254,.05) 65%, transparent 75%)',
          }}
          animate={reduceMotion ? undefined : { x: [0, 60, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute top-[20%] -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl"
          style={{
            y: orbDriftB,
            opacity: 0.16 + sectionMultiplier * 0.18,
            background: 'radial-gradient(circle, rgba(121,89,255,.52) 0%, rgba(121,89,255,.05) 65%, transparent 75%)',
          }}
          animate={reduceMotion ? undefined : { x: [0, -80, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute bottom-[-8rem] left-[28%] w-[26rem] h-[26rem] rounded-full blur-3xl"
          style={{
            y: orbDriftC,
            opacity: 0.14 + sectionMultiplier * 0.15,
            background: 'radial-gradient(circle, rgba(48,100,230,.45) 0%, rgba(48,100,230,.04) 65%, transparent 75%)',
          }}
          animate={reduceMotion ? undefined : { x: [0, 35, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute inset-0"
          style={{
            opacity: gridOpacity,
            transform: `perspective(800px) rotateX(68deg) rotateZ(${gridTilt}deg)`,
            transformOrigin: 'center center',
            backgroundImage:
              'linear-gradient(rgba(120,170,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,255,0.6) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            backgroundPosition: 'center center',
          }}
          animate={reduceMotion ? undefined : { backgroundPositionY: ['0px', '-80px'] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
        />

        {!reduceMotion && (
          <div className="absolute inset-0">
            {binaryDigits.map((digit) => (
              <motion.span
                key={digit.id}
                className="absolute text-[10px] md:text-xs font-semibold text-blue-300/70 select-none"
                style={{ left: digit.left, top: digit.top }}
                initial={{ opacity: 0, y: 0, scale: digit.scale }}
                animate={{
                  opacity: [0, digit.opacity, 0],
                  y: [0, -digit.travel],
                }}
                transition={{
                  delay: digit.delay,
                  duration: digit.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
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
                className="absolute top-[-20%] h-px border-t border-dashed border-blue-200/60"
                style={{ left: streak.left, width: `${streak.length}px` }}
                initial={{ y: '-10vh', opacity: 0 }}
                animate={{
                  y: ['-10vh', '120vh'],
                  opacity: [0, 0.9, 0],
                  scaleX: [0.4, 1, 1.2],
                }}
                transition={{
                  duration: Math.max(0.9, streak.duration - sectionMultiplier * streakSpeed * 0.15),
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
