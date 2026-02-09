"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { motion } from 'framer-motion';
import { Users, Trophy, User, ChevronRight } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function OnboardingPage() {
    const router = useRouter();
    const { userProfile } = useAuth();

    const options = [
        {
            id: 'player',
            title: 'Register as a Player',
            description: 'Join an existing team, track your stats, and connect with your club.',
            icon: <User size={32} />,
            color: 'var(--primary)',
            action: () => router.push('/teams/join')
        },
        {
            id: 'team_admin',
            title: 'Register a Team',
            description: 'Start your own team, manage players, and organize matches.',
            icon: <Users size={32} />,
            color: '#10b981',
            action: () => router.push('/teams/register')
        },
        {
            id: 'league_admin',
            title: 'I am a League Admin',
            description: 'Setup a tournament/league, invite teams, and manage fixtures.',
            icon: <Trophy size={32} />,
            color: '#fbbf24',
            action: () => router.push('/leagues/create')
        }
    ];

    return (
        <ProtectedRoute>
            <main style={{
                minHeight: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '3rem' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
                            Welcome to Gully!
                        </h1>
                        <p style={{ fontSize: '1.125rem', opacity: 0.7 }}>
                            How do you want to use the pavilion today? Select your primary role to get started. 🏏
                        </p>
                    </motion.div>
                </div>

                <div style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {options.map((option, idx) => (
                        <motion.div
                            key={option.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * idx }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={option.action}
                            className="card"
                            style={{
                                cursor: 'pointer',
                                padding: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.5rem',
                                border: '1px solid var(--card-border)',
                                transition: 'border-color 0.2s'
                            }}
                        >
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                background: option.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                flexShrink: 0
                            }}>
                                {option.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                                    {option.title}
                                </h3>
                                <p style={{ fontSize: '0.875rem', opacity: 0.7, lineHeight: 1.4 }}>
                                    {option.description}
                                </p>
                            </div>
                            <ChevronRight size={20} style={{ opacity: 0.3 }} />
                        </motion.div>
                    ))}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '3rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', opacity: 0.5 }}>
                        Don&apos;t worry, you can change your role or join multiple teams later.
                    </p>
                </div>
            </main>
        </ProtectedRoute>
    );
}
