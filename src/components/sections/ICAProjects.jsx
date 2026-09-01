import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function useInViewHook(options) {
  const ref = React.useRef(null)
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        if (options.triggerOnce) observer.unobserve(entry.target)
      }
    }, { threshold: options.threshold || 0.1 })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [options.triggerOnce, options.threshold])

  return { ref, inView }
}

function ICAProjects() {
  const [isOverviewOpen, setIsOverviewOpen] = useState(false)
  const { ref, inView } = useInViewHook({ triggerOnce: true, threshold: 0.1 })

  const projects = [
    {
      title: 'Land of Shopping',
      type: 'Retail Demo',
      description: 'A storefront-style concept showcasing product presentation, layout structure, and consumer-facing design.',
      link: 'https://redavi19-asu.github.io/Land-of-shopping/',
      buttonText: 'View Project',
      buttonType: 'live',
      card: 'from-emerald-950/80 to-slate-950/90 border-emerald-500/25',
      badge: 'bg-emerald-500/10 border-emerald-400/25 text-emerald-200',
      button: 'from-emerald-700 to-green-500 hover:from-emerald-600 hover:to-green-400 shadow-emerald-900/30'
    },
    {
      title: 'Energy Website Example',
      type: 'Business Demo',
      description: 'A clean modern business-style site focused on service presentation, trust-building layout, and responsive design.',
      link: 'https://redavi19-asu.github.io/energy-website-example/',
      buttonText: 'View Project',
      buttonType: 'live',
      card: 'from-cyan-950/80 to-slate-950/90 border-cyan-500/25',
      badge: 'bg-cyan-500/10 border-cyan-400/25 text-cyan-200',
      button: 'from-cyan-700 to-sky-500 hover:from-cyan-600 hover:to-sky-400 shadow-cyan-900/30'
    },
    {
      title: 'Paralegal Services Demo',
      type: 'Legal Services Demo',
      description: 'A professional demo site built around trust, clarity, and structured service communication for legal support.',
      link: 'https://redavi19-asu.github.io/paralegal-services-demo/',
      buttonText: 'View Project',
      buttonType: 'live',
      card: 'from-rose-950/80 to-slate-950/90 border-rose-500/25',
      badge: 'bg-rose-500/10 border-rose-400/25 text-rose-200',
      button: 'from-rose-800 to-red-600 hover:from-rose-700 hover:to-red-500 shadow-rose-950/30'
    },
    {
      title: 'IntriguedMutts.com',
      type: 'Digital Brand Platform',
      description: 'A multi-feature digital brand platform combining original artwork, merchandise, NFTs, and stock-focused tools in one interactive experience.',
      link: 'https://www.intriguedmutts.com/',
      buttonText: 'View Project',
      buttonType: 'live',
      card: 'from-amber-950/80 to-slate-950/90 border-amber-500/25',
      badge: 'bg-amber-500/10 border-amber-400/25 text-amber-200',
      button: 'from-amber-700 to-orange-500 hover:from-amber-600 hover:to-orange-400 shadow-amber-950/30'
    },
    {
      title: 'Ghost Money Millionaire',
      type: 'Streetwear & E-Commerce Brand',
      description: 'A premium fashion storefront built around original Ghost Money Millionaire collections, custom apparel concepts, branded product presentation, and a connected commerce workflow.',
      link: 'https://redavi19-asu.github.io/GhostMoneyMillionaire/',
      buttonText: 'View Project',
      buttonType: 'live',
      card: 'from-lime-950/80 to-slate-950/90 border-lime-500/25',
      badge: 'bg-lime-500/10 border-lime-400/25 text-lime-200',
      button: 'from-lime-700 to-emerald-500 hover:from-lime-600 hover:to-emerald-400 shadow-lime-950/30'
    },
    {
      title: 'Starlink Event Connectivity',
      type: 'Mobile Internet & Streaming',
      description: 'Reliable high-speed internet and Wi-Fi for outdoor and indoor events, live streamers, productions, pop-ups, remote locations, and temporary sites where dependable connectivity is limited or unavailable. Built around portable network equipment with Starlink service capability.',
      buttonText: 'Coming Soon',
      buttonType: 'coming-soon',
      card: 'from-violet-950/80 to-slate-950/90 border-violet-500/25',
      badge: 'bg-violet-500/10 border-violet-400/25 text-violet-200',
      button: 'from-violet-800 to-purple-600 shadow-violet-950/30'
    },
    {
      title: 'Payments + Fulfillment Pipeline',
      type: 'Backend Integration',
      description: 'Integrated payment processing and fulfillment automation with protected APIs, webhooks, and order routing logic.',
      buttonText: 'Learn More',
      buttonType: 'overview',
      card: 'from-orange-950/80 to-slate-950/90 border-orange-500/25',
      badge: 'bg-orange-500/10 border-orange-400/25 text-orange-200',
      button: 'from-orange-700 to-red-500 hover:from-orange-600 hover:to-red-400 shadow-orange-950/30'
    },
  ]

  const handleButtonClick = (project) => {
    if (project.buttonType === 'live' && project.link) {
      window.open(project.link, '_blank', 'noopener,noreferrer')
      return
    }
    if (project.buttonType === 'overview') setIsOverviewOpen(true)
  }

  return (
    <section id="ica-projects" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">Projects / Portfolio</h2>
          <p className="section-subtitle">A selection of live builds, infrastructure work, and working project examples.</p>
        </motion.div>

        <div className="mobile-horizontal-scroll grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.article
              key={project.title}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.07 }}
              whileHover={{ y: -8 }}
              className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${project.card} p-8 backdrop-blur-sm flex flex-col min-h-[330px] shadow-xl`}
            >
              <span className={`w-fit px-3 py-1 text-xs font-medium rounded-full border ${project.badge}`}>{project.type}</span>
              <h3 className="text-2xl font-bold mt-5 mb-4 text-white">{project.title}</h3>
              <p className="text-gray-300 leading-relaxed flex-grow">{project.description}</p>

              <motion.button
                whileHover={project.buttonType !== 'coming-soon' ? { scale: 1.03 } : {}}
                whileTap={project.buttonType !== 'coming-soon' ? { scale: 0.98 } : {}}
                onClick={() => handleButtonClick(project)}
                disabled={project.buttonType === 'coming-soon'}
                className={`mt-7 w-full px-6 py-3 rounded-lg font-semibold text-white transition-all bg-gradient-to-r ${project.button} ${project.buttonType === 'coming-soon' ? 'opacity-45 cursor-default' : 'cursor-pointer shadow-lg'}`}
              >
                {project.buttonText}{project.buttonType !== 'coming-soon' ? ' →' : ''}
              </motion.button>
            </motion.article>
          ))}
        </div>

        <div className="flex justify-center mt-14">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => document.getElementById('final-cta')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 text-white font-semibold border border-white/10 shadow-lg"
          >
            Need custom software?
          </motion.button>
        </div>

        <AnimatePresence>
          {isOverviewOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOverviewOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center px-4"
              >
                <div className="w-full max-w-2xl rounded-3xl border border-orange-400/20 bg-slate-950 p-8 shadow-2xl">
                  <div className="flex justify-between gap-6">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-orange-300">Backend Integration</p>
                      <h3 className="text-3xl font-bold text-white mt-2">Payments + Fulfillment Pipeline</h3>
                    </div>
                    <button onClick={() => setIsOverviewOpen(false)} className="text-gray-400 hover:text-white text-2xl" aria-label="Close">×</button>
                  </div>
                  <p className="mt-6 text-gray-300 leading-7">Secure checkout, backend validation, protected API handling, webhooks, order routing, and automated fulfillment designed to work as one reliable pipeline.</p>
                  <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm text-gray-200">
                    {['Secure checkout flow', 'Backend API handling', 'Webhook automation', 'Cloudflare protection', 'Order routing', 'Scalable workflow design'].map(item => (
                      <div key={item} className="rounded-xl border border-orange-400/15 bg-orange-500/5 px-4 py-3">✓ {item}</div>
                    ))}
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
