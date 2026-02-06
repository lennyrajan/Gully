"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, Search, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function JoinTeam() {
    const router = useRouter();
    const { currentUser, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [myRequests, setMyRequests] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Load all teams
    useEffect(() => {
        const loadTeams = async () => {
            try {
                const teamsSnapshot = await getDocs(collection(db, 'teams'));
                const allTeams = teamsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Filter out teams user is already a member of
                const userTeamIds = userProfile?.teams || [];
                const availableTeams = allTeams.filter(team =>
                    !userTeamIds.includes(team.id) && team.isActive
                );

                setTeams(availableTeams);
            } catch (error) {
                console.error('Error loading teams:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userProfile) {
            loadTeams();
        }
    }, [userProfile]);

    // Real-time listener for user's requests
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'teamRequests'),
            where('playerId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMyRequests(requests);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleSubmitRequest = async () => {
        if (!selectedTeam || !currentUser || !userProfile) return;

        setSubmitting(true);
        try {
            // Check if request already exists
            const existingRequest = myRequests.find(
                req => req.teamId === selectedTeam.id && req.status === 'pending'
            );

            if (existingRequest) {
                alert('You already have a pending request for this team.');
                setSubmitting(false);
                return;
            }

            // Create join request
            await addDoc(collection(db, 'teamRequests'), {
                teamId: selectedTeam.id,
                playerId: currentUser.uid,
                playerName: userProfile.displayName || currentUser.email?.split('@')[0] || 'User',
                playerEmail: currentUser.email,
                status: 'pending',
                message: message.trim() || null,
                requestedAt: new Date().toISOString(),
                reviewedAt: null,
                reviewedBy: null
            });

            alert(`Your request to join ${selectedTeam.name} has been submitted!`);
            setSelectedTeam(null);
            setMessage('');
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Failed to submit request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.homeGround.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRequestStatus = (teamId) => {
        return myRequests.find(req => req.teamId === teamId);
    };

    return (
        <ProtectedRoute>
            <main style={{
                minHeight: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)',
                paddingBottom: '3rem'
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
                    <button className="btn" style={{ padding: '0.5rem' }} onClick={() => router.back()}>
                        <ChevronLeft />
                    </button>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Join a Team</h1>
                </header>

                <div style={{ padding: '1.5rem' }}>
                    {/* Search Bar */}
                    <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Search size={20} style={{ opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder="Search teams by name, abbreviation, or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--foreground)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* My Pending Requests */}
                    {myRequests.filter(req => req.status === 'pending').length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.7, marginBottom: '1rem' }}>
                                Pending Requests
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {myRequests
                                    .filter(req => req.status === 'pending')
                                    .map(req => {
                                        const team = teams.find(t => t.id === req.teamId);
                                        if (!team) return null;

                                        return (
                                            <div key={req.id} className="card" style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <Clock size={20} style={{ color: 'var(--warning)' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                                            {team.name}
                                                        </h3>
                                                        <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                                            Requested {new Date(req.requestedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Available Teams */}
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.7, marginBottom: '1rem' }}>
                        Available Teams
                    </h2>

                    {loading ? (
                        <p style={{ textAlign: 'center', opacity: 0.7 }}>Loading teams...</p>
                    ) : filteredTeams.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                            <p style={{ opacity: 0.7 }}>
                                {searchQuery ? 'No teams found matching your search.' : 'No teams available to join.'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredTeams.map((team, idx) => {
                                const requestStatus = getRequestStatus(team.id);

                                return (
                                    <motion.div
                                        key={team.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="card"
                                        style={{
                                            padding: '1.25rem',
                                            cursor: requestStatus ? 'default' : 'pointer',
                                            opacity: requestStatus ? 0.7 : 1
                                        }}
                                        onClick={() => !requestStatus && setSelectedTeam(team)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {team.logo ? (
                                                <img
                                                    src={team.logo}
                                                    alt={team.name}
                                                    style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '56px',
                                                    height: '56px',
                                                    borderRadius: '12px',
                                                    background: team.colors?.primary || 'var(--primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '1.25rem',
                                                    fontWeight: 800
                                                }}>
                                                    {team.shortName}
                                                </div>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                                                    {team.name}
                                                </h3>
                                                <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                                                    {team.homeGround} • {team.memberIds.length} members
                                                </p>
                                            </div>
                                            {requestStatus && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {requestStatus.status === 'pending' && (
                                                        <>
                                                            <Clock size={18} style={{ color: 'var(--warning)' }} />
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>Pending</span>
                                                        </>
                                                    )}
                                                    {requestStatus.status === 'approved' && (
                                                        <>
                                                            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Approved</span>
                                                        </>
                                                    )}
                                                    {requestStatus.status === 'rejected' && (
                                                        <>
                                                            <XCircle size={18} style={{ color: 'var(--error)' }} />
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>Rejected</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Join Request Modal */}
                {selectedTeam && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: '1.5rem'
                    }} onClick={() => setSelectedTeam(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="card"
                            style={{
                                padding: '1.5rem',
                                maxWidth: '400px',
                                width: '100%'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
                                Join {selectedTeam.name}
                            </h2>
                            <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '1.5rem' }}>
                                Your request will be reviewed by the team admin. You can optionally include a message.
                            </p>
                            <textarea
                                placeholder="Optional message to team admin..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--card-border)',
                                    background: 'var(--background)',
                                    color: 'var(--foreground)',
                                    fontSize: '0.9375rem',
                                    resize: 'vertical',
                                    marginBottom: '1rem'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setSelectedTeam(null)}
                                    className="btn"
                                    style={{ flex: 1, background: 'transparent' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitRequest}
                                    disabled={submitting}
                                    className="btn btn-primary"
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        opacity: submitting ? 0.6 : 1
                                    }}
                                >
                                    <Send size={18} />
                                    {submitting ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </main>
        </ProtectedRoute>
    );
}
