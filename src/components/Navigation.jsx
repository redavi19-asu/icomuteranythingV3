import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function Navigation({ activeSection, onRequestService }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { id: 'hero', label: 'Home' },
    { id: 'what-we-do', label: 'Services' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'software', label: 'Software' },
    { id: 'ica-projects', label: 'Projects' },
    { id: 'meet-the-lead-tech', label: 'About' },
  ]

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMobileMenuOpen(false)
    }
  }

  const handleOpenChat = () => {
    if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
      window.Tawk_API.maximize()
      return
    }
    const existingScript = document.querySelector('script[src*="embed.tawk.to/68c4b6410b3548192e8590fb/1j506fs5q"]')
    if (!existingScript) {
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://embed.tawk.to/68c4b6410b3548192e8590fb/1j506fs5q'
      script.onload = () => { if (window.Tawk_API) window.Tawk_API.onLoaded = () => window.Tawk_API.maximize() }
      document.head.appendChild(script)
    } else {
      const waitForTawk = window.setInterval(() => {
        if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
          window.clearInterval(waitForTawk)
          window.Tawk_API.maximize()
        }
      }, 150)
      window.setTimeout(() => window.clearInterval(waitForTawk), 5000)
    }
  }

  return (
    <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6 }} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-dark-950/80 backdrop-blur-md border-b border-blue-500/10' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <motion.button whileHover={{ scale: 1.05 }} className="cursor-pointer text-left" onClick={() => scrollToSection('hero')} aria-label="Go to home">
          <div className="text-2xl font-bold tracking-tight flex items-center">
            <span className="bg-gradient-to-b from-red-300 via-red-500 to-red-800 bg-clip-text text-transparent">I</span><span className="bg-gradient-to-b from-orange-200 via-orange-500 to-orange-700 bg-clip-text text-transparent">C</span><span className="bg-gradient-to-b from-gray-200 via-gray-400 to-gray-600 bg-clip-text text-transparent">A</span>
          </div>
        </motion.button>

        <div className="hidden md:flex items-center gap-7">
          {navLinks.map(link => (
            <motion.button key={link.id} onClick={() => scrollToSection(link.id)} className={`relative text-sm font-medium transition-colors ${activeSection === link.id ? 'text-blue-400' : 'text-gray-300 hover:text-white'}`} whileHover={{ scale: 1.05 }}>
              {link.label}
              {activeSection === link.id && <motion.div layoutId="underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500" transition={{ duration: 0.3 }} />}
            </motion.button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRequestService} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition-all text-sm">Request Service</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleOpenChat} className="live-chat-button px-6 py-2 text-sm">Live Chat</motion.button>
        </div>

        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden flex flex-col gap-1.5 focus:outline-none" aria-label="Toggle mobile menu">
          <motion.span animate={isMobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }} className="w-6 h-0.5 bg-gray-300 block rounded-full" />
          <motion.span animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }} className="w-6 h-0.5 bg-gray-300 block rounded-full" />
          <motion.span animate={isMobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }} className="w-6 h-0.5 bg-gray-300 block rounded-full" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" />
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="absolute top-full left-0 right-0 bg-dark-950/95 backdrop-blur-md border-b border-blue-500/10 md:hidden z-40">
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-3">
              {navLinks.map(link => <motion.button key={link.id} onClick={() => scrollToSection(link.id)} className={`text-left py-3 px-4 rounded-lg transition-colors font-medium ${activeSection === link.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:text-white hover:bg-blue-600/10'}`} whileHover={{ x: 8 }}>{link.label}</motion.button>)}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { onRequestService(); setIsMobileMenuOpen(false) }} className="mt-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition-all w-full">Request Service</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { handleOpenChat(); setIsMobileMenuOpen(false) }} className="live-chat-button py-3 px-4 w-full">Live Chat</motion.button>
            </div>
          </motion.div>
        </>}
      </AnimatePresence>
    </motion.nav>
  )
}

export default Navigation
