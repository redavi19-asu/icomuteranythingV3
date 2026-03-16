import React, { useState } from 'react';

function CookiePreferencesModal({ initialPrefs, onSave, onCancel }) {
  const [analytics, setAnalytics] = useState(initialPrefs.analytics);
  const [marketing, setMarketing] = useState(initialPrefs.marketing);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto">
        <h2 className="text-xl font-bold text-blue-200 mb-4 text-center">Cookie Preferences</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ analytics, marketing });
          }}
        >
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked disabled className="accent-blue-500" />
              <span className="text-white font-medium">Essential Cookies</span>
              <span className="text-xs text-blue-300">(Always On)</span>
            </label>
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={e => setAnalytics(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-white">Analytics Cookies</span>
            </label>
          </div>
          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={marketing}
                onChange={e => setMarketing(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-white">Marketing / Tracking Cookies</span>
            </label>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              type="submit"
              className="btn-primary px-6 py-2 rounded-lg"
              aria-label="Save cookie preferences"
            >
              Save Preferences
            </button>
            <button
              type="button"
              className="btn-secondary px-6 py-2 rounded-lg"
              onClick={onCancel}
              aria-label="Cancel cookie preferences"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CookiePreferencesModal;
