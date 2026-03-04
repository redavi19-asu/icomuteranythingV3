import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

function ICAProjects() {
  const [isOverviewOpen, setIsOverviewOpen] = useState(false)

  const { ref, inView } = useInViewHook({
    triggerOnce: true,
    threshold: 0.1,
  })

  const projects = [
    {
      title: 'Land of Shopping',
      type: 'Retail Demo',
      description: 'A storefront-style concept showcasing product presentation, layout structure, and consumer-facing design.',
      link: 'https://redavi19-asu.github.io/Land-of-shopping/',
      buttonText: 'View Project',
      buttonType: 'live',
      color: 'from-blue-500/20 to-cyan-600/20',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'Energy Website Example',
      type: 'Business Demo',
      description: 'A clean modern business-style site focused on service presentation, trust-building layout, and responsive design.',
      link: 'https://redavi19-asu.github.io/energy-website-example/',
      buttonText: 'View Project',
      buttonType: 'live',
      color: 'from-emerald-500/20 to-green-600/20',
      borderColor: 'border-emerald-500/30'
    },
    {
      title: 'Paralegal Services Demo',
      type: 'Legal Services Demo',
      description: 'A professional demo site built around trust, clarity, and structured service communication for legal support.',
      link: 'https://redavi19-asu.github.io/paralegal-services-demo/',
      buttonText: 'View Project',
      buttonType: 'live',
      color: 'from-purple-500/20 to-violet-600/20',
      borderColor: 'border-purple-500/30'
    },
    {
      title: 'IntriguedMutts.com',
      type: 'E-commerce Platform',
      description: 'Full-stack e-commerce platform for premium dog training resources and smart gear, built with modern web technologies.',
      link: 'https://www.intriguedmutts.com/',
      buttonText: 'View Project',
      buttonType: 'live',
      color: 'from-amber-500/20 to-orange-600/20',
      borderColor: 'border-amber-500/30'
    },
    {
      title: 'I Computer Anything',
      type: 'Business Website',
      description: 'Business landing page showcasing IT services with responsive design, smooth animations, and modern UI/UX.',
      link: 'https://redavi19-asu.github.io/icomputeranything-react-/',
      buttonText: 'View Project',
      buttonType: 'live',
      color: 'from-cyan-500/20 to-blue-600/20',
      borderColor: 'border-cyan-500/30'
    },
    {
      title: 'Portable Event Wi-Fi',
      type: 'Infrastructure Project',
      description: 'Custom-built portable network infrastructure solution for events, conferences, and temporary deployments.',
      buttonText: 'Coming Soon',
      buttonType: 'coming-soon',
      color: 'from-rose-500/20 to-pink-600/20',
      borderColor: 'border-rose-500/30'
    },
    {
      title: 'Payments + Fulfillment Pipeline',
      type: 'Backend Integration',
      description: 'Integrated payment processing and order fulfillment system with API integrations and automated workflows.',
      buttonText: 'Learn More',
      buttonType: 'overview',
      color: 'from-violet-500/20 to-purple-600/20',
      borderColor: 'border-violet-500/30'
    },
  ]

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.5,
      },
    }),
  }

  const handleButtonClick = (project) => {
    if (project.buttonType === 'live' && project.link) {
      window.open(project.link, '_blank', 'noopener,noreferrer')
      return
    }

    if (project.buttonType === 'overview' && project.title === 'Payments + Fulfillment Pipeline') {
      setIsOverviewOpen(true)
    }
  }

  return (
    <section id="ica-projects" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">Projects / Portfolio</h2>
          <p className="section-subtitle">
            A selection of live demo builds and working project examples.
          </p>
        </motion.div>

        {/* Projects grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {projects.map((project, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(79, 172, 254, 0.15)' }}
              className="group relative p-8 rounded-2xl border bg-gradient-to-br from-dark-800/80 to-dark-900/80 backdrop-blur-sm overflow-hidden flex flex-col h-full"
              style={{ borderColor: `var(--tw-${project.borderColor})` }}
            >
              {/* Gradient overlay */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full">
                {/* Type label */}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                    {project.type}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-4 flex-shrink-0">{project.title}</h3>

                {/* Description */}
                <p className="text-gray-400 mb-6 leading-relaxed flex-grow">{project.description}</p>

                {/* Action button */}
                <motion.button
                  whileHover={project.buttonType === 'live' || project.buttonType === 'overview' ? { scale: 1.05 } : {}}
                  whileTap={project.buttonType === 'live' || project.buttonType === 'overview' ? { scale: 0.95 } : {}}
                  onClick={() => handleButtonClick(project)}
                  disabled={project.buttonType === 'coming-soon'}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex-shrink-0 ${
                    project.buttonType === 'live' || project.buttonType === 'overview'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-600/30 cursor-pointer'
                      : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 cursor-default'
                  }`}
                >
                  {project.buttonText}
                  {(project.buttonType === 'live' || project.buttonType === 'overview') && (
                    <span className="ml-2">→</span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence>
          {isOverviewOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOverviewOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-50 flex items-center justify-center px-4"
              >
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl shadow-2xl">
                  <div className="sticky top-0 flex items-start justify-between p-8 bg-gradient-to-b from-slate-900/80 to-transparent border-b border-blue-500/20 z-10">
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-1">Payments + Fulfillment Pipeline</h3>
                    </div>

                    <button
                      onClick={() => setIsOverviewOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors p-2 -mr-2 -mt-2"
                      aria-label="Close overview modal"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-8">
                    <div className="mb-8">
                      <h4 className="text-xl font-bold text-blue-200 mb-3">Overview</h4>
                      <p className="text-gray-300 leading-relaxed text-lg">
                        This is a secure end-to-end checkout and fulfillment workflow designed to handle online orders,
                        backend validation, payment processing, and automated fulfillment.
                      </p>
                    </div>

                    <div className="mb-8">
                      <h4 className="text-xl font-bold text-blue-200 mb-3">What&apos;s Included</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3 text-gray-300"><span className="text-blue-400 mt-1">✓</span><span>secure checkout flow</span></li>
                        <li className="flex items-start gap-3 text-gray-300"><span className="text-blue-400 mt-1">✓</span><span>backend API handling</span></li>
                        <li className="flex items-start gap-3 text-gray-300"><span className="text-blue-400 mt-1">✓</span><span>webhook automation</span></li>
                        <li className="flex items-start gap-3 text-gray-300"><span className="text-blue-400 mt-1">✓</span><span>Cloudflare-based backend protection</span></li>
                        <li className="flex items-start gap-3 text-gray-300"><span className="text-blue-400 mt-1">✓</span><span>order routing / fulfillment logic</span></li>
                        <li className="flex items-start gap-3 text-gray-300"><span className="text-blue-400 mt-1">✓</span><span>scalable workflow design</span></li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xl font-bold text-blue-200 mb-3">Why It Matters</h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <span className="text-blue-400 font-semibold min-w-fit">→</span>
                          <span className="text-gray-300">useful when a business needs custom checkout beyond basic plugins</span>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <span className="text-blue-400 font-semibold min-w-fit">→</span>
                          <span className="text-gray-300">useful when orders need automated fulfillment steps</span>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <span className="text-blue-400 font-semibold min-w-fit">→</span>
                          <span className="text-gray-300">useful when payment, backend, and delivery systems must work together reliably</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

export default ICAProjects
