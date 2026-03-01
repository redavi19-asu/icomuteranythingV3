import React from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

function FloatingPanel({ panel, scrollY }) {
  const panelScroll = useTransform(
    scrollY,
    [0, 600],
    [0, panel.scrollOffset * -200]
  )

  return (
    <motion.div
      className="absolute"
      style={{
        top: panel.top,
        bottom: panel.bottom,
        left: panel.left,
        right: panel.right,
        y: panelScroll,
      }}
    >
      <motion.div
        className={`${panel.size} rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-purple-600/10 backdrop-blur-sm shadow-2xl`}
        animate={{
          rotateY: [0, 15, 0],
          rotateX: [0, 8, 0],
          y: [0, 30, 0],
          scale: [1, 1.06, 1],
        }}
        transition={{
          duration: panel.duration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: panel.delay,
        }}
        initial={{ opacity: 0, rotateZ: panel.rotation }}
        whileInView={{ opacity: panel.opacity, rotateZ: panel.rotation }}
        viewport={{ once: false }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-purple-500/10 pointer-events-none" />

        <div className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id={`panelGrid-${panel.id}`}
                x="20"
                y="20"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#4facfe"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#panelGrid-${panel.id})`} />
          </svg>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Hero() {
  const { scrollY } = useScroll()
  
  // Scroll-reactive transforms for panels and content
  const containerScale = useTransform(scrollY, [0, 400], [1, 0.95])
  const panelY = useTransform(scrollY, [0, 500], [0, -150])
  const contentY = useTransform(scrollY, [0, 500], [0, -60])
  const contentOpacity = useTransform(scrollY, [0, 400], [1, 0.6])

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Floating panel configurations with different depths
  const panels = [
    {
      id: 1,
      size: 'w-72 h-48',
      top: '-5%',
      left: '5%',
      delay: 0,
      duration: 25,
      rotation: 8,
      opacity: 0.4,
      scrollOffset: 0.3,
    },
    {
      id: 2,
      size: 'w-96 h-64',
      top: '15%',
      right: '8%',
      delay: 1,
      duration: 30,
      rotation: -12,
      opacity: 0.35,
      scrollOffset: 0.5,
    },
    {
      id: 3,
      size: 'w-80 h-56',
      bottom: '20%',
      left: '12%',
      delay: 2,
      duration: 28,
      rotation: 15,
      opacity: 0.3,
      scrollOffset: 0.25,
    },
    {
      id: 4,
      size: 'w-64 h-44',
      top: '50%',
      right: '5%',
      delay: 1.5,
      duration: 26,
      rotation: -8,
      opacity: 0.32,
      scrollOffset: 0.4,
    },
    {
      id: 5,
      size: 'w-80 h-52',
      bottom: '10%',
      right: '20%',
      delay: 3,
      duration: 32,
      rotation: -20,
      opacity: 0.28,
      scrollOffset: 0.35,
    },
    {
      id: 6,
      size: 'w-72 h-48',
      top: '25%',
      left: '50%',
      delay: 0.5,
      duration: 27,
      rotation: 5,
      opacity: 0.3,
      scrollOffset: 0.2,
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 }
    },
  }

  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center relative pt-20 px-6 overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      {/* Tech grid overlay for depth */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="techGrid" x="40" y="40" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#4facfe" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#techGrid)" />
        </svg>
      </div>

      {/* Floating tech panels background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: panelY }}
      >
        {panels.map((panel) => (
          <FloatingPanel key={panel.id} panel={panel} scrollY={scrollY} />
        ))}
      </motion.div>

      {/* Content with scroll reactivity */}
      <motion.div
        className="max-w-4xl mx-auto text-center z-10 relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ y: contentY, opacity: contentOpacity, scale: containerScale }}
      >
        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="inline-block mb-6"
        >
          <div className="px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-medium">
            ✨ Premium Tech Solutions for Everyone
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight"
        >
          <span className="bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent">
            I Computer Anything
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Expert computer repair, custom web development, and trusted IT support. We solve your tech problems so you can focus on what matters.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => scrollToSection('what-we-do')}
            className="btn-primary shadow-lg shadow-blue-600/20"
          >
            Get Started
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => scrollToSection('how-it-works')}
            className="btn-secondary"
          >
            How It Works
          </motion.button>
        </motion.div>

        {/* Stats/Trust */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row gap-12 justify-center text-gray-400 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">→</span>
            Fast & Reliable Service
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">→</span>
            Expert Technicians
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">→</span>
            Competitive Pricing
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500"
      >
        <p className="text-xs">Scroll to explore</p>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </section>
  )
}

export default Hero
