"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import {
    ChevronLeft,
    DollarSign,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    Clock,
    ExternalLink,
    Plus,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export default function FinesLedger() {
    const { currentUser, userProfile } = useAuth();
    const [fines, setFines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [teams, setTeams] = useState([]);

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

    // Real-time listener for fines
    useEffect(() => {
        if (!userProfile?.teams || userProfile.teams.length === 0) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'fines'),
            where('teamId', 'in', userProfile.teams)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const finesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by date (newest first)
            finesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setFines(finesData);
            setLoading(false);
        }, (error) => {
            console.error('Error loading fines:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile]);

    const handlePayFine = async (fineId) => {
        try {
            await updateDoc(doc(db, 'fines', fineId), {
                status: 'paid',
                paidAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error paying fine:', error);
            alert('Failed to mark fine as paid. Please try again.');
        }
    };

    const myTotalDebt = fines
        .filter(f => f.playerId === currentUser?.uid && f.status === 'unpaid')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const canCreateFines = hasPermission(userProfile?.role, PERMISSIONS.CREATE_FINE);

    if (loading) {
        return (
            <ProtectedRoute>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <p>Loading fines...</p>
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
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fines Ledger</h1>
                </header>

                {/* Debt Summary Card */}
                <div style={{ padding: '1.5rem' }}>
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="card"
                        style={{
                            background: myTotalDebt > 0
                                ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                                : 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            padding: '2rem',
                            textAlign: 'center'
                        }}
                    >
                        <p style={{ fontSize: '0.875rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {myTotalDebt > 0 ? 'Your Outstanding Debt' : 'All Clear!'}
                        </p>
                        <h2 style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0' }}>
                            ${myTotalDebt.toFixed(2)}
                        </h2>
                        {myTotalDebt > 0 && (
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                                <button className="btn" style={{ background: 'white', color: '#b91c1c', fontSize: '0.875rem' }}>
                                    <CreditCard size={18} /> Pay via Venmo
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Fines List */}
                <div style={{ padding: '0 1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.5, marginBottom: '1rem' }}>Recent Fines</h3>
                    {fines.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                            <CheckCircle2 size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
                            <p style={{ opacity: 0.7 }}>No fines yet! Keep up the good work! 🎉</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {fines.map((fine, idx) => {
                                const isMyFine = fine.playerId === currentUser?.uid;
                                const canPay = isMyFine && fine.status === 'unpaid';

                                return (
                                    <motion.div
                                        key={fine.id}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="card"
                                        style={{
                                            padding: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            borderLeft: fine.status === 'paid' ? '4px solid var(--success)' : '4px solid var(--error)',
                                            background: isMyFine ? 'var(--card)' : 'var(--background)'
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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                                    {fine.playerName}
                                                    {isMyFine && <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '0.5rem' }}>(You)</span>}
                                                </h4>
                                                <span style={{ fontWeight: 800, color: fine.status === 'paid' ? 'var(--success)' : 'var(--error)' }}>
                                                    ${fine.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>{fine.reason}</p>
                                            <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.25rem' }}>
                                                {new Date(fine.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            {canPay && (
                                                <button
                                                    onClick={() => handlePayFine(fine.id)}
                                                    className="btn btn-primary"
                                                    style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                                                >
                                                    Mark as Paid
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Admin Add Fine Button */}
                {canCreateFines && (
                    <div style={{ padding: '2rem 1.5rem' }}>
                        <div className="card" style={{ borderStyle: 'dashed', textAlign: 'center', borderColor: 'var(--primary)' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600 }}>
                                Admin: Add new club expense or fine
                            </p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn btn-primary"
                                style={{ marginTop: '0.75rem', width: '100%' }}
                            >
                                <Plus size={18} /> Add Ledger Entry
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Fine Modal */}
                <AddFineModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    teams={teams}
                    currentUser={currentUser}
                />
            </main>
        </ProtectedRoute>
    );
}

// Add Fine Modal Component
function AddFineModal({ isOpen, onClose, teams, currentUser }) {
    const [formData, setFormData] = useState({
        teamId: '',
        playerId: '',
        playerName: '',
        reason: '',
        amount: ''
    });
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load team members when team is selected
    useEffect(() => {
        if (!formData.teamId) {
            setTeamMembers([]);
            return;
        }

        const loadMembers = async () => {
            try {
                const teamDoc = await getDoc(doc(db, 'teams', formData.teamId));
                if (teamDoc.exists()) {
                    const team = teamDoc.data();
                    const memberPromises = team.memberIds.map(async (memberId) => {
                        const userDoc = await getDoc(doc(db, 'users', memberId));
                        if (userDoc.exists()) {
                            return { id: userDoc.id, ...userDoc.data() };
                        }
                        return null;
                    });
                    const members = (await Promise.all(memberPromises)).filter(Boolean);
                    setTeamMembers(members);
                }
            } catch (error) {
                console.error('Error loading team members:', error);
            }
        };

        loadMembers();
    }, [formData.teamId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.teamId || !formData.playerId || !formData.reason || !formData.amount) {
            alert('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'fines'), {
                teamId: formData.teamId,
                playerId: formData.playerId,
                playerName: formData.playerName,
                reason: formData.reason,
                amount: parseFloat(formData.amount),
                status: 'unpaid',
                createdAt: new Date().toISOString(),
                paidAt: null,
                createdBy: currentUser.uid
            });

            alert('Fine added successfully!');
            setFormData({ teamId: '', playerId: '', playerName: '', reason: '', amount: '' });
            onClose();
        } catch (error) {
            console.error('Error adding fine:', error);
            alert('Failed to add fine. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerSelect = (e) => {
        const selectedMember = teamMembers.find(m => m.id === e.target.value);
        setFormData(prev => ({
            ...prev,
            playerId: e.target.value,
            playerName: selectedMember?.displayName || ''
        }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
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
                    padding: '1rem'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="card"
                    style={{
                        maxWidth: '500px',
                        width: '100%',
                        padding: '2rem',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Add Fine</h2>
                        <button onClick={onClose} className="btn" style={{ padding: '0.5rem' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Team Selection */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Team *
                            </label>
                            <select
                                value={formData.teamId}
                                onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value, playerId: '', playerName: '' }))}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--card-border)',
                                    background: 'var(--background)',
                                    color: 'var(--foreground)',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="">Select team...</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Player Selection */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Player *
                            </label>
                            <select
                                value={formData.playerId}
                                onChange={handlePlayerSelect}
                                required
                                disabled={!formData.teamId}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--card-border)',
                                    background: 'var(--background)',
                                    color: 'var(--foreground)',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="">Select player...</option>
                                {teamMembers.map(member => (
                                    <option key={member.id} value={member.id}>{member.displayName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Reason */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Reason *
                            </label>
                            <input
                                type="text"
                                value={formData.reason}
                                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                required
                                placeholder="e.g., Dropped a sitter"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--card-border)',
                                    background: 'var(--background)',
                                    color: 'var(--foreground)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Amount ($) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                required
                                placeholder="5.00"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--card-border)',
                                    background: 'var(--background)',
                                    color: 'var(--foreground)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1rem',
                                fontWeight: 700,
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? 'Adding...' : 'Add Fine'}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
