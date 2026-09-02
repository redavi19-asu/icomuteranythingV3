import React, { useState } from 'react'
import { motion } from 'framer-motion'
import ServiceModal from '../ServiceModal'

function useInView(options) {
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

function WhatWeDo({ onRequestService }) {
  const [selectedService, setSelectedService] = useState(null)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const coreServices = [
    {
      title: 'Computer Repair', category: 'Core Service',
      description: 'Fast diagnostics and repair for hardware failures, crashes, and virus removal.',
      icon: '🛠️', color: 'from-orange-500/20 to-orange-600/20', borderColor: 'border-orange-500/30',
      overview: 'I diagnose and fix computer problems quickly. Whether it\'s a crashing system, malware infection, or hardware failure, I work to get your computer back online fast.',
      includes: ['Complete system diagnostics','Hardware repair and replacement','Virus and malware removal','Operating system reinstallation','Performance optimization','Data recovery from damaged drives'],
      useCases: ['Your computer won\'t start or keeps crashing','You suspect your system has a virus or malware','You\'re getting error messages or blue screens','Fans are loud or performance is slow','You need urgent data recovery from a dead drive']
    },
    {
      title: 'Web & SaaS Development', category: 'Core Service',
      description: 'Custom websites, web applications, SaaS platforms, and business automation solutions.',
      icon: '💻', color: 'from-blue-500/20 to-blue-600/20', borderColor: 'border-blue-500/30',
      overview: 'I build modern websites, web apps, and SaaS platforms for businesses and entrepreneurs. From custom interfaces to backend automation, I tailor the solution to the way you need to work.',
      includes: ['Custom website and web app development','SaaS platform design and build','Business process automation','API integration and backend systems','Database design and management','Deployment, hosting, and security'],
      useCases: ['You need a custom web application or SaaS platform','You want to automate business workflows online','Your business requires a secure, scalable digital solution','You need API integrations or backend automation','You want a complete, production-ready web solution']
    },
    {
      title: 'Custom Software Development', category: 'Core Service',
      description: 'Tailored software solutions, business tools, and workflow automation for your unique needs.',
      icon: '🧩', color: 'from-green-500/20 to-teal-600/20', borderColor: 'border-green-500/30',
      overview: 'I design and build custom software, business tools, and automation systems around your workflow and the problem you actually need solved.',
      includes: ['Custom business software','Workflow automation tools','Internal dashboards and reporting','Integration with existing systems','Mobile and desktop app development','Ongoing support and enhancements'],
      useCases: ['You need a software tool built for your business','You want to automate manual tasks or reporting','You need integration with your current systems','You want a custom app for your team or clients','You need ongoing support for a business solution']
    },
    {
      title: 'AI Integration & AI-Assisted Solutions', category: 'Core Service',
      description: 'Practical AI integrations for websites and business tools, from AI-powered features to workflow and support automation.',
      icon: '🤖', color: 'from-teal-500/20 to-cyan-600/20', borderColor: 'border-teal-500/30',
      overview: 'I help businesses add practical AI features without turning the whole operation upside down. The goal is useful automation, cleaner workflows, and human control where it matters.',
      includes: ['AI-powered feature integration for websites and digital tools','Small business AI tool setup and configuration','AI-assisted content and workflow support solutions','Form and customer support automation','Simple AI-enhanced business tool integrations','Secure implementation with human-guided oversight'],
      useCases: ['You want to add AI capabilities to an existing website or app','Your team needs faster content, communication, or support workflows','You need practical AI tools without replacing your current systems','You want AI-assisted processes that still keep human control','You need clean integrations that work with your day-to-day operations']
    },
    {
      title: 'IT Support', category: 'Core Service',
      description: 'Comprehensive technical support for networks, servers, devices, and day-to-day operations.',
      icon: '🔧', color: 'from-blue-500/20 to-cyan-600/20', borderColor: 'border-blue-500/30',
      overview: 'I provide direct IT support for troubleshooting, setup, maintenance, and technical problems that need somebody to actually work through them with you.',
      includes: ['Remote and onsite technical support','Network troubleshooting','Printer and device setup','Software installation and updates','Email and account configuration','Emergency technical assistance'],
      useCases: ['An employee can\'t access a network resource','A device isn\'t working properly','You need help setting up new software','You have an IT emergency that needs immediate attention','You want technical support without hiring full-time staff']
    },
  ]

  const advancedServices = [
    {
      title: 'Cybersecurity Consulting', category: 'Advanced Service',
      description: 'Security reviews, threat awareness, hardening, and practical protection for small-business environments.',
      icon: '🔒', color: 'from-emerald-500/20 to-emerald-600/20', borderColor: 'border-emerald-500/30',
      overview: 'I review your current security posture, identify weak points, and help you tighten the systems and habits that protect your business.',
      includes: ['Security risk assessments','Vulnerability scanning','Threat analysis and recommendations','Security policy guidance','Security best-practice training','Incident response planning'],
      useCases: ['You want to review your current security setup','You\'ve experienced a security concern','You\'re handling sensitive customer data','You need to protect business systems and information','You want practical security improvements without enterprise complexity']
    },
    {
      title: 'Data Backup & Recovery', category: 'Advanced Service',
      description: 'Backup planning, automated protection, and recovery help when important data is at risk.',
      icon: '💾', color: 'from-cyan-500/20 to-cyan-600/20', borderColor: 'border-cyan-500/30',
      overview: 'I can set up dependable backup systems and help recover data when hardware failure, accidental deletion, or other problems put your files at risk.',
      includes: ['Automated backup systems','Cloud backup solutions','Local and offsite backup options','Emergency data recovery','Ransomware recovery planning','Backup monitoring and verification'],
      useCases: ['A hard drive crashes and you need to recover files','You want protection against ransomware','You\'re concerned about losing critical business data','You need a better backup routine','You want automated backups that do not depend on memory']
    },
    {
      title: 'Hardware Installation & Upgrades', category: 'Advanced Service',
      description: 'Installation and upgrades for computers, peripherals, storage, memory, and network equipment.',
      icon: '⚙️', color: 'from-amber-500/20 to-amber-600/20', borderColor: 'border-amber-500/30',
      overview: 'I handle hardware upgrades and installations from RAM and SSDs to complete workstation and network equipment setups.',
      includes: ['RAM and storage upgrades','Graphics card installation','Computer building and assembly','Printer and scanner setup','Network equipment installation','Multi-device deployment support'],
      useCases: ['Your computer is running slowly and needs more RAM','You want to upgrade to a faster SSD','You\'re setting up new computers for your office','You need specialized hardware installed','You\'re expanding hardware across multiple locations']
    },
    {
      title: 'Managed IT Services', category: 'Advanced Service',
      description: 'Ongoing IT support, maintenance, monitoring, and technical guidance for small businesses.',
      icon: '📊', color: 'from-indigo-500/20 to-indigo-600/20', borderColor: 'border-indigo-500/30',
      overview: 'For businesses that need ongoing help, I can provide recurring support, maintenance, updates, monitoring, and a direct technical point of contact.',
      includes: ['Monitoring and alerts','Proactive maintenance','Software updates and patching','User account and access support','Performance optimization','Vendor coordination and support'],
      useCases: ['You want to reduce expensive IT emergencies','You don\'t have an in-house IT department','You want a consistent technical contact','You need regular maintenance and patching','You\'re scaling and need flexible IT support']
    },
    {
      title: 'Event Tech Deployment', category: 'Advanced Service',
      description: 'Technology setup and hands-on support for conferences, presentations, pop-ups, and events.',
      icon: '🎥', color: 'from-cyan-500/20 to-blue-600/20', borderColor: 'border-cyan-500/30',
      overview: 'I can plan, set up, troubleshoot, and support the technology behind an event, and bring in additional trusted hands when the scale calls for it.',
      includes: ['Audio/visual equipment setup','Projection and streaming setup','WiFi and networking deployment','Live technical support','Equipment coordination','Backup systems and contingency planning'],
      useCases: ['You\'re hosting a conference or trade show','You need live streaming for an event','You\'re giving a presentation and want backup support','You need reliable WiFi for attendees','You want hands-on technical support during an event']
    },
    {
      title: 'Networking & Server Setup', category: 'Advanced Service',
      description: 'Network design, installation, server configuration, remote access, and infrastructure support.',
      icon: '🌐', color: 'from-blue-500/20 to-sky-600/20', borderColor: 'border-blue-500/30',
      overview: 'I design and configure networks and servers around the needs of the environment, from small offices and home labs to more involved deployments.',
      includes: ['Network design and architecture','Router and firewall configuration','Server setup and configuration','VPN and remote access setup','Network security implementation','Cabling and infrastructure installation'],
      useCases: ['You\'re opening a new office and need network setup','Your network is outdated or unreliable','You need secure remote access','You want to implement a local server','You\'re upgrading your network infrastructure']
    },
  ]

  const containerVariants = { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } }
  const cardVariants = { hidden: { opacity: 1, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }

  const handleRequestService = () => {
    setSelectedService(null)
    onRequestService()
  }

  return (
    <>
      <section id="what-we-do" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            ref={ref}
            initial={{ opacity: 1, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="section-title mb-6">What I Do</h2>
            <p className="section-subtitle">
              I build, repair, automate, configure, and support technology for businesses and individuals — from a single computer problem to a full software or infrastructure project.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 1, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.2 }} className="mb-16">
            <h3 className="text-xl md:text-2xl font-bold text-blue-200/90 mb-6 tracking-wide text-center">Core Services</h3>
            <motion.div variants={containerVariants} initial="hidden" animate={inView ? 'visible' : 'hidden'} className="core-services-cards mobile-horizontal-scroll grid md:grid-cols-3 gap-6">
              {coreServices.map((service, index) => (
                <motion.div key={index} variants={cardVariants} whileHover={{ y: -10, boxShadow: '0 20px 50px rgba(59, 130, 246, 0.2)' }} onClick={() => setSelectedService(service)} className={`group relative p-8 rounded-2xl border ${service.borderColor} bg-gradient-to-br ${service.color} backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300`}>
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-5xl mb-4">{service.icon}</div>
                    <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{service.description}</p>
                    <motion.div className="mt-6 flex items-center gap-2 text-blue-400 font-medium" whileHover={{ gap: '12px' }}>Learn more <span>→</span></motion.div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 1, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.4 }}>
            <h3 className="text-xl md:text-2xl font-bold text-blue-200/90 mb-6 tracking-wide text-center">Advanced &amp; Business Services</h3>
            <motion.div variants={containerVariants} initial="hidden" animate={inView ? 'visible' : 'hidden'} className="advanced-services-cards mobile-horizontal-scroll grid md:grid-cols-3 gap-5">
              {advancedServices.map((service, index) => (
                <motion.div key={index} variants={cardVariants} whileHover={{ y: -8, boxShadow: '0 15px 40px rgba(59, 130, 246, 0.15)' }} onClick={() => setSelectedService(service)} className={`group relative p-6 rounded-xl border ${service.borderColor} bg-gradient-to-br ${service.color} backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300`}>
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-4xl mb-3">{service.icon}</div>
                    <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{service.description}</p>
                    <motion.div className="mt-4 flex items-center gap-2 text-blue-400 text-sm font-medium" whileHover={{ gap: '10px' }}>Learn more <span>→</span></motion.div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <ServiceModal
        isOpen={selectedService !== null}
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onRequestService={handleRequestService}
      />
    </>
  )
}

export default WhatWeDo
