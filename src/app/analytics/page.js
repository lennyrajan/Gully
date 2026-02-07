"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import {
    ChevronLeft,
    TrendingUp,
    Target,
    Trophy,
    Zap,
    Award,
    Users,
    BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    aggregatePlayerStats,
    calculateBattingAverage,
    calculateStrikeRate,
    calculateBowlingAverage,
    calculateEconomyRate,
    formatOvers,
    formatBestBowling,
    getTopPerformers,
    calculateTeamStats
} from '@/lib/statsUtils';

export default function AnalyticsPage() {
    const { currentUser, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'team' | 'leaderboard'
    const [matches, setMatches] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [myStats, setMyStats] = useState(null);
    const [teamStats, setTeamStats] = useState(null);
    const [leaderboards, setLeaderboards] = useState({ runs: [], wickets: [], average: [], strikeRate: [] });

    // Load matches for user's teams
    useEffect(() => {
        if (!userProfile?.teams || userProfile.teams.length === 0) {
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                // Load matches
                const matchesQuery = query(
                    collection(db, 'matches'),
                    where('teamId', 'in', userProfile.teams)
                );
                const matchesSnapshot = await getDocs(matchesQuery);
                const matchesData = matchesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMatches(matchesData);

                // Load team members for leaderboards
                const primaryTeamId = userProfile.primaryTeamId || userProfile.teams[0];
                const teamDoc = await getDoc(doc(db, 'teams', primaryTeamId));
                if (teamDoc.exists()) {
                    const team = teamDoc.data();
                    const memberPromises = (team.memberIds || []).map(async (memberId) => {
                        const userDoc = await getDoc(doc(db, 'users', memberId));
                        if (userDoc.exists()) {
                            return { id: userDoc.id, ...userDoc.data() };
                        }
                        return null;
                    });
                    const members = (await Promise.all(memberPromises)).filter(Boolean);
                    setTeamMembers(members);

                    // Calculate team stats
                    setTeamStats(calculateTeamStats(matchesData, primaryTeamId));
                }

                // Calculate my stats
                if (userProfile?.displayName) {
                    setMyStats(aggregatePlayerStats(matchesData, userProfile.displayName));
                }

                // Calculate leaderboards
                calculateLeaderboards(matchesData, teamDoc.exists() ? teamDoc.data().memberIds : []);

            } catch (error) {
                console.error('Error loading analytics data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userProfile]);

    const calculateLeaderboards = async (matchesData, memberIds) => {
        try {
            // Get all member names
            const memberPromises = memberIds.map(async (memberId) => {
                const userDoc = await getDoc(doc(db, 'users', memberId));
                if (userDoc.exists()) {
                    return userDoc.data().displayName;
                }
                return null;
            });
            const memberNames = (await Promise.all(memberPromises)).filter(Boolean);

            // Calculate stats for each member
            const playerStatsList = memberNames.map(name => ({
                playerName: name,
                stats: aggregatePlayerStats(matchesData, name)
            })).filter(p => p.stats.batting.innings > 0 || p.stats.bowling.wickets > 0);

            setLeaderboards({
                runs: getTopPerformers(playerStatsList, 'runs', 5),
                wickets: getTopPerformers(playerStatsList, 'wickets', 5),
                average: getTopPerformers(playerStatsList.filter(p => p.stats.batting.innings >= 3), 'average', 5),
                strikeRate: getTopPerformers(playerStatsList.filter(p => p.stats.batting.balls >= 20), 'strikeRate', 5)
            });
        } catch (error) {
            console.error('Error calculating leaderboards:', error);
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <p>Loading analytics...</p>
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
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Analytics</h1>
                </header>

                {/* Tabs */}
                <div style={{ padding: '1rem 1.5rem 0' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <TabButton
                            active={activeTab === 'personal'}
                            onClick={() => setActiveTab('personal')}
                            icon={<TrendingUp size={16} />}
                            label="My Stats"
                        />
                        <TabButton
                            active={activeTab === 'team'}
                            onClick={() => setActiveTab('team')}
                            icon={<Users size={16} />}
                            label="Team"
                        />
                        <TabButton
                            active={activeTab === 'leaderboard'}
                            onClick={() => setActiveTab('leaderboard')}
                            icon={<Trophy size={16} />}
                            label="Leaders"
                        />
                    </div>
                </div>

                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    {activeTab === 'personal' && <PersonalStats stats={myStats} />}
                    {activeTab === 'team' && <TeamStats stats={teamStats} members={teamMembers} />}
                    {activeTab === 'leaderboard' && <Leaderboards data={leaderboards} currentUser={userProfile?.displayName} />}
                </div>
            </main>
        </ProtectedRoute>
    );
}

function TabButton({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className="btn"
            style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'white' : 'var(--foreground)',
                fontSize: '0.875rem'
            }}
        >
            {icon}
            {label}
        </button>
    );
}

function PersonalStats({ stats }) {
    if (!stats) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <BarChart3 size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                <p style={{ opacity: 0.7 }}>No match data available yet. Play some matches to see your stats!</p>
            </div>
        );
    }

    const battingAvg = calculateBattingAverage(stats.batting.runs, stats.batting.innings, stats.batting.notOuts);
    const strikeRate = calculateStrikeRate(stats.batting.runs, stats.batting.balls);
    const bowlingAvg = calculateBowlingAverage(stats.bowling.runs, stats.bowling.wickets);
    const economy = calculateEconomyRate(stats.bowling.runs, stats.bowling.overs);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Summary Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{
                    background: 'linear-gradient(135deg, var(--primary), #6366f1)',
                    padding: '1.5rem',
                    color: 'white'
                }}
            >
                <h3 style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Career Overview</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div>
                        <p style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.batting.matches}</p>
                        <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Matches</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.batting.runs}</p>
                        <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Runs</p>
                    </div>
                </div>
            </motion.div>

            {/* Batting Stats */}
            <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={18} /> Batting
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    <StatCard label="Innings" value={stats.batting.innings} />
                    <StatCard label="Runs" value={stats.batting.runs} />
                    <StatCard label="Average" value={battingAvg} />
                    <StatCard label="Strike Rate" value={strikeRate} />
                    <StatCard label="High Score" value={stats.batting.highScore} highlight />
                    <StatCard label="50s / 100s" value={`${stats.batting.fifties} / ${stats.batting.hundreds}`} />
                    <StatCard label="4s" value={stats.batting.fours} />
                    <StatCard label="6s" value={stats.batting.sixes} />
                </div>
            </div>

            {/* Bowling Stats */}
            <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={18} /> Bowling
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    <StatCard label="Overs" value={formatOvers(stats.bowling.overs)} />
                    <StatCard label="Wickets" value={stats.bowling.wickets} />
                    <StatCard label="Average" value={bowlingAvg} />
                    <StatCard label="Economy" value={economy} />
                    <StatCard label="Best Bowling" value={formatBestBowling(stats.bowling.bestFigures)} highlight />
                    <StatCard label="Maidens" value={stats.bowling.maidens} />
                </div>
            </div>

            {/* Recent Form */}
            {stats.recentMatches.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} /> Recent Form
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {stats.recentMatches.map((match, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="card"
                                style={{ padding: '1rem' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 600 }}>{match.opponent || 'Match'}</span>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                                        {match.date ? new Date(match.date).toLocaleDateString() : ''}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                                    {match.batting && (
                                        <span style={{ color: 'var(--primary)' }}>
                                            🏏 {match.batting.runs} ({match.batting.balls}b)
                                        </span>
                                    )}
                                    {match.bowling && (
                                        <span style={{ color: 'var(--success)' }}>
                                            ⚾ {match.bowling.wickets}/{match.bowling.runs}
                                        </span>
                                    )}
                                    {!match.batting && !match.bowling && (
                                        <span style={{ opacity: 0.5 }}>Did not participate</span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TeamStats({ stats, members }) {
    if (!stats) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <Users size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                <p style={{ opacity: 0.7 }}>No team data available yet.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Win/Loss Record */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    padding: '1.5rem',
                    color: 'white'
                }}
            >
                <h3 style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '1rem' }}>Team Record</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.played}</p>
                        <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Played</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.won}</p>
                        <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Won</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.lost}</p>
                        <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Lost</p>
                    </div>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.winPercentage}%</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Win Rate</p>
                </div>
            </motion.div>

            {/* Squad Size */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Squad</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.5rem',
                        fontWeight: 800
                    }}>
                        {members.length}
                    </div>
                    <div>
                        <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{members.length} Players</p>
                        <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>Active squad members</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Leaderboards({ data, currentUser }) {
    const [category, setCategory] = useState('runs');

    const categoryConfig = {
        runs: { label: 'Most Runs', icon: <Target size={18} />, getValue: (p) => p.stats.batting.runs },
        wickets: { label: 'Most Wickets', icon: <Zap size={18} />, getValue: (p) => p.stats.bowling.wickets },
        average: { label: 'Best Average', icon: <Award size={18} />, getValue: (p) => calculateBattingAverage(p.stats.batting.runs, p.stats.batting.innings, p.stats.batting.notOuts) },
        strikeRate: { label: 'Best Strike Rate', icon: <TrendingUp size={18} />, getValue: (p) => calculateStrikeRate(p.stats.batting.runs, p.stats.batting.balls) }
    };

    const currentData = data[category] || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Category Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {Object.entries(categoryConfig).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setCategory(key)}
                        className="btn"
                        style={{
                            padding: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            background: category === key ? 'var(--primary)' : 'var(--card)',
                            color: category === key ? 'white' : 'var(--foreground)',
                            fontSize: '0.75rem'
                        }}
                    >
                        {config.icon}
                        {config.label}
                    </button>
                ))}
            </div>

            {/* Leaderboard List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentData.length === 0 ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                        <Trophy size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                        <p style={{ opacity: 0.7 }}>Not enough data for leaderboards yet.</p>
                    </div>
                ) : (
                    currentData.map((player, idx) => {
                        const isCurrentUser = player.playerName === currentUser;
                        const value = categoryConfig[category].getValue(player);

                        return (
                            <motion.div
                                key={player.playerName}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="card"
                                style={{
                                    padding: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    border: isCurrentUser ? '2px solid var(--primary)' : 'none'
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#cd7f32' : 'var(--card-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    color: idx < 3 ? 'white' : 'var(--foreground)'
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 600 }}>
                                        {player.playerName}
                                        {isCurrentUser && <span style={{ color: 'var(--primary)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>(You)</span>}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                        {player.stats.batting.matches} matches
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{value}</p>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, highlight }) {
    return (
        <div className="card" style={{
            padding: '1rem',
            textAlign: 'center',
            background: highlight ? 'var(--primary)' : 'var(--card)',
            color: highlight ? 'white' : 'var(--foreground)'
        }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800 }}>{value}</p>
            <p style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.25rem' }}>{label}</p>
        </div>
    );
}
