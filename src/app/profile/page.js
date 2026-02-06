"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
    ChevronLeft,
    Trophy,
    Target,
    Zap,
    Shield,
    TrendingUp,
    Award,
    Share2,
    Edit,
    Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    getPlayerRoleLabel,
    getBattingStyleLabel,
    getBowlingStyleLabel
} from '@/lib/cricketConstants';

export default function PlayerProfile() {
    const router = useRouter();
    const { currentUser, userProfile } = useAuth();
    const [teams, setTeams] = useState([]);
    const [stats, setStats] = useState({
        runs: 0,
        wickets: 0,
        avg: 0,
        sr: 0,
        history: []
    });

    // Load user's teams
    useEffect(() => {
        if (!userProfile?.teams) return;

        const loadTeams = async () => {
            try {
                const teamPromises = userProfile.teams.map(async (teamId) => {
                    const teamDoc = await getDoc(doc(db, 'teams', teamId));
                    if (teamDoc.exists()) {
                        return { id: teamDoc.id, ...teamDoc.data() };
                    }
                    return null;
                });

                const loadedTeams = (await Promise.all(teamPromises)).filter(Boolean);
                setTeams(loadedTeams);
            } catch (error) {
                console.error('Error loading teams:', error);
            }
        };

        loadTeams();
    }, [userProfile]);

    // Load match history stats (keeping existing logic)
    useEffect(() => {
        const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
        if (history.length > 0) {
            // Calculate real stats for Lenny Rajan from history
            let newRuns = 2482;
            let newWickets = 84;
            let totalBalls = 2482 / (138.4 / 100);

            history.forEach(match => {
                const myStats = match.scorecard.batting['Lenny Rajan'];
                if (myStats) {
                    newRuns += myStats.runs;
                    totalBalls += myStats.balls;
                }
                // Check if I was bowling (simulated for now)
                Object.values(match.scorecard.bowling).forEach(bowler => {
                    // Logic would go here if we tracked specific bowlers
                });
            });

            setStats({
                runs: newRuns,
                wickets: newWickets,
                avg: (newRuns / 72).toFixed(1), // Mocking innings
                sr: ((newRuns / totalBalls) * 100).toFixed(1),
                history
            });
        }
    }, []);

    if (!userProfile) {
        return (
            <ProtectedRoute>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <p>Loading profile...</p>
                </div>
            </ProtectedRoute>
        );
    }

    const primaryTeam = teams.find(t => t.id === userProfile.primaryTeamId) || teams[0];

    return (
        <ProtectedRoute>
            <main style={{
                minHeight: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)',
                paddingBottom: '5rem'
            }}>
                {/* Header */}
                <header style={{
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <button className="btn" style={{ padding: '0.5rem' }} onClick={() => router.back()}>
                        <ChevronLeft />
                    </button>
                    <h1 style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.7 }}>Player Profile</h1>
                    <button className="btn" style={{ padding: '0.5rem' }} onClick={() => router.push('/profile/edit')}>
                        <Edit size={20} />
                    </button>
                </header>

                {/* Profile Info */}
                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="card"
                        style={{
                            background: primaryTeam
                                ? `linear-gradient(135deg, ${primaryTeam.colors.primary}, ${primaryTeam.colors.secondary})`
                                : 'linear-gradient(135deg, #1e293b, #0f172a)',
                            padding: '2rem',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '24px',
                            background: userProfile.photoURL ? 'transparent' : 'rgba(255,255,255,0.2)',
                            margin: '0 auto 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            fontWeight: 800,
                            color: 'white',
                            overflow: 'hidden'
                        }}>
                            {userProfile.photoURL ? (
                                <img src={userProfile.photoURL} alt={userProfile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                userProfile.displayName?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>
                            {userProfile.displayName || 'Player'}
                        </h2>
                        {userProfile.cricketProfile?.jerseyNumber && (
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', marginTop: '0.25rem' }}>
                                #{userProfile.cricketProfile.jerseyNumber}
                            </p>
                        )}
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, marginTop: '0.5rem' }}>
                            {primaryTeam ? `${primaryTeam.shortName} • ` : ''}
                            {userProfile.cricketProfile?.playerRole
                                ? getPlayerRoleLabel(userProfile.cricketProfile.playerRole)
                                : 'Role not set'}
                        </p>

                        {/* Cricket Attributes */}
                        {(userProfile.cricketProfile?.battingStyle || userProfile.cricketProfile?.bowlingStyle) && (
                            <div style={{
                                marginTop: '1.5rem',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                textAlign: 'left'
                            }}>
                                {userProfile.cricketProfile.battingStyle && (
                                    <p style={{ color: 'white', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                        <strong>Batting:</strong> {getBattingStyleLabel(userProfile.cricketProfile.battingStyle)}
                                    </p>
                                )}
                                {userProfile.cricketProfile.bowlingStyle && (
                                    <p style={{ color: 'white', fontSize: '0.875rem' }}>
                                        <strong>Bowling:</strong> {getBowlingStyleLabel(userProfile.cricketProfile.bowlingStyle)}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Teams */}
                        {teams.length > 0 && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    marginBottom: '0.75rem'
                                }}>
                                    <Users size={16} />
                                    <span>Teams ({teams.length})</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    {teams.map(team => (
                                        <div
                                            key={team.id}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: 'rgba(255,255,255,0.2)',
                                                borderRadius: '8px',
                                                fontSize: '0.875rem',
                                                color: 'white',
                                                fontWeight: 600
                                            }}
                                        >
                                            {team.shortName}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Dynamic Stats Section */}
                <div style={{ padding: '0 1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <StatBox label="Career Runs" value={stats.runs.toLocaleString()} icon={<TrendingUp size={18} />} />
                        <StatBox label="Career Wickets" value={stats.wickets} icon={<Target size={18} />} />
                        <StatBox label="Strike Rate" value={stats.sr} icon={<Zap size={18} />} />
                        <StatBox label="Average" value={stats.avg} icon={<Trophy size={18} />} />
                    </div>

                    {/* Recent Innings Sweep */}
                    {stats.history.length > 0 && (
                        <>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.5, marginBottom: '1rem', textTransform: 'uppercase' }}>
                                Recent Swept Stats
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                                {stats.history.slice(-3).reverse().map((match, i) => {
                                    const myMatchStats = match.scorecard.batting[userProfile?.displayName || 'Player'];
                                    return (
                                        <div key={i} className="card" style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 700 }}>{match.teams}</span>
                                                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{match.date}</span>
                                            </div>
                                            {myMatchStats ? (
                                                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)' }}>
                                                    {myMatchStats.runs} runs off {myMatchStats.balls} balls
                                                </p>
                                            ) : (
                                                <p style={{ fontSize: '0.875rem', opacity: 0.5 }}>DNP / No Bat</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </ProtectedRoute>
    );
}

// Subcomponents keeping original style
function StatBox({ label, value, icon }) {
    return (
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                {icon}
            </div>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</h4>
            <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>{label}</p>
        </div>
    );
}

function LeagueItem({ name, runs, wkts, avg, color }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <div style={{ width: '4px', height: '40px', background: color, borderRadius: '2px' }} />
            <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{name}</h4>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.6 }}>
                    <span>Runs: <b>{runs}</b></span>
                    <span>Wkts: <b>{wkts}</b></span>
                    <span>Avg: <b>{avg}</b></span>
                </div>
            </div>
        </div>
    );
}

function Badge({ label, icon, color }) {
    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            background: `${color}20`,
            color: color,
            borderRadius: '50px',
            fontSize: '0.65rem',
            fontWeight: 800,
            border: `1px solid ${color}40`
        }}>
            {icon}
            {label}
        </div>
    );
}
