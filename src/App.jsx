import React, { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Navigation from './components/Navigation'
import Hero from './components/sections/Hero'
import WhatWeDo from './components/sections/WhatWeDo'
import HowItWorks from './components/sections/HowItWorks'
import WhyChooseUs from './components/sections/WhyChooseUs'
import MeetTheLeadTech from './components/sections/MeetTheLeadTech'
import WhoItFor from './components/sections/WhoItFor'
import FinalCTA from './components/sections/FinalCTA'
import Footer from './components/Footer'
import GlobalCinematicBackground from './components/effects/GlobalCinematicBackground'
import IntroLoaderOverlay from './components/effects/IntroLoaderOverlay'
import RequestServiceOverlay from './components/RequestServiceOverlay'

function App() {
  const [activeSection, setActiveSection] = useState('hero')
  const [introVisible, setIntroVisible] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [isRequestServiceOpen, setIsRequestServiceOpen] = useState(false)
  const { scrollY } = useScroll()

  // Parallax effect on hero
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.8])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const setMotionPreference = () => setReduceMotion(mediaQuery.matches)
    setMotionPreference()

    mediaQuery.addEventListener('change', setMotionPreference)

    const loaderDuration = mediaQuery.matches ? 1800 : 7000
    const timer = window.setTimeout(() => {
      setIntroVisible(false)
    }, loaderDuration)

    const handleScroll = () => {
      const sections = ['hero', 'what-we-do', 'how-it-works', 'why-choose-us', 'meet-the-lead-tech', 'who-it-for', 'final-cta']
      
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
    return () => {
      window.clearTimeout(timer)
      mediaQuery.removeEventListener('change', setMotionPreference)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="bg-dark-950 text-white overflow-x-hidden relative">
      <GlobalCinematicBackground activeSection={activeSection} reduceMotion={reduceMotion} />

      <div className={`relative z-10 transition-opacity duration-700 ${introVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Navigation activeSection={activeSection} onRequestService={() => setIsRequestServiceOpen(true)} />
        
        <motion.div style={{ opacity: heroOpacity }}>
          <Hero />
        </motion.div>

        <WhatWeDo />
        <HowItWorks onRequestService={() => setIsRequestServiceOpen(true)} />
        <WhyChooseUs />
        <MeetTheLeadTech />
        <WhoItFor />
        <FinalCTA onRequestService={() => setIsRequestServiceOpen(true)} />
        <Footer />
      </div>

      <IntroLoaderOverlay visible={introVisible} reduceMotion={reduceMotion} />
      <RequestServiceOverlay isOpen={isRequestServiceOpen} onClose={() => setIsRequestServiceOpen(false)} />
    </div>
  )
}

export default App
