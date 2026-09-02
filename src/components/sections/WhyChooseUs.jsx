import React from 'react'
import { motion } from 'framer-motion'
import InlineTechTicker from '../InlineTechTicker'

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
      description: 'I can come to you with the tools needed for hands-on support. Same-day service is available in many cases.',
      icon: '🚚',
      benefits: ['On-site service', 'Quick turnaround', 'Your convenience']
    },
    {
      title: 'Real Troubleshooting',
      description: 'No guesswork. I diagnose the root cause and work toward the right fix the first time.',
      icon: '🎯',
      benefits: ['Expert diagnosis', 'Practical fixes', 'Peace of mind']
    },
    {
      title: 'Full Stack Support',
      description: 'From hardware to software, repair to development, I handle a wide range of technology needs.',
      icon: '⚡',
      benefits: ['End-to-end service', 'One point of contact', 'Integrated solutions']
    },
    {
      title: 'Small Business Ready',
      description: 'Straightforward service for individuals, entrepreneurs, and small businesses without the big-company runaround.',
      icon: '💰',
      benefits: ['Fair pricing', 'Flexible service', 'Small-business friendly']
    },
  ]

  const cardVariants = {
    hidden: { opacity: 1, y: 30 },
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
        <motion.div
          ref={ref}
          initial={{ opacity: 1, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">Why Choose Me</h2>
          <p className="section-subtitle">
            Direct service, real hands-on experience, and one person accountable for your project from start to finish.
          </p>
        </motion.div>

        <motion.div className="grid md:grid-cols-2 gap-8">
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
              <motion.div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">{feature.description}</p>
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

        <motion.div
          initial={{ opacity: 1, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 backdrop-blur-sm overflow-hidden"
        >
          <InlineTechTicker height={120} speed={95} />
        </motion.div>
      </div>
    </section>
  )
}

export default WhyChooseUs
