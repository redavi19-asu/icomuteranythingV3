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

function WhyChooseUs() {
  const { ref, inView } = useInViewHook({
    triggerOnce: true,
    threshold: 0.1,
  })

  const features = [
    {
      title: 'Mobile-Friendly Service',
      description: 'We come to you in our fully equipped mobile lab. Same-day service available in most cases.',
      icon: '🚚',
      benefits: ['On-site service', 'Quick turnaround', 'Your convenience']
    },
    {
      title: 'Real Troubleshooting',
      description: 'No guesswork. We diagnose the root cause and fix it right the first time.',
      icon: '🎯',
      benefits: ['Expert diagnosis', 'Permanent fixes', 'Peace of mind']
    },
    {
      title: 'Full Stack Support',
      description: 'From hardware to software, repair to development. We handle it all with expertise.',
      icon: '⚡',
      benefits: ['End-to-end service', 'One point of contact', 'Integrated solutions']
    },
    {
      title: 'Small Business Ready',
      description: 'Affordable rates designed for individuals and small businesses. No corporate markups.',
      icon: '💰',
      benefits: ['Fair pricing', 'Flexible terms', 'Startup-friendly']
    },
  ]

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
  }

  return (
    <section id="why-choose-us" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">Why Choose Us</h2>
          <p className="section-subtitle">
            Premium service, real expertise, and a commitment to solving your problems.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          className="grid md:grid-cols-2 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(79, 172, 254, 0.15)' }}
              className="group relative p-10 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-dark-800/80 to-dark-900/80 backdrop-blur-sm overflow-hidden"
            >
              {/* Subtle gradient overlay on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />

              {/* Icon */}
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">{feature.description}</p>

                {/* Benefits list */}
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-blue-400">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonial bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 p-8 rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-500/5 to-emerald-500/5 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-gray-300 mb-2">Trusted by hundreds of customers</p>
              <p className="text-green-400 font-bold">⭐⭐⭐⭐⭐ Highly Rated Service</p>
            </div>
            <button className="btn-secondary">
              Read Reviews
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default WhyChooseUs
