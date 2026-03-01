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

function WhatWeDo() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const services = [
    {
      title: 'Computer Repair',
      description: 'Laptop crashes, hardware failures, virus removal, and more. We diagnose and fix problems quickly.',
      icon: '🛠️',
      color: 'from-orange-500/20 to-orange-600/20',
      borderColor: 'border-orange-500/30'
    },
    {
      title: 'Web Development',
      description: 'Custom websites, e-commerce platforms, and web applications built with modern technology.',
      icon: '💻',
      color: 'from-blue-500/20 to-blue-600/20',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'IT Support',
      description: 'Network setup, server management, backup solutions, and ongoing technical support.',
      icon: '🔧',
      color: 'from-purple-500/20 to-purple-600/20',
      borderColor: 'border-purple-500/30'
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <section id="what-we-do" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">What We Do</h2>
          <p className="section-subtitle">
            Comprehensive tech solutions designed to solve your problems and grow your business.
          </p>
        </motion.div>

        {/* Service cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid md:grid-cols-3 gap-6"
        >
          {services.map((service, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{
                y: -10,
                boxShadow: '0 20px 50px rgba(59, 130, 246, 0.2)',
              }}
              className={`group relative p-8 rounded-2xl border ${service.borderColor} bg-gradient-to-br ${service.color} backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300`}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Content */}
              <div className="relative z-10">
                <div className="text-5xl mb-4">{service.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                <p className="text-gray-400 leading-relaxed">{service.description}</p>
                
                {/* Arrow accent */}
                <motion.div
                  className="mt-6 flex items-center gap-2 text-blue-400 font-medium"
                  whileHover={{ gap: '12px' }}
                >
                  Learn more
                  <span>→</span>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default WhatWeDo
