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
    return (
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
                <button className="btn" style={{ padding: '0.5rem' }} onClick={() => window.history.back()}>
                    <ChevronLeft />
                </button>
                <h1 style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.7 }}>Gully Master Card</h1>
                <button className="btn" style={{ padding: '0.5rem' }}>
                    <Share2 size={20} />
                </button>
            </header>

            {/* Profile Info - Premium Card */}
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="card"
                    style={{
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '2rem',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Decorative Background Element */}
                    <div style={{
                        position: 'absolute',
                        top: '-20%',
                        right: '-10%',
                        width: '200px',
                        height: '200px',
                        background: 'var(--primary)',
                        filter: 'blur(100px)',
                        opacity: 0.2,
                        zIndex: 0
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
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
                            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                            transform: 'rotate(-5deg)'
                        }}>
                            LR
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Lenny Rajan</h2>
                        <p style={{ color: 'var(--primary)', fontWeight: 600, marginTop: '0.25rem' }}>PVCC • All-Rounder</p>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                            <Badge label="Season MVP" icon={<Award size={12} />} color="#fbbf24" />
                            <Badge label="Gully Verified" icon={<Shield size={12} />} color="#60a5fa" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Stats Section */}
            <div style={{ padding: '0 1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <StatBox label="Career Runs" value="2,482" icon={<TrendingUp size={18} />} />
                    <StatBox label="Career Wickets" value="84" icon={<Target size={18} />} />
                    <StatBox label="Strike Rate" value="138.4" icon={<Zap size={18} />} />
                    <StatBox label="Average" value="34.2" icon={<Trophy size={18} />} />
                </div>

                {/* Career Breakdown */}
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
