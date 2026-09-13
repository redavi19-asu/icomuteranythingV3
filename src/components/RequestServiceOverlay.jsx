import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SERVICES = ['Custom Software Development','Website / SaaS Development','Live Production + Redundant Connectivity','IT Support','Networking & Server Setup','Cybersecurity & Backup','Hardware Installation & Upgrades','Managed IT Services','Other Technology Request']
const SOFTWARE_OPTIONS = ['Customer-facing app','Internal dashboard','Mobile app','Desktop app','Automation / AI','Accounts & login','Payments','API integration']
const PRODUCTION_OPTIONS = ['Multi-camera production','Live switching','Graphics / lower thirds','Recording & replay','Venue internet','Starlink backup','Cellular backup','Peplink / failover']
const IT_OPTIONS = ['Diagnostics / repair','Wi-Fi / networking','Server / cloud','Security review','Backup / recovery','Hardware setup','Ongoing support','On-site service']
const TIMELINES = ['Urgent / ASAP','Within 2 weeks','Within 30 days','1–3 months','Planning ahead']
const BUDGETS = ['Not sure yet','Under $3,500','$3,500–$7,500','$7,500–$15,000','$15,000–$30,000','$30,000+']

const emptyForm = (service = '') => ({ fullName:'', email:'', phone:'', company:'', serviceNeeded:service, projectOptions:[], currentSetup:'', issueDescription:'', timeline:'', budget:'', contactMethod:'Email', bestTime:'' })

function ChoiceButton({ selected, onClick, children }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${selected ? 'border-cyan-300/70 bg-cyan-400/15 text-cyan-100 shadow-md shadow-cyan-950/30' : 'border-white/10 bg-white/[0.035] text-gray-300 hover:border-blue-400/40 hover:bg-blue-500/10'}`}><span className="mr-2 text-cyan-300" aria-hidden="true">{selected ? '✓' : '+'}</span>{children}</button>
}

function RequestServiceOverlay({ isOpen, initialService = '', onClose }) {
  const [formData, setFormData] = useState(() => emptyForm(initialService))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined
    setFormData(emptyForm(initialService)); setIsSuccess(false); setError('')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape) }
  }, [isOpen, initialService])

  const optionSet = useMemo(() => {
    if (formData.serviceNeeded.includes('Software') || formData.serviceNeeded.includes('Website')) return SOFTWARE_OPTIONS
    if (formData.serviceNeeded.includes('Production')) return PRODUCTION_OPTIONS
    return IT_OPTIONS
  }, [formData.serviceNeeded])

  const setField = (name, value) => setFormData((current) => ({ ...current, [name]: value }))
  const toggleOption = (option) => setFormData((current) => ({ ...current, projectOptions: current.projectOptions.includes(option) ? current.projectOptions.filter((item) => item !== option) : [...current.projectOptions, option] }))

  const handleSubmit = async (event) => {
    event.preventDefault(); setIsSubmitting(true); setError('')
    const message = [
      formData.company && `Company / Organization: ${formData.company}`,
      formData.projectOptions.length && `Requested capabilities: ${formData.projectOptions.join(', ')}`,
      formData.currentSetup && `Current setup / environment: ${formData.currentSetup}`,
      formData.timeline && `Timeline: ${formData.timeline}`,
      formData.budget && `Planning budget: ${formData.budget}`,
      formData.contactMethod && `Preferred contact: ${formData.contactMethod}`,
      formData.bestTime && `Best time: ${formData.bestTime}`,
      `Project details: ${formData.issueDescription}`,
    ].filter(Boolean).join('\n')
    const params = new URLSearchParams({ name:formData.fullName, email:formData.email, phone:formData.phone, service:formData.serviceNeeded, message })
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbwrQT9Z54IEEtk4PIMmA5fR52dFFdZoXt1cyVna5xj2lf9nfgu8lP9Ry22k9YDrnwKs/exec', { method:'POST', body:params.toString(), headers:{'Content-Type':'application/x-www-form-urlencoded'} })
      if (!response.ok) throw new Error('The request could not be sent.')
      setIsSuccess(true)
    } catch (err) { console.error('Form submission error:', err); setError('Something went wrong. Please try again or email ryanedavis@gmail.com.') }
    finally { setIsSubmitting(false) }
  }

  const fieldClass = 'mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-normal text-white outline-none focus:border-cyan-400'

  return <AnimatePresence>{isOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[200] flex items-center justify-center bg-dark-950/85 p-3 backdrop-blur-md md:p-6" onClick={onClose}>
    <motion.div initial={{opacity:0,scale:.96,y:18}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96,y:18}} role="dialog" aria-modal="true" aria-labelledby="request-service-title" className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 shadow-2xl shadow-black/70" onClick={(event)=>event.stopPropagation()}>
      <button type="button" onClick={onClose} aria-label="Close request form" className="sticky top-4 z-20 float-right mr-4 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-slate-950/90 text-xl text-gray-200 hover:border-cyan-300/50 hover:text-white">×</button>
      <div className="p-6 pt-8 md:p-10">{!isSuccess ? <>
        <div className="mb-8 max-w-3xl"><p className="mb-3 text-xs font-black uppercase tracking-[.22em] text-cyan-300">ICA Project Intake</p><h2 id="request-service-title" className="mb-3 text-3xl font-black tracking-tight text-white md:text-5xl">Let’s scope the right solution.</h2><p className="text-base leading-7 text-gray-300">Choose what applies. You do not need to know every technical detail—I’ll use your answers to prepare the right questions and next steps.</p></div>
        <form onSubmit={handleSubmit} className="space-y-8">
          <fieldset><legend className="mb-3 text-sm font-bold text-blue-100">1. What do you need? *</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{SERVICES.map((service)=><ChoiceButton key={service} selected={formData.serviceNeeded===service} onClick={()=>setFormData((current)=>({...current,serviceNeeded:service,projectOptions:[]}))}>{service}</ChoiceButton>)}</div></fieldset>
          {formData.serviceNeeded && <fieldset><legend className="mb-1 text-sm font-bold text-blue-100">2. What should be included?</legend><p className="mb-3 text-xs text-gray-400">Choose as many as you need.</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{optionSet.map((option)=><ChoiceButton key={option} selected={formData.projectOptions.includes(option)} onClick={()=>toggleOption(option)}>{option}</ChoiceButton>)}</div></fieldset>}
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-bold text-blue-100">Full name *<input required value={formData.fullName} onChange={(e)=>setField('fullName',e.target.value)} className={fieldClass} placeholder="Your name" /></label>
            <label className="text-sm font-bold text-blue-100">Company / organization<input value={formData.company} onChange={(e)=>setField('company',e.target.value)} className={fieldClass} placeholder="Business or organization name" /></label>
            <label className="text-sm font-bold text-blue-100">Email *<input required type="email" value={formData.email} onChange={(e)=>setField('email',e.target.value)} className={fieldClass} placeholder="you@example.com" /></label>
            <label className="text-sm font-bold text-blue-100">Phone<input type="tel" value={formData.phone} onChange={(e)=>setField('phone',e.target.value)} className={fieldClass} placeholder="Best callback number" /></label>
          </div>
          <label className="block text-sm font-bold text-blue-100">Current setup or environment<input value={formData.currentSetup} onChange={(e)=>setField('currentSetup',e.target.value)} className={fieldClass} placeholder="Existing website/app, venue, devices, network, software, or equipment" /></label>
          <div className="grid gap-7 lg:grid-cols-2">
            <fieldset><legend className="mb-3 text-sm font-bold text-blue-100">3. Target timeline</legend><div className="grid gap-2 sm:grid-cols-2">{TIMELINES.map((item)=><ChoiceButton key={item} selected={formData.timeline===item} onClick={()=>setField('timeline',item)}>{item}</ChoiceButton>)}</div></fieldset>
            <fieldset><legend className="mb-3 text-sm font-bold text-blue-100">4. Planning budget</legend><div className="grid gap-2 sm:grid-cols-2">{BUDGETS.map((item)=><ChoiceButton key={item} selected={formData.budget===item} onClick={()=>setField('budget',item)}>{item}</ChoiceButton>)}</div></fieldset>
          </div>
          <label className="block text-sm font-bold text-blue-100">Project details *<textarea required rows={5} value={formData.issueDescription} onChange={(e)=>setField('issueDescription',e.target.value)} className={`${fieldClass} resize-y`} placeholder="Tell me the goal, what is happening now, who will use it, location or event date if relevant, and what success should look like." /></label>
          <fieldset><legend className="mb-3 text-sm font-bold text-blue-100">5. Best way to follow up</legend><div className="grid gap-2 sm:grid-cols-3">{['Email','Phone call','Text message'].map((item)=><ChoiceButton key={item} selected={formData.contactMethod===item} onClick={()=>setField('contactMethod',item)}>{item}</ChoiceButton>)}</div></fieldset>
          <label className="block text-sm font-bold text-blue-100">Best day or time to reach you<input value={formData.bestTime} onChange={(e)=>setField('bestTime',e.target.value)} className={fieldClass} placeholder="Example: Weekdays after 5 PM" /></label>
          {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
          <button type="submit" disabled={isSubmitting || !formData.serviceNeeded} className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 px-8 py-4 text-base font-black text-white shadow-lg shadow-blue-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting?'Sending request…':'Send Detailed Request →'}</button>
          <p className="text-center text-xs leading-5 text-gray-500">No payment is collected here. I’ll review the request and contact you about scope, availability, and next steps.</p>
        </form>
      </> : <div className="py-16 text-center"><div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border-2 border-emerald-400/50 bg-emerald-400/10 text-4xl text-emerald-300">✓</div><h3 className="mb-3 text-3xl font-black text-white">Detailed request sent.</h3><p className="mx-auto mb-8 max-w-xl text-lg text-gray-300">Thank you. I have the technical details needed to review your request and follow up with the right next steps.</p><button type="button" onClick={onClose} className="rounded-xl bg-blue-600 px-8 py-3 font-bold text-white hover:bg-blue-500">Close</button></div>}</div>
    </motion.div>
  </motion.div>}</AnimatePresence>
}

export default RequestServiceOverlay
