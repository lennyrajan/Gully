"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import {
    ChevronLeft,
    Check,
    X,
    HelpCircle,
    Calendar,
    MapPin,
    Clock,
    Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AvailabilityHub() {
    const { currentUser, userProfile } = useAuth();
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    // Real-time listener for games
    useEffect(() => {
        if (!userProfile?.teams || userProfile.teams.length === 0) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'games'),
            where('teamId', 'in', userProfile.teams)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const gamesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by date (soonest first)
            gamesData.sort((a, b) => new Date(a.date) - new Date(b.date));

            setGames(gamesData);
            setLoading(false);
        }, (error) => {
            console.error('Error loading games:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile]);

    const updateAvailability = async (gameId, status) => {
        if (!currentUser) return;

        try {
            const gameRef = doc(db, 'games', gameId);
            await updateDoc(gameRef, {
                [`availability.${currentUser.uid}`]: status
            });
        } catch (error) {
            console.error('Error updating availability:', error);
            alert('Failed to update availability. Please try again.');
        }
    };

    const getAvailabilityCounts = (game) => {
        if (!game.availability) return { yes: 0, maybe: 0, no: 0 };

        const counts = { yes: 0, maybe: 0, no: 0 };
        Object.values(game.availability).forEach(status => {
            if (status === 'yes') counts.yes++;
            else if (status === 'maybe') counts.maybe++;
            else if (status === 'no') counts.no++;
        });

        return counts;
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <p>Loading games...</p>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
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

                    {games.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                            <Calendar size={48} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                            <p style={{ opacity: 0.7 }}>No upcoming games scheduled yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {games.map((game, idx) => {
                                const myStatus = game.availability?.[currentUser?.uid] || 'none';
                                const counts = getAvailabilityCounts(game);

                                return (
                                    <motion.div
                                        key={game.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="card"
                                        style={{ padding: '1.5rem' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>vs {game.opponent}</h3>
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', opacity: 0.6, fontSize: '0.8rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Calendar size={14} /> {new Date(game.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
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

                                        {/* Availability Counts */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '1rem',
                                            marginBottom: '1rem',
                                            padding: '0.75rem',
                                            background: 'var(--background)',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Users size={16} style={{ color: 'var(--success)' }} />
                                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>{counts.yes}</span>
                                                <span style={{ opacity: 0.6 }}>Available</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <HelpCircle size={16} style={{ color: 'var(--warning)' }} />
                                                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{counts.maybe}</span>
                                                <span style={{ opacity: 0.6 }}>Maybe</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <X size={16} style={{ color: 'var(--error)' }} />
                                                <span style={{ color: 'var(--error)', fontWeight: 600 }}>{counts.no}</span>
                                                <span style={{ opacity: 0.6 }}>Unavailable</span>
                                            </div>
                                        </div>

                                        {/* Status Buttons */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                            <StatusButton
                                                label="YES"
                                                active={myStatus === 'yes'}
                                                color="var(--success)"
                                                icon={<Check size={18} />}
                                                onClick={() => updateAvailability(game.id, 'yes')}
                                            />
                                            <StatusButton
                                                label="MAYBE"
                                                active={myStatus === 'maybe'}
                                                color="var(--warning)"
                                                icon={<HelpCircle size={18} />}
                                                onClick={() => updateAvailability(game.id, 'maybe')}
                                            />
                                            <StatusButton
                                                label="NO"
                                                active={myStatus === 'no'}
                                                color="var(--error)"
                                                icon={<X size={18} />}
                                                onClick={() => updateAvailability(game.id, 'no')}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </ProtectedRoute>
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
