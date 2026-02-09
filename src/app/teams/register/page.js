"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ChevronLeft, Upload, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

export default function TeamRegistration() {
    const router = useRouter();
    const { currentUser, userProfile, updateUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        homeGround: '',
        foundedYear: new Date().getFullYear(),
        primaryColor: '#10b981',
        secondaryColor: '#1e293b'
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentUser || !userProfile) {
            alert('You must be logged in to create a team');
            return;
        }

        // Check permission (only super_admin can create teams)
        if (!hasPermission(userProfile.role, PERMISSIONS.CREATE_TEAM)) {
            alert('You do not have permission to create teams. Please contact an administrator.');
            return;
        }

        setLoading(true);
        try {
            let logoURL = null;

            // Upload logo if provided
            if (logoFile) {
                const logoRef = ref(storage, `team-logos/${Date.now()}_${logoFile.name}`);
                await uploadBytes(logoRef, logoFile);
                logoURL = await getDownloadURL(logoRef);
            }

            // Create team document
            const teamData = {
                name: formData.name,
                shortName: formData.shortName.toUpperCase(),
                logo: logoURL,
                colors: {
                    primary: formData.primaryColor,
                    secondary: formData.secondaryColor
                },
                homeGround: formData.homeGround,
                foundedYear: parseInt(formData.foundedYear),

                // Admin & Members
                adminIds: [currentUser.uid],
                memberIds: [currentUser.uid],
                guestPlayerIds: [],

                // Team Stats
                matchesPlayed: 0,
                matchesWon: 0,
                matchesLost: 0,

                // Metadata
                createdAt: new Date().toISOString(),
                createdBy: currentUser.uid,
                isActive: true
            };

            const teamRef = await addDoc(collection(db, 'teams'), teamData);

            // Update user's teams array and set as primary team
            await updateUserProfile(currentUser.uid, {
                teams: arrayUnion(teamRef.id),
                primaryTeamId: teamRef.id,
                role: 'team_admin' // Promote creator to team admin
            });

            alert(`Team "${formData.name}" created successfully!`);
            router.push('/teams/manage');
        } catch (error) {
            console.error('Error creating team:', error);
            alert('Failed to create team. Please try again.');
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
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Register New Team</h1>
                </header>

                <div style={{ padding: '1.5rem' }}>
                    <motion.form
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleSubmit}
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                    >
                        {/* Team Logo Upload */}
                        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <label style={{ cursor: 'pointer' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    style={{ display: 'none' }}
                                />
                                {logoPreview ? (
                                    <div style={{
                                        width: '120px',
                                        height: '120px',
                                        margin: '0 auto',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        border: '2px solid var(--primary)'
                                    }}>
                                        <Image src={logoPreview} alt="Team logo preview" width={120} height={120} style={{ objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '120px',
                                        height: '120px',
                                        margin: '0 auto',
                                        borderRadius: '16px',
                                        border: '2px dashed var(--card-border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        color: 'var(--primary)'
                                    }}>
                                        <Upload size={32} />
                                        <span style={{ fontSize: '0.75rem' }}>Upload Logo</span>
                                    </div>
                                )}
                            </label>
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '1rem' }}>
                                Click to upload team logo (optional)
                            </p>
                        </div>

                        {/* Team Name */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Team Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="e.g., Palo Verde Cricket Club"
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

                        {/* Short Name */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Short Name / Abbreviation *
                            </label>
                            <input
                                type="text"
                                name="shortName"
                                value={formData.shortName}
                                onChange={handleInputChange}
                                required
                                maxLength={5}
                                placeholder="e.g., PVCC"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--card-border)',
                                    background: 'var(--background)',
                                    color: 'var(--foreground)',
                                    fontSize: '1rem',
                                    textTransform: 'uppercase'
                                }}
                            />
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>
                                Max 5 characters (will be converted to uppercase)
                            </p>
                        </div>

                        {/* Home Ground */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Home Ground *
                            </label>
                            <input
                                type="text"
                                name="homeGround"
                                value={formData.homeGround}
                                onChange={handleInputChange}
                                required
                                placeholder="e.g., Monarch Park, CA"
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

                        {/* Founded Year */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Founded Year *
                            </label>
                            <input
                                type="number"
                                name="foundedYear"
                                value={formData.foundedYear}
                                onChange={handleInputChange}
                                required
                                min="1800"
                                max={new Date().getFullYear()}
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

                        {/* Team Colors */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Team Colors</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                                        Primary Color
                                    </label>
                                    <input
                                        type="color"
                                        name="primaryColor"
                                        value={formData.primaryColor}
                                        onChange={handleInputChange}
                                        style={{
                                            width: '100%',
                                            height: '50px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--card-border)',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                                        Secondary Color
                                    </label>
                                    <input
                                        type="color"
                                        name="secondaryColor"
                                        value={formData.secondaryColor}
                                        onChange={handleInputChange}
                                        style={{
                                            width: '100%',
                                            height: '50px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--card-border)',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
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
                                'Creating Team...'
                            ) : (
                                <>
                                    <Check size={20} />
                                    Create Team
                                </>
                            )}
                        </button>
                    </motion.form>
                </div>
            </main>
        </ProtectedRoute>
    );
}
