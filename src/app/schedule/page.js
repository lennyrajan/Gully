"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from 'firebase/firestore';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar,
    Clock,
    MapPin,
    Users,
    X,
    Edit2,
    Trash2,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulePage() {
    const { currentUser, userProfile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scheduledMatches, setScheduledMatches] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [loading, setLoading] = useState(true);

    // Real-time listener for scheduled matches
    useEffect(() => {
        if (!userProfile?.teams || userProfile.teams.length === 0) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'scheduledMatches'),
            where('teamId', 'in', userProfile.teams)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matchesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setScheduledMatches(matchesData);
            setLoading(false);
        }, (error) => {
            console.error('Error loading scheduled matches:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days = [];

        // Previous month's trailing days
        for (let i = 0; i < startingDay; i++) {
            const prevDate = new Date(year, month, -startingDay + i + 1);
            days.push({ date: prevDate, isCurrentMonth: false });
        }

        // Current month's days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        // Next month's leading days
        const remainingDays = 42 - days.length; // 6 rows * 7 days
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return days;
    };

    const getMatchesForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return scheduledMatches.filter(match => match.date === dateStr);
    };

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + direction);
            return newDate;
        });
    };

    const handleDeleteMatch = async (matchId) => {
        if (!confirm('Are you sure you want to delete this scheduled match?')) return;

        try {
            await deleteDoc(doc(db, 'scheduledMatches', matchId));
        } catch (error) {
            console.error('Error deleting match:', error);
            alert('Failed to delete match. Please try again.');
        }
    };

    const canCreateMatch = hasPermission(userProfile?.role, PERMISSIONS.CREATE_GAME);

    const days = getDaysInMonth(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (loading) {
        return (
            <ProtectedRoute>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <p>Loading schedule...</p>
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
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, flex: 1 }}>Schedule</h1>
                    {canCreateMatch && (
                        <button
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            onClick={() => { setEditingMatch(null); setShowMatchModal(true); }}
                        >
                            <Plus size={18} /> Schedule
                        </button>
                    )}
                </header>

                <div style={{ padding: '1.5rem' }}>
                    {/* Calendar Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1.5rem'
                    }}>
                        <button className="btn" style={{ padding: '0.5rem' }} onClick={() => navigateMonth(-1)}>
                            <ChevronLeft size={20} />
                        </button>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <button className="btn" style={{ padding: '0.5rem' }} onClick={() => navigateMonth(1)}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '4px',
                        marginBottom: '0.5rem'
                    }}>
                        {DAYS.map(day => (
                            <div key={day} style={{
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                opacity: 0.6,
                                padding: '0.5rem'
                            }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '4px'
                    }}>
                        {days.map(({ date, isCurrentMonth }, idx) => {
                            const matches = getMatchesForDate(date);
                            const isToday = date.getTime() === today.getTime();
                            const isSelected = selectedDate?.getTime() === date.getTime();

                            return (
                                <motion.button
                                    key={idx}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedDate(date)}
                                    style={{
                                        aspectRatio: '1',
                                        padding: '0.25rem',
                                        borderRadius: '8px',
                                        border: isSelected ? '2px solid var(--primary)' : '1px solid transparent',
                                        background: isToday ? 'var(--primary)' : isCurrentMonth ? 'var(--card)' : 'transparent',
                                        color: isToday ? 'white' : isCurrentMonth ? 'var(--foreground)' : 'var(--foreground)',
                                        opacity: isCurrentMonth ? 1 : 0.3,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative'
                                    }}
                                >
                                    <span style={{ fontSize: '0.875rem', fontWeight: isToday ? 700 : 500 }}>
                                        {date.getDate()}
                                    </span>
                                    {matches.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '4px',
                                            display: 'flex',
                                            gap: '2px'
                                        }}>
                                            {matches.slice(0, 3).map((_, i) => (
                                                <div key={i} style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: isToday ? 'white' : 'var(--primary)'
                                                }} />
                                            ))}
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Selected Date Matches */}
                    {selectedDate && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ marginTop: '1.5rem' }}
                        >
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: 700,
                                marginBottom: '1rem'
                            }}>
                                {selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </h3>

                            {getMatchesForDate(selectedDate).length === 0 ? (
                                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                    <Calendar size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                                    <p style={{ opacity: 0.6, fontSize: '0.875rem' }}>No matches scheduled</p>
                                    {canCreateMatch && (
                                        <button
                                            className="btn btn-primary"
                                            style={{ marginTop: '1rem', fontSize: '0.875rem' }}
                                            onClick={() => {
                                                setEditingMatch({ date: selectedDate.toISOString().split('T')[0] });
                                                setShowMatchModal(true);
                                            }}
                                        >
                                            <Plus size={16} /> Schedule for this day
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {getMatchesForDate(selectedDate).map(match => (
                                        <MatchCard
                                            key={match.id}
                                            match={match}
                                            canEdit={canCreateMatch}
                                            onEdit={() => { setEditingMatch(match); setShowMatchModal(true); }}
                                            onDelete={() => handleDeleteMatch(match.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Upcoming Matches List */}
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                            Upcoming Fixtures
                        </h3>
                        {scheduledMatches
                            .filter(m => new Date(m.date) >= today)
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .slice(0, 5)
                            .map(match => (
                                <MatchCard
                                    key={match.id}
                                    match={match}
                                    canEdit={canCreateMatch}
                                    onEdit={() => { setEditingMatch(match); setShowMatchModal(true); }}
                                    onDelete={() => handleDeleteMatch(match.id)}
                                    showDate
                                />
                            ))}
                        {scheduledMatches.filter(m => new Date(m.date) >= today).length === 0 && (
                            <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                <p style={{ opacity: 0.6 }}>No upcoming fixtures scheduled</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Match Modal */}
                <ScheduleMatchModal
                    isOpen={showMatchModal}
                    onClose={() => { setShowMatchModal(false); setEditingMatch(null); }}
                    editingMatch={editingMatch}
                    userProfile={userProfile}
                    currentUser={currentUser}
                />
            </main>
        </ProtectedRoute>
    );
}

function MatchCard({ match, canEdit, onEdit, onDelete, showDate }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ padding: '1rem', marginBottom: '0.5rem' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                        vs {match.opponent}
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', opacity: 0.7 }}>
                        {showDate && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={14} />
                                {new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} /> {match.time}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={14} /> {match.venue}
                        </span>
                    </div>
                    {match.format && (
                        <span style={{
                            display: 'inline-block',
                            marginTop: '0.5rem',
                            fontSize: '0.7rem',
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px'
                        }}>
                            {match.format} overs
                        </span>
                    )}
                </div>
                {canEdit && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" style={{ padding: '0.5rem' }} onClick={onEdit}>
                            <Edit2 size={16} />
                        </button>
                        <button className="btn" style={{ padding: '0.5rem', color: 'var(--error)' }} onClick={onDelete}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function ScheduleMatchModal({ isOpen, onClose, editingMatch, userProfile, currentUser }) {
    const [formData, setFormData] = useState({
        teamId: '',
        opponent: '',
        date: '',
        time: '',
        venue: '',
        format: '20'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingMatch && editingMatch.id) {
            setFormData({
                teamId: editingMatch.teamId || '',
                opponent: editingMatch.opponent || '',
                date: editingMatch.date || '',
                time: editingMatch.time || '',
                venue: editingMatch.venue || '',
                format: editingMatch.format || '20'
            });
        } else if (editingMatch?.date) {
            // Scheduling for a specific date
            setFormData({
                teamId: userProfile?.primaryTeamId || userProfile?.teams?.[0] || '',
                opponent: '',
                date: editingMatch.date,
                time: '',
                venue: '',
                format: '20'
            });
        } else {
            setFormData({
                teamId: userProfile?.primaryTeamId || userProfile?.teams?.[0] || '',
                opponent: '',
                date: '',
                time: '',
                venue: '',
                format: '20'
            });
        }
    }, [editingMatch, userProfile, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.opponent || !formData.date || !formData.time || !formData.venue) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            if (editingMatch?.id) {
                await updateDoc(doc(db, 'scheduledMatches', editingMatch.id), {
                    ...formData,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser.uid
                });
            } else {
                await addDoc(collection(db, 'scheduledMatches'), {
                    ...formData,
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser.uid
                });
            }

            onClose();
        } catch (error) {
            console.error('Error saving match:', error);
            alert('Failed to save match. Please try again.');
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
                            {editingMatch?.id ? 'Edit Match' : 'Schedule Match'}
                        </h2>
                        <button onClick={onClose} className="btn" style={{ padding: '0.5rem' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Opponent *
                            </label>
                            <input
                                type="text"
                                value={formData.opponent}
                                onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                                required
                                placeholder="e.g., South Bay CC"
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

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Venue *
                            </label>
                            <input
                                type="text"
                                value={formData.venue}
                                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
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
                            {loading ? 'Saving...' : (editingMatch?.id ? 'Update Match' : 'Schedule Match')}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
