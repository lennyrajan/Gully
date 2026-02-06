"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScorer } from '@/hooks/useScorer';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
        lastSynced,
        swapStriker,
        startNextInnings,
        maxOversPerBowler,
        setStriker,
        setNonStriker,
        setBatters,
        setBowler
    } = useScorer(config);

    const [showWicketModal, setShowWicketModal] = useState(false);
    const [showScorecard, setShowScorecard] = useState(false);
    const [selectedExtra, setSelectedExtra] = useState(null);
    const [fielder1, setFielder1] = useState('');
    const [fielder2, setFielder2] = useState('');
    const [wicketTypePending, setWicketTypePending] = useState(null);
    const [isStrikerOutChoice, setIsStrikerOutChoice] = useState(true);
    const [showWicketDetailModal, setShowWicketDetailModal] = useState(false);
    const [showFielderModal, setShowFielderModal] = useState(false);
    const [newBatterPending, setNewBatterPending] = useState('');

    const handleRunClick = (runs) => {
        if (matchState.isPaused || !matchState.bowler) return;
        addBall({
            runs,
            isExtra: !!selectedExtra,
            extraType: selectedExtra,
            isWicket: false
        });
        setSelectedExtra(null);
    };

    const handleWicketClick = (type) => {
        setWicketTypePending(type);
        const autoSkipTypes = ['Bowled', 'LBW', 'Retired'];

        if (autoSkipTypes.includes(type)) {
            addBall({
                runs: 0,
                isExtra: false,
                isWicket: true,
                wicketType: type,
                fielder: '',
                isStrikerOut: true
            });
            setShowWicketModal(false);
            return;
        }

        if (type === 'Stumped') {
            const team = matchState.bowlingTeam;
            const wkIndex = team.wicketKeeper;
            const wkName = (wkIndex !== null && wkIndex !== undefined) ? team.players[wkIndex] : 'Wicket Keeper';
            setFielder1(wkName);
            setIsStrikerOutChoice(true);
            setShowWicketModal(false);
            setShowFielderModal(true);
        } else {
            setShowWicketModal(false);
            setShowFielderModal(true);
        }
    };

    const confirmWicketDetails = () => {
        const fielderText = fielder2 ? `${fielder1} / ${fielder2}` : fielder1;
        addBall({
            runs: 0,
            isExtra: false,
            isWicket: true,
            wicketType: wicketTypePending,
            fielder: fielderText || 'Fielder',
            isStrikerOut: isStrikerOutChoice
        });
        setFielder1('');
        setFielder2('');
        setShowFielderModal(false);
    };

    const handleStrikeChoice = (isNewBatterStriker) => {
        const survivor = isStrikerOutChoice ? matchState.nonStriker : matchState.striker;
        if (isNewBatterStriker) {
            setBatters(newBatterPending, survivor);
        } else {
            setBatters(survivor, newBatterPending);
        }
        setNewBatterPending('');
        setWicketTypePending(null);
    };

    const finalizeMatch = async () => {
        // If it's the 1st innings, offer to start next innings instead of fully finalizing
        if (matchState.innings === 1) {
            const proceed = window.confirm("End of 1st Innings. Start 2nd Innings?");
            if (proceed) {
                await updateDoc(doc(db, 'matches', matchState.matchId), {
                    status: 'INNINGS_BREAK',
                    lastUpdated: new Date().toISOString()
                });
                startNextInnings();
                return;
            }
        }

        const stats = {
            date: new Date().toLocaleDateString(),
            teams: `${matchState.battingTeam.name} vs ${matchState.bowlingTeam.name}`,
            inningsHistory: [
                ...(matchState.completedInnings || []),
                {
                    inningsNum: matchState.innings,
                    battingTeam: matchState.battingTeam.name,
                    bowlingTeam: matchState.bowlingTeam.name,
                    totalRuns: matchState.totalRuns,
                    wickets: matchState.wickets,
                    balls: matchState.balls,
                    scorecard: matchState.scorecard
                }
            ]
        };

        // Update Firestore status
        if (matchState.matchId) {
            try {
                await updateDoc(doc(db, 'matches', matchState.matchId), {
                    status: 'FINISHED',
                    lastUpdated: new Date().toISOString()
                });
            } catch (error) {
                console.error("Error finalising match in Firestore:", error);
            }
        }

        const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
        history.push(stats);
        localStorage.setItem('matchHistory', JSON.stringify(history));
        alert('Match Finalized! Stats synced to profiles.');
        router.push('/profile');
    };

    const getAvailableBatters = () => {
        return matchState.battingTeam.players.filter(p =>
            p !== matchState.striker &&
            p !== matchState.nonStriker &&
            !matchState.scorecard.batting[p]?.dismissal
        );
    };

    const getAvailableBowlers = () => {
        return matchState.bowlingTeam.players.filter(p =>
            p !== matchState.bowler &&
            p !== matchState.lastBowler
        );
    };

    const getPlayerDisplayName = (player, teamType) => {
        if (!player) return '';
        const team = teamType === 'batting' ? matchState.battingTeam : matchState.bowlingTeam;
        const playerIndex = team.players.indexOf(player);
        if (playerIndex === -1) return player;

        let suffix = '';
        if (team.captain === playerIndex) suffix += ' (C)';
        if (team.viceCaptain === playerIndex) suffix += ' (VC)';
        if (team.wicketKeeper === playerIndex) suffix += ' (WK)';

        return player + suffix;
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
                        {matchState.pauseReason === 'WICKET' && !newBatterPending && (
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'block', color: 'var(--primary)' }}>Select New Batter</label>
                                <select
                                    className="input-field"
                                    style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', fontSize: '1.1rem' }}
                                    onChange={(e) => setNewBatterPending(e.target.value)}
                                    value={newBatterPending}
                                >
                                    <option value="" disabled>Choose New Batter...</option>
                                    {getAvailableBatters().map(p => (
                                        <option key={p} value={p}>{getPlayerDisplayName(p, 'batting')}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {matchState.pauseReason === 'WICKET' && newBatterPending && (
                            <div style={{ textAlign: 'center' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.5rem', display: 'block', color: 'var(--accent)' }}>Who is on Strike?</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '1.5rem', fontSize: '1rem' }}
                                        onClick={() => handleStrikeChoice(true)}
                                    >
                                        {newBatterPending}<br />
                                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(New Batter)</span>
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '1.5rem', fontSize: '1rem', background: 'var(--card-border)' }}
                                        onClick={() => handleStrikeChoice(false)}
                                    >
                                        {isStrikerOutChoice ? matchState.nonStriker : matchState.striker}<br />
                                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(Survivor)</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {matchState.pauseReason === 'INIT' && (
                            <>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'block', color: 'var(--primary)' }}>Select Striker</label>
                                    <select
                                        className="input-field"
                                        style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', fontSize: '1.1rem' }}
                                        onChange={(e) => setStriker(e.target.value)}
                                        value={matchState.striker || ''}
                                    >
                                        <option value="" disabled>Choose Striker...</option>
                                        {matchState.battingTeam.players
                                            .filter(p => p.trim() !== '' && p !== matchState.nonStriker)
                                            .map(p => (
                                                <option key={p} value={p}>{getPlayerDisplayName(p, 'batting')}</option>
                                            ))}
                                    </select>
                                </div>
                                <div style={{ marginTop: '1.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'block', color: 'var(--primary)' }}>Select Non-Striker</label>
                                    <select
                                        className="input-field"
                                        style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', fontSize: '1.1rem' }}
                                        onChange={(e) => setNonStriker(e.target.value)}
                                        value={matchState.nonStriker || ''}
                                    >
                                        <option value="" disabled>Choose Non-Striker...</option>
                                        {matchState.battingTeam.players
                                            .filter(p => p.trim() !== '' && p !== matchState.striker)
                                            .map(p => (
                                                <option key={p} value={p}>{getPlayerDisplayName(p, 'batting')}</option>
                                            ))}
                                    </select>
                                </div>
                                <div style={{ marginTop: '1.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'block', color: 'var(--accent)' }}>Select Bowler</label>
                                    <select
                                        className="input-field"
                                        style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', fontSize: '1.1rem' }}
                                        onChange={(e) => setBowler(e.target.value)}
                                        value={matchState.bowler || ''}
                                    >
                                        <option value="" disabled>Choose Bowler...</option>
                                        {matchState.bowlingTeam.players
                                            .filter(p => p.trim() !== '')
                                            .map(p => {
                                                const bStats = matchState.scorecard.bowling[p];
                                                const ballsBowled = bStats ? bStats.balls : 0;
                                                const overCount = Math.floor(ballsBowled / 6);
                                                const isLimitReached = overCount >= maxOversPerBowler;

                                                return (
                                                    <option key={p} value={p} disabled={isLimitReached}>
                                                        {getPlayerDisplayName(p, 'bowling')} {isLimitReached ? '(Limit Reached)' : `(${overCount} Ov)`}
                                                    </option>
                                                );
                                            })}
                                    </select>
                                </div>
                            </>
                        )}

                        {matchState.pauseReason === 'OVER' && (
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'block', color: 'var(--accent)' }}>Select Bowler</label>
                                <select
                                    className="input-field"
                                    style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', fontSize: '1.1rem' }}
                                    onChange={(e) => setBowler(e.target.value)}
                                    value={matchState.bowler || ''}
                                >
                                    <option value="" disabled>Choose Bowler...</option>
                                    {matchState.bowlingTeam.players
                                        .filter(p => p !== matchState.lastBowler)
                                        .map(p => {
                                            const bStats = matchState.scorecard.bowling[p];
                                            const ballsBowled = bStats ? bStats.balls : 0;
                                            const overCount = Math.floor(ballsBowled / 6);
                                            const isLimitReached = overCount >= maxOversPerBowler;

                                            return (
                                                <option key={p} value={p} disabled={isLimitReached}>
                                                    {getPlayerDisplayName(p, 'bowling')} {isLimitReached ? '(Limit Reached)' : `(${overCount} Ov)`}
                                                </option>
                                            );
                                        })}
                                </select>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <p style={{ fontWeight: 600 }}>1st Innings • Max {matchState.maxOvers} Ov</p>
                        {matchState.matchId && (
                            <span style={{
                                fontSize: '0.65rem',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: '#22c55e',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                            }}>
                                <span style={{ width: '6px', height: '6px', background: lastSynced ? '#22c55e' : '#eab308', borderRadius: '50%' }} />
                                {lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Syncing...'}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ padding: '0.5rem' }} onClick={() => setShowScorecard(true)}>
                        <Info size={20} />
                    </button>
                    {(Math.floor(matchState.balls / 6) >= matchState.maxOvers || matchState.wickets >= matchState.maxWickets) && (
                        <button className="btn" style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem' }} onClick={finalizeMatch}>
                            {matchState.innings === 2 ? 'Finish' : 'End Innings'}
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
                    flexDirection: 'column',
                    gap: '1.25rem'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        background: 'var(--card-bg)',
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-md)',
                        position: 'relative',
                        border: '1px solid var(--card-border)'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Striker</p>
                            <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>{getPlayerDisplayName(matchState.striker, 'batting') || '?'}</p>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                {matchState.striker ? `${matchState.scorecard.batting[matchState.striker]?.runs || 0}(${matchState.scorecard.batting[matchState.striker]?.balls || 0})` : '-'}
                            </p>
                        </div>

                        <button
                            onClick={swapStriker}
                            style={{
                                alignSelf: 'center',
                                background: 'var(--card-bg)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '50%',
                                padding: '0.6rem',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            title="Swap Striker"
                        >
                            <RotateCcw size={16} />
                        </button>

                        <div style={{ textAlign: 'center', opacity: 0.8 }}>
                            <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Non-Striker</p>
                            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{getPlayerDisplayName(matchState.nonStriker, 'batting') || '?'}</p>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                {matchState.nonStriker ? `${matchState.scorecard.batting[matchState.nonStriker]?.runs || 0}(${matchState.scorecard.batting[matchState.nonStriker]?.balls || 0})` : '-'}
                            </p>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '1rem',
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '0.75rem 1.25rem',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
                    }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 800 }}>Bowler</p>
                            <p style={{ fontWeight: 800, fontSize: '1rem' }}>{getPlayerDisplayName(matchState.bowler, 'bowling') || '?'}</p>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.3)' }} />
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 800 }}>Stats</p>
                            <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                                {matchState.scorecard.bowling[matchState.bowler]?.overs || '0.0'}-{matchState.scorecard.bowling[matchState.bowler]?.maidens || 0}-{matchState.scorecard.bowling[matchState.bowler]?.runs || 0}-{matchState.scorecard.bowling[matchState.bowler]?.wickets || 0}
                            </p>
                        </div>
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
                            <p>Scorer: {matchState.officials?.scorer || matchState.scorerName}</p>
                            <p>Umpires: {[matchState.officials?.umpires?.umpire1, matchState.officials?.umpires?.umpire2].filter(Boolean).join(', ') || 'None'}</p>
                        </div>

                        {/* Completed Innings */}
                        {matchState.completedInnings?.map((inn) => (
                            <div key={inn.inningsNum} style={{ marginBottom: '3rem', borderBottom: '1px dashed var(--card-border)', paddingBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Innings {inn.inningsNum}: {inn.battingTeam}</span>
                                    <span>{inn.totalRuns}/{inn.wickets}</span>
                                </h2>

                                <h3 style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.7, marginBottom: '1rem' }}>Batting</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--card-border)', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'var(--card-bg)', padding: '0.75rem', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5 }}>
                                        <span>BATTER</span><span>R</span><span>B</span><span>SR</span>
                                    </div>
                                    {Object.entries(inn.scorecard.batting).map(([name, stats]) => (
                                        <div key={name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'var(--card-bg)', padding: '1rem', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600 }}>{name}</span>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{stats.dismissal || 'not out'}</span>
                                            </div>
                                            <span>{stats.runs}</span><span>{stats.balls}</span><span>{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0'}</span>
                                        </div>
                                    ))}
                                </div>

                                <h3 style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.7, marginBottom: '1rem' }}>Bowling</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--card-border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 1fr 1.5fr', background: 'var(--card-bg)', padding: '0.75rem', fontSize: '0.65rem', fontWeight: 700, opacity: 0.5 }}>
                                        <span>BOWLER</span><span>O</span><span>M</span><span>DOTS</span><span>R</span><span>W</span><span>ER</span>
                                    </div>
                                    {Object.entries(inn.scorecard.bowling).map(([name, stats]) => (
                                        <div key={name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 1fr 1.5fr', background: 'var(--card-bg)', padding: '1rem', fontSize: '0.85rem' }}>
                                            <span style={{ fontWeight: 600 }}>{name}</span>
                                            <span>{stats.overs}</span><span>{stats.maidens}</span><span>{stats.dots}</span><span>{stats.runs}</span><span>{stats.wickets}</span><span>{stats.economy || '0.00'}</span>
                                        </div>
                                    ))}
                                </div>
                                <p style={{ fontSize: '0.875rem', opacity: 0.6, marginTop: '1rem' }}>
                                    Extras: {Object.values(inn.extras || {}).reduce((a, b) => a + b, 0)}
                                </p>
                            </div>
                        ))}

                        {/* Current Innings */}
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Innings {matchState.innings}: {matchState.battingTeam.name}</span>
                            <span>{matchState.totalRuns}/{matchState.wickets}</span>
                        </h2>

                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>Batting</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--card-border)', marginBottom: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'var(--card-bg)', padding: '0.75rem', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5 }}>
                                <span>BATTER</span><span>R</span><span>B</span><span>SR</span>
                            </div>
                            {Object.entries(matchState.scorecard.batting).map(([name, stats]) => (
                                <div key={name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'var(--card-bg)', padding: '1rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600 }}>{getPlayerDisplayName(name, 'batting')}</span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{stats.dismissal || 'not out'}</span>
                                    </div>
                                    <span>{stats.runs}</span><span>{stats.balls}</span><span>{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0'}</span>
                                </div>
                            ))}
                        </div>

                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '1rem' }}>{matchState.bowlingTeam.name} Bowling</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--card-border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 1fr 1.5fr', background: 'var(--card-bg)', padding: '0.75rem', fontSize: '0.65rem', fontWeight: 700, opacity: 0.5 }}>
                                <span>BOWLER</span><span>O</span><span>M</span><span>DOTS</span><span>R</span><span>W</span><span>ER</span>
                            </div>
                            {Object.entries(matchState.scorecard.bowling).map(([name, stats]) => (
                                <div key={name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 1fr 1.5fr', background: 'var(--card-bg)', padding: '1rem', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: 600 }}>{getPlayerDisplayName(name, 'bowling')}</span>
                                    <span>{stats.overs}</span>
                                    <span>{stats.maidens}</span>
                                    <span>{stats.dots}</span>
                                    <span>{stats.runs}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{stats.wickets}</span>
                                    <span style={{ opacity: 0.7 }}>{stats.economy || '0.00'}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--primary)' }}>
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
                                {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Retired', 'Other'].map(type => (
                                    <button key={type} className="btn" onClick={() => handleWicketClick(type)} style={{ background: 'var(--card-border)', padding: '1.5rem' }}>{type}</button>
                                ))}
                            </div>
                            <button className="btn" onClick={() => setShowWicketModal(false)} style={{ width: '100%', marginTop: '1.5rem', background: 'transparent', border: '1px solid var(--card-border)' }}>Cancel</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fielder Selection Modal */}
            <AnimatePresence>
                {showFielderModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 6000, display: 'flex', alignItems: 'flex-end' }}>
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} style={{ width: '100%', background: 'var(--background)', borderTopLeftRadius: '2rem', borderTopRightRadius: '2rem', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Wicket: {wicketTypePending}</h2>
                            <p style={{ textAlign: 'center', opacity: 0.6, marginBottom: '2rem' }}>Select the fielder(s) involved</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', color: 'var(--primary)' }}>Fielder 1</label>
                                    <select
                                        className="input-field"
                                        style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white' }}
                                        value={fielder1}
                                        onChange={(e) => setFielder1(e.target.value)}
                                        disabled={wicketTypePending === 'Stumped'}
                                    >
                                        <option value="">{wicketTypePending === 'Stumped' ? fielder1 : 'Choose Fielder...'}</option>
                                        {matchState.bowlingTeam.players.map(p => (
                                            <option key={p} value={p}>{getPlayerDisplayName(p, 'bowling')}</option>
                                        ))}
                                    </select>
                                </div>

                                {wicketTypePending === 'Run Out' && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', color: 'var(--accent)' }}>Fielder 2 (Optional)</label>
                                            <select
                                                className="input-field"
                                                style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white' }}
                                                value={fielder2}
                                                onChange={(e) => setFielder2(e.target.value)}
                                            >
                                                <option value="">Choose Fielder...</option>
                                                {matchState.bowlingTeam.players.map(p => (
                                                    <option key={p} value={p}>{getPlayerDisplayName(p, 'bowling')}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'block', color: 'var(--error)', textAlign: 'center' }}>Who was Out?</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <button
                                                    className="btn"
                                                    style={{
                                                        padding: '1rem',
                                                        background: isStrikerOutChoice ? 'var(--error)' : 'var(--card-border)',
                                                        color: 'white',
                                                        border: isStrikerOutChoice ? 'none' : '1px solid var(--card-border)'
                                                    }}
                                                    onClick={() => setIsStrikerOutChoice(true)}
                                                >
                                                    Striker<br /><span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{matchState.striker}</span>
                                                </button>
                                                <button
                                                    className="btn"
                                                    style={{
                                                        padding: '1rem',
                                                        background: !isStrikerOutChoice ? 'var(--error)' : 'var(--card-border)',
                                                        color: 'white',
                                                        border: !isStrikerOutChoice ? 'none' : '1px solid var(--card-border)'
                                                    }}
                                                    onClick={() => setIsStrikerOutChoice(false)}
                                                >
                                                    Non-Striker<br /><span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{matchState.nonStriker}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '1.25rem', marginTop: '1rem' }}
                                    onClick={confirmWicketDetails}
                                    disabled={!fielder1}
                                >
                                    Confirm Wicket
                                </button>
                                <button className="btn" onClick={() => setShowFielderModal(false)} style={{ background: 'transparent', border: '1px solid var(--card-border)' }}>Cancel</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
