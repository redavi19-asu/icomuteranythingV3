import React from 'react'
import { motion } from 'framer-motion'

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

function MeetTheLeadTech() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const specialties = [
    'Hardware Repair',
    'Network Solutions',
    'Web Development',
    'System Administration',
    'Technical Support',
    'Problem Solving'
  ]

  const experiences = [
    {
      title: 'Comcast',
      description: 'Field technical support and customer solutions',
      icon: '📡',
      color: 'from-blue-500/20 to-cyan-500/20',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'DirecTV',
      description: 'Satellite systems installation and troubleshooting',
      icon: '📺',
      color: 'from-indigo-500/20 to-blue-500/20',
      borderColor: 'border-indigo-500/30'
    },
    {
      title: 'Goodwill',
      description: 'Junior Network Administrator',
      icon: '🖥️',
      color: 'from-purple-500/20 to-indigo-500/20',
      borderColor: 'border-purple-500/30'
    },
    {
      title: 'USPS',
      description: 'Technical operations and systems support',
      icon: '📮',
      color: 'from-cyan-500/20 to-teal-500/20',
      borderColor: 'border-cyan-500/30'
    },
    {
      title: 'Home Lab / Data Center',
      description: 'Personal infrastructure and continuous learning',
      icon: '🔬',
      color: 'from-emerald-500/20 to-green-500/20',
      borderColor: 'border-emerald-500/30'
    },
    {
      title: 'Help Desk / Technical Support',
      description: 'Direct customer service and problem resolution',
      icon: '🎧',
      color: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30'
    }
  ]

  const skills = [
    {
      title: 'Windows / Active Directory',
      description: 'Domain management, GPO, user administration',
      icon: '🪟',
      color: 'from-blue-500/20 to-blue-600/20',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'Linux / Servers',
      description: 'Ubuntu, CentOS, server configuration',
      icon: '🐧',
      color: 'from-green-500/20 to-emerald-600/20',
      borderColor: 'border-green-500/30'
    },
    {
      title: 'Networking',
      description: 'TCP/IP, routing, VLANs, wireless systems',
      icon: '🌐',
      color: 'from-cyan-500/20 to-blue-600/20',
      borderColor: 'border-cyan-500/30'
    },
    {
      title: 'Frontend / Web Development',
      description: 'React, JavaScript, responsive design',
      icon: '⚛️',
      color: 'from-purple-500/20 to-pink-600/20',
      borderColor: 'border-purple-500/30'
    },
    {
      title: 'Web Basics / Site Building',
      description: 'HTML, CSS, WordPress, hosting',
      icon: '🎨',
      color: 'from-pink-500/20 to-rose-600/20',
      borderColor: 'border-pink-500/30'
    },
    {
      title: 'Deployment / Automation',
      description: 'CI/CD, scripting, infrastructure as code',
      icon: '⚙️',
      color: 'from-indigo-500/20 to-violet-600/20',
      borderColor: 'border-indigo-500/30'
    },
    {
      title: 'Troubleshooting / Diagnostics',
      description: 'Root cause analysis, systematic debugging',
      icon: '🔍',
      color: 'from-orange-500/20 to-amber-600/20',
      borderColor: 'border-orange-500/30'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <section id="meet-the-lead-tech" className="py-24 px-6 relative bg-gradient-to-b from-transparent via-blue-950/5 to-transparent">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">Meet the Lead Tech</h2>
          <p className="section-subtitle">
            The hands-on expertise and real-world experience behind every solution.
          </p>
        </motion.div>

        {/* 1. Lead Tech Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-20"
        >
          <div className="relative p-10 md:p-12 rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-blue-600/10 backdrop-blur-sm overflow-hidden">
            {/* Animated gradient accent */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                backgroundSize: '200% 100%',
              }}
            />

            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Avatar */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex-shrink-0"
              >
                <img
                  src="/icomuteranythingV3/ryan-profile.jpeg"
                  alt="Ryan Davis - Lead Tech"
                  className="w-40 h-40 md:w-48 md:h-48 rounded-2xl object-cover shadow-2xl shadow-blue-500/20 border-2 border-blue-400/40"
                />
              </motion.div>

              {/* Profile content */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                    Lead Tech
                  </span>
                </h3>
                <p className="text-lg text-blue-300/80 mb-6 font-medium">Ryan Davis</p>
                
                <p className="text-gray-300 leading-relaxed mb-8 text-lg">
                  With years of hands-on experience in the field, I've worked everywhere from enterprise networks to home setups. 
                  I believe in doing the job right, communicating clearly, and making tech work for you—not the other way around. 
                  Every project gets my full attention, whether it's a laptop repair or a full business deployment.
                </p>

                {/* Specialties badges */}
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-3 uppercase tracking-wide">Core Specialties</p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {specialties.map((specialty, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={inView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 text-sm text-blue-200 font-medium hover:bg-blue-500/20 transition-colors"
                      >
                        {specialty}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. Experience Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-20"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-blue-200/90 mb-8 text-center tracking-wide">
            Experience
          </h3>
          <p className="text-center text-gray-400 mb-10 max-w-3xl mx-auto">
            Real-world positions and hands-on technical work across multiple industries and environments.
          </p>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {experiences.map((exp, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{
                  y: -8,
                  boxShadow: '0 20px 40px rgba(59, 130, 246, 0.15)',
                }}
                className={`relative p-6 rounded-xl border ${exp.borderColor} bg-gradient-to-br ${exp.color} backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300`}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="relative z-10">
                  <div className="text-4xl mb-4">{exp.icon}</div>
                  <h4 className="text-xl font-bold mb-2">{exp.title}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{exp.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* 3. Skills Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-blue-200/90 mb-8 text-center tracking-wide">
            Skills
          </h3>
          <p className="text-center text-gray-400 mb-10 max-w-3xl mx-auto">
            Technical proficiencies developed through years of continuous learning and practical application.
          </p>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {skills.map((skill, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{
                  y: -6,
                  boxShadow: '0 15px 35px rgba(59, 130, 246, 0.12)',
                }}
                className={`group relative p-6 rounded-xl border ${skill.borderColor} bg-gradient-to-br ${skill.color} backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300`}
              >
                {/* Subtle shine effect on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    transform: 'translateX(-100%)',
                  }}
                  whileHover={{
                    transform: 'translateX(100%)',
                  }}
                  transition={{ duration: 0.6 }}
                />

                <div className="relative z-10">
                  <div className="text-3xl mb-3">{skill.icon}</div>
                  <h4 className="text-lg font-bold mb-2">{skill.title}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{skill.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Bottom credibility statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-300 text-lg mb-4">
            <span className="font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">
              Real experience. Real results.
            </span>
          </p>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">
            This isn't just a side hustle—it's a commitment to delivering reliable, professional tech solutions backed by years of proven expertise.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export default MeetTheLeadTech
