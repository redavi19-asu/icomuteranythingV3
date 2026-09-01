import { useMemo, useState } from "react";

const brandColors = {
  "fa-google": "#4285F4",
  "fa-amazon": "#FF9900",
  "fa-meta": "#0866FF",
  "fa-x-twitter": "#FFFFFF",
  "fa-github": "#c9d1d9",
  "fa-gitlab": "#FC6D26",
  "fa-bitbucket": "#0052CC",
  "fa-git": "#F05032",
  "fa-docker": "#0db7ed",
  "fa-jenkins": "#D24939",
  "fa-react": "#61DAFB",
  "fa-angular": "#DD0031",
  "fa-vuejs": "#41B883",
  "fa-node": "#339933",
  "fa-python": "#3776AB",
  "fa-java": "#5382A1",
  "fa-php": "#777BB4",
  "fa-rust": "#DEA584",
  "fa-golang": "#00ADD8",
  "fa-js": "#F7DF1E",
  "fa-stripe": "#635BFF",
  "fa-paypal": "#003087",
  "fa-venmo": "#3D95CE",
  "fa-apple-pay": "#FFFFFF",
  "fa-google-pay": "#5F6368",
  "fa-spotify": "#1DB954",
  "fa-youtube": "#FF0000",
  "fa-instagram": "#E4405F",
  "fa-tiktok": "#EE1D52",
  "fa-uber": "#FFFFFF",
  "fa-linkedin": "#0A66C2",
  "fa-pinterest": "#BD081C",
  "fa-reddit": "#FF4500",
  "fa-ebay": "#E53238",
  "fa-shopify": "#95BF47",
  "fa-snapchat": "#FFFC00",
  "fa-slack": "#4A154B",
  "fa-salesforce": "#00A1E0",
  "fa-aws": "#FF9900",
  "fa-raspberry-pi": "#C51A4A",
  "fa-ethereum": "#8C8C8C",
  "fa-bitcoin": "#F7931A",
  "fa-discord": "#5865F2",
  "fa-dribbble": "#EA4C89",
  "fa-stack-overflow": "#F48024",
  "fa-android": "#3DDC84",
  "fa-firefox": "#FF7139",
  "fa-chrome": "#4285F4",
  "fa-edge": "#0078D7",
  "fa-vimeo": "#1AB7EA",
  "fa-dropbox": "#0061FF",
  "fa-skype": "#00AFF0",
  "fa-telegram": "#229ED9",
  "fa-weixin": "#07C160",
  "fa-whatsapp": "#25D366",
  "fa-yahoo": "#6001D2",
  "fa-tumblr": "#36465D",
  "fa-medium": "#00ab6c",
  "fa-quora": "#B92B27",
  "fa-wordpress": "#21759B",
  "fa-joomla": "#5091CD",
  "fa-drupal": "#0678BE",
  "fa-magento": "#EE672F",
  "fa-prestashop": "#DF0067",
  "fa-waze": "#33CCFF",
  "fa-signal": "#3A76F0",
  "fa-viber": "#7360F2",
  "fa-twitch": "#9146FF",
  "fa-steam": "#C5C3C0",
  "fa-soundcloud": "#FF5500",
  "fa-mastodon": "#3088D4",
  "fa-creative-commons": "#EF9421",
  "fa-osi": "#3DA639",
  "fa-free-code-camp": "#4CAF50",
  "fa-hackerrank": "#00EA64",
  "fa-codepen": "#FFFFFF",
  "fa-network-wired": "#1BA0D7",
  "fa-cloud": "#0080FF",
  "fa-shield": "#6d4aff",
  "fa-bolt": "#FF282D",
  "fa-hashtag": "#FFFFFF",
  "fa-database": "#4DB33D",
  "fa-search": "#005571",
  "fa-envelope": "#FF6C37",
  "fa-figma": "#F24E1E",
  "fa-notion": "#FFFFFF",
  "fa-trello": "#0079BF",
  "fa-bug": "#FB4226",
  "fa-chart-line": "#0A7C86",
  "fa-user-lock": "#EB5424",
  "fa-chart-simple": "#5850EC",
  "fa-rocket": "#46E3B7",
  "fa-train": "#8A63D2",
  "fa-plane": "#8B5CF6",
  "fa-film": "#ffb347",
};

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <circle cx="12" cy="7.5" r="4.2" fill="#111" />
      <ellipse cx="12" cy="8.3" rx="2.6" ry="2.2" fill="#fff" />
      <circle cx="11" cy="7.8" r="0.45" fill="#111" />
      <circle cx="13" cy="7.8" r="0.45" fill="#111" />
      <polygon points="12,8.9 10.9,10 13.1,10" fill="#FCC624" />
      <ellipse cx="12" cy="14.2" rx="6" ry="7.2" fill="#111" />
      <ellipse cx="12" cy="15.3" rx="4.2" ry="5.2" fill="#fff" />
      <ellipse cx="9.2" cy="20.1" rx="2.1" ry="1.1" fill="#FCC624" />
      <ellipse cx="14.8" cy="20.1" rx="2.1" ry="1.1" fill="#FCC624" />
    </svg>
  );
}

function BadgeIcon({ bg, children, stroke }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill={bg} />
      {stroke ? <ellipse cx="12" cy="12" rx="6.6" ry="4" fill="none" stroke="#fff" strokeWidth="2.1" /> : children}
    </svg>
  );
}

function SpecialIcon({ type }) {
  if (type === "microsoft" || type === "windows") return <MicrosoftIcon />;
  if (type === "linux") return <LinuxIcon />;
  if (type === "ibm") return <BadgeIcon bg="#0B1B4D"><g fill="#3A8DFF">{[6,8.4,10.8,13.2,15.6,18].map((y) => <rect key={y} x="5" y={y} width="14" height="1.2" />)}</g></BadgeIcon>;
  if (type === "intel") return <BadgeIcon bg="#0071C5"><><rect x="11" y="6" width="2" height="8" rx="1" fill="#fff"/><circle cx="12" cy="5" r="1" fill="#fff"/><rect x="7" y="15" width="10" height="2.4" rx="1.2" fill="#fff"/></></BadgeIcon>;
  if (type === "amd") return <BadgeIcon bg="#30B767"><path fill="#fff" d="M6.4 17l3-8h1.6l3 8h-1.8l-.6-1.6H8.8L8.2 17H6.4Zm3-3h2.4l-1.2-3.4L9.4 14Z"/></BadgeIcon>;
  if (type === "oracle") return <BadgeIcon bg="#F80000" stroke />;
  if (type === "dell") return <BadgeIcon bg="#007DB8"><><circle cx="12" cy="12" r="7.2" fill="none" stroke="#fff" strokeWidth="1.6"/><text x="12" y="14.5" textAnchor="middle" fontSize="5.6" fontWeight="700" fill="#fff">DELL</text></></BadgeIcon>;
  if (type === "hp") return <BadgeIcon bg="#0096D6"><text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">hp</text></BadgeIcon>;
  if (type === "zoom") return <BadgeIcon bg="#2D8CFF"><><rect x="5" y="7.2" width="9.2" height="9.6" rx="2" fill="#fff"/><path fill="#fff" d="M14.8 9.2L19 11.6v2.8l-4.2 2.4v-7.6z"/></></BadgeIcon>;
  if (type === "kubernetes") return <BadgeIcon bg="#326CE5"><><circle cx="12" cy="12" r="6" fill="none" stroke="#fff" strokeWidth="1.6"/><circle cx="12" cy="12" r="2.4" fill="#fff"/></></BadgeIcon>;
  return null;
}

function renderIcon(item) {
  if (item.special) return <SpecialIcon type={item.special} />;
  const colorKey = Object.keys(brandColors).find((key) => item.icon?.includes(key));
  return <i className={item.icon} style={{ color: colorKey ? brandColors[colorKey] : "#8bd5ff" }} aria-hidden="true" />;
}

export default function InlineTechTicker({ height = 96, speed = 72 }) {
  const [paused, setPaused] = useState(false);

  const items = useMemo(() => [
    { label: "Microsoft", special: "microsoft" },
    { label: "Google", icon: "fa-brands fa-google" },
    { label: "Amazon", icon: "fa-brands fa-amazon" },
    { label: "Meta", icon: "fa-brands fa-meta" },
    { label: "X", icon: "fa-brands fa-x-twitter" },
    { label: "GitHub", icon: "fa-brands fa-github" },
    { label: "Docker", icon: "fa-brands fa-docker" },
    { label: "Spotify", icon: "fa-brands fa-spotify" },
    { label: "YouTube", icon: "fa-brands fa-youtube" },
    { label: "Instagram", icon: "fa-brands fa-instagram" },
    { label: "Uber", icon: "fa-brands fa-uber" },
    { label: "TikTok", icon: "fa-brands fa-tiktok" },
    { label: "Apple", icon: "fa-brands fa-apple" },
    { label: "Linux", special: "linux" },
    { label: "Windows", special: "windows" },
    { label: "IBM", special: "ibm" },
    { label: "Intel", special: "intel" },
    { label: "AMD", special: "amd" },
    { label: "Oracle", special: "oracle" },
    { label: "Cisco", icon: "fa-solid fa-network-wired" },
    { label: "Dell", special: "dell" },
    { label: "HP", special: "hp" },
    { label: "Salesforce", icon: "fa-brands fa-salesforce" },
    { label: "Zoom", special: "zoom" },
    { label: "Slack", icon: "fa-brands fa-slack" },
    { label: "Stripe", icon: "fa-brands fa-stripe" },
    { label: "PayPal", icon: "fa-brands fa-paypal" },
    { label: "eBay", icon: "fa-brands fa-ebay" },
    { label: "Reddit", icon: "fa-brands fa-reddit" },
    { label: "Pinterest", icon: "fa-brands fa-pinterest" },
    { label: "LinkedIn", icon: "fa-brands fa-linkedin" },
    { label: "Snapchat", icon: "fa-brands fa-snapchat" },
    { label: "Shopify", icon: "fa-brands fa-shopify" },
    { label: "GitLab", icon: "fa-brands fa-gitlab" },
    { label: "DigitalOcean", icon: "fa-solid fa-cloud" },
    { label: "Heroku", icon: "fa-solid fa-cloud" },
    { label: "Vercel", icon: "fa-solid fa-v" },
    { label: "Netlify", icon: "fa-solid fa-water" },
    { label: "Linode", icon: "fa-solid fa-server" },
    { label: "Cloudflare", icon: "fa-solid fa-cloud" },
    { label: "Proton", icon: "fa-solid fa-shield" },
    { label: "Fastly", icon: "fa-solid fa-bolt" },
    { label: "HashiCorp", icon: "fa-solid fa-hashtag" },
    { label: "MongoDB", icon: "fa-solid fa-database" },
    { label: "Elastic", icon: "fa-solid fa-search" },
    { label: "Postman", icon: "fa-solid fa-envelope" },
    { label: "Figma", icon: "fa-brands fa-figma" },
    { label: "Notion", icon: "fa-brands fa-notion" },
    { label: "Trello", icon: "fa-brands fa-trello" },
    { label: "Zapier", icon: "fa-solid fa-bolt" },
    { label: "IFTTT", icon: "fa-solid fa-link" },
    { label: "Bitbucket", icon: "fa-brands fa-bitbucket" },
    { label: "Sentry", icon: "fa-solid fa-bug" },
    { label: "Segment", icon: "fa-solid fa-chart-line" },
    { label: "Auth0", icon: "fa-solid fa-user-lock" },
    { label: "Plausible", icon: "fa-solid fa-chart-simple" },
    { label: "Render", icon: "fa-solid fa-rocket" },
    { label: "Railway", icon: "fa-solid fa-train" },
    { label: "Fly.io", icon: "fa-solid fa-plane" },
    { label: "Discord", icon: "fa-brands fa-discord" },
    { label: "Dribbble", icon: "fa-brands fa-dribbble" },
    { label: "Stack Overflow", icon: "fa-brands fa-stack-overflow" },
    { label: "Android", icon: "fa-brands fa-android" },
    { label: "Firefox", icon: "fa-brands fa-firefox" },
    { label: "Chrome", icon: "fa-brands fa-chrome" },
    { label: "Edge", icon: "fa-brands fa-edge" },
    { label: "Vimeo", icon: "fa-brands fa-vimeo" },
    { label: "Dropbox", icon: "fa-brands fa-dropbox" },
    { label: "Skype", icon: "fa-brands fa-skype" },
    { label: "AWS", icon: "fa-brands fa-aws" },
    { label: "Raspberry Pi", icon: "fa-brands fa-raspberry-pi" },
    { label: "Ethereum", icon: "fa-brands fa-ethereum" },
    { label: "Bitcoin", icon: "fa-brands fa-bitcoin" },
    { label: "Telegram", icon: "fa-brands fa-telegram" },
    { label: "WeChat", icon: "fa-brands fa-weixin" },
    { label: "WhatsApp", icon: "fa-brands fa-whatsapp" },
    { label: "Yahoo", icon: "fa-brands fa-yahoo" },
    { label: "Tumblr", icon: "fa-brands fa-tumblr" },
    { label: "Medium", icon: "fa-brands fa-medium" },
    { label: "Quora", icon: "fa-brands fa-quora" },
    { label: "WordPress", icon: "fa-brands fa-wordpress" },
    { label: "Joomla", icon: "fa-brands fa-joomla" },
    { label: "Drupal", icon: "fa-brands fa-drupal" },
    { label: "Magento", icon: "fa-brands fa-magento" },
    { label: "PrestaShop", icon: "fa-brands fa-prestashop" },
    { label: "Waze", icon: "fa-brands fa-waze" },
    { label: "Swank", icon: "fa-solid fa-film" },
    { label: "Signal", icon: "fa-brands fa-signal" },
    { label: "Viber", icon: "fa-brands fa-viber" },
    { label: "Twitch", icon: "fa-brands fa-twitch" },
    { label: "Steam", icon: "fa-brands fa-steam" },
    { label: "SoundCloud", icon: "fa-brands fa-soundcloud" },
    { label: "Mastodon", icon: "fa-brands fa-mastodon" },
    { label: "Apple Pay", icon: "fa-brands fa-apple-pay" },
    { label: "Google Pay", icon: "fa-brands fa-google-pay" },
    { label: "Venmo", icon: "fa-brands fa-venmo" },
    { label: "Creative Commons", icon: "fa-brands fa-creative-commons" },
    { label: "OSI", icon: "fa-brands fa-osi" },
    { label: "freeCodeCamp", icon: "fa-brands fa-free-code-camp" },
    { label: "HackerRank", icon: "fa-brands fa-hackerrank" },
    { label: "CodePen", icon: "fa-brands fa-codepen" },
    { label: "JavaScript", icon: "fa-brands fa-js" },
    { label: "Python", icon: "fa-brands fa-python" },
    { label: "Java", icon: "fa-brands fa-java" },
    { label: "PHP", icon: "fa-brands fa-php" },
    { label: "Rust", icon: "fa-brands fa-rust" },
    { label: "Go", icon: "fa-brands fa-golang" },
    { label: "React", icon: "fa-brands fa-react" },
    { label: "Angular", icon: "fa-brands fa-angular" },
    { label: "Vue.js", icon: "fa-brands fa-vuejs" },
    { label: "Node.js", icon: "fa-brands fa-node" },
    { label: "Kubernetes", special: "kubernetes" },
    { label: "Jenkins", icon: "fa-brands fa-jenkins" },
    { label: "Git", icon: "fa-brands fa-git" },
  ], []);

  const loop = [...items, ...items];

  return (
    <div
      style={{ ...s.wrap, height }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Technology ticker"
    >
      <style>{`
        @keyframes inlineTechTickerScroll {
          0% { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-50%,0,0); }
        }
      `}</style>
      <div
        style={{
          ...s.track,
          animation: `inlineTechTickerScroll ${speed}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {loop.map((item, idx) => (
          <span key={`${item.label}-${idx}`} style={s.item} title={item.label}>
            <span style={s.icon}>{renderIcon(item)}</span>
            <span style={s.txt}>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: {
    position: "relative",
    width: "100%",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    background: "transparent",
    border: 0,
    boxShadow: "none",
    backdropFilter: "none",
    WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%)",
    maskImage: "linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%)",
  },
  track: {
    display: "flex",
    alignItems: "center",
    gap: 34,
    padding: "10px 16px",
    width: "max-content",
    willChange: "transform",
  },
  item: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    padding: "0",
    background: "transparent",
    border: 0,
    borderRadius: 0,
    boxShadow: "none",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  },
  icon: {
    width: 30,
    minWidth: 30,
    height: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    lineHeight: 1,
  },
  txt: {
    fontSize: "clamp(1rem, 1.5vw, 1.18rem)",
    fontWeight: 700,
    color: "rgba(255,255,255,0.94)",
    letterSpacing: "0.01em",
  },
};
