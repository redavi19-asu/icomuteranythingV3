import React from 'react'
import { motion } from 'framer-motion'

const DISPATCH_URL = 'https://redavi19-asu.github.io/icomputer-dispatch-platform/'

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
      </div>
    </section>
  )
}

export default SoftwareShowcase
