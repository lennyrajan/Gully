"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ChevronLeft, Trophy, Users, Calendar, Plus, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

export default function LeaguesList() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeagues = async () => {
            try {
                const q = query(collection(db, 'leagues'));
                const querySnapshot = await getDocs(q);
                const leaguesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setLeagues(leaguesData);
            } catch (error) {
                console.error('Error fetching leagues:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeagues();
    }, []);

    const canCreateLeague = userProfile && hasPermission(userProfile.role, PERMISSIONS.CREATE_LEAGUE);

    return (
        <ProtectedRoute>
            <main style={{
                minHeight: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)',
                paddingBottom: '3rem'
            }}>
                <header className="glass" style={{
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn" style={{ padding: '0.5rem' }} onClick={() => router.back()}>
                            <ChevronLeft />
                        </button>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Tournaments</h1>
                    </div>
                    {canCreateLeague && (
                        <button
                            className="btn btn-primary"
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'var(--primary)',
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                            onClick={() => router.push('/leagues/create')}
                        >
                            <Plus size={18} />
                            Setup league
                        </button>
                    )}
                </header>

                <div style={{ padding: '1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <p>Loading tournaments...</p>
                        </div>
                    ) : leagues.length === 0 ? (
                        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                            <Trophy size={64} style={{ opacity: 0.1, margin: '0 auto 1.5rem' }} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Active Leagues</h2>
                            <p style={{ opacity: 0.6, marginBottom: '2rem' }}>Be the first to launch a tournament in your area!</p>
                            {canCreateLeague && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => router.push('/leagues/create')}
                                    style={{ background: 'var(--primary)', color: 'white' }}
                                >
                                    Create League
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {leagues.map((league, idx) => (
                                <motion.div
                                    key={league.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="card"
                                    onClick={() => router.push(`/leagues/${league.id}`)}
                                    style={{ cursor: 'pointer', padding: '1.5rem', position: 'relative' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                background: league.status === 'upcoming' ? 'var(--primary-light)' : 'var(--success-light)',
                                                color: 'var(--primary)',
                                                marginBottom: '0.5rem',
                                                textTransform: 'uppercase'
                                            }}>
                                                {league.status}
                                            </div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{league.name}</h3>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', opacity: 0.6, fontSize: '0.875rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Calendar size={14} />
                                                    {new Date(league.startDate).toLocaleDateString()}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Users size={14} />
                                                    {league.teamIds?.length || 0} / {league.maxTeams} Teams
                                                </div>
                                                {league.type && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <Trophy size={14} />
                                                        {league.type.replace('_', ' ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <ExternalLink size={20} style={{ opacity: 0.3 }} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </ProtectedRoute>
    );
}
