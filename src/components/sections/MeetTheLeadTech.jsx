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

                <div className="mb-8 rounded-2xl border border-cyan-400/25 bg-blue-500/10 p-5">
                  <p className="text-sm font-semibold text-blue-300 mb-2 uppercase tracking-wide">Credentials</p>
                  <h4 className="text-lg font-semibold text-cyan-200">Upwork Partner Certified</h4>
                  <p className="mt-2 text-sm text-gray-300 leading-relaxed">Partner Certified credential displayed on my Upwork profile.</p>
                  <a
                    href="https://www.upwork.com/freelancers/~018a17f051b80f4907"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex rounded text-sm font-medium text-blue-200 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                  >
                    View my Upwork profile <span className="sr-only">(opens in a new tab)</span><span aria-hidden="true" className="ml-1">↗</span>
                  </a>

                  <div className="mt-5 border-t border-cyan-400/20 pt-5">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <img
                        src="data:image/png;base64,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"
                        alt="Coding for Web certification icon"
                        className="h-14 w-14 shrink-0 rounded-full object-cover shadow-lg shadow-violet-500/20"
                      />

                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg font-semibold text-cyan-200">Coding for Web</h4>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-md border border-cyan-300/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200">Front-End Development</span>
                          <span className="rounded-md border border-cyan-300/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200">Web Development</span>
                          <span className="rounded-md border border-cyan-300/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200">Web Design</span>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-gray-300">
                          <p><span className="font-semibold text-gray-200">Provider:</span> Podium</p>
                          <p><span className="font-semibold text-gray-200">Issued:</span> January 2025</p>
                        </div>

                        <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                          The Global Career Accelerator (GCA) is a one-semester program that embeds real employer projects and career preparation into a student’s academic term. Web Development students complete work with major companies like Intel, L’Oreal, and Airbnb, and master skills across coding in HTML, CSS, and JavaScript, UI/UX, and app development, as well as AI and Intercultural Competency. Students complete the program with portfolio-ready work and resume-worthy real-world experience while they are still enrolled in college.
                        </p>

                        <a
                          href="https://www.upwork.com/freelancers/~018a17f051b80f4907"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex rounded text-sm font-medium text-blue-200 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                        >
                          View certification on Upwork <span className="sr-only">(opens in a new tab)</span><span aria-hidden="true" className="ml-1">↗</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

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
