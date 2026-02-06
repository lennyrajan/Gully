"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { ChevronLeft, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    PLAYER_ROLE_OPTIONS,
    BATTING_STYLE_OPTIONS,
    BOWLING_STYLE_OPTIONS,
    GENDER_OPTIONS
} from '@/lib/cricketConstants';

export default function EditProfile() {
    const router = useRouter();
    const { currentUser, userProfile, updateUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        displayName: userProfile?.displayName || '',
        playerRole: userProfile?.cricketProfile?.playerRole || '',
        battingStyle: userProfile?.cricketProfile?.battingStyle || '',
        bowlingStyle: userProfile?.cricketProfile?.bowlingStyle || '',
        dateOfBirth: userProfile?.cricketProfile?.dateOfBirth || '',
        gender: userProfile?.cricketProfile?.gender || '',
        jerseyNumber: userProfile?.cricketProfile?.jerseyNumber || ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert('You must be logged in to edit your profile');
            return;
        }

        setLoading(true);
        try {
            await updateUserProfile(currentUser.uid, {
                displayName: formData.displayName,
                cricketProfile: {
                    playerRole: formData.playerRole || null,
                    battingStyle: formData.battingStyle || null,
                    bowlingStyle: formData.bowlingStyle || null,
                    dateOfBirth: formData.dateOfBirth || null,
                    gender: formData.gender || null,
                    jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : null
                }
            });

            alert('Profile updated successfully!');
            router.push('/profile');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
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
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Edit Profile</h1>
                </header>

                <div style={{ padding: '1.5rem' }}>
                    <motion.form
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleSubmit}
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                    >
                        {/* Display Name */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Display Name *
                            </label>
                            <input
                                type="text"
                                name="displayName"
                                value={formData.displayName}
                                onChange={handleInputChange}
                                required
                                placeholder="Your name"
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

                        {/* Cricket Profile Section */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                                Cricket Profile
                            </h2>

                            {/* Player Role */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Player Role
                                </label>
                                <select
                                    name="playerRole"
                                    value={formData.playerRole}
                                    onChange={handleInputChange}
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
                                    <option value="">Select role...</option>
                                    {PLAYER_ROLE_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Batting Style */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Batting Style
                                </label>
                                <select
                                    name="battingStyle"
                                    value={formData.battingStyle}
                                    onChange={handleInputChange}
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
                                    <option value="">Select batting style...</option>
                                    {BATTING_STYLE_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Bowling Style */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Bowling Style
                                </label>
                                <select
                                    name="bowlingStyle"
                                    value={formData.bowlingStyle}
                                    onChange={handleInputChange}
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
                                    {BOWLING_STYLE_OPTIONS.map(option => (
                                        <option key={option.value || 'none'} value={option.value || ''}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Jersey Number */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Jersey Number
                                </label>
                                <input
                                    type="number"
                                    name="jerseyNumber"
                                    value={formData.jerseyNumber}
                                    onChange={handleInputChange}
                                    min="0"
                                    max="999"
                                    placeholder="Optional"
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

                        {/* Personal Information */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                                Personal Information
                            </h2>

                            {/* Date of Birth */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleInputChange}
                                    max={new Date().toISOString().split('T')[0]}
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

                            {/* Gender */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Gender
                                </label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
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
                                    <option value="">Select gender...</option>
                                    {GENDER_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? (
                                'Saving...'
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Profile
                                </>
                            )}
                        </button>
                    </motion.form>
                </div>
            </main>
        </ProtectedRoute>
    );
}
