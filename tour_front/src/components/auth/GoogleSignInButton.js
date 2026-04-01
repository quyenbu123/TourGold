import React, { useEffect, useRef } from 'react';
import authService from '../../services/authService';

/**
 * GoogleSignInButton renders the GIS One Tap button and handles login
 * Requires window.google to be available (Google Identity Services script)
 */
const GoogleSignInButton = ({ onSuccess, onError, text = 'continue_with', type = 'standard' }) => {
  const divRef = useRef(null);

  useEffect(() => {
    // Load Google script if not present
    const ensureScript = () => new Promise((resolve, reject) => {
      if (window.google && window.google.accounts && window.google.accounts.id) return resolve();
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.body.appendChild(script);
    });

    const init = async () => {
      try {
        await ensureScript();
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
        if (!clientId) {
          console.error('Missing REACT_APP_GOOGLE_CLIENT_ID');
          return;
        }
        console.log('[GIS] Initializing with client_id:', clientId, 'origin:', window.location.origin);
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const { credential } = response; // Google ID token
              if (!credential) {
                const err = new Error('Google did not return an ID token (credential is missing)');
                console.error(err);
                if (onError) onError(err);
                return;
              }
              const authResp = await authService.loginWithGoogle(credential);
              if (onSuccess) onSuccess(authResp);
            } catch (err) {
              console.error('Google login failed:', err);
              if (onError) onError(err);
            }
          },
          ux_mode: 'popup'
        });
        if (divRef.current) {
          window.google.accounts.id.renderButton(divRef.current, {
            theme: 'outline',
            size: 'large',
            text,
            type
          });
        }
      } catch (e) {
        console.error('Failed to init Google Identity Services', e);
      }
    };
    init();
  }, [onSuccess, onError, text, type]);

  return <div ref={divRef} />;
};

export default GoogleSignInButton;
