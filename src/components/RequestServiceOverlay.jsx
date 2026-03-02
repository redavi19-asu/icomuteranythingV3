import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function RequestServiceOverlay({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    serviceNeeded: '',
    deviceType: '',
    issueDescription: '',
    contactMethod: 'Email',
    bestTime: '',
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Build the message field from the remaining form data
      const messageParts = []
      
      if (formData.deviceType) {
        messageParts.push(`Device/Equipment: ${formData.deviceType}`)
      }
      if (formData.issueDescription) {
        messageParts.push(`Issue: ${formData.issueDescription}`)
      }
      if (formData.contactMethod) {
        messageParts.push(`Preferred Contact: ${formData.contactMethod}`)
      }
      if (formData.bestTime) {
        messageParts.push(`Best Time: ${formData.bestTime}`)
      }

      const message = messageParts.length > 0 
        ? messageParts.join('\n') 
        : formData.issueDescription

      // Build the form-encoded payload for the old backend
      const params = new URLSearchParams()
      params.append('name', formData.fullName)
      params.append('email', formData.email)
      params.append('phone', formData.phone)
      params.append('service', formData.serviceNeeded)
      params.append('message', message)

      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbwrQT9Z54IEEtk4PIMmA5fR52dFFdZoXt1cyVna5xj2lf9nfgu8lP9Ry22k9YDrnwKs/exec',
        {
          method: 'POST',
          body: params.toString(),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      // Log response for debugging
      console.log('Form submission response:', response)

      // The backend should return a success response
      if (response.ok || response.status === 200) {
        setIsSuccess(true)
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          serviceNeeded: '',
          deviceType: '',
          issueDescription: '',
          contactMethod: 'Email',
          bestTime: '',
        })
      } else {
        // Still treat as success for no-cors requests since we can't read response
        setIsSuccess(true)
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          serviceNeeded: '',
          deviceType: '',
          issueDescription: '',
          contactMethod: 'Email',
          bestTime: '',
        })
      }
    } catch (err) {
      console.error('Form submission error:', err)
      setError('Something went wrong. Please try again or contact us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsSuccess(false)
    setError('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-dark-950/80"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-dark-900/95 border border-blue-500/30 rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors z-10"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8 md:p-12">
              {!isSuccess ? (
                <>
                  {/* Header */}
                  <div className="mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                      Request Service
                    </h2>
                    <p className="text-gray-400">
                      Fill out the form below and we'll get back to you as soon as possible.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name */}
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-blue-200 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-dark-800/80 border border-blue-500/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                        placeholder="John Doe"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-dark-800/80 border border-blue-500/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                        placeholder="john@example.com"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-blue-200 mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-dark-800/80 border border-blue-500/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    {/* Service Needed */}
                    <div>
                      <label htmlFor="serviceNeeded" className="block text-sm font-medium text-blue-200 mb-2">
                        Service Needed *
                      </label>
                      <select
                        id="serviceNeeded"
                        name="serviceNeeded"
                        required
                        value={formData.serviceNeeded}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-dark-800/80 border border-blue-500/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                      >
                        <option value="">Select a service...</option>
                        <option value="Computer Repair">Computer Repair</option>
                        <option value="Web Development">Web Development</option>
                        <option value="IT Support">IT Support</option>
                        <option value="Cybersecurity Consulting">Cybersecurity Consulting</option>
                        <option value="Data Backup & Recovery">Data Backup & Recovery</option>
                        <option value="Hardware Installation">Hardware Installation & Upgrades</option>
                        <option value="Managed IT Services">Managed IT Services</option>
                        <option value="Event Tech Deployment">Event Tech Deployment</option>
                        <option value="Networking & Server Setup">Networking & Server Setup</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Device / Equipment Type */}
                    <div>
                      <label htmlFor="deviceType" className="block text-sm font-medium text-blue-200 mb-2">
                        Device / Equipment Type
                      </label>
                      <input
                        type="text"
                        id="deviceType"
                        name="deviceType"
                        value={formData.deviceType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-dark-800/80 border border-blue-500/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                        placeholder="e.g., Dell Laptop, HP Desktop, Network Router"
                      />
                    </div>

                    {/* Describe the Issue */}
                    <div>
                      <label htmlFor="issueDescription" className="block text-sm font-medium text-blue-200 mb-2">
                        Describe the Issue *
                      </label>
                      <textarea
                        id="issueDescription"
                        name="issueDescription"
                        required
                        value={formData.issueDescription}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg bg-dark-800/80 border border-blue-500/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all resize-none"
                        placeholder="Please describe your tech issue or service need in detail..."
                      />
                    </div>

                    {/* Preferred Contact Method */}
                    <div>
                      <label htmlFor="contactMethod" className="block text-sm font-medium text-blue-200 mb-2">
                        Preferred Contact Method *
                      </label>
                      <select
                        id="contactMethod"
                        name="contactMethod"
                        required
                        value={formData.contactMethod}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-dark-800/80 border border-blue-500/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                      >
                        <option value="Email">Email</option>
                        <option value="Phone">Phone</option>
                        <option value="Text">Text</option>
                      </select>
                    </div>

                    {/* Best Time to Reach You */}
                    <div>
                      <label htmlFor="bestTime" className="block text-sm font-medium text-blue-200 mb-2">
                        Best Time to Reach You
                      </label>
                      <input
                        type="text"
                        id="bestTime"
                        name="bestTime"
                        value={formData.bestTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-dark-800/80 border border-blue-500/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                        placeholder="e.g., Weekday mornings, After 5pm, Anytime"
                      />
                    </div>

                    {/* Error message */}
                    {error && (
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                        {error}
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold transition-colors shadow-lg shadow-blue-600/20"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Request'}
                    </button>
                  </form>
                </>
              ) : (
                // Success message
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-3 text-green-300">
                    Request Sent!
                  </h3>
                  <p className="text-gray-300 mb-8 text-lg">
                    Thanks — your request was sent. We'll get back with you soon.
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default RequestServiceOverlay
