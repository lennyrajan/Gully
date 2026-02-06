"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function LiveMatchBanner() {
    const [liveMatches, setLiveMatches] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        // Query for live matches
        const q = query(
            collection(db, 'matches'),
            where('status', '==', 'LIVE'),
            orderBy('lastUpdated', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matches = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLiveMatches(matches);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (liveMatches.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % liveMatches.length);
        }, 5000); // Rotate every 5 seconds

        return () => clearInterval(interval);
    }, [liveMatches.length]);

    if (liveMatches.length === 0) return null;

    const currentMatch = liveMatches[currentIndex];
    const state = currentMatch.state || {};
    const lastEvent = currentMatch.lastEvent || {};

    return (
        <Link href={`/match/${currentMatch.id}`} style={{ textDecoration: 'none' }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    color: 'white',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Live Indicator */}
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                }}>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#22c55e'
                        }}
                    />
                    LIVE
                </div>

                {/* Match Info */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentMatch.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h3 style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            marginBottom: '0.5rem',
                            opacity: 0.9
                        }}>
                            {state.battingTeam?.name || 'Team A'} vs {state.bowlingTeam?.name || 'Team B'}
                        </h3>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginTop: '0.75rem'
                        }}>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: 800,
                                lineHeight: 1
                            }}>
                                {state.totalRuns || 0}/{state.wickets || 0}
                            </div>

                            <div style={{
                                fontSize: '0.9rem',
                                opacity: 0.9
                            }}>
                                ({Math.floor((state.balls || 0) / 6)}.{(state.balls || 0) % 6} Ov)
                            </div>

                            {lastEvent.summary && (
                                <div style={{
                                    flex: 1,
                                    fontSize: '0.85rem',
                                    opacity: 0.95,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <TrendingUp size={16} />
                                    {lastEvent.summary}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Carousel Indicators */}
                {liveMatches.length > 1 && (
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginTop: '1rem',
                        justifyContent: 'center'
                    }}>
                        {liveMatches.map((_, idx) => (
                            <div
                                key={idx}
                                style={{
                                    width: idx === currentIndex ? '24px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: idx === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.4)',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                )}
            </motion.div>
        </Link>
    );
}
