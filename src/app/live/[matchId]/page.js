"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { ChevronLeft, TrendingUp, Target, Activity } from 'lucide-react';

export default function LiveScorePage() {
    const params = useParams();
    const router = useRouter();
    const matchId = params.matchId;
    const [matchState, setMatchState] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const feedRef = useRef(null);

    // Listen to match state
    useEffect(() => {
        if (!matchId) return;

        const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (snapshot) => {
            if (snapshot.exists()) {
                setMatchState(snapshot.data().state);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [matchId]);

    // Listen to live events
    useEffect(() => {
        if (!matchId) return;

        const q = query(
            collection(db, 'matches', matchId, 'events'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEvents(eventsData);
        });

        return () => unsubscribe();
    }, [matchId]);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <Activity size={48} className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ opacity: 0.7 }}>Loading live score...</p>
                </div>
            </div>
        );
    }

    if (!matchState) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)',
                padding: '2rem'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ opacity: 0.7, marginBottom: '1rem' }}>Match not found</p>
                    <button className="btn" onClick={() => router.push('/')}>
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    const overs = `${Math.floor(matchState.balls / 6)}.${matchState.balls % 6}`;
    const runRate = matchState.balls > 0 ? ((matchState.totalRuns / matchState.balls) * 6).toFixed(2) : '0.00';

    // Calculate run equation for 2nd innings
    const isSecondInnings = matchState.innings === 2;
    const targetScore = isSecondInnings && matchState.completedInnings?.[0]?.totalRuns
        ? matchState.completedInnings[0].totalRuns + 1
        : null;
    const runsRequired = targetScore ? Math.max(0, targetScore - matchState.totalRuns) : null;
    const maxBalls = (matchState.maxOvers || 20) * 6;
    const ballsRemaining = Math.max(0, maxBalls - matchState.balls);
    const requiredRunRate = ballsRemaining > 0 && runsRequired ? ((runsRequired / ballsRemaining) * 6).toFixed(2) : '0.00';

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
                <button className="btn" style={{ padding: '0.5rem' }} onClick={() => router.push('/')}>
                    <ChevronLeft />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {matchState.battingTeam?.name} vs {matchState.bowlingTeam?.name}
                    </h1>
                    <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
                        {isSecondInnings ? '2nd Innings' : '1st Innings'} • Live
                        <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            marginLeft: '0.5rem',
                            animation: 'pulse 2s infinite'
                        }} />
                    </p>
                </div>
            </header>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Current Score */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                    style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, var(--card-bg), rgba(var(--primary-rgb), 0.1))'
                    }}
                >
                    <h2 style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {matchState.battingTeam?.name}
                    </h2>
                    <p style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.5rem' }}>
                        {matchState.totalRuns}/{matchState.wickets}
                    </p>
                    <p style={{ fontSize: '1.25rem', opacity: 0.7 }}>
                        Overs: {overs} • RR: {runRate}
                    </p>

                    {/* Run Equation */}
                    {isSecondInnings && targetScore && (
                        <div className="card" style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.05)'
                        }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                {runsRequired === 0 ? (
                                    <span style={{ color: 'var(--primary)' }}>🎯 Target Reached!</span>
                                ) : (
                                    <>
                                        <span style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>{runsRequired}</span> runs needed
                                        {' '}in{' '}
                                        <span style={{ color: 'var(--accent)' }}>{ballsRemaining}</span> balls
                                    </>
                                )}
                            </p>
                            <p style={{ fontSize: '0.875rem', opacity: 0.6, marginTop: '0.5rem' }}>
                                Target: {targetScore} • RRR: {requiredRunRate}
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* Current Batters */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', opacity: 0.7 }}>
                        Batting
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {matchState.striker && matchState.scorecard?.batting?.[matchState.striker] && (
                            <BatterRow
                                name={matchState.striker}
                                stats={matchState.scorecard.batting[matchState.striker]}
                                isStriker={true}
                            />
                        )}
                        {matchState.nonStriker && matchState.scorecard?.batting?.[matchState.nonStriker] && (
                            <BatterRow
                                name={matchState.nonStriker}
                                stats={matchState.scorecard.batting[matchState.nonStriker]}
                                isStriker={false}
                            />
                        )}
                    </div>
                </div>

                {/* Current Bowler */}
                {matchState.bowler && matchState.scorecard?.bowling?.[matchState.bowler] && (
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', opacity: 0.7 }}>
                            Bowling
                        </h3>
                        <BowlerRow
                            name={matchState.bowler}
                            stats={matchState.scorecard.bowling[matchState.bowler]}
                        />
                    </div>
                )}

                {/* Live Commentary */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', opacity: 0.7 }}>
                        Live Commentary
                    </h3>
                    <div ref={feedRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                        {events.length === 0 ? (
                            <p style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>
                                Waiting for first ball...
                            </p>
                        ) : (
                            events.map((event, idx) => (
                                <CommentaryItem key={event.id} event={event} index={idx} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .spinner {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </main>
    );
}

function BatterRow({ name, stats, isStriker }) {
    const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem',
            background: isStriker ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
            borderRadius: '8px',
            border: isStriker ? '1px solid var(--primary)' : '1px solid transparent'
        }}>
            <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>
                    {name} {isStriker && <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>★</span>}
                </p>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>{stats.runs}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>R</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600 }}>{stats.balls}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>B</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600 }}>{stats.fours}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>4s</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600 }}>{stats.sixes}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>6s</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600 }}>{sr}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>SR</p>
                </div>
            </div>
        </div>
    );
}

function BowlerRow({ name, stats }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem',
            background: 'rgba(var(--secondary-rgb), 0.1)',
            borderRadius: '8px',
            border: '1px solid var(--secondary)'
        }}>
            <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>{name}</p>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>{stats.wickets}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>W</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600 }}>{stats.overs}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>Ov</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600 }}>{stats.runs}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>R</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600 }}>{stats.economy}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>Eco</p>
                </div>
            </div>
        </div>
    );
}

function CommentaryItem({ event, index }) {
    const getEventColor = () => {
        if (event.type === 'WICKET') return '#ef4444';
        if (event.type === 'BOUNDARY') return '#10b981';
        return 'var(--foreground)';
    };

    const getEventIcon = () => {
        if (event.icon === 'WICKET') return '🎯';
        if (event.icon === 'SIX') return '🚀';
        if (event.icon === 'FOUR') return '🔥';
        return '•';
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
                padding: '0.75rem',
                background: event.type === 'WICKET' ? 'rgba(239, 68, 68, 0.1)' :
                    event.type === 'BOUNDARY' ? 'rgba(16, 185, 129, 0.1)' :
                        'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                borderLeft: `3px solid ${getEventColor()}`
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{getEventIcon()}</span>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>
                        Over {event.overNum}
                    </p>
                    <p style={{ fontWeight: 500, color: getEventColor() }}>
                        {event.summary}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
