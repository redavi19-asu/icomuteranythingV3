import React from 'react'
import { motion } from 'framer-motion'

function useInView(options) {
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

function HowItWorks({ onRequestService }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const steps = [
    {
      number: '01',
      title: 'Request Service',
      description: 'Tell us what you need and we\'ll get back to you quickly with availability and a preliminary assessment.',
      icon: '📋',
    },
    {
      number: '02',
      title: 'Diagnose & Quote',
      description: 'Our expert technicians assess your situation and provide you with a clear quote before any work begins.',
      icon: '🔍',
    },
    {
      number: '03',
      title: 'Fix, Build, or Deploy',
      description: 'We deliver fast, professional solutions and ensure everything works perfectly before we\'re done.',
      icon: '✅',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const stepVariants = {
    hidden: { opacity: 0, x: -40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <section id="how-it-works" className="py-24 px-6 relative bg-gradient-to-b from-transparent to-blue-950/10">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="section-title mb-6">How It Works</h2>
          <p className="section-subtitle">
            A simple, transparent process from start to finish.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variables={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid md:grid-cols-3 gap-8 relative"
        >
          {/* Connection lines (hidden on mobile) */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={stepVariants}
              className="relative"
            >
              {/* Step card */}
              <div className="bg-dark-800/50 border border-blue-500/20 rounded-2xl p-8 backdrop-blur-sm relative z-10">
                {/* Step number badge */}
                <div className="absolute -top-6 left-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full w-14 h-14 flex items-center justify-center font-bold text-xl text-white border-4 border-dark-950">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="text-4xl mb-6 mt-2">{step.icon}</div>

                {/* Content */}
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.description}</p>
              </div>

              {/* Arrow pointer */}
              {index < steps.length - 1 && (
                <motion.div
                  animate={{ x: [0, 8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="hidden md:flex absolute right-0 top-32 translate-x-8 text-blue-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-gray-400 mb-6">Ready to get started?</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRequestService}
            className="btn-primary"
          >
            Request Service Now
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

export default HowItWorks
