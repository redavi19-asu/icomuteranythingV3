import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function Navigation({ activeSection }) {
  const [isScrolled, setIsScrolled] = useState(false)

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
    { id: 'who-it-for', label: 'Who It\'s For' },
  ]

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
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
          onClick={() => scrollToSection('final-cta')}
          className="hidden md:block px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition-all text-sm"
        >
          Request Service
        </motion.button>

        {/* Mobile menu indicator */}
        <div className="md:hidden text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navigation
