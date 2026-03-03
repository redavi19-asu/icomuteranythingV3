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

function WhatWeDo() {
  const [selectedService, setSelectedService] = useState(null)
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const coreServices = [
    {
      title: 'Computer Repair',
      category: 'Core Service',
      description: 'Fast diagnostics and repair for hardware failures, crashes, and virus removal.',
      icon: '🛠️',
      color: 'from-orange-500/20 to-orange-600/20',
      borderColor: 'border-orange-500/30',
      overview: 'We diagnose and fix computer problems quickly. Whether it\'s a crashing system, malware infection, or hardware failure, our technicians get your computer back online fast.',
      includes: [
        'Complete system diagnostics',
        'Hardware repair and replacement',
        'Virus and malware removal',
        'Operating system reinstallation',
        'Performance optimization',
        'Data recovery from damaged drives'
      ],
      useCases: [
        'Your computer won\'t start or keeps crashing',
        'You suspect your system has a virus or malware',
        'You\'re getting error messages or blue screens',
        'Fans are loud or performance is slow',
        'You need urgent data recovery from a dead drive'
      ]
    },
    {
      title: 'Full Stack Development',
      category: 'Core Service',
      description: 'End-to-end web solutions with custom front-end interfaces and powerful back-end systems.',
      icon: '💻',
      color: 'from-blue-500/20 to-blue-600/20',
      borderColor: 'border-blue-500/30',
      overview: 'We build complete full stack solutions from front-end to back-end. Custom websites, web applications, API integrations, and database-driven systems that are production-ready and scalable.',
      includes: [
        'Front-end development with modern frameworks',
        'Back-end API development and integration',
        'Database design and management',
        'Custom web applications',
        'Deployment and hosting setup',
        'Authentication and security implementation'
      ],
      useCases: [
        'You need a custom web application with user accounts and data management',
        'You want to build an API-driven platform with front-end and back-end',
        'Your business requires a database-backed web solution',
        'You need third-party API integrations with a custom interface',
        'You want a complete deployment-ready full stack solution'
      ]
    },
    {
      title: 'AI Integration & AI-Assisted Solutions',
      category: 'Core Service',
      description: 'Practical AI integrations for websites and business tools, from AI-powered features to workflow and support automation.',
      icon: '🤖',
      color: 'from-teal-500/20 to-cyan-600/20',
      borderColor: 'border-teal-500/30',
      overview: 'We help businesses adopt AI in a practical, reliable way. From adding AI-powered features to websites and digital tools to streamlining content, support, and internal workflows, every implementation is designed to fit your operations and goals.',
      includes: [
        'AI-powered feature integration for websites and digital tools',
        'Small business AI tool setup and configuration',
        'AI-assisted content and workflow support solutions',
        'Form and customer support automation',
        'Simple AI-enhanced business tool integrations',
        'Secure implementation with human-guided oversight'
      ],
      useCases: [
        'You want to add AI capabilities to an existing website or app',
        'Your team needs faster content, communication, or support workflows',
        'You need practical AI tools without replacing your current systems',
        'You want AI-assisted processes that still keep human control',
        'You need clean integrations that work with your day-to-day operations'
      ]
    },
    {
      title: 'IT Support',
      category: 'Core Service',
      description: 'Comprehensive technical support for networks, servers, and ongoing operations.',
      icon: '🔧',
      color: 'from-purple-500/20 to-purple-600/20',
      borderColor: 'border-purple-500/30',
      overview: 'Get reliable IT support when you need it. We handle everything from troubleshooting to ongoing maintenance, keeping your systems running 24/7.',
      includes: [
        'Remote and onsite technical support',
        'Network troubleshooting',
        'Printer and device setup',
        'Software installation and updates',
        'Email and account configuration',
        'Emergency technical assistance'
      ],
      useCases: [
        'An employee can\'t access a network resource',
        'A device isn\'t working properly',
        'You need help setting up new software',
        'You have an IT emergency that needs immediate attention',
        'You want technical support without hiring full-time staff'
      ]
    },
  ]

  const advancedServices = [
    {
      title: 'Cybersecurity Consulting',
      category: 'Advanced Service',
      description: 'Protect your business with security audits, threat assessments, and best practices.',
      icon: '🔒',
      color: 'from-emerald-500/20 to-emerald-600/20',
      borderColor: 'border-emerald-500/30',
      overview: 'Strengthen your security posture with expert consulting. We identify vulnerabilities, assess threats, and implement protection strategies tailored to your business.',
      includes: [
        'Security risk assessments',
        'Vulnerability scanning',
        'Threat analysis and recommendations',
        'Security policy development',
        'Employee training on security best practices',
        'Incident response planning'
      ],
      useCases: [
        'You want to ensure compliance with industry regulations',
        'You\'ve experienced a security breach or concern',
        'You\'re handling sensitive customer data',
        'You need to protect intellectual property',
        'You want to audit your current security setup'
      ]
    },
    {
      title: 'Data Backup & Recovery',
      category: 'Advanced Service',
      description: 'Reliable backup solutions and emergency data recovery services to protect your information.',
      icon: '💾',
      color: 'from-cyan-500/20 to-cyan-600/20',
      borderColor: 'border-cyan-500/30',
      overview: 'Never lose important data again. We implement automatic backups and provide expert recovery services when disaster strikes.',
      includes: [
        'Automated backup systems',
        'Cloud backup solutions',
        'Local and offsite backup storage',
        'Emergency data recovery',
        'Ransomware recovery',
        'Backup monitoring and verification'
      ],
      useCases: [
        'A hard drive crashes and you need to recover files',
        'You want protection against ransomware attacks',
        'You\'re concerned about losing critical business data',
        'You need compliance with data retention regulations',
        'You want automated daily backups you can forget about'
      ]
    },
    {
      title: 'Hardware Installation & Upgrades',
      category: 'Advanced Service',
      description: 'Expert installation and upgrades for computers, peripherals, and enterprise equipment.',
      icon: '⚙️',
      color: 'from-amber-500/20 to-amber-600/20',
      borderColor: 'border-amber-500/30',
      overview: 'Upgrade your hardware safely and efficiently. From RAM and SSDs to complete system builds, we handle it all with expertise.',
      includes: [
        'RAM and storage upgrades',
        'Graphics card installation',
        'Computer building and assembly',
        'Printer and scanner setup',
        'Network equipment installation',
        'Enterprise hardware deployment'
      ],
      useCases: [
        'Your computer is running slowly and needs more RAM',
        'You want to upgrade to a faster SSD',
        'You\'re setting up new computers for your office',
        'You need specialized hardware installed',
        'You\'re expanding your hardware across multiple locations'
      ]
    },
    {
      title: 'Managed IT Services',
      category: 'Advanced Service',
      description: 'Complete IT infrastructure management with proactive monitoring and maintenance.',
      icon: '📊',
      color: 'from-indigo-500/20 to-indigo-600/20',
      borderColor: 'border-indigo-500/30',
      overview: 'Let us manage your entire IT infrastructure. We monitor, maintain, and optimize your systems so you can focus on your business.',
      includes: [
        '24/7 monitoring and alerts',
        'Proactive maintenance',
        'Software updates and patching',
        'User account and access management',
        'Performance optimization',
        'Vendor management and support'
      ],
      useCases: [
        'You want to avoid expensive IT emergencies',
        'You don\'t have an in-house IT department',
        'You need predictable IT costs',
        'You want security patches applied immediately',
        'You\'re scaling your business and need flexible IT support'
      ]
    },
    {
      title: 'Event Tech Deployment',
      category: 'Advanced Service',
      description: 'Full-service technology setup and support for conferences, presentations, and events.',
      icon: '🎥',
      color: 'from-pink-500/20 to-pink-600/20',
      borderColor: 'border-pink-500/30',
      overview: 'Make your events run smoothly with reliable tech support. We handle setup, troubleshooting, and live support throughout your event.',
      includes: [
        'Audio/visual equipment setup',
        'Projection and streaming setup',
        'WiFi and networking deployment',
        'Live technical support',
        'Equipment rental coordination',
        'Backup systems and contingency planning'
      ],
      useCases: [
        'You\'re hosting a conference or trade show',
        'You need live streaming for an event',
        'You\'re giving a presentation and want backup support',
        'You need reliable WiFi for attendees',
        'You want professional A/V for a corporate event'
      ]
    },
    {
      title: 'Networking & Server Setup',
      category: 'Advanced Service',
      description: 'Professional network infrastructure design, installation, and server configuration.',
      icon: '🌐',
      color: 'from-violet-500/20 to-violet-600/20',
      borderColor: 'border-violet-500/30',
      overview: 'Build a foundation for reliable business operations. We design and implement networks and servers tailored to your needs.',
      includes: [
        'Network design and architecture',
        'Router and firewall configuration',
        'Server setup and configuration',
        'VPN and remote access setup',
        'Network security implementation',
        'Cabling and infrastructure installation'
      ],
      useCases: [
        'You\'re opening a new office and need network setup',
        'Your network is outdated or unreliable',
        'You need secure remote access for your team',
        'You want to implement a local server',
        'You\'re upgrading your entire network infrastructure'
      ]
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const handleRequestService = () => {
    const element = document.getElementById('request-service')
    if (element) {
      setSelectedService(null) // Close modal
      element.scrollIntoView({ behavior: 'smooth' })
      // Open the RequestServiceOverlay if it exists
      const btn = element.querySelector('button')
      if (btn) btn.click()
    }
  }

  return (
    <>
      <section id="what-we-do" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">What We Do</h2>
          <p className="section-subtitle">
            Comprehensive tech solutions designed to solve your problems and grow your business.
          </p>
        </motion.div>

        {/* Core Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <h3 className="text-xl md:text-2xl font-bold text-blue-200/90 mb-6 tracking-wide text-center">
            Core Services
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="grid md:grid-cols-3 gap-6"
          >
            {coreServices.map((service, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{
                  y: -10,
                  boxShadow: '0 20px 50px rgba(59, 130, 246, 0.2)',
                }}
                onClick={() => setSelectedService(service)}
                className={`group relative p-8 rounded-2xl border ${service.borderColor} bg-gradient-to-br ${service.color} backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300`}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="text-5xl mb-4">{service.icon}</div>
                  <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{service.description}</p>
                  
                  {/* Arrow accent */}
                  <motion.div
                    className="mt-6 flex items-center gap-2 text-blue-400 font-medium"
                    whileHover={{ gap: '12px' }}
                  >
                    Learn more
                    <span>→</span>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Advanced & Business Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-xl md:text-2xl font-bold text-blue-200/90 mb-6 tracking-wide text-center">
            Advanced &amp; Business Services
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="grid md:grid-cols-3 gap-5"
          >
            {advancedServices.map((service, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{
                  y: -8,
                  boxShadow: '0 15px 40px rgba(59, 130, 246, 0.15)',
                }}
                onClick={() => setSelectedService(service)}
                className={`group relative p-6 rounded-xl border ${service.borderColor} bg-gradient-to-br ${service.color} backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300`}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="text-4xl mb-3">{service.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{service.description}</p>
                  
                  {/* Arrow accent */}
                  <motion.div
                    className="mt-4 flex items-center gap-2 text-blue-400 text-sm font-medium"
                    whileHover={{ gap: '10px' }}
                  >
                    Learn more
                    <span>→</span>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Service Details Modal */}
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
