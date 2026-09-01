import React from 'react'
import { motion } from 'framer-motion'

function useInView(options) {
  const ref = React.useRef(null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); if (options.triggerOnce) observer.unobserve(entry.target) }
    }, { threshold: options.threshold || 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [options.triggerOnce, options.threshold])
  return { ref, inView }
}

function HowItWorks({ onRequestService }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
  const handleOpenChat = () => {
    if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') { window.Tawk_API.maximize(); return }
    const existingScript = document.querySelector('script[src*="embed.tawk.to/68c4b6410b3548192e8590fb/1j506fs5q"]')
    if (!existingScript) {
      const script = document.createElement('script'); script.async = true; script.src = 'https://embed.tawk.to/68c4b6410b3548192e8590fb/1j506fs5q'
      script.onload = () => { if (window.Tawk_API) window.Tawk_API.onLoaded = () => window.Tawk_API.maximize() }; document.head.appendChild(script)
    } else {
      const waitForTawk = window.setInterval(() => { if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') { window.clearInterval(waitForTawk); window.Tawk_API.maximize() } }, 150)
      window.setTimeout(() => window.clearInterval(waitForTawk), 5000)
    }
  }
  const steps = [
    { number: '01', title: 'Request Service', description: 'Tell us what you need and we\'ll get back to you quickly with availability and a preliminary assessment.', icon: '📋' },
    { number: '02', title: 'Diagnose & Quote', description: 'Our expert technicians assess your situation and provide you with a clear quote before any work begins.', icon: '🔍' },
    { number: '03', title: 'Fix, Build, or Deploy', description: 'We deliver fast, professional solutions and ensure everything works perfectly before we\'re done.', icon: '✅' },
  ]
  const serviceOptions = [
    { icon: '💻', title: 'Remote Service', description: 'Many software, website, configuration, troubleshooting, and technology services can be handled remotely — wherever you are.' },
    { icon: '📍', title: 'DMV On-Site Service', description: 'Based in the Washington, D.C. metro area, with on-site service available throughout Washington, D.C., Maryland, and Virginia.' },
    { icon: '✈️', title: 'Travel Available', description: 'Have a project outside the DMV that needs hands-on support? Travel to other states and locations can be arranged for the right project.' },
  ]
  const containerVariants = { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } }
  const stepVariants = { hidden: { opacity: 1, x: -40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6 } } }

  return (
    <section id="how-it-works" className="py-24 px-6 relative bg-gradient-to-b from-transparent to-blue-950/10"><div className="max-w-6xl mx-auto">
      <motion.div ref={ref} initial={{ opacity: 1, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-20"><h2 className="section-title mb-6">How It Works</h2><p className="section-subtitle">A simple, transparent process from start to finish.</p></motion.div>
      <motion.div variables={containerVariants} initial="hidden" animate={inView ? 'visible' : 'hidden'} className="grid md:grid-cols-3 gap-8 relative">
        <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        {steps.map((step, index) => <motion.div key={index} variants={stepVariants} className="relative"><div className="bg-dark-800/50 border border-blue-500/20 rounded-2xl p-8 backdrop-blur-sm relative z-10"><div className="absolute -top-6 left-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full w-14 h-14 flex items-center justify-center font-bold text-xl text-white border-4 border-dark-950">{step.number}</div><div className="text-4xl mb-6 mt-2">{step.icon}</div><h3 className="text-2xl font-bold mb-4">{step.title}</h3><p className="text-gray-400 leading-relaxed">{step.description}</p></div>{index < steps.length - 1 && <motion.div animate={{ x: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="hidden md:flex absolute right-0 top-32 translate-x-8 text-blue-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></motion.div>}</motion.div>)}
      </motion.div>
      <motion.div initial={{ opacity: 1, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.45 }} className="mt-20"><div className="text-center mb-8"><p className="text-xs md:text-sm uppercase tracking-[0.22em] text-blue-400 font-semibold mb-3">Local roots. Flexible reach.</p><h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Based in the Washington, D.C. Metro Area</h3><p className="text-gray-300 max-w-3xl mx-auto leading-relaxed text-base md:text-lg">Serving Washington, D.C., Maryland, and Virginia — with remote technology services available far beyond the DMV and travel available when a project needs hands-on support.</p></div><div className="grid md:grid-cols-3 gap-5">{serviceOptions.map((option) => <div key={option.title} className="bg-dark-800/40 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm text-center"><div className="text-3xl mb-3">{option.icon}</div><h4 className="text-lg font-bold text-white mb-2">{option.title}</h4><p className="text-sm text-gray-400 leading-relaxed">{option.description}</p></div>)}</div></motion.div>
      <motion.div initial={{ opacity: 1, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.6 }} className="text-center mt-16"><p className="text-gray-400 mb-6">Ready to get started?</p><div className="flex flex-col sm:flex-row items-center justify-center gap-4"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRequestService} className="btn-primary">Request Service Now</motion.button><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleOpenChat} className="live-chat-button px-8 py-3">Live Chat</motion.button></div></motion.div>
    </div></section>
  )
}

export default HowItWorks
