"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScorer } from '@/hooks/useScorer';
import {
    ChevronLeft,
    RotateCcw,
    XOctagon,
    Settings2,
    Info,
    X,
    Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScorerPage() {
    const router = useRouter();
    const [config, setConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('currentMatchConfig');
        if (saved) {
            setConfig(JSON.parse(saved));
        }
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
                <div className="loader" />
            </div>
        );
    }

    if (!config) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', gap: '1rem' }}>
                <p style={{ opacity: 0.6 }}>No active match configuration found.</p>
                <button className="btn btn-primary" onClick={() => router.push('/scorer/setup')}>Start New Match</button>
            </div>
        );
    }

    return <ScorerBoard config={config} />;
}

function ScorerBoard({ config }) {
    const router = useRouter();
    const {
        matchState,
        overs,
        addBall,
        undo,
        setStriker,
        setNonStriker,
        setBowler
    } = useScorer(config);

    const [showWicketModal, setShowWicketModal] = useState(false);
    const [showScorecard, setShowScorecard] = useState(false);
    const [selectedExtra, setSelectedExtra] = useState(null);
    const [fielder, setFielder] = useState('');

    const handleRunClick = (runs) => {
        if (matchState.isPaused) return;
        addBall({
            runs,
            isExtra: !!selectedExtra,
            extraType: selectedExtra,
            isWicket: false
        });
        setSelectedExtra(null);
    };

    const handleWicket = (type) => {
        if (['Caught', 'Run Out'].includes(type) && !fielder) {
            const f = prompt(`Enter ${type === 'Caught' ? 'Fielder' : 'Fielder'} Name:`);
            addBall({ runs: 0, isExtra: false, isWicket: true, wicketType: type, fielder: f || 'Fielder' });
        } else {
            addBall({ runs: 0, isExtra: false, isWicket: true, wicketType: type });
        }
        setShowWicketModal(false);
    };

    const finalizeMatch = () => {
        const stats = {
            date: new Date().toLocaleDateString(),
            teams: `${matchState.battingTeam.name} vs ${matchState.bowlingTeam.name}`,
            scorecard: matchState.scorecard
        };
        const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
        history.push(stats);
        localStorage.setItem('matchHistory', JSON.stringify(history));
        alert('Match Finalized! Stats synced to profiles.');
        router.push('/profile');
    };

    const getAvailableBatters = () => {
        return matchState.battingTeam.players.filter(p => p !== matchState.striker && p !== matchState.nonStriker);
    };

    const getAvailableBowlers = () => {
        return matchState.bowlingTeam.players.filter(p => p !== matchState.bowler);
    };


    return (
        <main style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--background)',
            color: 'var(--foreground)'
        }}>
            {/* Selection Modals Overlay */}
            {matchState.isPaused && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.95)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 5000,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '2rem',
                    color: 'white'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <Trophy size={48} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                            {matchState.pauseReason === 'INIT' ? 'Match Start Setup' :
                                matchState.pauseReason === 'WICKET' ? 'New Batter' : 'New Bowler'}
                        </h2>
                        <p style={{ opacity: 0.6 }}>Choose the next player to continue</p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {(!matchState.striker || matchState.pauseReason === 'WICKET') && (
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Select Striker</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {(getAvailableBatters().length > 0 ? getAvailableBatters() : ['Batter 1', 'Batter 2']).map(p => (
                                        <button key={p} className="btn" style={{ background: 'var(--card-bg)', padding: '1rem', border: '1px solid var(--card-border)' }} onClick={() => setStriker(p)}>{p}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(!matchState.nonStriker && matchState.pauseReason === 'INIT') && (
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Select Non-Striker</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {(getAvailableBatters().map(p => (
                                        <button key={p} className="btn" style={{ background: 'var(--card-bg)', padding: '1rem', border: '1px solid var(--card-border)' }} onClick={() => setNonStriker(p)}>{p}</button>
                                    )))}
                                </div>
                            </div>
                        )}

                        {(!matchState.bowler || matchState.pauseReason === 'OVER' || matchState.pauseReason === 'INIT') && (
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Select Bowler</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {(getAvailableBowlers().length > 0 ? getAvailableBowlers() : ['Bowler 1', 'Bowler 2']).map(p => (
                                        <button key={p} className="btn" style={{ background: 'var(--primary)', color: 'white', padding: '1rem' }} onClick={() => setBowler(p)}>{p}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button className="btn" style={{ opacity: 0.5 }} onClick={() => router.push('/scorer/setup')}>Back to Setup</button>
                    </div>
                </div>
            )}


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
                    <h1 style={{ fontSize: '1rem', opacity: 0.7 }}>{matchState.battingTeam.name} vs {matchState.bowlingTeam.name}</h1>
                    <p style={{ fontWeight: 600 }}>1st Innings • Max {matchState.maxOvers} Ov</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ padding: '0.5rem' }} onClick={() => setShowScorecard(true)}>
                        <Info size={20} />
                    </button>
                    {(Math.floor(matchState.balls / 6) >= matchState.maxOvers || matchState.wickets >= matchState.maxWickets) && (
                        <button className="btn" style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem' }} onClick={finalizeMatch}>
                            Finish
                        </button>
                    )}
                </div>
            </header>

            {/* Main Score Display */}
            <section style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem',
                position: 'relative',
                opacity: matchState.isPaused ? 0.3 : 1
            }}>
                <motion.div
                    key={matchState.totalRuns + '-' + matchState.balls}
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

                {/* Ball by Ball Log */}
                <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem', height: '40px', alignItems: 'center' }}>
                    {matchState.ballsLog.map((b, i) => (
                        <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: '32px', height: '32px', borderRadius: '50%', background: b === '•' ? 'var(--card-border)' : b === 'W' ? 'var(--error)' : 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                            {b}
                        </motion.div>
                    ))}
                    {matchState.ballsLog.length === 0 && !matchState.isPaused && (
                        <p style={{ opacity: 0.3, fontSize: '0.875rem' }}>New over by {matchState.bowler}...</p>
                    )}
                </div>

                <div style={{
                    marginTop: '3rem',
                    width: '100%',
                    maxWidth: '400px',
                    display: 'flex',
                    justifyContent: 'space-around',
                    background: 'var(--card-bg)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Striker</p>
                        <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>{matchState.striker || '?'}</p>
                        <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                            {matchState.striker ? `${matchState.scorecard.batting[matchState.striker]?.runs || 0}(${matchState.scorecard.batting[matchState.striker]?.balls || 0})` : '-'}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center', opacity: 0.7 }}>
                        <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Non-Striker</p>
                        <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{matchState.nonStriker || '?'}</p>
                        <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                            {matchState.nonStriker ? `${matchState.scorecard.batting[matchState.nonStriker]?.runs || 0}(${matchState.scorecard.batting[matchState.nonStriker]?.balls || 0})` : '-'}
                        </p>
                    </div>
                </div>
            </section>

            {/* Scoring Controls */}
            <section style={{
                background: 'var(--card-bg)',
                borderTopLeftRadius: '2.5rem',
                borderTopRightRadius: '2.5rem',
                padding: '2rem 1.5rem 3rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '0 -10px 25px rgba(0,0,0,0.1)',
                opacity: matchState.isPaused ? 0.5 : 1,
                pointerEvents: matchState.isPaused ? 'none' : 'auto'
            }}>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    {['wide', 'noBall', 'bye', 'legBye'].map(type => (
                        <button key={type} onClick={() => setSelectedExtra(selectedExtra === type ? null : type)} style={{ padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, border: '2px solid', borderColor: selectedExtra === type ? 'var(--primary)' : 'var(--card-border)', background: selectedExtra === type ? 'var(--primary)' : 'transparent', color: selectedExtra === type ? 'white' : 'var(--foreground)', transition: 'all 0.2s' }}>
                            {type.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    {[0, 1, 2, 3, 4, 6].map(run => (
                        <button key={run} onClick={() => handleRunClick(run)} className="btn" style={{ height: '70px', fontSize: '1.5rem', borderRadius: 'var(--radius-md)', background: run === 4 || run === 6 ? 'var(--accent)' : 'var(--card-border)', color: 'white', fontWeight: 800 }}>
                            {run}
                        </button>
                    ))}
                    <button className="btn" onClick={() => setShowWicketModal(true)} style={{ gridColumn: 'span 2', background: 'var(--error)', color: 'white', height: '70px', fontSize: '1.25rem', fontWeight: 800 }}>
                        <XOctagon style={{ marginRight: '0.5rem' }} /> WICKET
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                    <button onClick={undo} style={{ background: 'none', border: 'none', color: 'var(--foreground)', opacity: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.75rem' }}>
                        <RotateCcw size={24} />
                        <span style={{ marginTop: '0.25rem' }}>UNDO</span>
                    </button>
                    <button onClick={() => setShowScorecard(true)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', opacity: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.75rem' }}>
                        <Settings2 size={24} />
                        <span style={{ marginTop: '0.25rem' }}>FULL CARD</span>
                    </button>
                </div>
            </section>

            {/* Scorecard Modal */}
            <AnimatePresence>
                {showScorecard && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'var(--background)', zIndex: 4000, padding: '1.5rem', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Full Scorecard</h2>
                            <button className="btn" onClick={() => setShowScorecard(false)}><X /></button>
                        </div>

                        <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
                            <p>Scorer: {matchState.officials?.scorer}</p>
                            <p>Umpires: {matchState.officials?.umpires || 'None'}</p>
                        </div>

                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>{matchState.battingTeam.name} Batting</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--card-border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'var(--card-bg)', padding: '0.75rem', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5 }}>
                                <span>BATTER</span><span>R</span><span>B</span><span>SR</span>
                            </div>
                            {Object.entries(matchState.scorecard.batting).map(([name, stats]) => (
                                <div key={name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'var(--card-bg)', padding: '1rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600 }}>{name}</span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{stats.dismissal || 'not out'}</span>
                                    </div>
                                    <span>{stats.runs}</span><span>{stats.balls}</span><span>{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0'}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800 }}>
                                <span>TOTAL</span><span>{matchState.totalRuns}/{matchState.wickets}</span>
                            </div>
                            <p style={{ fontSize: '0.875rem', opacity: 0.6, marginTop: '0.5rem' }}>
                                Extras: {Object.values(matchState.extras).reduce((a, b) => a + b, 0)}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Wicket Modal */}
            <AnimatePresence>
                {showWicketModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 3500, display: 'flex', alignItems: 'flex-end' }}>
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} style={{ width: '100%', background: 'var(--background)', borderTopLeftRadius: '2rem', borderTopRightRadius: '2rem', padding: '2rem' }}>
                            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Choose Wicket Type</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Other'].map(type => (
                                    <button key={type} className="btn" onClick={() => handleWicket(type)} style={{ background: 'var(--card-border)', padding: '1.5rem' }}>{type}</button>
                                ))}
                            </div>
                            <button className="btn" onClick={() => setShowWicketModal(false)} style={{ width: '100%', marginTop: '1.5rem', background: 'transparent', border: '1px solid var(--card-border)' }}>Cancel</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
