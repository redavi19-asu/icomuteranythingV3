import { useMemo, useState } from "react";

function renderIcon(icon, label) {
  if (!icon) return null;

  if (typeof icon === "string" && icon.includes("fa-")) {
    return <i className={icon} aria-hidden="true" />;
  }

  if (typeof icon === "string") {
    return (
      <img
        src={icon}
        alt={label || ""}
        style={{ width: 16, height: 16, display: "block" }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return null;
}

export default function InlineTechTicker({ height = 120, speed = 60 }) {
  const [paused, setPaused] = useState(false);

  const items = useMemo(
    () => [
      { label: "Google", href: "https://google.com", icon: "fa-brands fa-google", color: "#4285F4" },
      { label: "Amazon", href: "https://amazon.com", icon: "fa-brands fa-amazon", color: "#FF9900" },
      { label: "Meta", href: "https://about.meta.com", icon: "fa-brands fa-meta", color: "#0866FF" },
      { label: "X", href: "https://x.com", icon: "fa-brands fa-x-twitter", color: "#FFFFFF" },
      { label: "GitHub", href: "https://github.com", icon: "fa-brands fa-github", color: "#FFFFFF" },
      { label: "Docker", href: "https://www.docker.com", icon: "fa-brands fa-docker", color: "#2496ED" },
      { label: "Apple", href: "https://apple.com", icon: "fa-brands fa-apple", color: "#FFFFFF" },
      { label: "Linux", href: "https://www.kernel.org", icon: "fa-brands fa-linux", color: "#FCC624" },
      { label: "Windows", href: "https://www.microsoft.com/windows", icon: "fa-brands fa-windows", color: "#00A4EF" },
      { label: "IBM", href: "https://www.ibm.com", icon: "fa-solid fa-microchip", color: "#0F62FE" },

      { label: "Spotify", href: "https://spotify.com", icon: "fa-brands fa-spotify", color: "#1DB954" },
      { label: "YouTube", href: "https://youtube.com", icon: "fa-brands fa-youtube", color: "#FF0000" },
      { label: "Instagram", href: "https://instagram.com", icon: "fa-brands fa-instagram", color: "#E1306C" },
      { label: "TikTok", href: "https://tiktok.com", icon: "fa-brands fa-tiktok", color: "#00F2EA" },
      { label: "Snapchat", href: "https://www.snapchat.com", icon: "fa-brands fa-snapchat", color: "#FFFC00" },
      { label: "Twitch", href: "https://www.twitch.tv", icon: "fa-brands fa-twitch", color: "#9146FF" },
      { label: "SoundCloud", href: "https://soundcloud.com", icon: "fa-brands fa-soundcloud", color: "#FF5500" },
      { label: "Mastodon", href: "https://joinmastodon.org", icon: "fa-brands fa-mastodon", color: "#6364FF" },

      { label: "Telegram", href: "https://telegram.org", icon: "fa-brands fa-telegram", color: "#24A1DE" },
      { label: "WeChat", href: "https://www.wechat.com", icon: "fa-brands fa-weixin", color: "#07C160" },
      { label: "WhatsApp", href: "https://www.whatsapp.com", icon: "fa-brands fa-whatsapp", color: "#25D366" },
      { label: "Viber", href: "https://www.viber.com", icon: "fa-brands fa-viber", color: "#7360F2" },
      { label: "Signal", href: "https://signal.org", icon: "fa-solid fa-shield-halved", color: "#3A76F0" },
      { label: "Slack", href: "https://slack.com", icon: "fa-brands fa-slack", color: "#36C5F0" },
      { label: "Zoom", href: "https://zoom.us", icon: "fa-solid fa-video", color: "#2D8CFF" },

      { label: "Yahoo", href: "https://www.yahoo.com", icon: "fa-brands fa-yahoo", color: "#5F01D1" },
      { label: "Tumblr", href: "https://www.tumblr.com", icon: "fa-brands fa-tumblr", color: "#36465D" },
      { label: "Medium", href: "https://medium.com", icon: "fa-brands fa-medium", color: "#FFFFFF" },
      { label: "Quora", href: "https://www.quora.com", icon: "fa-brands fa-quora", color: "#B92B27" },
      { label: "WordPress", href: "https://wordpress.com", icon: "fa-brands fa-wordpress", color: "#21759B" },
      { label: "Joomla", href: "https://www.joomla.org", icon: "fa-brands fa-joomla", color: "#5091CD" },
      { label: "Drupal", href: "https://www.drupal.org", icon: "fa-brands fa-drupal", color: "#0678BE" },

      { label: "Magento", href: "https://business.adobe.com/products/magento/magento-commerce.html", icon: "fa-brands fa-magento", color: "#EE672F" },
      { label: "PrestaShop", href: "https://www.prestashop.com", icon: "fa-solid fa-bag-shopping", color: "#DF0067" },
      { label: "Android", href: "https://www.android.com", icon: "fa-brands fa-android", color: "#3DDC84" },
      { label: "iOS", href: "https://www.apple.com/ios", icon: "fa-brands fa-apple", color: "#FFFFFF" },
      { label: "Waze", href: "https://www.waze.com", icon: "fa-brands fa-waze", color: "#33CCFF" },

      { label: "Apple Pay", href: "https://www.apple.com/apple-pay", icon: "fa-brands fa-apple-pay", color: "#FFFFFF" },
      { label: "Google Pay", href: "https://pay.google.com", icon: "fa-brands fa-google-pay", color: "#4285F4" },
      { label: "Venmo", href: "https://venmo.com", icon: "fa-solid fa-money-bill-wave", color: "#3D95CE" },
      { label: "Creative Commons", href: "https://creativecommons.org", icon: "fa-brands fa-creative-commons", color: "#FFFFFF" },
      { label: "OSI", href: "https://opensource.org", icon: "fa-solid fa-code-branch", color: "#3CC24A" },

      { label: "freeCodeCamp", href: "https://www.freecodecamp.org", icon: "fa-brands fa-free-code-camp", color: "#0A0A23" },
      { label: "HackerRank", href: "https://www.hackerrank.com", icon: "fa-brands fa-hackerrank", color: "#2EC866" },
      { label: "CodePen", href: "https://codepen.io", icon: "fa-brands fa-codepen", color: "#FFFFFF" },
      { label: "JavaScript", href: "https://developer.mozilla.org/docs/Web/JavaScript", icon: "fa-brands fa-js", color: "#F7DF1E" },
      { label: "Python", href: "https://www.python.org", icon: "fa-brands fa-python", color: "#3776AB" },
      { label: "Java", href: "https://www.oracle.com/java", icon: "fa-brands fa-java", color: "#EA2D2E" },

      { label: "Uber", href: "https://uber.com", icon: "fa-brands fa-uber", color: "#FFFFFF" },
      { label: "Steam", href: "https://store.steampowered.com", icon: "fa-brands fa-steam", color: "#00ADEF" },
      { label: "Swank", href: "https://www.swank.com", icon: "fa-solid fa-film", color: "#FFFFFF" },
    ],
    []
  );

  const loop = [...items, ...items];

  return (
    <div
      style={{ ...s.wrap, height }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Tech ticker"
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
        {loop.map((it, idx) => (
          <a
            key={`${it.label}-${idx}`}
            href={it.href}
            target="_blank"
            rel="noreferrer"
            style={s.pill}
            title={it.label}
          >
            <span style={s.icoBox}>
              <span style={{ display: "block", color: it.color, lineHeight: 1 }}>
                {renderIcon(it.icon, it.label)}
              </span>
            </span>
            <span style={s.txt}>{it.label}</span>
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
    border: "0",
    borderRadius: 22,
  },
  track: {
    display: "flex",
    gap: 24,
    padding: "14px 10px",
    width: "max-content",
    willChange: "transform",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 22px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.92)",
    textDecoration: "none",
    fontWeight: 800,
    boxShadow: "0 1px 8px rgba(0,0,0,0.20)",
    userSelect: "none",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  },
  icoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
    flex: "0 0 auto",
  },
  txt: {
    fontSize: "clamp(1.125rem, 1.9vw, 1.375rem)",
    opacity: 0.95,
    lineHeight: 1.2,
  },
};
