"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
    ArrowLeft,
    Edit,
    Trophy,
    Calendar,
    MapPin,
    Users,
    TrendingUp,
    Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function MatchScorecard() {
    const params = useParams();
    const router = useRouter();
    const { currentUser, userProfile } = useAuth();
    const [matchData, setMatchData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const matchId = params.matchId;

    // Load match data
    useEffect(() => {
        if (!matchId) return;

        const loadMatch = async () => {
            try {
                const matchRef = doc(db, 'matches', matchId);
                const matchDoc = await getDoc(matchRef);

                if (!matchDoc.exists()) {
                    setError('Match not found');
                    setLoading(false);
                    return;
                }

                const data = matchDoc.data();
                console.log('🔍 FIREBASE MATCH DATA:', data);
                console.log('🔍 STATE OBJECT:', data.state);
                console.log('🔍 SCORECARD:', data.state?.scorecard);
                setMatchData({ id: matchDoc.id, ...data });

                // Set up real-time listener for live matches
                if (data.status === 'LIVE' || data.status === 'live') {
                    const unsubscribe = onSnapshot(matchRef, (doc) => {
                        if (doc.exists()) {
                            setMatchData({ id: doc.id, ...doc.data() });
                        }
                    });

                    setLoading(false);
                    return () => unsubscribe();
                }

                setLoading(false);
            } catch (err) {
                console.error('Error loading match:', err);
                setError('Failed to load match');
                setLoading(false);
            }
        };

        loadMatch();
    }, [matchId]);

    // Check if user can edit this match
    const canEdit = currentUser && matchData && (
        matchData.createdBy === currentUser.uid ||
        hasPermission(userProfile?.role, PERMISSIONS.MANAGE_MATCHES)
    );

    if (loading) {
        return (
            <main style={{
                minHeight: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)',
                padding: '2rem'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.1rem', opacity: 0.7 }}>Loading match...</p>
                </div>
            </main>
        );
    }

    if (error || !matchData) {
        return (
            <main style={{
                minHeight: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)',
                padding: '2rem'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <Trophy size={64} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Match Not Found</h1>
                    <p style={{ opacity: 0.7, marginBottom: '2rem' }}>{error || 'This match does not exist'}</p>
                    <Link href="/">
                        <button className="btn btn-primary">
                            <ArrowLeft size={18} />
                            Back to Home
                        </button>
                    </Link>
                </div>
            </main>
        );
    }

    const state = matchData.state || {};
    const isLive = matchData.status === 'LIVE' || matchData.status === 'live';

    return (
        <main style={{
            minHeight: '100vh',
            background: 'var(--background)',
            color: 'var(--foreground)',
            paddingBottom: '3rem'
        }}>
            {/* Header */}
            <header className="glass" style={{
                padding: '1.5rem',
                marginBottom: '2rem',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{
                    maxWidth: '1000px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Link href="/">
                        <button className="btn" style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '0.5rem 1rem'
                        }}>
                            <ArrowLeft size={18} />
                            Back
                        </button>
                    </Link>

                    {canEdit && (
                        <Link href={`/scorer?matchId=${matchId}`}>
                            <button className="btn btn-primary">
                                <Edit size={18} />
                                Edit Match
                            </button>
                        </Link>
                    )}
                </div>
            </header>

            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1.5rem' }}>
                {/* Match Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                    style={{
                        background: isLive
                            ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                            : 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                        color: 'white',
                        padding: '2rem',
                        marginBottom: '2rem'
                    }}
                >
                    {/* Live Badge */}
                    {isLive && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(255, 255, 255, 0.2)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            marginBottom: '1rem'
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
                    )}

                    {/* Teams */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                            {state.battingTeam?.name || matchData.teamA?.name || 'Team A'}
                        </h1>
                        <p style={{ fontSize: '1.25rem', opacity: 0.9 }}>vs</p>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem' }}>
                            {state.bowlingTeam?.name || matchData.teamB?.name || 'Team B'}
                        </h2>
                    </div>

                    {/* Score */}
                    {state.totalRuns !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>
                                {state.totalRuns}/{state.wickets || 0}
                            </div>
                            <div style={{ fontSize: '1.25rem', opacity: 0.9 }}>
                                ({Math.floor((state.balls || 0) / 6)}.{(state.balls || 0) % 6} Ov)
                            </div>
                        </div>
                    )}

                    {/* Match Info */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1.5rem',
                        marginTop: '1.5rem',
                        fontSize: '0.9rem',
                        opacity: 0.9
                    }}>
                        {matchData.date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} />
                                {new Date(matchData.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                        )}
                        {matchData.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MapPin size={16} />
                                {matchData.location}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Batting Scorecard */}
                {state.scorecard?.batting && Object.keys(state.scorecard.batting).length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="card"
                        style={{ marginBottom: '2rem' }}
                    >
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={24} />
                            Batting Scorecard - {state.battingTeam?.name || 'Batting Team'}
                        </h2>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>Batsman</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>R</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>B</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>4s</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>6s</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>SR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(state.battingOrder || Object.keys(state.scorecard.batting)).map((playerName, idx) => {
                                        const stats = state.scorecard.batting[playerName];
                                        if (!stats) return null; // Skip if no stats

                                        const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
                                        const isOnStrike = playerName === state.striker;

                                        return (
                                            <tr
                                                key={idx}
                                                style={{
                                                    borderBottom: '1px solid var(--card-border)',
                                                    background: isOnStrike ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                                                }}
                                            >
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ fontWeight: isOnStrike ? 700 : 500 }}>
                                                        {playerName}
                                                        {isOnStrike && <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontSize: '0.75rem' }}>*</span>}
                                                    </div>
                                                    {stats.dismissal && (
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>
                                                            {stats.dismissal}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 600 }}>{stats.runs || 0}</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{stats.balls || 0}</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{stats.fours || 0}</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{stats.sixes || 0}</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{strikeRate}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Extras and Total */}
                        <div style={{
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--card-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.9rem'
                        }}>
                            <div>
                                <span style={{ opacity: 0.7 }}>Extras: </span>
                                <span style={{ fontWeight: 600 }}>
                                    {(state.extras?.wides || 0) + (state.extras?.noBalls || 0) + (state.extras?.byes || 0) + (state.extras?.legByes || 0)}
                                </span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.5, marginLeft: '0.5rem' }}>
                                    (wd {state.extras?.wides || 0}, nb {state.extras?.noBalls || 0}, b {state.extras?.byes || 0}, lb {state.extras?.legByes || 0})
                                </span>
                            </div>
                            <div>
                                <span style={{ opacity: 0.7 }}>Total: </span>
                                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>
                                    {state.totalRuns}/{state.wickets}
                                </span>
                                <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>
                                    ({Math.floor((state.balls || 0) / 6)}.{(state.balls || 0) % 6} Ov)
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="card"
                        style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'center' }}
                    >
                        <Users size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                        <p style={{ opacity: 0.7 }}>
                            {state.totalRuns === 0 ? 'Match just started - no balls bowled yet' : 'Batting scorecard will appear once scoring begins'}
                        </p>
                    </motion.div>
                )}

                {/* Bowling Figures */}
                {state.scorecard?.bowling && Object.keys(state.scorecard.bowling).length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="card"
                        style={{ marginBottom: '2rem' }}
                    >
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={24} />
                            Bowling Figures - {state.bowlingTeam?.name || 'Bowling Team'}
                        </h2>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>Bowler</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>O</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>M</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>R</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>W</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>Econ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(state.scorecard.bowling).map(([playerName, stats], idx) => {
                                        const isBowling = playerName === state.bowler;

                                        return (
                                            <tr
                                                key={idx}
                                                style={{
                                                    borderBottom: '1px solid var(--card-border)',
                                                    background: isBowling ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                                                }}
                                            >
                                                <td style={{ padding: '0.75rem', fontWeight: isBowling ? 700 : 500 }}>
                                                    {playerName}
                                                    {isBowling && <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontSize: '0.75rem' }}>*</span>}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{stats.overs || '0.0'}</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{stats.maidens || 0}</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{stats.runs || 0}</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 600 }}>{stats.wickets || 0}</td>
                                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{stats.economy || '0.00'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* Match Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card"
                >
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                        Match Summary
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {matchData.toss && (
                            <div>
                                <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.25rem' }}>Toss</p>
                                <p style={{ fontSize: '1rem', fontWeight: 600 }}>{matchData.toss}</p>
                            </div>
                        )}

                        {matchData.result && (
                            <div>
                                <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.25rem' }}>Result</p>
                                <p style={{ fontSize: '1rem', fontWeight: 600 }}>{matchData.result}</p>
                            </div>
                        )}

                        {matchData.createdAt && (
                            <div>
                                <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.25rem' }}>Match Started</p>
                                <p style={{ fontSize: '1rem' }}>
                                    {new Date(matchData.createdAt).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}

                        {!isLive && matchData.status && (
                            <div>
                                <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.25rem' }}>Status</p>
                                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--success)' }}>
                                    Match Completed
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
