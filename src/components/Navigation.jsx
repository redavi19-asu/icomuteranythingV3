import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function Navigation({ activeSection, onRequestService }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { id: 'hero', label: 'Home' },
    { id: 'what-we-do', label: 'Services' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'why-choose-us', label: 'Why Us' },
    { id: 'ica-projects', label: 'ICA Projects' },
    { id: 'who-it-for', label: 'Who It\'s For' },
  ]

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMobileMenuOpen(false)
    }
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-dark-950/80 backdrop-blur-md border-b border-blue-500/10' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="cursor-pointer"
          onClick={() => scrollToSection('hero')}
        >
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            ICA
          </div>
        </motion.div>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <motion.button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className={`relative text-sm font-medium transition-colors ${
                activeSection === link.id ? 'text-blue-400' : 'text-gray-300 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {link.label}
              {activeSection === link.id && (
                <motion.div
                  layoutId="underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* CTA Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRequestService}
          className="hidden md:block px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition-all text-sm"
        >
          Request Service
        </motion.button>

        {/* Mobile hamburger menu button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden flex flex-col gap-1.5 focus:outline-none"
          aria-label="Toggle mobile menu"
        >
          <motion.span
            animate={isMobileMenuOpen ? { rotate: 45, y: 10 } : { rotate: 0, y: 0 }}
            className="w-6 h-0.5 bg-gray-300 block rounded-full"
          />
          <motion.span
            animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
            className="w-6 h-0.5 bg-gray-300 block rounded-full"
          />
          <motion.span
            animate={isMobileMenuOpen ? { rotate: -45, y: -10 } : { rotate: 0, y: 0 }}
            className="w-6 h-0.5 bg-gray-300 block rounded-full"
          />
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Mobile Menu Content */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute top-full left-0 right-0 bg-dark-950/95 backdrop-blur-md border-b border-blue-500/10 md:hidden z-40"
            >
              <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-4">
                {navLinks.map(link => (
                  <motion.button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className={`text-left py-3 px-4 rounded-lg transition-colors font-medium ${
                      activeSection === link.id
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-gray-300 hover:text-white hover:bg-blue-600/10'
                    }`}
                    whileHover={{ x: 8 }}
                  >
                    {link.label}
                  </motion.button>
                ))}

                {/* Mobile CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onRequestService()
                    setIsMobileMenuOpen(false)
                  }}
                  className="mt-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition-all w-full"
                >
                  Request Service
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

export default Navigation
