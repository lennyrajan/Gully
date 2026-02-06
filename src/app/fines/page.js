"use client";

import React from 'react';
import {
    ChevronLeft,
    DollarSign,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    Clock,
    ExternalLink,
    Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_FINES = [
    {
        id: 1,
        player: 'Lenny Rajan',
        reason: 'Dropped a sitter (Sanjay’s bowling)',
        amount: 5.00,
        status: 'unpaid',
        date: 'Feb 5, 2026'
    },
    {
        id: 2,
        player: 'Sanjay Gupta',
        reason: 'Arriving late for warm-ups',
        amount: 10.00,
        status: 'paid',
        date: 'Feb 1, 2026'
    },
    {
        id: 3,
        player: 'Lenny Rajan',
        reason: 'Golden Duck dismissal',
        amount: 10.00,
        status: 'unpaid',
        date: 'Jan 28, 2026'
    }
];

export default function FinesLedger() {
    const myTotalDebt = MOCK_FINES
        .filter(f => f.player === 'Lenny Rajan' && f.status === 'unpaid')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return (
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
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fines Ledger</h1>
            </header>

            {/* Debt Summary Card */}
            <div style={{ padding: '1.5rem' }}>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="card"
                    style={{
                        background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                        color: 'white',
                        padding: '2rem',
                        textAlign: 'center'
                    }}
                >
                    <p style={{ fontSize: '0.875rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Your Outstanding Debt
                    </p>
                    <h2 style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0' }}>
                        ${myTotalDebt.toFixed(2)}
                    </h2>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                        <button className="btn" style={{ background: 'white', color: '#b91c1c', fontSize: '0.875rem' }}>
                            <CreditCard size={18} /> Pay via Venmo
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Fines List */}
            <div style={{ padding: '0 1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.5, marginBottom: '1rem' }}>Recent Fines</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {MOCK_FINES.map((fine, idx) => (
                        <motion.div
                            key={fine.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="card"
                            style={{
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                borderLeft: fine.status === 'paid' ? '4px solid var(--success)' : '4px solid var(--error)'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: 'var(--card-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: fine.status === 'paid' ? 'var(--success)' : 'var(--error)'
                            }}>
                                {fine.status === 'paid' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{fine.player}</h4>
                                    <span style={{ fontWeight: 800, color: fine.status === 'paid' ? 'var(--success)' : 'var(--error)' }}>
                                        ${fine.amount.toFixed(2)}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>{fine.reason}</p>
                                <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.25rem' }}>{fine.date}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Admin Quick Link */}
            <div style={{ padding: '2rem 1.5rem' }}>
                <div className="card" style={{ borderStyle: 'dashed', textAlign: 'center', borderColor: 'var(--primary)' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600 }}>
                        Admin: Add new club expense or fine
                    </p>
                    <button className="btn btn-primary" style={{ marginTop: '0.75rem', width: '100%' }}>
                        <Plus size={18} /> Add Ledger Entry
                    </button>
                </div>
            </div>
        </main>
    );
}
