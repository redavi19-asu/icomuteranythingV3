import React, { useState, useEffect } from 'react';
import CookiePreferencesModal from './CookiePreferencesModal';
import { getConsent, saveConsent } from '../utils/cookieConsent';

const defaultConsent = {
  essential: true,
  analytics: false,
  marketing: false,
  choiceMade: false,
};

function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [consent, setConsent] = useState(defaultConsent);

  useEffect(() => {
    const saved = getConsent();
    if (!saved || !saved.choiceMade) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const newConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      choiceMade: true,
    };
    saveConsent(newConsent);
    setConsent(newConsent);
    setShowBanner(false);
  };

  const handleReject = () => {
    const newConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      choiceMade: true,
    };
    saveConsent(newConsent);
    setConsent(newConsent);
    setShowBanner(false);
  };

  const handleManage = () => {
    setShowModal(true);
  };

  const handleModalSave = (prefs) => {
    const newConsent = {
      ...prefs,
      essential: true,
      choiceMade: true,
    };
    saveConsent(newConsent);
    setConsent(newConsent);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleModalCancel = () => {
    setShowModal(false);
  };

  if (!showBanner) return null;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-300 text-zinc-950 border-t-2 border-amber-500 shadow-[0_-8px_30px_rgba(0,0,0,0.22)] px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4"
        role="dialog"
        aria-live="polite"
      >
        <div className="flex-1 text-sm md:text-base font-medium flex items-start gap-3">
          <span className="text-xl leading-none" aria-hidden="true">⚠️</span>
          <span>
            This site uses essential cookies to keep things working properly. Optional cookies may also be used to understand site usage and improve your experience. You can accept all, reject non-essential cookies, or manage your preferences.
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-2 md:mt-0">
          <button
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 transition-colors"
            onClick={handleAcceptAll}
            aria-label="Accept all cookies"
          >
            Accept All
          </button>
          <button
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-white/80 text-zinc-950 border border-zinc-800 hover:bg-white transition-colors"
            onClick={handleReject}
            aria-label="Reject non-essential cookies"
          >
            Reject Non-Essential
          </button>
          <button
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-transparent text-zinc-950 border border-zinc-800 hover:bg-amber-200 transition-colors"
            onClick={handleManage}
            aria-label="Manage cookie preferences"
          >
            Manage Preferences
          </button>
        </div>
      </div>
      {showModal && (
        <CookiePreferencesModal
          initialPrefs={consent}
          onSave={handleModalSave}
          onCancel={handleModalCancel}
        />
      )}
    </>
  );
}

export default CookieBanner;
