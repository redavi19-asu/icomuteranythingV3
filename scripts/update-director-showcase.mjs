import fs from 'node:fs'

const path = 'src/components/sections/SoftwareShowcase.jsx'
const source = fs.readFileSync(path, 'utf8')

const startNeedle = `        <div className="text-center max-w-3xl mx-auto mt-24 mb-14">\n          <p className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-4">Live Production SaaS</p>\n          <h2 className="section-title mb-3">Urban Director Studio</h2>`
const endNeedle = `        <motion.div\n          id="software-pricing"`

const start = source.indexOf(startNeedle)
const end = source.indexOf(endNeedle, start)

if (start < 0 || end < 0) {
  throw new Error('Could not locate the Urban Director Studio showcase block.')
}

const replacement = `        <div className="text-center max-w-4xl mx-auto mt-24 mb-14">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-4">Live Production + AI Media SaaS</p>
          <h2 className="section-title mb-3">Urban Director Studio</h2>
          <p className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-amber-300 mb-6">
            Multi-Camera Director • AI Studio • Replay • Editing • Broadcast
          </p>
          <p className="section-subtitle">
            A cloud-connected production studio for phones, tablets, computers, capture devices, external audio, live switching,
            recording, replay, graphics, editing, broadcasting, and AI-generated media — all coordinated from one Director console.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-stone-950 via-zinc-950 to-amber-950/25 p-8 md:p-12 shadow-2xl shadow-black/30"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.13),transparent_34%),radial-gradient(circle_at_82%_82%,rgba(255,255,255,0.06),transparent_34%)] pointer-events-none" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
            <div>
              <div className="inline-flex px-3 py-1 rounded-full border border-amber-300/25 bg-amber-300/10 text-xs font-semibold text-amber-100 mb-5">
                ICA SaaS • Live Production + AI Studio
              </div>
              <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
                Run the production, create the media, and control the broadcast from one studio.
              </h3>
              <p className="text-amber-200 font-semibold tracking-wide mb-5">
                Director → Wireless Cameras → Preview → Program → Replay / Edit / AI
              </p>
              <p className="text-gray-300 leading-relaxed text-lg max-w-2xl">
                Urban Director Studio gives one authorized Director a full production control room while camera operators join from compatible phones and tablets through secure camera links and QR workflows. Monitor sources in multiview, prepare Preview, switch Program, communicate with the crew, manage production audio, trigger graphics, record, build instant replays, edit media, control broadcast destinations, and create AI photos and short cinematic video from inside the same product.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  'Director Console',
                  'Wireless Phone + Tablet Cameras',
                  'QR / Secure Camera Join',
                  'Preview + Program Switching',
                  'Multiview',
                  'Crew Messaging',
                  'Walkie-Talkie Intercom',
                  'External Audio + Capture Devices',
                  'Master Audio',
                  'Graphics + Overlays',
                  'Program + ISO Recording',
                  'Instant Replay',
                  'Director Edit',
                  'Broadcast Destinations',
                  'Dedicated Live Viewer',
                  'AI Studio',
                  'AI Photo Templates',
                  '5-Second AI Motion',
                  '8-Second AI Movie Scenes + Audio',
                  'Save Generated Media',
                  'Account Login',
                ].map((item) => (
                  <span key={item} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <a
                  href={SCENEPILOT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex justify-center items-center px-7 py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold transition-all shadow-lg shadow-amber-950/20"
                >
                  Open Urban Director Studio
                </a>
                <span className="inline-flex justify-center items-center px-7 py-4 rounded-xl border border-white/10 bg-white/5 text-gray-300 font-semibold">
                  App Store + Play Store Release Prep
                </span>
              </div>

              <div className="mt-5 rounded-xl border border-fuchsia-400/15 bg-fuchsia-400/[0.05] p-4 max-w-2xl">
                <p className="text-[10px] uppercase tracking-[0.16em] text-fuchsia-200 mb-2">Director AI Studio</p>
                <p className="m-0 text-sm leading-relaxed text-gray-300">
                  Choose a creative template, add your photos, generate premium AI media, preview the result, save it, or send it into Director Edit. Generator/model routing stays automatic behind the scenes so the customer only chooses what they want to create.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/45 p-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  <span>Urban Director Studio Director</span>
                  <span className="text-amber-200">Room Online</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="aspect-video rounded-xl border border-white/10 bg-gradient-to-br from-zinc-800 to-black flex flex-col items-center justify-center">
                    <span className="text-[10px] tracking-[0.18em] text-gray-500">PREVIEW</span>
                    <strong className="mt-2 text-lg">CAM 07</strong>
                  </div>
                  <div className="aspect-video rounded-xl border border-amber-300/20 bg-gradient-to-br from-amber-950/40 to-black flex flex-col items-center justify-center">
                    <span className="text-[10px] tracking-[0.18em] text-amber-300">PROGRAM</span>
                    <strong className="mt-2 text-lg">LIVE</strong>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((camera) => (
                    <div key={camera} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-[10px] font-semibold tracking-[0.12em] text-gray-400">
                      CAM {String(camera).padStart(2, '0')}
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {['MASTER AUDIO', 'REPLAY', 'GRAPHICS', 'BROADCAST'].map((tool) => (
                    <div key={tool} className="rounded-lg border border-amber-300/10 bg-amber-300/[0.04] px-2 py-3 text-center text-[9px] font-bold tracking-[0.1em] text-amber-100">
                      {tool}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-950/30 via-black/60 to-indigo-950/30 p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  <span>AI Studio</span>
                  <span className="text-fuchsia-200">Create → Preview → Save / Edit</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ['AI PHOTOS', 'Template-based stills'],
                    ['5S MOTION', 'Cinematic AI video'],
                    ['8S MOVIE', 'Premium scene + audio'],
                    ['SAVE / EDIT', 'Keep it or send to Director Edit'],
                  ].map(([title, description]) => (
                    <div key={title} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <strong className="block text-xs text-white">{title}</strong>
                      <span className="mt-1 block text-[10px] leading-relaxed text-gray-500">{description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
`

const updated = source.slice(0, start) + replacement + source.slice(end)
fs.writeFileSync(path, updated)
console.log('Urban Director Studio showcase updated.')
