"use client";

import React from 'react';

/**
 * Guest Player Badge Component
 * Displays a visual indicator for guest players in the team roster
 */
export default function GuestBadge({ size = 'default' }) {
    const sizes = {
        small: {
            fontSize: '0.6rem',
            padding: '2px 6px',
        },
        default: {
            fontSize: '0.7rem',
            padding: '3px 8px',
        },
        large: {
            fontSize: '0.8rem',
            padding: '4px 10px',
        }
    };

    const sizeStyles = sizes[size] || sizes.default;

    return (
        <span
            title="Guest player - not a registered team member"
            style={{
                ...sizeStyles,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                borderRadius: '4px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'help'
            }}
        >
            👤 Guest
        </span>
    );
}

/**
 * Check if a user is a guest player
 * @param {object} userProfile - The user profile object
 * @returns {boolean} - Whether the user is a guest
 */
export function isGuestPlayer(userProfile) {
    return userProfile?.role === 'guest' || userProfile?.isGuest === true;
}
