const walkers = [
  { y: 286, delay: -2.1, duration: 12.4, shirt: "#38bdf8", skin: "#7c4a2d", dir: 1, scale: 1.0 },
  { y: 300, delay: -7.8, duration: 15.1, shirt: "#a78bfa", skin: "#8b5a3c", dir: -1, scale: .9 },
  { y: 278, delay: -4.3, duration: 13.6, shirt: "#f472b6", skin: "#c6865a", dir: 1, scale: .96 },
  { y: 306, delay: -10.2, duration: 16.2, shirt: "#22c55e", skin: "#5a3825", dir: -1, scale: .86 },
  { y: 290, delay: -6.5, duration: 14.4, shirt: "#facc15", skin: "#9f6b47", dir: 1, scale: .92 },
  { y: 312, delay: -1.4, duration: 17.1, shirt: "#fb7185", skin: "#6f432d", dir: -1, scale: .82 },
  { y: 282, delay: -11.1, duration: 12.9, shirt: "#60a5fa", skin: "#d09a72", dir: 1, scale: .88 },
  { y: 300, delay: -3.7, duration: 15.8, shirt: "#34d399", skin: "#7a4d34", dir: -1, scale: .9 },
];

const cars = [
  { y: 350, delay: -1.0, duration: 10.8, body: "#ef4444", dir: 1, scale: 1.0 },
  { y: 383, delay: -5.8, duration: 13.6, body: "#3b82f6", dir: -1, scale: .93 },
  { y: 350, delay: -8.4, duration: 12.1, body: "#f59e0b", dir: 1, scale: .9 },
  { y: 383, delay: -2.8, duration: 14.9, body: "#8b5cf6", dir: -1, scale: .86 },
  { y: 350, delay: -6.9, duration: 15.3, body: "#14b8a6", dir: 1, scale: .82 },
];

function Person({ y, delay, duration, shirt, skin, dir, scale }) {
  return (
    <g className={dir === 1 ? "uc-walk uc-walk-right" : "uc-walk uc-walk-left"} style={{ "--delay": delay + "s", "--duration": duration + "s", "--y": y + "px", "--scale": scale }}>
      <g className="uc-bob">
        <circle cx="0" cy="-23" r="6.5" fill={skin} />
        <path d="M-5 -15 L5 -15 L7 7 L-7 7 Z" fill={shirt} />
        <rect x="5" y="-11" width="8" height="17" rx="2.8" fill="#f97316" />
        <rect x="7" y="-8" width="8" height="3" rx="1.5" fill="#fb923c" />
        <path d="M-3 7 L-7 23 M3 7 L8 23" stroke="#10233f" strokeWidth="4" strokeLinecap="round" />
        <path d="M-6 -10 L-13 2 M6 -10 L12 3" stroke={skin} strokeWidth="3.4" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Car({ y, delay, duration, body, dir, scale }) {
  return (
    <g className={dir === 1 ? "uc-car uc-car-right" : "uc-car uc-car-left"} style={{ "--delay": delay + "s", "--duration": duration + "s", "--y": y + "px", "--scale": scale }}>
      <g>
        <path d="M-34 -7 L-24 -21 L14 -21 L30 -7 L36 -7 L36 11 L-36 11 L-36 -5 Z" fill={body} />
        <path d="M-20 -18 L-5 -18 L-5 -8 L-28 -8 Z M0 -18 L13 -18 L25 -8 L0 -8 Z" fill="#d7efff" opacity=".9" />
        <rect x="26" y="-18" width="12" height="12" rx="2" fill="#f97316" />
        <rect x="29" y="-15" width="12" height="3" rx="1.5" fill="#fb923c" />
        <circle cx="-22" cy="11" r="7" fill="#172033" />
        <circle cx="22" cy="11" r="7" fill="#172033" />
        <circle cx="-22" cy="11" r="3" fill="#94a3b8" />
        <circle cx="22" cy="11" r="3" fill="#94a3b8" />
      </g>
    </g>
  );
}

export default function UrbanCarrierCityScene({ compact = false }) {
  return (
    <div className={compact ? "uc-city uc-city-compact" : "uc-city"} aria-label="Animated Urban Carrier city with couriers and delivery vehicles">
      <svg viewBox="0 0 800 460" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="ucSkyCard" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#72cdf6" />
            <stop offset="100%" stopColor="#dff6ff" />
          </linearGradient>
          <linearGradient id="ucRoadCard" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="800" height="460" rx="34" fill="url(#ucSkyCard)" />
        <circle cx="675" cy="76" r="38" fill="#ffd166" opacity=".95" />
        <g opacity=".72">
          <rect x="18" y="108" width="110" height="170" rx="6" fill="#6ea3c9" />
          <rect x="117" y="74" width="92" height="204" rx="6" fill="#447ea7" />
          <rect x="201" y="130" width="96" height="148" rx="6" fill="#7bb4d8" />
          <rect x="292" y="88" width="125" height="190" rx="6" fill="#346f9d" />
          <rect x="404" y="120" width="88" height="158" rx="6" fill="#72a7c8" />
          <rect x="482" y="65" width="112" height="213" rx="6" fill="#2f6d9a" />
          <rect x="583" y="105" width="95" height="173" rx="6" fill="#6fa8cf" />
          <rect x="670" y="83" width="112" height="195" rx="6" fill="#3e7fac" />
        </g>
        {[80,205,330,455,580,705].map((x)=><g key={x}><rect x={x} y="236" width="7" height="42" rx="3" fill="#7c5a3b"/><circle cx={x+3.5} cy="225" r="18" fill="#2fa568"/><circle cx={x-7} cy="230" r="11" fill="#38b878"/><circle cx={x+14} cy="231" r="10" fill="#24965c"/></g>)}
        <rect x="0" y="270" width="800" height="64" fill="#d8e8ef" />
        <rect x="0" y="334" width="800" height="92" fill="url(#ucRoadCard)" />
        <rect x="0" y="426" width="800" height="34" fill="#cbd5e1" />
        <g stroke="#f8fafc" strokeWidth="5" strokeDasharray="26 22" opacity=".9"><line x1="0" y1="366" x2="800" y2="366"/><line x1="0" y1="405" x2="800" y2="405"/></g>
        <g className="uc-route"><path d="M44 316 C180 286 238 328 350 304 S565 282 744 314" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeDasharray="10 14" opacity=".75"/><circle cx="744" cy="314" r="13" fill="#ff5a2a" stroke="#fff" strokeWidth="4"/><circle cx="744" cy="314" r="4" fill="#fff"/></g>
        {walkers.map((w,i)=><Person key={"w"+i} {...w}/>)}
        {cars.map((c,i)=><Car key={"c"+i} {...c}/>)}
      </svg>
      <style>{`
        .uc-city{position:relative;width:100%;overflow:hidden;border-radius:2rem;background:#8ed8f8;box-shadow:0 28px 75px rgba(6,26,51,.25)}
        .uc-city svg{display:block;width:100%;height:auto}.uc-city-compact{border-radius:1.6rem}
        .uc-city .uc-walk,.uc-city .uc-car{transform-box:view-box;transform-origin:center}
        .uc-walk-right{animation:ucWalkRight var(--duration) linear var(--delay) infinite}.uc-walk-left{animation:ucWalkLeft var(--duration) linear var(--delay) infinite}
        .uc-car-right{animation:ucCarRight var(--duration) linear var(--delay) infinite}.uc-car-left{animation:ucCarLeft var(--duration) linear var(--delay) infinite}
        .uc-bob{animation:ucBob .42s ease-in-out infinite alternate}.uc-route{animation:ucRoutePulse 2.8s ease-in-out infinite}
        @keyframes ucWalkRight{from{transform:translate(-70px,var(--y)) scale(var(--scale))}to{transform:translate(870px,var(--y)) scale(var(--scale))}}
        @keyframes ucWalkLeft{from{transform:translate(870px,var(--y)) scaleX(-1) scale(var(--scale))}to{transform:translate(-70px,var(--y)) scaleX(-1) scale(var(--scale))}}
        @keyframes ucCarRight{from{transform:translate(-90px,var(--y)) scale(var(--scale))}to{transform:translate(900px,var(--y)) scale(var(--scale))}}
        @keyframes ucCarLeft{from{transform:translate(900px,var(--y)) scaleX(-1) scale(var(--scale))}to{transform:translate(-90px,var(--y)) scaleX(-1) scale(var(--scale))}}
        @keyframes ucBob{from{transform:translateY(-1px) rotate(-1deg)}to{transform:translateY(1px) rotate(1deg)}}@keyframes ucRoutePulse{0%,100%{opacity:.58}50%{opacity:.95}}
        @media (prefers-reduced-motion:reduce){.uc-walk,.uc-car,.uc-bob,.uc-route{animation-play-state:paused!important}}
      `}</style>
    </div>
  );
}
