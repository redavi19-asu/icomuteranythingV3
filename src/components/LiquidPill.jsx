import React from 'react'
import { motion } from 'framer-motion'

function LiquidPill({ children, className = '' }) {

  return (
    <div className={`relative ${className}`}>
      {/* Base liquid fill layer */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-blue-950/45 via-slate-950/55 to-blue-950/60" />
      
      {/* Smooth wave layer 1 - Slowest, darker */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden opacity-40"
        animate={{ x: ['0%', '100%'] }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-[200%] h-[120%]"
        >
          <defs>
            <linearGradient id="wave1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(37, 99, 235, 0.30)" />
              <stop offset="100%" stopColor="rgba(15, 23, 42, 0.34)" />
            </linearGradient>
          </defs>
          <path
            d="M0 80 Q150 60 300 80 T600 80 T900 80 T1200 80 L1200 200 L0 200 Z"
            fill="url(#wave1Grad)"
          />
        </svg>
      </motion.div>

      {/* Smooth wave layer 2 - Medium speed */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden opacity-35"
        animate={{ x: ['-100%', '0%'] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-[200%] h-[115%]"
        >
          <defs>
            <linearGradient id="wave2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(14, 116, 220, 0.32)" />
              <stop offset="100%" stopColor="rgba(15, 23, 42, 0.36)" />
            </linearGradient>
          </defs>
          <path
            d="M0 90 Q180 70 360 90 T720 90 T1080 90 T1200 90 L1200 200 L0 200 Z"
            fill="url(#wave2Grad)"
          />
        </svg>
      </motion.div>

      {/* Smooth wave layer 3 - Fastest, brightest */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden opacity-40"
        animate={{ x: ['0%', '-100%'] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-[200%] h-[110%]"
        >
          <defs>
            <linearGradient id="wave3Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.34)" />
              <stop offset="100%" stopColor="rgba(15, 23, 42, 0.42)" />
            </linearGradient>
          </defs>
          <path
            d="M0 100 Q160 82 320 100 T640 100 T960 100 T1200 100 L1200 200 L0 200 Z"
            fill="url(#wave3Grad)"
          />
        </svg>
      </motion.div>

      {/* Glossy highlight overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/12 via-transparent to-transparent pointer-events-none" />
      
      {/* Blue tint for color integration */}
      <div className="absolute inset-0 rounded-full bg-blue-500/10 pointer-events-none" />
      
      {/* Content layer - Icon and Text (always on top) */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

export default LiquidPill
