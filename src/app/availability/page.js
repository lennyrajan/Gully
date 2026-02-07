"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    doc,
    addDoc,
    deleteDoc,
    getDoc
} from 'firebase/firestore';
import {
    ChevronLeft,
    Check,
    X,
    HelpCircle,
    Calendar,
    MapPin,
    Clock,
    Users,
    Plus,
    Edit2,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export default function AvailabilityHub() {
    const { currentUser, userProfile } = useAuth();
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGameModal, setShowGameModal] = useState(false);
    const [editingGame, setEditingGame] = useState(null);
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

    // Real-time listener for games
    useEffect(() => {
        if (!userProfile?.teams || userProfile.teams.length === 0) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'games'),
            where('teamId', 'in', userProfile.teams)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const gamesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by date (soonest first)
            gamesData.sort((a, b) => new Date(a.date) - new Date(b.date));

            setGames(gamesData);
            setLoading(false);
        }, (error) => {
            console.error('Error loading games:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile]);

    const updateAvailability = async (gameId, status) => {
        if (!currentUser) return;

        try {
            const gameRef = doc(db, 'games', gameId);
            await updateDoc(gameRef, {
                [`availability.${currentUser.uid}`]: status
            });
        } catch (error) {
            console.error('Error updating availability:', error);
            alert('Failed to update availability. Please try again.');
        }
    };

    const handleDeleteGame = async (gameId) => {
        if (!confirm('Are you sure you want to delete this game?')) return;

        try {
            await deleteDoc(doc(db, 'games', gameId));
        } catch (error) {
            console.error('Error deleting game:', error);
            alert('Failed to delete game. Please try again.');
        }
    };

    const getAvailabilityCounts = (game) => {
        if (!game.availability) return { yes: 0, maybe: 0, no: 0 };

        const counts = { yes: 0, maybe: 0, no: 0 };
        Object.values(game.availability).forEach(status => {
            if (status === 'yes') counts.yes++;
            else if (status === 'maybe') counts.maybe++;
            else if (status === 'no') counts.no++;
        });

        return counts;
    };

    const canCreateGame = hasPermission(userProfile?.role, PERMISSIONS.CREATE_GAME);
    const canEditGame = hasPermission(userProfile?.role, PERMISSIONS.EDIT_GAME);

    if (loading) {
        return (
            <ProtectedRoute>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <p>Loading games...</p>
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
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, flex: 1 }}>Availability</h1>
                    {canCreateGame && (
                        <button
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            onClick={() => { setEditingGame(null); setShowGameModal(true); }}
                        >
                            <Plus size={18} /> Add Game
                        </button>
                    )}
                </header>

                <div style={{ padding: '1.5rem' }}>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Mark your availability for the upcoming matches so the captain can finalize the XI.
                    </p>

                    {games.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                            <Calendar size={48} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                            <p style={{ opacity: 0.7 }}>No upcoming games scheduled yet.</p>
                            {canCreateGame && (
                                <button
                                    className="btn btn-primary"
                                    style={{ marginTop: '1rem' }}
                                    onClick={() => { setEditingGame(null); setShowGameModal(true); }}
                                >
                                    <Plus size={18} /> Schedule a Game
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {games.map((game, idx) => {
                                const myStatus = game.availability?.[currentUser?.uid] || 'none';
                                const counts = getAvailabilityCounts(game);

                                return (
                                    <motion.div
                                        key={game.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="card"
                                        style={{ padding: '1.5rem' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>vs {game.opponent}</h3>
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', opacity: 0.6, fontSize: '0.8rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Calendar size={14} /> {new Date(game.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={14} /> {game.time}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.25rem', opacity: 0.6, fontSize: '0.8rem' }}>
                                                    <MapPin size={14} /> {game.location}
                                                </div>
                                                {game.format && (
                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)' }}>
                                                        {game.format} overs
                                                    </div>
                                                )}
                                            </div>
                                            {canEditGame && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '0.5rem' }}
                                                        onClick={() => { setEditingGame(game); setShowGameModal(true); }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '0.5rem', color: 'var(--error)' }}
                                                        onClick={() => handleDeleteGame(game.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Availability Counts */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '1rem',
                                            marginBottom: '1rem',
                                            padding: '0.75rem',
                                            background: 'var(--background)',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Users size={16} style={{ color: 'var(--success)' }} />
                                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>{counts.yes}</span>
                                                <span style={{ opacity: 0.6 }}>Available</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <HelpCircle size={16} style={{ color: 'var(--warning)' }} />
                                                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{counts.maybe}</span>
                                                <span style={{ opacity: 0.6 }}>Maybe</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <X size={16} style={{ color: 'var(--error)' }} />
                                                <span style={{ color: 'var(--error)', fontWeight: 600 }}>{counts.no}</span>
                                                <span style={{ opacity: 0.6 }}>Unavailable</span>
                                            </div>
                                        </div>

                                        {/* Status Buttons */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                            <StatusButton
                                                label="YES"
                                                active={myStatus === 'yes'}
                                                color="var(--success)"
                                                icon={<Check size={18} />}
                                                onClick={() => updateAvailability(game.id, 'yes')}
                                            />
                                            <StatusButton
                                                label="MAYBE"
                                                active={myStatus === 'maybe'}
                                                color="var(--warning)"
                                                icon={<HelpCircle size={18} />}
                                                onClick={() => updateAvailability(game.id, 'maybe')}
                                            />
                                            <StatusButton
                                                label="NO"
                                                active={myStatus === 'no'}
                                                color="var(--error)"
                                                icon={<X size={18} />}
                                                onClick={() => updateAvailability(game.id, 'no')}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Game Modal */}
                <GameModal
                    isOpen={showGameModal}
                    onClose={() => { setShowGameModal(false); setEditingGame(null); }}
                    teams={teams}
                    editingGame={editingGame}
                    currentUser={currentUser}
                />
            </main>
        </ProtectedRoute>
    );
}

function StatusButton({ label, active, color, icon, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '12px',
                border: active ? `2px solid ${color}` : '2px solid transparent',
                background: active ? `${color}15` : 'var(--card-border)',
                color: active ? color : 'var(--foreground)',
                opacity: active ? 1 : 0.6,
                fontWeight: 700,
                fontSize: '0.7rem',
                transition: 'all 0.2s',
                cursor: 'pointer'
            }}
        >
            {icon}
            {label}
        </button>
    );
}

// Game Modal Component
function GameModal({ isOpen, onClose, teams, editingGame, currentUser }) {
    const [formData, setFormData] = useState({
        teamId: '',
        opponent: '',
        date: '',
        time: '',
        location: '',
        format: '20'
    });
    const [loading, setLoading] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editingGame) {
            setFormData({
                teamId: editingGame.teamId || '',
                opponent: editingGame.opponent || '',
                date: editingGame.date || '',
                time: editingGame.time || '',
                location: editingGame.location || '',
                format: editingGame.format || '20'
            });
        } else {
            setFormData({
                teamId: teams[0]?.id || '',
                opponent: '',
                date: '',
                time: '',
                location: '',
                format: '20'
            });
        }
    }, [editingGame, teams, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.teamId || !formData.opponent || !formData.date || !formData.time || !formData.location) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            if (editingGame) {
                // Update existing game
                await updateDoc(doc(db, 'games', editingGame.id), {
                    ...formData,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser.uid
                });
            } else {
                // Create new game
                await addDoc(collection(db, 'games'), {
                    ...formData,
                    availability: {},
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser.uid
                });
            }

            onClose();
        } catch (error) {
            console.error('Error saving game:', error);
            alert('Failed to save game. Please try again.');
        } finally {
            setLoading(false);
        }
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
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {editingGame ? 'Edit Game' : 'Schedule Game'}
                        </h2>
                        <button onClick={onClose} className="btn" style={{ padding: '0.5rem' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Team Selection */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Team *
                            </label>
                            <select
                                value={formData.teamId}
                                onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
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

                        {/* Opponent */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Opponent *
                            </label>
                            <input
                                type="text"
                                value={formData.opponent}
                                onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                                required
                                placeholder="e.g., South Bay Cricket Club"
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

                        {/* Date & Time */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
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
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Time *
                                </label>
                                <input
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
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
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Location *
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                required
                                placeholder="e.g., Central Park Cricket Ground"
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

                        {/* Format (Overs) */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Format (Overs)
                            </label>
                            <select
                                value={formData.format}
                                onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
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
                                <option value="10">10 Overs</option>
                                <option value="15">15 Overs</option>
                                <option value="20">20 Overs (T20)</option>
                                <option value="35">35 Overs</option>
                                <option value="40">40 Overs</option>
                                <option value="50">50 Overs (ODI)</option>
                            </select>
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
                                opacity: loading ? 0.6 : 1,
                                marginTop: '0.5rem'
                            }}
                        >
                            {loading ? 'Saving...' : (editingGame ? 'Update Game' : 'Create Game')}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
