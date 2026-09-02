import React from 'react'
import { motion } from 'framer-motion'

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

function MeetTheLeadTech() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const specialties = [
    'Hardware Repair',
    'Network Solutions',
    'Full Stack Development',
    'System Administration',
    'Technical Support',
    'Problem Solving'
  ]

  const experiences = [
    { title: 'Comcast', description: 'Field technical support and customer solutions', icon: '📡' },
    { title: 'DirecTV', description: 'Satellite systems installation and troubleshooting', icon: '📺' },
    { title: 'Goodwill', description: 'Junior Network Administrator and end-user technical support', icon: '🖥️' },
    { title: 'USPS', description: 'Operations experience in a fast-moving service environment', icon: '📮' },
    { title: 'Home Lab / Data Center', description: 'Hands-on Windows, Linux, server, networking, and deployment practice', icon: '🔬' },
    { title: 'Help Desk / Technical Support', description: 'Direct troubleshooting, ticket support, and problem resolution', icon: '🎧' }
  ]

  const skills = [
    { title: 'Web Development', description: 'Modern websites, responsive design, and user experience', icon: '⚛️' },
    { title: 'Custom Software / Full Stack', description: 'Tailored apps, APIs, dashboards, and backend systems', icon: '🔧' },
    { title: 'IT Support', description: 'Technical assistance, troubleshooting, repair, and maintenance', icon: '🔍' },
    { title: 'Windows / Active Directory', description: 'Domain management, users, systems, and administration', icon: '🪟' },
    { title: 'Linux / Servers', description: 'Server setup, administration, automation, and deployment', icon: '🐧' },
    { title: 'Networking', description: 'TCP/IP, routing, wireless, switching, and secure connectivity', icon: '🌐' },
    { title: 'Cloud / Deployment', description: 'Web deployment, hosting workflows, CI/CD, and infrastructure', icon: '⚙️' },
    { title: 'AI Integration', description: 'Practical AI-assisted features and workflow automation', icon: '🤖' },
    { title: 'Cybersecurity', description: 'Security-minded configuration, risk reduction, and best practices', icon: '🛡️' }
  ]

  const cardVariants = {
    hidden: { opacity: 1, y: 24 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.45 } })
  }

  return (
    <section id="meet-the-lead-tech" className="py-24 px-6 relative bg-gradient-to-b from-transparent via-blue-950/5 to-transparent">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 1, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title mb-6">Meet Me</h2>
          <p className="section-subtitle">
            I Computer Anything is personal by design. When you hire the business, you work directly with me.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-20"
        >
          <div className="relative p-10 md:p-12 rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-blue-600/10 backdrop-blur-sm overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              style={{ backgroundSize: '200% 100%' }}
            />

            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <motion.div whileHover={{ scale: 1.05 }} className="flex-shrink-0">
                <img
                  src="/ryan-profile.jpeg"
                  alt="Ryan Davis - I Computer Anything"
                  className="w-40 h-40 md:w-48 md:h-48 rounded-2xl object-cover shadow-2xl shadow-blue-500/20 border-2 border-blue-400/40"
                />
              </motion.div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                    Ryan Davis
                  </span>
                </h3>
                <p className="text-lg text-blue-300/80 mb-6 font-medium">Founder · Developer · IT Technician</p>

                <p className="text-gray-300 leading-relaxed mb-8 text-lg">
                  I named the business I Computer Anything because that is how I approach technology: I build it, repair it, configure it, troubleshoot it, and keep learning what comes next. I bring years of hands-on field experience, networking, technical support, server work, and software development into every project. When a project grows large enough to need extra hands, I can bring in trusted help, but I remain your direct point of contact and stay accountable for the work.
                </p>

                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-3 uppercase tracking-wide">Core Specialties</p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {specialties.map((specialty, index) => (
                      <motion.span
                        key={specialty}
                        initial={{ opacity: 1, scale: 0.9 }}
                        animate={inView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.3 + index * 0.05 }}
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

        <div className="mb-20">
          <h3 className="text-2xl md:text-3xl font-bold text-blue-200/90 mb-4 text-center tracking-wide">My Experience</h3>
          <p className="text-center text-gray-400 mb-10 max-w-3xl mx-auto">Real-world positions and hands-on technical work across different environments.</p>
          <div className="mobile-horizontal-scroll grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp, index) => (
              <motion.div
                key={exp.title}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(59, 130, 246, 0.15)' }}
                className="relative p-6 rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-cyan-600/10 backdrop-blur-sm"
              >
                <div className="text-4xl mb-4">{exp.icon}</div>
                <h4 className="text-xl font-bold mb-2">{exp.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{exp.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-blue-200/90 mb-4 text-center tracking-wide">Technical Expertise</h3>
          <p className="text-center text-gray-400 mb-10 max-w-3xl mx-auto">Skills I keep developing through real projects, continuous learning, and hands-on lab work.</p>
          <div className="mobile-horizontal-scroll grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {skills.map((skill, index) => (
              <motion.div
                key={skill.title}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                whileHover={{ y: -6, boxShadow: '0 15px 35px rgba(59, 130, 246, 0.12)' }}
                className="relative p-6 rounded-xl border border-blue-500/20 bg-gradient-to-br from-dark-800/70 to-blue-950/30 backdrop-blur-sm"
              >
                <div className="text-3xl mb-3">{skill.icon}</div>
                <h4 className="text-lg font-bold mb-2">{skill.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{skill.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 1, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-300 text-lg mb-4">
            <span className="font-bold text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">One name. One point of contact. Real accountability.</span>
          </p>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">I Computer Anything is built around direct, hands-on service — not pretending there is a giant team behind the screen.</p>
        </motion.div>
      </div>
    </section>
  )
}

export default MeetTheLeadTech
