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

  const coreServices = [
    {
      title: 'Computer Repair',
      description: 'Fast diagnostics and repair for hardware failures, crashes, and virus removal.',
      icon: '🛠️',
      color: 'from-orange-500/20 to-orange-600/20',
      borderColor: 'border-orange-500/30'
    },
    {
      title: 'Web Development',
      description: 'Custom websites and web applications built with modern technology and best practices.',
      icon: '💻',
      color: 'from-blue-500/20 to-blue-600/20',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'IT Support',
      description: 'Comprehensive technical support for networks, servers, and ongoing operations.',
      icon: '🔧',
      color: 'from-purple-500/20 to-purple-600/20',
      borderColor: 'border-purple-500/30'
    },
  ]

  const advancedServices = [
    {
      title: 'Cybersecurity Consulting',
      description: 'Protect your business with security audits, threat assessments, and best practices.',
      icon: '🔒',
      color: 'from-emerald-500/20 to-emerald-600/20',
      borderColor: 'border-emerald-500/30'
    },
    {
      title: 'Data Backup & Recovery',
      description: 'Reliable backup solutions and emergency data recovery services to protect your information.',
      icon: '💾',
      color: 'from-cyan-500/20 to-cyan-600/20',
      borderColor: 'border-cyan-500/30'
    },
    {
      title: 'Hardware Installation & Upgrades',
      description: 'Expert installation and upgrades for computers, peripherals, and enterprise equipment.',
      icon: '⚙️',
      color: 'from-amber-500/20 to-amber-600/20',
      borderColor: 'border-amber-500/30'
    },
    {
      title: 'Managed IT Services',
      description: 'Complete IT infrastructure management with proactive monitoring and maintenance.',
      icon: '📊',
      color: 'from-indigo-500/20 to-indigo-600/20',
      borderColor: 'border-indigo-500/30'
    },
    {
      title: 'Event Tech Deployment',
      description: 'Full-service technology setup and support for conferences, presentations, and events.',
      icon: '🎥',
      color: 'from-pink-500/20 to-pink-600/20',
      borderColor: 'border-pink-500/30'
    },
    {
      title: 'Networking & Server Setup',
      description: 'Professional network infrastructure design, installation, and server configuration.',
      icon: '🌐',
      color: 'from-violet-500/20 to-violet-600/20',
      borderColor: 'border-violet-500/30'
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

        {/* Core Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <h3 className="text-xl md:text-2xl font-bold text-blue-200/90 mb-6 tracking-wide text-center">
            Core Services
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="grid md:grid-cols-3 gap-6"
          >
            {coreServices.map((service, index) => (
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
        </motion.div>

        {/* Advanced & Business Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-xl md:text-2xl font-bold text-blue-200/90 mb-6 tracking-wide text-center">
            Advanced &amp; Business Services
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="grid md:grid-cols-3 gap-5"
          >
            {advancedServices.map((service, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{
                  y: -8,
                  boxShadow: '0 15px 40px rgba(59, 130, 246, 0.15)',
                }}
                className={`group relative p-6 rounded-xl border ${service.borderColor} bg-gradient-to-br ${service.color} backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300`}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="text-4xl mb-3">{service.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{service.description}</p>
                  
                  {/* Arrow accent */}
                  <motion.div
                    className="mt-4 flex items-center gap-2 text-blue-400 text-sm font-medium"
                    whileHover={{ gap: '10px' }}
                  >
                    Learn more
                    <span>→</span>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default WhatWeDo
