import React from 'react'
import { motion } from 'framer-motion'

function useInViewHook(options) {
  const ref = React.useRef(null)
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        if (options.triggerOnce) {
          observer.unobserve(entry.target)
        }
      }
    }, {
      threshold: options.threshold || 0.1,
    })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [options.triggerOnce, options.threshold])

  return { ref, inView }
}

function FinalCTA() {
  const { ref, inView } = useInViewHook({
    triggerOnce: true,
    threshold: 0.1,
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <section
      id="final-cta"
      ref={ref}
      className="min-h-screen flex items-center justify-center py-24 px-6 relative overflow-hidden"
    >
      {/* Gradient orbs */}
      <motion.div
        className="absolute top-0 right-0 w-96 h-96 bg-blue-600/30 rounded-full filter blur-3xl"
        animate={{
          y: [0, 40, -40, 0],
          x: [0, 40, -40, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full filter blur-3xl"
        animate={{
          y: [0, -40, 40, 0],
          x: [0, -40, 40, 0],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <motion.div
        className="max-w-3xl mx-auto text-center z-10 relative"
        variants={containerVariants}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        {/* Headline */}
        <motion.h2
          variants={itemVariants}
          className="section-title mb-8 leading-tight"
        >
          <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Your Tech Problems, Solved
          </span>
        </motion.h2>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-xl text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto"
        >
          Stop wasting time with broken technology. Get expert help today and get back to doing what matters most.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: '0 20px 50px rgba(59, 130, 246, 0.4)',
            }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary px-10 py-4 text-lg shadow-lg shadow-blue-600/30"
          >
            Request Service
          </motion.button>
          <motion.button
            whileHover={{
              scale: 1.05,
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
            }}
            whileTap={{ scale: 0.95 }}
            className="btn-secondary px-10 py-4 text-lg"
          >
            Schedule a Call
          </motion.button>
        </motion.div>

        {/* Contact info */}
        <motion.div
          variants={itemVariants}
          className="space-y-4 text-gray-400"
        >
          <p className="font-medium text-white">Quick contact options:</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-blue-400">📞</span>
              <span>Call or text us</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">✉️</span>
              <span>Email inquiry</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">⏰</span>
              <span>24/7 availability</span>
            </div>
          </div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          variants={itemVariants}
          className="mt-16 pt-12 border-t border-gray-800"
        >
          <p className="text-sm text-gray-500 mb-6">Trusted by:</p>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {['Individuals', 'Small Biz', 'Churches', 'Events'].map((item, i) => (
              <div key={i} className="text-gray-400 flex items-center gap-2">
                <span className="text-blue-400">★</span>
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default FinalCTA
