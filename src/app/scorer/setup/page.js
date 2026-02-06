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
        teamA: { name: 'PVCC', players: Array(11).fill(''), impactPlayer: '' },
        teamB: { name: 'SVCC', players: Array(11).fill(''), impactPlayer: '' },
        maxOvers: 20,
        maxWickets: 11,
        scorerName: 'Lenny Rajan',
        umpires: ''
    });

    const [tossResult, setTossResult] = useState({ winner: '', choice: '' }); // winner: 'teamA' or 'teamB', choice: 'bat' or 'bowl'
    const [isFlipping, setIsFlipping] = useState(false);

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

    const isSquadComplete = (team) => {
        return matchConfig[team].players.every(p => p.trim() !== '');
    };

    const runToss = () => {
        setIsFlipping(true);
        setTimeout(() => {
            const winner = Math.random() > 0.5 ? 'teamA' : 'teamB';
            setTossResult({ winner, choice: '' });
            setIsFlipping(false);
        }, 1500);
    };

    const startMatch = () => {
        if (!isSquadComplete('teamA') || !isSquadComplete('teamB')) {
            alert('Please fill in all player names for both squads.');
            return;
        }

        // Determine who bats first based on toss
        let finalConfig = { ...matchConfig };
        const tossWinner = tossResult.winner;
        const choice = tossResult.choice;

        const teamA_Name = matchConfig.teamA.name;
        const teamB_Name = matchConfig.teamB.name;

        // If Team A won and chose Bat OR Team B won and chose Bowl -> Team A bats first
        const teamAbatsFirst = (tossWinner === 'teamA' && choice === 'bat') || (tossWinner === 'teamB' && choice === 'bowl');

        if (!teamAbatsFirst) {
            // Swap teams so teamA is always the batting first team in currentMatchConfig
            finalConfig.teamA = matchConfig.teamB;
            finalConfig.teamB = matchConfig.teamA;
        }

        localStorage.setItem('currentMatchConfig', JSON.stringify(finalConfig));
        router.push('/scorer');
    };

    return (
        <main style={{
            minHeight: '100vh',
            background: 'var(--background)',
            color: 'var(--foreground)',
            paddingBottom: '2rem'
        }}>
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
                <div style={{ display: 'flex', gap: '4px', marginBottom: '2rem' }}>
                    {[1, 2, 3, 4, 5].map(s => (
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
                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Match Details</h2>
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', opacity: 0.6, marginBottom: '0.5rem' }}>Team A</label>
                                        <input
                                            type="text"
                                            value={matchConfig.teamA.name}
                                            onChange={(e) => setMatchConfig({ ...matchConfig, teamA: { ...matchConfig.teamA, name: e.target.value } })}
                                            className="input-field"
                                            style={{ width: '100%', padding: '1rem', background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--foreground)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', opacity: 0.6, marginBottom: '0.5rem' }}>Team B</label>
                                        <input
                                            type="text"
                                            value={matchConfig.teamB.name}
                                            onChange={(e) => setMatchConfig({ ...matchConfig, teamB: { ...matchConfig.teamB, name: e.target.value } })}
                                            className="input-field"
                                            style={{ width: '100%', padding: '1rem', background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--foreground)' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', opacity: 0.6, marginBottom: '0.5rem' }}>Max Overs</label>
                                        <input
                                            type="number"
                                            value={matchConfig.maxOvers}
                                            onChange={(e) => setMatchConfig({ ...matchConfig, maxOvers: parseInt(e.target.value) || 20 })}
                                            className="input-field"
                                            style={{ width: '100%', padding: '1rem', background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--foreground)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', opacity: 0.6, marginBottom: '0.5rem' }}>Wicket Limit</label>
                                        <input
                                            type="number"
                                            value={matchConfig.maxWickets}
                                            onChange={(e) => setMatchConfig({ ...matchConfig, maxWickets: parseInt(e.target.value) || 11 })}
                                            className="input-field"
                                            style={{ width: '100%', padding: '1rem', background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--foreground)' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', opacity: 0.6, marginBottom: '0.5rem' }}>Scorer Name</label>
                                    <input
                                        type="text"
                                        value={matchConfig.scorerName}
                                        onChange={(e) => setMatchConfig({ ...matchConfig, scorerName: e.target.value })}
                                        className="input-field"
                                        style={{ width: '100%', padding: '1rem', background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--foreground)' }}
                                    />
                                </div>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', padding: '1rem' }} onClick={() => setStep(2)}>
                                Next: {matchConfig.teamA.name} Squad
                            </button>
                        </motion.div>
                    )}

                    {(step === 2 || step === 3) && (
                        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>{step === 2 ? matchConfig.teamA.name : matchConfig.teamB.name} Squad</h2>
                            <div className="card" style={{ padding: '1rem' }}>
                                {matchConfig[step === 2 ? 'teamA' : 'teamB'].players.map((player, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.4, width: '20px' }}>{idx + 1}</span>
                                        <input
                                            type="text"
                                            placeholder={`Player Name`}
                                            value={player}
                                            onChange={(e) => handlePlayerChange(step === 2 ? 'teamA' : 'teamB', idx, e.target.value)}
                                            style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                                        />
                                    </div>
                                ))}
                                <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--card-border)', paddingTop: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.5rem' }}>Impact Player</label>
                                    <input
                                        type="text"
                                        placeholder="Optional 12th player"
                                        value={matchConfig[step === 2 ? 'teamA' : 'teamB'].impactPlayer}
                                        onChange={(e) => handleImpactPlayerChange(step === 2 ? 'teamA' : 'teamB', e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--foreground)' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>Back</button>
                                <button className="btn btn-primary" style={{ flex: 2, padding: '1rem' }} onClick={() => {
                                    if (isSquadComplete(step === 2 ? 'teamA' : 'teamB')) setStep(step + 1);
                                    else alert('Please enter all 11 players.');
                                }}>{step === 2 ? `Next: ${matchConfig.teamB.name} Squad` : 'Next: Coin Toss'}</button>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem' }}>Coin Toss</h2>

                            <div style={{ position: 'relative', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                                <motion.div
                                    animate={isFlipping ? {
                                        rotateY: [0, 180, 360, 540, 720, 900, 1080],
                                        y: [0, -100, 0]
                                    } : { rotateY: 0, y: 0 }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(45deg, #ffd700, #ff8c00)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        fontWeight: 900,
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                                        border: '4px solid rgba(255,255,255,0.3)'
                                    }}
                                >
                                    {isFlipping ? '?' : 'G'}
                                </motion.div>
                            </div>

                            {!tossResult.winner && !isFlipping && (
                                <button className="btn btn-primary" style={{ width: '100%', padding: '1.25rem' }} onClick={runToss}>
                                    Flip the Coin!
                                </button>
                            )}

                            {tossResult.winner && !isFlipping && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--primary)' }}>
                                        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                            {matchConfig[tossResult.winner].name} WON the toss!
                                        </p>
                                    </div>

                                    <p style={{ opacity: 0.6, marginBottom: '1rem' }}>What did they choose?</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <button
                                            className={`btn ${tossResult.choice === 'bat' ? 'btn-primary' : ''}`}
                                            style={{ padding: '1rem', border: '1px solid var(--card-border)' }}
                                            onClick={() => setTossResult({ ...tossResult, choice: 'bat' })}
                                        >
                                            BAT
                                        </button>
                                        <button
                                            className={`btn ${tossResult.choice === 'bowl' ? 'btn-primary' : ''}`}
                                            style={{ padding: '1rem', border: '1px solid var(--card-border)' }}
                                            onClick={() => setTossResult({ ...tossResult, choice: 'bowl' })}
                                        >
                                            BOWL
                                        </button>
                                    </div>

                                    {tossResult.choice && (
                                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', padding: '1.25rem' }} onClick={() => setStep(5)}>
                                            Continue to Confirmation
                                        </button>
                                    )}
                                </motion.div>
                            )}

                            <button className="btn" style={{ marginTop: '1rem', opacity: 0.5 }} onClick={() => setStep(3)}>Back</button>
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div key="step5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <Trophy size={40} />
                                </div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Ready to Play!</h2>
                                <div className="card" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                                    <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>Match Summary:</p>
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <p><strong>Batting First:</strong> {
                                            (tossResult.winner === 'teamA' && tossResult.choice === 'bat') || (tossResult.winner === 'teamB' && tossResult.choice === 'bowl')
                                                ? matchConfig.teamA.name
                                                : matchConfig.teamB.name
                                        }</p>
                                        <p><strong>Bowling First:</strong> {
                                            (tossResult.winner === 'teamA' && tossResult.choice === 'bat') || (tossResult.winner === 'teamB' && tossResult.choice === 'bowl')
                                                ? matchConfig.teamB.name
                                                : matchConfig.teamA.name
                                        }</p>
                                        <p><strong>Overs/Wickets:</strong> {matchConfig.maxOvers} Ov / {matchConfig.maxWickets} Wkts</p>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setStep(4)}>Edit Toss</button>
                                <button className="btn btn-primary" style={{ flex: 2, padding: '1.25rem' }} onClick={startMatch}>Start Scoring</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
