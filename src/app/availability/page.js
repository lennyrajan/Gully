"use client";

import React, { useState } from 'react';
import {
    ChevronLeft,
    Check,
    X,
    HelpCircle,
    Calendar,
    MapPin,
    Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_GAMES = [
    {
        id: 1,
        opponent: 'Silicon Valley CC',
        date: 'Sat, Feb 7',
        time: '9:00 AM',
        location: 'Monarch Park, CA',
        status: 'yes'
    },
    {
        id: 2,
        opponent: 'Bay Area Blues',
        date: 'Sun, Feb 15',
        time: '1:00 PM',
        location: 'Tiffany Roberts, CA',
        status: 'maybe'
    },
    {
        id: 3,
        opponent: 'Redwood Strikers',
        date: 'Sat, Feb 21',
        time: '10:00 AM',
        location: 'Central Park, Fremont',
        status: 'none'
    }
];

export default function AvailabilityHub() {
    const [games, setGames] = useState(MOCK_GAMES);

    const updateStatus = (id, newStatus) => {
        setGames(prev => prev.map(g => g.id === id ? { ...g, status: newStatus } : g));
    };

    return (
        <main style={{
            minHeight: '100vh',
            background: 'var(--background)',
            color: 'var(--foreground)',
            paddingBottom: '5rem'
        }}>
            {/* Header */}
            <header className="glass" style={{
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                position: 'sticky',
                top: 0,
                zIndex: 50
            }}>
                <button className="btn" style={{ padding: '0.5rem' }} onClick={() => window.history.back()}>
                    <ChevronLeft />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Availability</h1>
            </header>

            <div style={{ padding: '1.5rem' }}>
                <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Mark your availability for the upcoming matches so the captain can finalize the XI.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {games.map((game, idx) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="card"
                            style={{ padding: '1.5rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>vs {game.opponent}</h3>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', opacity: 0.6, fontSize: '0.8rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={14} /> {game.date}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={14} /> {game.time}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.25rem', opacity: 0.6, fontSize: '0.8rem' }}>
                                        <MapPin size={14} /> {game.location}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                <StatusButton
                                    label="YES"
                                    active={game.status === 'yes'}
                                    color="var(--success)"
                                    icon={<Check size={18} />}
                                    onClick={() => updateStatus(game.id, 'yes')}
                                />
                                <StatusButton
                                    label="MAYBE"
                                    active={game.status === 'maybe'}
                                    color="var(--warning)"
                                    icon={<HelpCircle size={18} />}
                                    onClick={() => updateStatus(game.id, 'maybe')}
                                />
                                <StatusButton
                                    label="NO"
                                    active={game.status === 'no'}
                                    color="var(--error)"
                                    icon={<X size={18} />}
                                    onClick={() => updateStatus(game.id, 'no')}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </main>
    );
}

function StatusButton({ label, active, color, icon, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '12px',
                border: active ? `2px solid ${color}` : '2px solid transparent',
                background: active ? `${color}15` : 'var(--card-border)',
                color: active ? color : 'var(--foreground)',
                opacity: active ? 1 : 0.6,
                fontWeight: 700,
                fontSize: '0.7rem',
                transition: 'all 0.2s',
                cursor: 'pointer'
            }}
        >
            {icon}
            {label}
        </button>
    );
}
