import React, { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Navigation from './components/Navigation'
import Hero from './components/sections/Hero'
import WhatWeDo from './components/sections/WhatWeDo'
import HowItWorks from './components/sections/HowItWorks'
import WhyChooseUs from './components/sections/WhyChooseUs'
import WhoItFor from './components/sections/WhoItFor'
import FinalCTA from './components/sections/FinalCTA'
import Footer from './components/Footer'

function App() {
  const [activeSection, setActiveSection] = useState('hero')
  const { scrollY } = useScroll()

  // Parallax effect on hero
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.8])

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'what-we-do', 'how-it-works', 'why-choose-us', 'who-it-for', 'final-cta']
      
      for (let section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= window.innerHeight / 2) {
            setActiveSection(section)
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="bg-dark-950 text-white overflow-x-hidden">
      <Navigation activeSection={activeSection} />
      
      <motion.div style={{ opacity: heroOpacity }}>
        <Hero />
      </motion.div>

      <WhatWeDo />
      <HowItWorks />
      <WhyChooseUs />
      <WhoItFor />
      <FinalCTA />
      <Footer />
    </div>
  )
}

export default App
