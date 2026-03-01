import React, { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function IntroLoaderOverlay({ visible, reduceMotion = false }) {
  const words = ['Booting', 'Calibrating', 'Rendering', 'Launching']

  const tiles = useMemo(() => {
    return Array.from({ length: 64 }, (_, index) => ({
      id: index,
      delay: (index % 8) * 0.035 + Math.floor(index / 8) * 0.03,
    }))
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#060a13]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: 'easeInOut' }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: reduceMotion ? 0.35 : [0.22, 0.42, 0.25] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background:
                'radial-gradient(850px circle at 20% 15%, rgba(74,145,255,.22), transparent 58%), radial-gradient(900px circle at 80% 35%, rgba(122,82,255,.18), transparent 62%), linear-gradient(160deg, #050913 0%, #060b17 70%, #070d1b 100%)',
            }}
          />

          <div className="relative z-10 text-center px-6">
            <div className="text-[10px] tracking-[0.5em] text-blue-300/60 uppercase mb-6">
              I Computer Anything
            </div>

            {!reduceMotion && (
              <div className="h-10 md:h-12 mb-3 overflow-hidden">
                {words.map((word, index) => (
                  <motion.div
                    key={word}
                    className="text-2xl md:text-3xl font-semibold text-blue-100/90"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: [0, 1, 0], y: [22, 0, -12] }}
                    transition={{
                      duration: 0.9,
                      delay: 0.35 + index * 0.32,
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
              animate={{ opacity: [0, 1, 0.45] }}
              transition={{ duration: 1.6, delay: 0.45 }}
            >
              Cinematic System Online
            </motion.div>
          </div>

          {!reduceMotion && (
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 z-20 pointer-events-none">
              {tiles.map((tile) => (
                <motion.div
                  key={tile.id}
                  className="bg-[#070d1a]"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: [1, 1, 0] }}
                  transition={{
                    duration: 0.45,
                    delay: 1.35 + tile.delay,
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
