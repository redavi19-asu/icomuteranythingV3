import { useEffect, useMemo, useRef, useState } from "react";

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

const techLinks = {
  Microsoft: "https://www.microsoft.com/",
  Google: "https://www.google.com/",
  Amazon: "https://www.amazon.com/",
  Meta: "https://www.meta.com/",
  X: "https://x.com/",
  GitHub: "https://github.com/",
  Docker: "https://www.docker.com/",
  Spotify: "https://www.spotify.com/",
  YouTube: "https://www.youtube.com/",
  Instagram: "https://www.instagram.com/",
  Uber: "https://www.uber.com/",
  TikTok: "https://www.tiktok.com/",
  Apple: "https://www.apple.com/",
  Linux: "https://www.kernel.org/",
  Windows: "https://www.microsoft.com/windows/",
  IBM: "https://www.ibm.com/",
  Intel: "https://www.intel.com/",
  AMD: "https://www.amd.com/",
  Oracle: "https://www.oracle.com/",
  Cisco: "https://www.cisco.com/",
  Dell: "https://www.dell.com/",
  HP: "https://www.hp.com/",
  Salesforce: "https://www.salesforce.com/",
  Zoom: "https://www.zoom.com/",
  Slack: "https://slack.com/",
  Stripe: "https://stripe.com/",
  PayPal: "https://www.paypal.com/",
  eBay: "https://www.ebay.com/",
  Reddit: "https://www.reddit.com/",
  Pinterest: "https://www.pinterest.com/",
  LinkedIn: "https://www.linkedin.com/",
  Snapchat: "https://www.snapchat.com/",
  Shopify: "https://www.shopify.com/",
  GitLab: "https://gitlab.com/",
  DigitalOcean: "https://www.digitalocean.com/",
  Heroku: "https://www.heroku.com/",
  Vercel: "https://vercel.com/",
  Netlify: "https://www.netlify.com/",
  Linode: "https://www.linode.com/",
  Cloudflare: "https://www.cloudflare.com/",
  Proton: "https://proton.me/",
  Fastly: "https://www.fastly.com/",
  HashiCorp: "https://www.hashicorp.com/",
  MongoDB: "https://www.mongodb.com/",
  Elastic: "https://www.elastic.co/",
  Postman: "https://www.postman.com/",
  Figma: "https://www.figma.com/",
  Notion: "https://www.notion.com/",
  Trello: "https://trello.com/",
  Zapier: "https://zapier.com/",
  IFTTT: "https://ifttt.com/",
  Bitbucket: "https://bitbucket.org/",
  Sentry: "https://sentry.io/",
  Segment: "https://segment.com/",
  Auth0: "https://auth0.com/",
  Plausible: "https://plausible.io/",
  Render: "https://render.com/",
  Railway: "https://railway.com/",
  "Fly.io": "https://fly.io/",
  Discord: "https://discord.com/",
  Dribbble: "https://dribbble.com/",
  "Stack Overflow": "https://stackoverflow.com/",
  Android: "https://www.android.com/",
  Firefox: "https://www.mozilla.org/firefox/",
  Chrome: "https://www.google.com/chrome/",
  Edge: "https://www.microsoft.com/edge/",
  Vimeo: "https://vimeo.com/",
  Dropbox: "https://www.dropbox.com/",
  Skype: "https://www.skype.com/",
  AWS: "https://aws.amazon.com/",
  "Raspberry Pi": "https://www.raspberrypi.com/",
  Ethereum: "https://ethereum.org/",
  Bitcoin: "https://bitcoin.org/",
  Telegram: "https://telegram.org/",
  WeChat: "https://www.wechat.com/",
  WhatsApp: "https://www.whatsapp.com/",
  Yahoo: "https://www.yahoo.com/",
  Tumblr: "https://www.tumblr.com/",
  Medium: "https://medium.com/",
  Quora: "https://www.quora.com/",
  WordPress: "https://wordpress.org/",
  Joomla: "https://www.joomla.org/",
  Drupal: "https://www.drupal.org/",
  Magento: "https://business.adobe.com/products/magento/magento-commerce.html",
  PrestaShop: "https://www.prestashop.com/",
  Waze: "https://www.waze.com/",
  Swank: "https://www.swank.com/",
  Signal: "https://signal.org/",
  Viber: "https://www.viber.com/",
  Twitch: "https://www.twitch.tv/",
  Steam: "https://store.steampowered.com/",
  SoundCloud: "https://soundcloud.com/",
  Mastodon: "https://joinmastodon.org/",
  "Apple Pay": "https://www.apple.com/apple-pay/",
  "Google Pay": "https://pay.google.com/",
  Venmo: "https://venmo.com/",
  "Creative Commons": "https://creativecommons.org/",
  OSI: "https://opensource.org/",
  freeCodeCamp: "https://www.freecodecamp.org/",
  HackerRank: "https://www.hackerrank.com/",
  CodePen: "https://codepen.io/",
  JavaScript: "https://developer.mozilla.org/docs/Web/JavaScript",
  Python: "https://www.python.org/",
  Java: "https://www.java.com/",
  PHP: "https://www.php.net/",
  Rust: "https://www.rust-lang.org/",
  Go: "https://go.dev/",
  React: "https://react.dev/",
  Angular: "https://angular.dev/",
  "Vue.js": "https://vuejs.org/",
  "Node.js": "https://nodejs.org/",
  Kubernetes: "https://kubernetes.io/",
  Jenkins: "https://www.jenkins.io/",
  Git: "https://git-scm.com/",
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
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const pausedRef = useRef(false);
  const pointerDownRef = useRef(false);
  const draggedRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startScrollRef = useRef(0);
  const resumeTimerRef = useRef(null);

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

  const setPauseState = (value) => {
    pausedRef.current = value;
    setPaused(value);
  };

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const scheduleResume = () => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      if (!pointerDownRef.current) setPauseState(false);
    }, 2600);
  };

  const getLoopWidth = () => (trackRef.current?.scrollWidth || 0) / 2;

  const setWrappedScroll = (value) => {
    const wrap = wrapRef.current;
    const loopWidth = getLoopWidth();
    if (!wrap || !loopWidth) return;

    let next = value;
    while (next < 0) next += loopWidth;
    while (next >= loopWidth) next -= loopWidth;
    wrap.scrollLeft = next;
  };

  useEffect(() => {
    let frameId;
    let lastTime = performance.now();

    const tick = (now) => {
      const wrap = wrapRef.current;
      const loopWidth = getLoopWidth();
      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (wrap && loopWidth && !pausedRef.current && !pointerDownRef.current) {
        const pixelsPerSecond = loopWidth / Math.max(speed, 1);
        setWrappedScroll(wrap.scrollLeft + pixelsPerSecond * deltaSeconds);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [speed]);

  useEffect(() => {
    const handleOutsidePointer = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        clearResumeTimer();
        pointerDownRef.current = false;
        setPauseState(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      clearResumeTimer();
    };
  }, []);

  const handlePointerDown = (event) => {
    clearResumeTimer();
    pointerDownRef.current = true;
    draggedRef.current = false;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    startScrollRef.current = wrapRef.current?.scrollLeft || 0;
    setPauseState(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!pointerDownRef.current) return;

    const dx = event.clientX - startXRef.current;
    const dy = event.clientY - startYRef.current;

    if (Math.abs(dx) > 5 && Math.abs(dx) >= Math.abs(dy)) {
      draggedRef.current = true;
      event.preventDefault();
      setWrappedScroll(startScrollRef.current - dx);
    }
  };

  const handlePointerUp = (event) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    scheduleResume();
  };

  const handleMouseEnter = () => {
    clearResumeTimer();
    setPauseState(true);
  };

  const handleMouseLeave = () => {
    if (!pointerDownRef.current) {
      clearResumeTimer();
      setPauseState(false);
    }
  };

  const handleLinkClick = (event) => {
    if (draggedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      draggedRef.current = false;
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{ ...s.wrap, height, cursor: pointerDownRef.current ? "grabbing" : "grab" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label="Technology ticker. Touch or hover to pause, drag left or right to browse, and tap a technology to visit its website."
      data-paused={paused ? "true" : "false"}
    >
      <div ref={trackRef} style={s.track}>
        {loop.map((item, idx) => (
          <a
            key={`${item.label}-${idx}`}
            href={techLinks[item.label]}
            target="_blank"
            rel="noreferrer"
            style={s.item}
            title={`Visit ${item.label}`}
            aria-label={`Visit ${item.label}`}
            draggable="false"
            onClick={handleLinkClick}
          >
            <span style={s.icon}>{renderIcon(item)}</span>
            <span style={s.txt}>{item.label}</span>
          </a>
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
    touchAction: "pan-y",
    userSelect: "none",
    WebkitUserSelect: "none",
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
    color: "inherit",
    textDecoration: "none",
    cursor: "pointer",
    WebkitUserDrag: "none",
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