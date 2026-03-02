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

function WhoItFor() {
  const { ref, inView } = useInViewHook({
    triggerOnce: true,
    threshold: 0.1,
  })

  const personas = [
    {
      title: 'Home Users',
      description: 'Got a slow laptop or broken desktop? We fix personal computers fast.',
      icon: '🏠',
      color: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30',
      examples: ['Laptop repair', 'Virus removal', 'Speed-up service', 'Data recovery']
    },
    {
      title: 'Small Businesses',
      description: 'Reliable downtime-minimizing tech support for growing companies.',
      icon: '📊',
      color: 'from-cyan-500/20 to-blue-500/20',
      borderColor: 'border-cyan-500/30',
      examples: ['Network setup', 'Server support', 'Backup solutions', 'IT consulting']
    },
    {
      title: 'Churches',
      description: 'Specialized support for AV systems, communications, and operations.',
      icon: '⛪',
      color: 'from-indigo-500/20 to-purple-500/20',
      borderColor: 'border-indigo-500/30',
      examples: ['AV setup', 'Sound systems', 'Live streaming', 'Tech training']
    },
    {
      title: 'Events & On-Site',
      description: 'Mobile support for events, conferences, and on-location tech needs.',
      icon: '🎪',
      color: 'from-pink-500/20 to-rose-500/20',
      borderColor: 'border-pink-500/30',
      examples: ['Event tech', 'Equipment setup', 'Live support', 'Quick fixes']
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5 },
    },
  }

  return (
    <section id="who-it-for" className="py-24 px-6 relative bg-gradient-to-b from-transparent to-purple-950/10">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">Who It's For</h2>
          <p className="section-subtitle">
            We serve everyone from home users to growing businesses and beyond.
          </p>
        </motion.div>

        {/* Persona cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid md:grid-cols-2 gap-8"
        >
          {personas.map((persona, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{
                y: -12,
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              }}
              className={`group relative p-10 rounded-2xl border ${persona.borderColor} bg-gradient-to-br ${persona.color} backdrop-blur-sm overflow-hidden cursor-pointer ${
                persona.title === 'Churches' ? 'opacity-75' : ''
              }`}
            >
              {/* Animated accent line */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Content */}
              <div className={`relative z-10 ${persona.title === 'Churches' ? 'blur-sm' : ''}`}>
                <div className="text-6xl mb-6 group-hover:scale-125 transition-transform duration-300">
                  {persona.icon}
                </div>

                <h3 className="text-2xl font-bold mb-3">{persona.title}</h3>
                <p className="text-gray-400 mb-8 leading-relaxed">{persona.description}</p>

                {/* Examples */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-blue-300">What we offer:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {persona.examples.map((example, i) => (
                      <div key={i} className="text-sm text-gray-400 flex items-start gap-2">
                        <span className="text-purple-400 mt-1">•</span>
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coming Soon Overlay */}
              {persona.title === 'Churches' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-950/50 via-dark-950/60 to-dark-950/50 backdrop-blur-sm rounded-2xl z-20"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="px-8 py-6 rounded-xl border-2 border-purple-500/60 bg-purple-950/40 backdrop-blur"
                    >
                      <div className="text-5xl md:text-6xl font-black text-transparent bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text mb-2">
                        COMING SOON
                      </div>
                      <p className="text-purple-200/80 text-sm font-semibold tracking-wider uppercase">
                        We're preparing specialized solutions
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-300 text-lg mb-4">
            If you have a tech problem,
            <span className="font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text"> we can solve it.</span>
          </p>
          <p className="text-gray-500 text-sm">
            Not sure if we serve your specific need? Reach out and let's talk about it.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export default WhoItFor
