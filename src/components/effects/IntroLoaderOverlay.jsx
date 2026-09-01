import React, { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const loaderPalette = [
  { bg: 'rgba(34,211,238,.32)', border: 'rgba(103,232,249,.82)', glow: 'rgba(34,211,238,.44)' },
  { bg: 'rgba(16,185,129,.28)', border: 'rgba(110,231,183,.82)', glow: 'rgba(16,185,129,.42)' },
  { bg: 'rgba(245,158,11,.28)', border: 'rgba(251,191,36,.82)', glow: 'rgba(245,158,11,.42)' },
  { bg: 'rgba(185,28,28,.28)', border: 'rgba(248,113,113,.80)', glow: 'rgba(185,28,28,.42)' },
  { bg: 'rgba(139,92,246,.28)', border: 'rgba(196,181,253,.82)', glow: 'rgba(139,92,246,.42)' },
]

function IntroLoaderOverlay({ visible, reduceMotion = false }) {
  const words = ['Booting', 'Calibrating', 'Rendering', 'Launching']

  const centerSquares = useMemo(() => [
    { id: 1, left: '-86px', top: '-44px', size: 'w-6 h-6', delay: 0.05 },
    { id: 2, left: '68px', top: '-36px', size: 'w-5 h-5', delay: 0.18 },
    { id: 3, left: '-60px', top: '54px', size: 'w-4 h-4', delay: 0.30 },
    { id: 4, left: '84px', top: '42px', size: 'w-6 h-6', delay: 0.42 },
    { id: 5, left: '-8px', top: '-84px', size: 'w-3 h-3', delay: 0.54 },
  ], [])

  const sequenceDuration = reduceMotion ? 1.2 : 4.5

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[#050914]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.08, ease: 'linear' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,.12),transparent_30%),radial-gradient(circle_at_80%_28%,rgba(139,92,246,.10),transparent_34%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,.09),transparent_34%)]" />

          {!reduceMotion && (
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              {centerSquares.map((square, index) => {
                const color = loaderPalette[index % loaderPalette.length]
                return (
                  <motion.div
                    key={square.id}
                    className={`absolute ${square.size} rounded-full`}
                    style={{
                      left: square.left,
                      top: square.top,
                      background: color.bg,
                      border: `1px solid ${color.border}`,
                      boxShadow: `0 0 18px ${color.glow}, 0 0 34px ${color.glow}`,
                    }}
                    initial={{ opacity: 0, scale: 0.55 }}
                    animate={{
                      opacity: [0, 1, 0.35, 0.9],
                      scale: [0.55, 1.12, 0.82, 1],
                      y: [0, -14, 5, 0],
                    }}
                    transition={{ duration: 1.55, delay: square.delay, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )
              })}
            </div>
          )}

          <div className="relative z-20 text-center px-6">
            <div className="text-[10px] tracking-[0.5em] text-cyan-200/65 uppercase mb-5">I Computer Anything</div>

            {!reduceMotion ? (
              <div className="h-12 md:h-14 mb-3 overflow-hidden relative">
                {words.map((word, index) => (
                  <motion.div
                    key={word}
                    className="absolute inset-x-0 text-2xl md:text-4xl font-semibold text-white/95"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [22, 0, 0, -10] }}
                    transition={{ duration: 1.0, delay: 0.22 + index * 0.88, ease: 'easeInOut' }}
                  >
                    {word}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-2xl md:text-3xl font-semibold text-white/90 mb-3">Launching</div>
            )}

            <motion.div
              className="text-xs md:text-sm tracking-[0.26em] uppercase text-white/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.35, 1, 0.6] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            >
              Cinematic System Online
            </motion.div>
          </div>

          <div className="absolute bottom-12 left-1/2 z-20 -translate-x-1/2 w-[80%] max-w-md text-center px-4">
            <motion.div
              className="text-[11px] md:text-xs uppercase tracking-[0.28em] text-white/60 mb-3"
              animate={{ opacity: [0.4, 1, 0.5] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              Loading...
            </motion.div>

            <div className="relative h-[4px] rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg,#22d3ee,#10b981,#f59e0b,#b91c1c,#8b5cf6,#38bdf8)',
                  boxShadow: '0 0 14px rgba(34,211,238,.35)',
                }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: sequenceDuration - 0.25, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default IntroLoaderOverlay
