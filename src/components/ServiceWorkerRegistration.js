"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

/**
 * ServiceWorkerRegistration Component
 * Handles PWA service worker registration and install prompt
 */
export default function ServiceWorkerRegistration() {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Register service worker
        if ('serviceWorker' in navigator) {
            registerServiceWorker();
        }

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
            // Show install banner after a delay
            setTimeout(() => {
                setShowInstallBanner(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('[PWA] Running in standalone mode');
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[PWA] Service Worker registered:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;

                newWorker?.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        setUpdateAvailable(true);
                    }
                });
            });
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
        }
    };

    const handleInstall = async () => {
        if (!installPrompt) return;

        try {
            await installPrompt.prompt();
            const result = await installPrompt.userChoice;

            if (result.outcome === 'accepted') {
                console.log('[PWA] App installed');
            }
        } catch (error) {
            console.error('[PWA] Install failed:', error);
        } finally {
            setInstallPrompt(null);
            setShowInstallBanner(false);
        }
    };

    const handleUpdate = () => {
        window.location.reload();
    };

    return (
        <>
            {/* Install Banner */}
            <AnimatePresence>
                {showInstallBanner && installPrompt && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        style={{
                            position: 'fixed',
                            bottom: '5rem',
                            left: '1rem',
                            right: '1rem',
                            background: 'var(--card)',
                            borderRadius: '12px',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            zIndex: 1000
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Download size={24} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Install Gully</p>
                            <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Add to home screen for quick access</p>
                        </div>
                        <button
                            onClick={handleInstall}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                            Install
                        </button>
                        <button
                            onClick={() => setShowInstallBanner(false)}
                            className="btn"
                            style={{ padding: '0.5rem' }}
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Update Available Banner */}
            <AnimatePresence>
                {updateAvailable && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            fontSize: '0.875rem',
                            zIndex: 1001
                        }}
                    >
                        <span>A new version is available!</span>
                        <button
                            onClick={handleUpdate}
                            style={{
                                background: 'white',
                                color: 'var(--primary)',
                                border: 'none',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '4px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Update
                        </button>
                        <button
                            onClick={() => setUpdateAvailable(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
