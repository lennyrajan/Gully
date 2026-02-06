"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    Users,
    Settings,
    CheckCircle2,
    Plus,
    X,
    Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MatchSetup() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [matchConfig, setMatchConfig] = useState({
        teamA: { name: 'PVCC', players: Array(11).fill('').map((_, i) => i === 0 ? 'Lenny Rajan' : ''), impactPlayer: '' },
        teamB: { name: 'SVCC', players: Array(11).fill(''), impactPlayer: '' },
        maxOvers: 20
    });

    const handlePlayerChange = (team, index, value) => {
        setMatchConfig(prev => ({
            ...prev,
            [team]: {
                ...prev[team],
                players: prev[team].players.map((p, i) => i === index ? value : p)
            }
        }));
    };

    const handleImpactPlayerChange = (team, value) => {
        setMatchConfig(prev => ({
            ...prev,
            [team]: { ...prev[team], impactPlayer: value }
        }));
    };

    const startMatch = () => {
        // In a real app, we'd save this to Firestore and get an ID
        // For now, we'll pass via localStorage or state management if available
        localStorage.setItem('currentMatchConfig', JSON.stringify(matchConfig));
        router.push('/scorer');
    };

    return (
        <main style={{
            minHeight: '100vh',
            background: 'var(--background)',
            color: 'var(--foreground)',
            paddingBottom: '2rem'
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
                <button className="btn" style={{ padding: '0.5rem' }} onClick={() => router.back()}>
                    <ChevronLeft />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Match Setup</h1>
            </header>

            <div style={{ padding: '1.5rem' }}>
                {/* Progress Bar */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '2rem' }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            background: s <= step ? 'var(--primary)' : 'var(--card-border)',
                            transition: 'all 0.3s'
                        }} />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Basic Settings</h2>
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', opacity: 0.6, marginBottom: '0.5rem' }}>Opponent Team Name</label>
                                    <input
                                        type="text"
                                        value={matchConfig.teamB.name}
                                        onChange={(e) => setMatchConfig({ ...matchConfig, teamB: { ...matchConfig.teamB, name: e.target.value } })}
                                        style={{
                                            width: '100%',
                                            padding: '1rem',
                                            background: 'var(--background)',
                                            border: '1px solid var(--card-border)',
                                            borderRadius: '12px',
                                            color: 'var(--foreground)',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', opacity: 0.6, marginBottom: '0.5rem' }}>Match Format (Max Overs)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                        {[10, 20, 40].map(overs => (
                                            <button
                                                key={overs}
                                                onClick={() => setMatchConfig({ ...matchConfig, maxOvers: overs })}
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--card-border)',
                                                    background: matchConfig.maxOvers === overs ? 'var(--primary)' : 'transparent',
                                                    color: matchConfig.maxOvers === overs ? 'white' : 'inherit',
                                                    fontWeight: 600
                                                }}
                                            >
                                                {overs} Overs
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', padding: '1rem' }} onClick={() => setStep(2)}>
                                Continue to Squads
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Squad Selection</h2>

                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <button className="btn" style={{ flex: 1, background: 'var(--primary)', color: 'white' }}>{matchConfig.teamA.name}</button>
                                <button className="btn" style={{ flex: 1, background: 'var(--card-border)' }}>{matchConfig.teamB.name}</button>
                            </div>

                            <div className="card" style={{ maxHeight: '50vh', overflowY: 'auto', padding: '1rem' }}>
                                {matchConfig.teamA.players.map((player, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.4, width: '20px' }}>{idx + 1}</span>
                                        <input
                                            type="text"
                                            placeholder={`Player ${idx + 1} Name`}
                                            value={player}
                                            onChange={(e) => handlePlayerChange('teamA', idx, e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                background: 'transparent',
                                                border: 'none',
                                                borderBottom: '1px solid var(--card-border)',
                                                color: 'var(--foreground)'
                                            }}
                                        />
                                    </div>
                                ))}
                                <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--card-border)', paddingTop: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.5rem' }}>Optional Impact Player (12th)</label>
                                    <input
                                        type="text"
                                        placeholder="Impact Player Name"
                                        value={matchConfig.teamA.impactPlayer}
                                        onChange={(e) => handleImpactPlayerChange('teamA', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'rgba(16, 185, 129, 0.05)',
                                            border: '1px solid var(--primary)',
                                            borderRadius: '8px',
                                            color: 'var(--foreground)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
                                <button className="btn btn-primary" style={{ flex: 2, padding: '1rem' }} onClick={() => setStep(3)}>Confirm Squads</button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.5rem'
                                }}>
                                    <Trophy size={40} />
                                </div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Ready to Play?</h2>
                                <p style={{ opacity: 0.6, marginTop: '0.5rem' }}>
                                    {matchConfig.teamA.name} vs {matchConfig.teamB.name}<br />
                                    {matchConfig.maxOvers} Overs • T20 Format
                                </p>
                            </div>

                            <div className="card" style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span>Playing 11 Confirmed</span>
                                    <CheckCircle2 color="var(--primary)" size={18} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Impact Player Registered</span>
                                    <CheckCircle2 color="var(--primary)" size={18} />
                                </div>
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem' }} onClick={startMatch}>
                                Toss & Start Scoring
                            </button>
                            <button className="btn" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setStep(2)}>
                                Edit Squads
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
