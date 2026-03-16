const STORAGE_KEY = 'ica-cookie-consent';

export function getConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveConsent(consent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {}
}

export function hasConsent(category) {
  const consent = getConsent();
  if (!consent || !consent.choiceMade) return false;
  if (category === 'essential') return true;
  return !!consent[category];
}
