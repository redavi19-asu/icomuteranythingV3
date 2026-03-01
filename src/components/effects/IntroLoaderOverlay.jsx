import React, { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function IntroLoaderOverlay({ visible, reduceMotion = false }) {
  const words = ['Booting', 'Calibrating', 'Rendering', 'Launching']

  const tiles = useMemo(() => {
    return Array.from({ length: 100 }, (_, index) => ({
      id: index,
      delay: (index % 10) * 0.05 + Math.floor(index / 10) * 0.04,
    }))
  }, [])

  const centerSquares = useMemo(() => {
    return [
      { id: 1, left: '-78px', top: '-42px', size: 'w-6 h-6', delay: 0.1 },
      { id: 2, left: '64px', top: '-30px', size: 'w-5 h-5', delay: 0.35 },
      { id: 3, left: '-55px', top: '52px', size: 'w-4 h-4', delay: 0.55 },
      { id: 4, left: '80px', top: '40px', size: 'w-6 h-6', delay: 0.8 },
    ]
  }, [])

  const sequenceDuration = reduceMotion ? 1.8 : 8

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-transparent"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.35 : 0.8, ease: 'easeOut' }}
        >
          {!reduceMotion && (
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              {centerSquares.map((square) => (
                <motion.div
                  key={square.id}
                  className={`absolute ${square.size} rounded-md border border-blue-200/85 bg-gradient-to-br from-blue-300/40 to-violet-300/35 shadow-[0_0_28px_rgba(101,145,255,0.65)]`}
                  style={{ left: square.left, top: square.top }}
                  initial={{ opacity: 0, scale: 0.7, rotate: -12 }}
                  animate={{
                    opacity: [0, 0.8, 0.22],
                    scale: [0.7, 1.06, 0.96],
                    rotate: [-12, 8, -4],
                    y: [0, -16, 6],
                  }}
                  transition={{
                    duration: 3.2,
                    delay: square.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative z-10 text-center px-6">
            <div className="text-[10px] tracking-[0.5em] text-blue-300/60 uppercase mb-6">
              I Computer Anything
            </div>

            {!reduceMotion && (
              <div className="h-12 md:h-14 mb-3 overflow-hidden">
                {words.map((word, index) => (
                  <motion.div
                    key={word}
                    className="text-2xl md:text-4xl font-semibold text-blue-100/95"
                    initial={{ opacity: 0, y: 26 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [26, 0, 0, -12] }}
                    transition={{
                      duration: 1.25,
                      delay: 0.45 + index * 1.02,
                      ease: 'easeInOut',
                    }}
                  >
                    {word}
                  </motion.div>
                ))}
              </div>
            )}

            {reduceMotion && (
              <div className="text-2xl md:text-3xl font-semibold text-blue-100/90 mb-3">Launching</div>
            )}

            <motion.div
              className="text-xs md:text-sm tracking-[0.26em] uppercase text-blue-200/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.55] }}
              transition={{ duration: 2.4, delay: 0.7 }}
            >
              Cinematic System Online
            </motion.div>
          </div>

          <div className="absolute bottom-12 left-1/2 z-20 -translate-x-1/2 w-[80%] max-w-md text-center px-4">
            <motion.div
              className="text-[11px] md:text-xs uppercase tracking-[0.28em] text-blue-200/70 mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.35, 0.95, 0.55] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              Loading...
            </motion.div>

            <div className="relative h-[3px] rounded-full bg-blue-500/20 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-300/85 via-violet-300/95 to-blue-200/80 shadow-[0_0_16px_rgba(109,152,255,0.7)]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: sequenceDuration - 0.35, ease: 'easeInOut' }}
              />
            </div>
          </div>

          {!reduceMotion && (
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 z-20 pointer-events-none">
              {tiles.map((tile) => (
                <motion.div
                  key={tile.id}
                  className="bg-[#070d1a]"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: [1, 1, 0] }}
                  transition={{
                    duration: 0.75,
                    delay: 3.7 + tile.delay,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default IntroLoaderOverlay
