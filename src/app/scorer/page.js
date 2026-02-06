"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScorer } from '@/hooks/useScorer';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getResourcePercentage, calculateRevisedTarget } from '@/lib/dls';
import { calculateMVPs } from '@/lib/mvp';
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
import { useAuth } from '@/lib/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';

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
        router.push('/scorer/setup');
        return null;
    }

    return (
        <ProtectedRoute>
            <ScorerBoard config={config} />
        </ProtectedRoute>
    );
}

function ScorerBoard({ config }) {
    const router = useRouter();
    const { currentUser } = useAuth();
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
        setBowler,
        changeBowler,
        updateDLS
    } = useScorer(config);

    const [showWicketModal, setShowWicketModal] = useState(false);
    const [showScorecard, setShowScorecard] = useState(false);
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [showDLSModal, setShowDLSModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showBowlerChangeModal, setShowBowlerChangeModal] = useState(false);
    const [showMatchSummary, setShowMatchSummary] = useState(false);
    const [selectedPOTM, setSelectedPOTM] = useState(null);
    const [mvps, setMvps] = useState([]);
    const [transferCode, setTransferCode] = useState(null);

    // DLS Modal State
    const [dlsOversRemaining, setDlsOversRemaining] = useState(matchState.maxOvers);
    const [dlsWicketsLost, setDlsWicketsLost] = useState(matchState.wickets);
    const [dlsTeam1Score, setDlsTeam1Score] = useState(matchState.innings === 2 ? (matchState.completedInnings[0]?.totalRuns || 100) : 100);
    const [dlsRevisedTargetResult, setDlsRevisedTargetResult] = useState(null);
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

    useEffect(() => {
        if (matchState.isMatchFinished && !showMatchSummary) {
            const calculatedMvps = calculateMVPs(matchState.scorecard);
            setMvps(calculatedMvps);
            if (calculatedMvps.length > 0) {
                setSelectedPOTM(calculatedMvps[0].name);
            }
            setShowMatchSummary(true);
        }
    }, [matchState.isMatchFinished, matchState.scorecard, showMatchSummary]);

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
                    playerOfTheMatch: selectedPOTM,
                    mvpRankings: mvps,
                    lastUpdated: new Date().toISOString()
                });
            } catch (error) {
                console.error("Error finalising match in Firestore:", error);
            }
        }

        const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
        history.push(stats);
        localStorage.setItem('matchHistory', JSON.stringify(history));
        localStorage.removeItem('currentMatchConfig');
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

    const generateTransferCode = async () => {
        if (!matchState.matchId) {
            alert("Match ID missing. Cannot generate transfer code.");
            return;
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60000).toISOString(); // 15 mins

        try {
            await updateDoc(doc(db, 'matches', matchState.matchId), {
                transferCode: { code, expiresAt },
                lastUpdated: new Date().toISOString()
            });
            setTransferCode(code);
            setShowTransferModal(true);
        } catch (error) {
            console.error("Error generating transfer code:", error);
            alert("Failed to generate code. Check your connection.");
        }
    };

    const abandonMatch = async () => {
        const reason = window.prompt("Reason for abandoning the match (e.g., Rain, Bad Light):");
        if (reason === null) return;

        if (matchState.matchId) {
            try {
                await updateDoc(doc(db, 'matches', matchState.matchId), {
                    status: 'ABANDONED',
                    abandonReason: reason,
                    lastUpdated: new Date().toISOString()
                });
                alert('Match Abandoned.');
                localStorage.removeItem('currentMatchConfig');
                router.push('/profile');
            } catch (error) {
                console.error("Error abandoning match:", error);
                alert("Failed to abandon match in Firestore.");
            }
        } else {
            alert("Match ID missing. Cannot abandon match in Firestore.");
            localStorage.removeItem('currentMatchConfig');
            router.push('/profile');
        }
    };


    const calculateDLS = () => {
        const team1Resources = 100; // Team 1 usually used 100% unless their innings was also cut short
        const team2Resources = getResourcePercentage(dlsOversRemaining, dlsWicketsLost);
        const revised = calculateRevisedTarget(dlsTeam1Score, team1Resources, team2Resources);
        setDlsRevisedTargetResult(revised);
    };

    const applyRevisedTarget = () => {
        if (dlsRevisedTargetResult) {
            updateDLS(dlsRevisedTargetResult);
            setShowDLSModal(false);
            alert(`Revised Target applied: ${dlsRevisedTargetResult} runs`);
        }
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
                            {matchState.pauseReason === 'INIT' ? 'Match Initialization' :
                                matchState.pauseReason === 'WICKET' ? 'Wicket: Select New Batter' :
                                    matchState.pauseReason === 'INNINGS_COMPLETE' ? 'Innings Complete!' : 'New Over: Select Bowler'}
                        </h2>
                        <p style={{ opacity: 0.6 }}>Choose the next player to continue</p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {matchState.pauseReason === 'WICKET' && !newBatterPending && (
                            <div>
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
                                            .filter(p => {
                                                const hasPlayed = matchState.scorecard.batting[p];
                                                const isOut = hasPlayed && hasPlayed.dismissal;
                                                return p.trim() !== '' && p !== matchState.nonStriker && !isOut;
                                            })
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
                                            .filter(p => {
                                                const hasPlayed = matchState.scorecard.batting[p];
                                                const isOut = hasPlayed && hasPlayed.dismissal;
                                                return p.trim() !== '' && p !== matchState.striker && !isOut;
                                            })
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

                        {matchState.pauseReason === 'INNINGS_COMPLETE' && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary)' }}>
                                    {matchState.totalRuns}/{matchState.wickets}
                                </div>
                                <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem' }}>
                                    {matchState.battingTeam.name} finished their innings.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '1.5rem', fontSize: '1.1rem' }}
                                        onClick={finalizeMatch}
                                    >
                                        {matchState.innings === 1 ? 'Start 2nd Innings' : 'Finalize Match'}
                                    </button>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.5 }}>
                                        Check the scorecard for full details before continuing.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button className="btn" style={{ opacity: 0.5 }} onClick={() => router.push('/scorer/setup')}>Back to Setup</button>
                    </div>
                </div>
            )}



            {/* DLS Modal */}
            <AnimatePresence>
                {showDLSModal && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'var(--background)',
                            zIndex: 6500,
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                            color: 'var(--foreground)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Trophy size={24} color="var(--primary)" />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>DLS Calculator</h2>
                            </div>
                            <button className="btn" onClick={() => setShowDLSModal(false)}><X /></button>
                        </div>

                        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem', opacity: 0.6 }}>Team 1 Total Score</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={dlsTeam1Score}
                                    onChange={(e) => setDlsTeam1Score(Number(e.target.value))}
                                    style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', fontSize: '1.25rem', fontWeight: 700 }}
                                />
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem', opacity: 0.6 }}>Overs Remaining for Team 2</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={dlsOversRemaining}
                                    onChange={(e) => setDlsOversRemaining(Number(e.target.value))}
                                    style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', fontSize: '1.25rem', fontWeight: 700 }}
                                />
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem', opacity: 0.6 }}>Wickets Lost by Team 2</label>
                                <select
                                    className="input-field"
                                    value={dlsWicketsLost}
                                    onChange={(e) => setDlsWicketsLost(Number(e.target.value))}
                                    style={{ width: '100%', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', fontSize: '1.1rem' }}
                                >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(w => (
                                        <option key={w} value={w}>{w} Wickets</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={calculateDLS}
                                style={{ padding: '1.25rem', fontSize: '1.1rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
                            >
                                Calculate Revised Target
                            </button>

                            {dlsRevisedTargetResult !== null && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        marginTop: '1rem',
                                        padding: '2rem',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        borderRadius: '20px',
                                        textAlign: 'center'
                                    }}
                                >
                                    <p style={{ fontSize: '0.875rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Revised Target Score</p>
                                    <h3 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--primary)', margin: '0.5rem 0' }}>{dlsRevisedTargetResult}</h3>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
                                        Resources Available: {getResourcePercentage(dlsOversRemaining, dlsWicketsLost).toFixed(1)}%
                                    </p>

                                    <button
                                        className="btn btn-primary"
                                        onClick={applyRevisedTarget}
                                        style={{ width: '100%', marginTop: '2rem', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 800 }}
                                    >
                                        Apply Revised Target
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* More Options Modal */}
            <AnimatePresence>
                {showMoreOptions && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'var(--background)',
                            zIndex: 6000,
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>More Options</h2>
                            <button className="btn" onClick={() => setShowMoreOptions(false)}><X /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <button
                                className="btn"
                                style={{
                                    padding: '1.5rem',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    fontSize: '1.1rem'
                                }}
                                onClick={() => {
                                    setShowMoreOptions(false);
                                    setShowBowlerChangeModal(true);
                                }}
                            >
                                <Settings2 size={24} color="var(--primary)" />
                                <span>Change Bowler</span>
                            </button>

                            <button
                                className="btn"
                                style={{
                                    padding: '1.5rem',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    fontSize: '1.1rem'
                                }}
                                onClick={() => {
                                    setShowMoreOptions(false);
                                    setShowDLSModal(true);
                                }}
                            >
                                <Trophy size={24} color="var(--primary)" />
                                <span>DLS Calculator</span>
                            </button>

                            <button
                                className="btn"
                                style={{
                                    padding: '1.5rem',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    fontSize: '1.1rem'
                                }}
                                onClick={() => {
                                    setShowMoreOptions(false);
                                    generateTransferCode();
                                }}
                            >
                                <RotateCcw size={24} color="var(--accent)" />
                                <span>Transfer Scoring</span>
                            </button>

                            <button
                                className="btn"
                                style={{
                                    padding: '1.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: 'var(--error)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    fontSize: '1.1rem'
                                }}
                                onClick={() => {
                                    setShowMoreOptions(false);
                                    abandonMatch();
                                }}
                            >
                                <XOctagon size={24} />
                                <span>Abandon Match</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transfer Code Modal */}
            <AnimatePresence>
                {showTransferModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 7000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="card"
                            style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '2.5rem' }}
                        >
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Transfer Scoring</h3>
                            <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Share this code with the new scorer. It expires in 15 minutes.</p>

                            <div style={{
                                fontSize: '3rem',
                                fontWeight: 900,
                                letterSpacing: '8px',
                                color: 'var(--primary)',
                                background: 'rgba(59, 130, 246, 0.1)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                marginBottom: '2rem'
                            }}>
                                {transferCode}
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowTransferModal(false)}>
                                Done
                            </button>
                        </motion.div>
                    </div>
                )}

                {/* Change Bowler Modal (Fixed Overlay) */}
                {showBowlerChangeModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.95)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 6000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        color: 'white'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="card"
                            style={{ maxWidth: '450px', width: '100%', textAlign: 'center' }}
                        >
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Correct Bowler Name</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', maxHeight: '50vh', overflowY: 'auto', padding: '1rem' }}>
                                {getAvailableBowlers().map(name => (
                                    <button
                                        key={name}
                                        className="btn"
                                        style={{
                                            padding: '1.25rem',
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            background: 'var(--card-bg)',
                                            border: '1px solid var(--card-border)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'white'
                                        }}
                                        onClick={() => {
                                            changeBowler(name);
                                            setShowBowlerChangeModal(false);
                                        }}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                            <button
                                className="btn"
                                style={{ marginTop: '2rem', width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                onClick={() => setShowBowlerChangeModal(false)}
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


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
                        <p style={{ fontWeight: 600 }}>
                            {matchState.innings === 2
                                ? `${matchState.battingTeam.name} chasing ${matchState.dlsRevisedTarget || (matchState.completedInnings?.[0]?.totalRuns + 1 || '?')}`
                                : `1st Innings • Max ${matchState.maxOvers} Ov`
                            }
                        </p>
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
                    <button className="btn" style={{ padding: '0.5rem', color: 'var(--primary)' }} onClick={() => setShowMoreOptions(true)}>
                        <Settings2 size={24} />
                    </button>
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

                    {/* Free Hit Indicator */}
                    {matchState.isFreeHit && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{
                                marginTop: '1rem',
                                padding: '0.5rem 1.5rem',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                borderRadius: '20px',
                                fontWeight: 800,
                                fontSize: '1rem',
                                color: 'white',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
                            }}
                        >
                            ⚡ FREE HIT ⚡
                        </motion.div>
                    )}

                    {/* Run Equation (Second Innings) */}
                    {matchState.innings === 2 && (matchState.completedInnings?.[0] || matchState.dlsRevisedTarget) && (() => {
                        const targetScore = matchState.dlsRevisedTarget || (matchState.completedInnings[0].totalRuns + 1);
                        const runsRequired = Math.max(0, targetScore - matchState.totalRuns);
                        const maxBalls = (matchState.maxOvers) * 6;
                        const ballsRemaining = Math.max(0, maxBalls - matchState.balls);
                        const wicketsRemaining = (matchState.maxWickets || 10) - matchState.wickets;

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="card"
                                style={{
                                    marginTop: '1.5rem',
                                    padding: '1rem 1.5rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--card-border)'
                                }}
                            >
                                <p style={{ fontSize: '1.1rem', fontWeight: 600, textAlign: 'center' }}>
                                    {runsRequired === 0 ? (
                                        <span style={{ color: 'var(--primary)' }}>🎯 Target Reached!</span>
                                    ) : (
                                        <>
                                            <span style={{ fontWeight: 800 }}>{matchState.battingTeam.name}</span> requires{' '}
                                            <span style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>{runsRequired}</span> runs
                                            {' '}in{' '}
                                            <span style={{ color: 'var(--accent)' }}>{ballsRemaining}</span> balls
                                            {' '}with{' '}
                                            <span style={{ color: 'var(--secondary)' }}>{wicketsRemaining}</span> wickets remaining to win
                                        </>
                                    )}
                                </p>
                                <p style={{ fontSize: '0.875rem', opacity: 0.6, marginTop: '0.5rem', textAlign: 'center' }}>
                                    Target: {targetScore} | RRR: {ballsRemaining > 0 ? ((runsRequired / ballsRemaining) * 6).toFixed(2) : '0.00'}
                                </p>
                            </motion.div>
                        );
                    })()}
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
                        <button
                            onClick={() => setShowBowlerChangeModal(true)}
                            style={{
                                alignSelf: 'center',
                                background: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                padding: '0.4rem',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                marginLeft: '0.5rem'
                            }}
                            title="Correct Bowler Name"
                        >
                            EDIT
                        </button>
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

            {/* Match Summary & POTM Modal */}
            <AnimatePresence>
                {showMatchSummary && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.98)',
                            backdropFilter: 'blur(15px)',
                            zIndex: 8000,
                            display: 'flex',
                            flexDirection: 'column',
                            color: 'white',
                            padding: '2rem'
                        }}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
                            <Trophy size={64} color="#fbbf24" style={{ margin: '0 auto 1.5rem' }} />
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Match Finished!</h2>
                            <p style={{ fontSize: '1.25rem', opacity: 0.8, color: 'var(--primary)', fontWeight: 700, marginTop: '0.5rem' }}>
                                {(() => {
                                    const team1 = matchState.completedInnings?.[0];
                                    const team2Runs = matchState.totalRuns;
                                    const target = team1 ? team1.totalRuns + 1 : 0;
                                    if (team2Runs >= target) {
                                        const wicketsLeft = (matchState.maxWickets || 10) - matchState.wickets;
                                        return `${matchState.battingTeam.name} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
                                    } else {
                                        const runsDiff = target - team2Runs - 1;
                                        return `${matchState.bowlingTeam.name} won by ${runsDiff} run${runsDiff > 1 ? 's' : ''}`;
                                    }
                                })()}
                            </p>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', maxWidth: '500px', width: '100%', margin: '0 auto' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1.5rem', textAlign: 'center', opacity: 0.6 }}>Top Performances (MVPs)</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {mvps.slice(0, 4).map((m, idx) => (
                                    <motion.div
                                        key={m.name}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 + (idx * 0.1) }}
                                        onClick={() => setSelectedPOTM(m.name)}
                                        style={{
                                            padding: '1.25rem',
                                            background: selectedPOTM === m.name ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            borderRadius: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            border: selectedPOTM === m.name ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                            cursor: 'pointer',
                                            boxShadow: selectedPOTM === m.name ? '0 10px 20px rgba(59, 130, 246, 0.3)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a2b8' : idx === 2 ? '#92400e' : 'rgba(255,255,255,0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 900,
                                                color: idx < 3 ? 'black' : 'white'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{m.name}</p>
                                                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>MVP Points: {m.points}</p>
                                            </div>
                                        </div>
                                        {selectedPOTM === m.name && (
                                            <div style={{ background: 'white', color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900 }}>POTM</div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>

                            <div style={{ marginTop: '2.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '16px', border: '1px dashed var(--primary)', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.75rem' }}>Selected Player of the Match</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>{selectedPOTM || 'None'}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', maxWidth: '500px', width: '100%', margin: '2rem auto 0' }}>
                            <button
                                className="btn"
                                style={{ flex: 1, padding: '1.25rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                onClick={() => {
                                    setShowMatchSummary(false);
                                    undo(); // Allow correction
                                }}
                            >
                                Undo Last
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 2, padding: '1.25rem', fontSize: '1.1rem', fontWeight: 800 }}
                                onClick={() => {
                                    if (confirm(`Finalize match with ${selectedPOTM} as Player of the Match?`)) {
                                        finalizeMatch();
                                    }
                                }}
                            >
                                Finalize & Sync
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
