"use client";

import React from 'react';
import {
    ChevronLeft,
    Trophy,
    Target,
    Zap,
    Shield,
    TrendingUp,
    Award,
    Share2
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlayerProfile() {
    const [stats, setStats] = React.useState({
        runs: 2482,
        wickets: 84,
        avg: 34.2,
        sr: 138.4,
        history: []
    });

    React.useEffect(() => {
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

    return (
        <main style={{
            minHeight: '100vh',
            background: 'var(--background)',
            color: 'var(--foreground)',
            paddingBottom: '5rem'
        }}>
            {/* Header omitted for brevity in replace, keeping the rest of the UI */}
            <header style={{
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <button className="btn" style={{ padding: '0.5rem' }} onClick={() => window.history.back()}>
                    <ChevronLeft />
                </button>
                <h1 style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.7 }}>Gully Master Card</h1>
                <button className="btn" style={{ padding: '0.5rem' }}>
                    <Share2 size={20} />
                </button>
            </header>

            {/* Profile Info */}
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="card"
                    style={{
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        padding: '2rem',
                        textAlign: 'center'
                    }}
                >
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '24px',
                        background: 'var(--primary)',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        color: 'white',
                        transform: 'rotate(-5deg)'
                    }}>
                        LR
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Lenny Rajan</h2>
                    <p style={{ color: 'var(--primary)', fontWeight: 600 }}>PVCC • All-Rounder</p>
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
                                const myMatchStats = match.scorecard.batting['Lenny Rajan'];
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

                <h3 style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.5, marginBottom: '1rem', textTransform: 'uppercase' }}>
                    League Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <LeagueItem name="NCCA Premier" runs="1,240" wkts="42" avg="31.0" color="#ef4444" />
                    <LeagueItem name="BACA Sunday T20" runs="840" wkts="30" avg="42.5" color="#3b82f6" />
                    <LeagueItem name="Gully Club Internal" runs="402" wkts="12" avg="28.1" color="#10b981" />
                </div>
            </div>
        </main>
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
