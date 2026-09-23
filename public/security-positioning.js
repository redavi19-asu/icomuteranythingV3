(() => {
  const STYLE_ID = 'ica-security-positioning-style';
  const MARKER = 'data-ica-security-positioning';
  const TITLES = ['Security Engineer', 'Endpoint Security Engineer', 'SecOps / Security Operations'];

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ica-security-positioning {
        margin-top: 1rem;
        display: flex;
        flex-wrap: wrap;
        gap: .5rem;
      }
      .ica-security-positioning__label {
        display: inline-flex;
        align-items: center;
        min-height: 2rem;
        padding: .42rem .72rem;
        border: 1px solid rgba(52, 211, 153, .28);
        border-radius: 999px;
        background: rgba(16, 185, 129, .08);
        color: rgb(209, 250, 229);
        font-size: .72rem;
        font-weight: 700;
        letter-spacing: .03em;
      }
      .ica-security-positioning__note {
        width: 100%;
        margin: .25rem 0 0;
        color: rgb(156, 163, 175);
        font-size: .82rem;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }

  function cardForHeading(heading) {
    return heading.closest('article, [class*="rounded-"], [class*="card"], [class*="border"]') || heading.parentElement;
  }

  function addPositioning(card, includeNote = false) {
    if (!card || card.querySelector(`[${MARKER}]`)) return;
    const wrap = document.createElement('div');
    wrap.className = 'ica-security-positioning';
    wrap.setAttribute(MARKER, 'true');
    TITLES.forEach((title) => {
      const chip = document.createElement('span');
      chip.className = 'ica-security-positioning__label';
      chip.textContent = title;
      wrap.appendChild(chip);
    });
    if (includeNote) {
      const note = document.createElement('p');
      note.className = 'ica-security-positioning__note';
      note.textContent = 'ICA Control connects security engineering, endpoint security, and security operations in one managed workflow.';
      wrap.appendChild(note);
    }
    card.appendChild(wrap);
  }

  function apply() {
    installStyle();
    const headings = [...document.querySelectorAll('h2, h3, h4')];
    headings.forEach((heading) => {
      const text = (heading.textContent || '').trim().toLowerCase();
      if (text === 'cybersecurity consulting' || text.includes('ica control')) {
        addPositioning(cardForHeading(heading), text.includes('ica control'));
      }
    });
  }

  let scheduled = false;
  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleApply, { once: true });
  } else {
    scheduleApply();
  }

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
