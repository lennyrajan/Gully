"use client";

import React, { useState } from 'react';
import { useScorer } from '@/hooks/useScorer';
import {
    ChevronLeft,
    RotateCcw,
    XOctagon,
    Settings2,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScorerPage() {
    const { matchState, overs, addBall, undo } = useScorer();
    const [showWicketModal, setShowWicketModal] = useState(false);
    const [selectedExtra, setSelectedExtra] = useState(null);

    const handleRunClick = (runs) => {
        addBall({
            runs,
            isExtra: !!selectedExtra,
            extraType: selectedExtra,
            isWicket: false
        });
        setSelectedExtra(null);
    };

    const handleWicket = (type) => {
        addBall({
            runs: 0,
            isExtra: false,
            isWicket: true,
            wicketType: type
        });
        setShowWicketModal(false);
    };

    return (
        <main style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--background)',
            color: 'var(--foreground)'
        }}>
            {/* Top Header */}
            <header style={{
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--card-border)'
            }}>
                <button className="btn" style={{ padding: '0.5rem' }} onClick={() => window.history.back()}>
                    <ChevronLeft />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1rem', opacity: 0.7 }}>PVCC vs SVCC</h1>
                    <p style={{ fontWeight: 600 }}>1st Innings</p>
                </div>
                <button className="btn" style={{ padding: '0.5rem' }}>
                    <Settings2 size={20} />
                </button>
            </header>

            {/* Main Score Display */}
            <section style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem'
            }}>
                <motion.div
                    key={matchState.totalRuns}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ textAlign: 'center' }}
                >
                    <h2 style={{ fontSize: '5rem', fontWeight: 800, lineHeight: 1 }}>
                        {matchState.totalRuns}/{matchState.wickets}
                    </h2>
                    <p style={{ fontSize: '1.5rem', opacity: 0.7, marginTop: '0.5rem' }}>
                        Overs: {overs}
                    </p>
                </motion.div>

                <div style={{
                    marginTop: '3rem',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-around',
                    background: 'var(--card-bg)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Striker</p>
                        <p style={{ fontWeight: 700, color: 'var(--primary)' }}>{matchState.striker}*</p>
                    </div>
                    <div style={{ textAlign: 'center', opacity: 0.7 }}>
                        <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Non-Striker</p>
                        <p style={{ fontWeight: 600 }}>{matchState.nonStriker}</p>
                    </div>
                </div>
            </section>

            {/* Scoring Controls (The "One-Handed" Pad) */}
            <section style={{
                background: 'var(--card-bg)',
                borderTopLeftRadius: '2.5rem',
                borderTopRightRadius: '2.5rem',
                padding: '2rem 1.5rem 3rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '0 -10px 25px rgba(0,0,0,0.1)'
            }}>
                {/* Extras Toggles */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    {['wide', 'noBall', 'bye', 'legBye'].map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedExtra(selectedExtra === type ? null : type)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '50px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: '2px solid',
                                borderColor: selectedExtra === type ? 'var(--primary)' : 'var(--card-border)',
                                background: selectedExtra === type ? 'var(--primary)' : 'transparent',
                                color: selectedExtra === type ? 'white' : 'var(--foreground)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {type.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Runs Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1rem'
                }}>
                    {[0, 1, 2, 3, 4, 6].map(run => (
                        <kbd
                            key={run}
                            onClick={() => handleRunClick(run)}
                            className="btn"
                            style={{
                                height: '70px',
                                fontSize: '1.5rem',
                                borderRadius: 'var(--radius-md)',
                                background: run === 4 || run === 6 ? 'var(--accent)' : 'var(--card-border)',
                                color: 'white'
                            }}
                        >
                            {run}
                        </kbd>
                    ))}

                    <button
                        className="btn"
                        onClick={() => setShowWicketModal(true)}
                        style={{
                            gridColumn: 'span 2',
                            background: 'var(--error)',
                            color: 'white',
                            height: '70px',
                            fontSize: '1.25rem'
                        }}
                    >
                        <XOctagon style={{ marginRight: '0.5rem' }} /> WICKET
                    </button>
                </div>

                {/* Undo / Actions */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                    <button onClick={undo} style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--foreground)',
                        opacity: 0.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        fontSize: '0.75rem'
                    }}>
                        <RotateCcw size={24} />
                        <span style={{ marginTop: '0.25rem' }}>UNDO</span>
                    </button>
                    <button style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--foreground)',
                        opacity: 0.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        fontSize: '0.75rem'
                    }}>
                        <Info size={24} />
                        <span style={{ marginTop: '0.25rem' }}>LOG</span>
                    </button>
                </div>
            </section>

            {/* Wicket Modal */}
            <AnimatePresence>
                {showWicketModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(5px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'flex-end'
                        }}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            style={{
                                width: '100%',
                                background: 'var(--background)',
                                borderTopLeftRadius: '2rem',
                                borderTopRightRadius: '2rem',
                                padding: '2rem'
                            }}
                        >
                            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Choose Wicket Type</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Other'].map(type => (
                                    <button
                                        key={type}
                                        className="btn"
                                        onClick={() => handleWicket(type)}
                                        style={{ background: 'var(--card-border)', padding: '1.5rem' }}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <button
                                className="btn"
                                onClick={() => setShowWicketModal(false)}
                                style={{ width: '100%', marginTop: '1.5rem', background: 'transparent', border: '1px solid var(--card-border)' }}
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
