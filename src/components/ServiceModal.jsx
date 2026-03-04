import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function ServiceModal({ isOpen, service, onClose, onRequestService }) {
  const [tawkLoaded, setTawkLoaded] = useState(false)

  if (!service) return null

  const handleOpenChat = () => {
    if (!tawkLoaded) {
      // Lazy load Tawk script
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://embed.tawk.to/68c4b6410b3548192e8590fb/1j506fs5q'
      script.onload = () => {
        setTawkLoaded(true)
        // Open the widget after loading
        if (window.Tawk_API) {
          window.Tawk_API.onLoaded = () => {
            window.Tawk_API.maximize()
          }
        }
      }
      document.head.appendChild(script)
    } else {
      // Widget already loaded, just open it
      if (window.Tawk_API) {
        window.Tawk_API.maximize()
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl shadow-2xl">
              {/* Header with close button */}
              <div className="sticky top-0 flex items-start justify-between p-8 bg-gradient-to-b from-slate-900/80 to-transparent border-b border-blue-500/20 z-10">
                <div className="flex items-start gap-4 flex-1">
                  <div className="text-5xl">{service.icon}</div>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-1">{service.title}</h2>
                    <p className="text-blue-400/80 font-medium">{service.category}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-2 -mr-2 -mt-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Overview */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-blue-200 mb-3">Overview</h3>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {service.overview}
                  </p>
                </div>

                {/* What's Included */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-blue-200 mb-3">What's Included</h3>
                  <ul className="space-y-2">
                    {service.includes &&
                      service.includes.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-gray-300">
                          <span className="text-blue-400 mt-1">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Use Cases */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-blue-200 mb-3">When You Might Need This</h3>
                  <div className="space-y-2">
                    {service.useCases &&
                      service.useCases.map((useCase, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <span className="text-blue-400 font-semibold min-w-fit">→</span>
                          <span className="text-gray-300">{useCase}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-blue-500/20">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onClose()
                      onRequestService()
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30"
                  >
                    Request This Service
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleOpenChat}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-500 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-teal-600/30"
                  >
                    Live Chat
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-gray-200 font-semibold rounded-xl border border-slate-600 transition-all"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ServiceModal
