"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('default');
    const [clubSettings, setClubSettings] = useState(null);

    // Initial setup for Pine Valley Cricket Club (PVCC)
    useEffect(() => {
        // In a real app, we'd fetch these from Firestore based on the URL slug
        const currentSlug = window.location.pathname.split('/')[1] || 'pvcc';

        if (currentSlug === 'pvcc') {
            setTheme('pvcc');
            setClubSettings({
                name: 'Pine Valley Cricket Club',
                primary: '#1e3a8a',
                secondary: '#fbbf24',
                logo: '/pvcc-logo.png' // Mock logo path
            });
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, clubSettings }}>
            <div data-theme={theme} className="theme-wrapper" style={{ minHeight: '100vh' }}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
