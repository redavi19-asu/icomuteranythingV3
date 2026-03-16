import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function Footer() {
  const currentYear = new Date().getFullYear()
  const [openModal, setOpenModal] = useState(null) // 'privacy' or 'terms'

  const handleScrollToService = (serviceName) => {
    const section = document.getElementById('what-we-do')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleAboutUs = () => {
    const section = document.getElementById('meet-the-lead-tech')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleContact = () => {
    // Find and trigger the Request Service overlay
    const element = document.getElementById('request-service')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      const btn = element.querySelector('button')
      if (btn) btn.click()
    }
  }

  const footerLinks = [
    {
      title: 'Services',
      links: [
        { label: 'Computer Repair', action: () => handleScrollToService('Computer Repair') },
        { label: 'Full Stack Development', action: () => handleScrollToService('Full Stack Development') },
        { label: 'IT Support', action: () => handleScrollToService('IT Support') }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', action: handleAboutUs },
        { label: 'Contact', action: handleContact }
      ]
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', action: () => setOpenModal('privacy') },
        { label: 'Terms of Service', action: () => setOpenModal('terms') },
        { label: 'Cookie Settings', action: () => setOpenModal('cookie') }
      ]
    },
  ];

  return (
    <footer className="relative px-6 py-16 border-t border-gray-800/50 bg-gradient-to-b from-dark-950 to-dark-900">
      <div className="max-w-6xl mx-auto">
        {/* Main footer content */}
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-4">
              ICA
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Premium tech solutions for everyone.
            </p>
          </motion.div>

          {/* Links */}
          {footerLinks.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
            >
              <h4 className="font-semibold mb-4 text-white">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, i) => (
                  <li key={i}>
                    <button
                      onClick={link.action}
                      className="text-gray-500 hover:text-blue-400 transition-colors text-sm text-left cursor-pointer font-normal"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800/50 mb-8" />

        {/* Bottom section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-sm text-gray-500 text-center"
        >
          <p>© {currentYear} I Computer Anything. All rights reserved.</p>
        </motion.div>

        {/* Cookie Preferences Modal */}
        <AnimatePresence>
          {openModal === 'cookie' && (
            <>
              <CookiePreferencesModal
                initialPrefs={{ essential: true, analytics: false, marketing: false }}
                onSave={() => setOpenModal(null)}
                onCancel={() => setOpenModal(null)}
              />
            </>
          )}
        </AnimatePresence>
        {/* Privacy Policy Modal */}
        <AnimatePresence>
          {openModal === 'privacy' && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpenModal(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-50 flex items-center justify-center px-4"
              >
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl shadow-2xl">
                  <div className="sticky top-0 flex items-center justify-between p-8 bg-gradient-to-b from-slate-900/80 to-transparent border-b border-blue-500/20 z-10">
                    <h2 className="text-3xl font-bold text-white">Privacy Policy</h2>
                    <button
                      onClick={() => setOpenModal(null)}
                      className="text-gray-400 hover:text-white transition-colors p-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-8 space-y-6 text-gray-300">
                    <div>
                      <h3 className="text-xl font-bold text-blue-200 mb-2">Information We Collect</h3>
                      <p>
                        When you submit a service request through our website, we collect information such as your name, email address, phone number, and details about your technology needs. This information is provided voluntarily by you.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-200 mb-2">How We Use Your Information</h3>
                      <p>
                        We use the information you provide to respond to your service inquiries, prepare quotes, schedule appointments, and communicate about your service needs. Your information helps us deliver better technical support and understand your requirements.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-200 mb-2">Your Privacy</h3>
                      <p>
                        We are committed to protecting your privacy. Your personal information is never sold, shared, or distributed to third parties. We maintain appropriate security measures to protect your data.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-200 mb-2">Contact Us</h3>
                      <p>
                        If you have any questions about our privacy practices or how we handle your information, please don't hesitate to contact us through the contact form on our website.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Terms of Service Modal */}
        <AnimatePresence>
          {openModal === 'terms' && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpenModal(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-50 flex items-center justify-center px-4"
              >
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl shadow-2xl">
                  <div className="sticky top-0 flex items-center justify-between p-8 bg-gradient-to-b from-slate-900/80 to-transparent border-b border-blue-500/20 z-10">
                    <h2 className="text-3xl font-bold text-white">Terms of Service</h2>
                    <button
                      onClick={() => setOpenModal(null)}
                      className="text-gray-400 hover:text-white transition-colors p-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-8 space-y-6 text-gray-300">
                    <div>
                      <h3 className="text-xl font-bold text-blue-200 mb-2">Service Availability</h3>
                      <p>
                        We strive to provide the best technical services possible. However, service availability and response times may vary based on current demand, service complexity, and other factors. We do our best to accommodate your needs within reasonable timeframes.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-200 mb-2">Quotes and Pricing</h3>
                      <p>
                        Any quotes provided are estimates based on the information available at the time of your request. Final quotes may vary depending on the actual issue diagnosed, the work required, and parts or materials needed. We will communicate any changes before proceeding.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-200 mb-2">Service Requests</h3>
                      <p>
                        Submitting a service request does not guarantee immediate service. Scheduling depends on our availability and your preferred timeline. Emergency services may be available on a case-by-case basis.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-200 mb-2">Final Work and Pricing</h3>
                      <p>
                        The final scope of work and pricing may depend on the diagnosis of your specific issue. We will provide detailed information about work to be performed and associated costs before finalizing services.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-200 mb-2">Agreement to Terms</h3>
                      <p>
                        By using this website and submitting service requests, you agree to the terms outlined in this document. We reserve the right to update these terms at any time.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </footer>
  )
}

export default Footer
