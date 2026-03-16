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
        className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4"
        role="dialog"
        aria-live="polite"
      >
        <div className="flex-1 text-sm md:text-base">
          We use essential cookies to keep this site working and optional cookies to understand site usage and improve the experience. You can accept all, reject non-essential cookies, or manage your preferences.
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button
            className="btn-primary px-4 py-2 text-sm rounded-lg"
            onClick={handleAcceptAll}
            aria-label="Accept all cookies"
          >
            Accept All
          </button>
          <button
            className="btn-secondary px-4 py-2 text-sm rounded-lg"
            onClick={handleReject}
            aria-label="Reject non-essential cookies"
          >
            Reject Non-Essential
          </button>
          <button
            className="btn-secondary px-4 py-2 text-sm rounded-lg border-blue-400"
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
