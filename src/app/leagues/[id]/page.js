"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import {
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';
import {
    ChevronLeft,
    Trophy,
    Users,
    Calendar,
    MapPin,
    Plus,
    X,
    Shield,
    CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

export default function LeagueDashboard() {
    const { id } = useParams();
    const router = useRouter();
    const { currentUser, userProfile } = useAuth();

    const [league, setLeague] = useState(null);
    const [teams, setTeams] = useState([]); // Teams in the league
    const [allTeams, setAllTeams] = useState([]); // All available teams to add
    const [loading, setLoading] = useState(true);
    const [showAddTeam, setShowAddTeam] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchLeagueData = async () => {
            try {
                const leagueDoc = await getDoc(doc(db, 'leagues', id));
                if (leagueDoc.exists()) {
                    const leagueData = { id: leagueDoc.id, ...leagueDoc.data() };
                    setLeague(leagueData);

                    // Fetch teams in this league
                    if (leagueData.teamIds?.length > 0) {
                        const teamPromises = leagueData.teamIds.map(async (teamId) => {
                            const teamDoc = await getDoc(doc(db, 'teams', teamId));
                            return teamDoc.exists() ? { id: teamDoc.id, ...teamDoc.data() } : null;
                        });
                        const leagueTeams = (await Promise.all(teamPromises)).filter(Boolean);
                        setTeams(leagueTeams);
                    }
                } else {
                    router.push('/leagues');
                }
            } catch (error) {
                console.error('Error fetching league data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeagueData();
    }, [id, router]);

    const fetchAllTeams = useCallback(async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'teams'));
            const teamsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Filter out teams already in the league
            setAllTeams(teamsData.filter(t => !league?.teamIds?.includes(t.id)));
        } catch (error) {
            console.error('Error fetching all teams:', error);
        }
    }, [league?.teamIds]);

    useEffect(() => {
        if (showAddTeam) {
            fetchAllTeams();
        }
    }, [showAddTeam, fetchAllTeams]);

    const handleAddTeam = async (teamId) => {
        try {
            await updateDoc(doc(db, 'leagues', id), {
                teamIds: arrayUnion(teamId)
            });

            // Update local state
            const addedTeam = allTeams.find(t => t.id === teamId);
            setTeams(prev => [...prev, addedTeam]);
            setLeague(prev => ({ ...prev, teamIds: [...(prev.teamIds || []), teamId] }));
            setAllTeams(prev => prev.filter(t => t.id !== teamId));

            alert('Team added to league successfully!');
        } catch (error) {
            console.error('Error adding team:', error);
            alert('Failed to add team.');
        }
    };

    const handleRemoveTeam = async (teamId, teamName) => {
        if (!confirm(`Are you sure you want to remove ${teamName} from this league?`)) return;

        try {
            await updateDoc(doc(db, 'leagues', id), {
                teamIds: arrayRemove(teamId)
            });

            // Update local state
            setTeams(prev => prev.filter(t => t.id !== teamId));
            setLeague(prev => ({ ...prev, teamIds: prev.teamIds?.filter(tid => tid !== teamId) }));

            alert('Team removed from league.');
        } catch (error) {
            console.error('Error removing team:', error);
            alert('Failed to remove team.');
        }
    };

    const isAdmin = league?.adminIds?.includes(currentUser?.uid) || userProfile?.role === 'super_admin';

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>;
    if (!league) return <div style={{ padding: '2rem', textAlign: 'center' }}>League not found.</div>;

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
                    gap: '1rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50
                }}>
                    <button className="btn" style={{ padding: '0.5rem' }} onClick={() => router.push('/leagues')}>
                        <ChevronLeft />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{league.name}</h1>
                        <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Dashboard</p>
                    </div>
                </header>

                <div style={{ padding: '1.5rem' }}>
                    {/* League Overview Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card"
                        style={{ padding: '1.5rem', marginBottom: '1.5rem' }}
                    >
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Trophy size={20} style={{ color: 'var(--primary)' }} />
                                    <span style={{ fontWeight: 700 }}>{league.type?.replace('_', ' ').toUpperCase()}</span>
                                </div>
                                <p style={{ opacity: 0.8, fontSize: '0.875rem', lineHeight: 1.5 }}>{league.description}</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', opacity: 0.7 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={16} />
                                    {new Date(league.startDate).toLocaleDateString()} - {new Date(league.endDate).toLocaleDateString()}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MapPin size={16} />
                                    {league.venue || 'TBD'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={16} />
                                    {teams.length} / {league.maxTeams} Teams
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Teams Management */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Participating Teams</h2>
                            {isAdmin && (
                                <button
                                    className="btn btn-primary"
                                    style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                    onClick={() => setShowAddTeam(true)}
                                >
                                    <Plus size={16} />
                                    Add Team
                                </button>
                            )}
                        </div>

                        {teams.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                                <p>No teams added yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {teams.map((team, idx) => (
                                    <motion.div
                                        key={team.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="card"
                                        style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: team.colors?.primary || 'var(--primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 800
                                        }}>
                                            {team.shortName}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{team.name}</h3>
                                            <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>{team.homeGround}</p>
                                        </div>
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleRemoveTeam(team.id, team.name)}
                                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', opacity: 0.6 }}
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Team Modal */}
                {showAddTeam && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="card"
                            style={{ maxWidth: '500px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                        >
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontWeight: 700 }}>Add Team to League</h3>
                                <button onClick={() => setShowAddTeam(false)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Search teams..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--background)',
                                        border: '1px solid var(--card-border)',
                                        color: 'white',
                                        marginBottom: '1rem'
                                    }}
                                />

                                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px' }}>
                                    {allTeams
                                        .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.shortName.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(team => (
                                            <div
                                                key={team.id}
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--card-border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem'
                                                }}
                                            >
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '4px',
                                                    background: team.colors?.primary || 'var(--primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 800
                                                }}>
                                                    {team.shortName}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{team.name}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddTeam(team.id)}
                                                    className="btn btn-primary"
                                                    style={{ background: 'var(--primary)', color: 'white', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))
                                    }
                                    {allTeams.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No more teams available.</p>}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </main>
        </ProtectedRoute>
    );
}
