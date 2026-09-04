import React from 'react'
import { motion } from 'framer-motion'

const DISPATCH_URL = 'https://redavi19-asu.github.io/icomputer-dispatch-platform/'
const ICA_UNIFIED_URL = 'https://github.com/redavi19-asu/ICA-unified-'

function SoftwareShowcase() {
  return (
    <section id="software" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-300 mb-4">Software by I Computer Anything</p>
          <h2 className="section-title mb-3">DispatchOS</h2>
          <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-cyan-300 mb-6">
            Business • Driver • Customer Logistics Software
          </p>
          <p className="section-subtitle">
            One connected logistics platform that links the business, the people in the field,
            and the customer from booking through completion.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl border border-blue-400/30 bg-gradient-to-br from-blue-950/85 via-slate-950/90 to-black/90 p-8 md:p-12 shadow-2xl shadow-blue-950/30"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.22),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.12),transparent_35%)] pointer-events-none" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <div className="inline-flex px-3 py-1 rounded-full border border-blue-400/30 bg-blue-500/10 text-xs font-semibold text-blue-200 mb-5">
                Flagship Logistics Software
              </div>
              <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">Run the whole job from one command system.</h3>
              <p className="text-cyan-300 font-semibold tracking-wide mb-5">Business → Driver → Customer</p>
              <p className="text-gray-300 leading-relaxed text-lg max-w-2xl">
                DispatchOS acts as the middle layer between your company, your drivers or field team,
                and your customers — receiving jobs, assigning work, managing field progress, and keeping the customer informed in one connected system.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {['Business Workspace', 'Booking', 'Dispatch', 'Driver App', 'Customer Updates', 'Billing'].map((item) => (
                  <span key={item} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <a
                  href={DISPATCH_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex justify-center items-center px-7 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-900/30"
                >
                  View DispatchOS
                </a>
                <a
                  href={`${DISPATCH_URL}plans`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex justify-center items-center px-7 py-4 rounded-xl border border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-100 font-semibold transition-all"
                >
                  Plans & Subscription
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                ['01', 'Customer requests'],
                ['02', 'Business dispatches'],
                ['03', 'Driver completes'],
                ['04', 'Customer stays updated'],
              ].map(([number, label]) => (
                <div key={number} className="min-h-32 rounded-2xl border border-white/10 bg-black/25 p-5 flex flex-col justify-between">
                  <span className="text-blue-300 text-sm font-mono">{number}</span>
                  <span className="text-white font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="text-center max-w-3xl mx-auto mt-24 mb-14">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300 mb-4">Business Management Software</p>
          <h2 className="section-title mb-3">ICA Unified</h2>
          <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-emerald-300 mb-6">
            LMS + AMS Business Management Platform
          </p>
          <p className="section-subtitle">
            One company workspace for learning, people, credentials, documents, compliance, and reporting — built to replace the maze of disconnected business systems.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-slate-950 via-black to-emerald-950/40 p-8 md:p-12 shadow-2xl shadow-emerald-950/20"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.15),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(34,211,238,0.09),transparent_32%)] pointer-events-none" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div>
              <div className="inline-flex px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-xs font-semibold text-emerald-200 mb-5">
                Unified Learning + Business Operations
              </div>
              <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">Stop making people hunt through five different systems.</h3>
              <p className="text-emerald-300 font-semibold tracking-wide mb-5">Learning → People → Credentials → Documents → Reports</p>
              <p className="text-gray-300 leading-relaxed text-lg max-w-2xl">
                ICA Unified gives each company its own secure workspace, then gives employees, managers, administrators, and platform staff the right view for the job they actually need to do.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {['Learning', 'People', 'Credentials', 'Documents', 'Compliance', 'Reports', 'Super Admin'].map((item) => (
                  <span key={item} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <a
                  href={ICA_UNIFIED_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex justify-center items-center px-7 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-950/30"
                >
                  View ICA Unified
                </a>
                <span className="inline-flex justify-center items-center px-7 py-4 rounded-xl border border-emerald-400/20 bg-emerald-500/5 text-emerald-100 font-semibold">
                  Server Preview Coming Next
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 md:p-5 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-300">ICA Unified</p>
                  <p className="text-white font-bold text-lg">Company Workspace</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">ACTIVE</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Learning', 'Courses + progress'],
                  ['People', 'Roles + onboarding'],
                  ['Credentials', 'Issue + verify'],
                  ['Documents', 'Acknowledge + track'],
                  ['Reports', 'Compliance snapshot'],
                  ['Platform', 'Super Admin control'],
                ].map(([title, label]) => (
                  <div key={title} className="min-h-24 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <span className="block text-emerald-300 text-xs font-mono mb-3">{title}</span>
                    <span className="block text-white text-sm font-semibold">{label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-xs text-gray-300">Multi-company tenant isolation</span>
                <span className="text-xs text-emerald-300">SYSTEM READY</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default SoftwareShowcase
