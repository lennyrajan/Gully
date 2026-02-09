"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ChevronLeft, Trophy, Calendar, Users, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

export default function CreateLeague() {
    const router = useRouter();
    const { currentUser, userProfile, updateUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'round_robin', // 'round_robin' | 'knockout'
        startDate: '',
        endDate: '',
        maxTeams: 8,
        venue: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentUser || !userProfile) return;

        // Check permission
        if (!hasPermission(userProfile.role, PERMISSIONS.CREATE_LEAGUE)) {
            alert('You do not have permission to create leagues.');
            return;
        }

        setLoading(true);
        try {
            const leagueData = {
                ...formData,
                adminIds: [currentUser.uid],
                teamIds: [],
                status: 'upcoming', // 'upcoming' | 'ongoing' | 'completed'
                createdAt: new Date().toISOString(),
                createdBy: currentUser.uid
            };

            const docRef = await addDoc(collection(db, 'leagues'), leagueData);

            // Promote user to league_admin if they weren't already a higher role
            if (userProfile.role === 'player') {
                await updateUserProfile(currentUser.uid, { role: 'league_admin' });
            }

            alert(`League "${formData.name}" created successfully!`);
            router.push(`/leagues/${docRef.id}`);
        } catch (error) {
            console.error('Error creating league:', error);
            alert('Failed to create league.');
        } finally {
            setLoading(false);
        }
    };

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
                    <button className="btn" style={{ padding: '0.5rem' }} onClick={() => router.back()}>
                        <ChevronLeft />
                    </button>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Setup Tournament</h1>
                </header>

                <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
                    <motion.form
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleSubmit}
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                    >
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                marginBottom: '1rem'
                            }}>
                                <Trophy size={24} />
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>League Information</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        League Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="e.g., Summer Gully Cup 2026"
                                        className="input-field"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            background: 'var(--card-bg)',
                                            border: '1px solid var(--card-border)',
                                            color: 'white'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Rules, prizes, or any details..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            background: 'var(--card-bg)',
                                            border: '1px solid var(--card-border)',
                                            color: 'white',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Format & Schedule</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                            League Type
                                        </label>
                                        <select
                                            name="type"
                                            value={formData.type}
                                            onChange={handleInputChange}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                background: 'var(--card-bg)',
                                                border: '1px solid var(--card-border)',
                                                color: 'white'
                                            }}
                                        >
                                            <option value="round_robin">Round Robin</option>
                                            <option value="knockout">Knockout</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                            Max Teams
                                        </label>
                                        <input
                                            type="number"
                                            name="maxTeams"
                                            value={formData.maxTeams}
                                            onChange={handleInputChange}
                                            min="2"
                                            max="32"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                background: 'var(--card-bg)',
                                                border: '1px solid var(--card-border)',
                                                color: 'white'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            name="startDate"
                                            value={formData.startDate}
                                            onChange={handleInputChange}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                background: 'var(--card-bg)',
                                                border: '1px solid var(--card-border)',
                                                color: 'white'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            name="endDate"
                                            value={formData.endDate}
                                            onChange={handleInputChange}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                background: 'var(--card-bg)',
                                                border: '1px solid var(--card-border)',
                                                color: 'white'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        Venue / Central Ground
                                    </label>
                                    <input
                                        type="text"
                                        name="venue"
                                        value={formData.venue}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Central Park Stadium"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            background: 'var(--card-bg)',
                                            border: '1px solid var(--card-border)',
                                            color: 'white'
                                        }}
                                    />
                                </div>
                            </div>
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
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                background: 'var(--primary)',
                                color: 'white',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? (
                                'Creating Tournament...'
                            ) : (
                                <>
                                    <Check size={20} />
                                    Launch League
                                </>
                            )}
                        </button>
                    </motion.form>
                </div>
            </main>
        </ProtectedRoute>
    );
}
