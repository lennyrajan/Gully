"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Shield, Target, Plus, Search } from 'lucide-react';
import { PLAYER_ROLE_OPTIONS, BATTING_STYLE_OPTIONS, BOWLING_STYLE_OPTIONS } from '@/lib/cricketConstants';

export default function LoginPage() {
    const { currentUser, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    // Profile Fields
    const [playerRole, setPlayerRole] = useState('batsman');
    const [battingStyle, setBattingStyle] = useState('right-hand');
    const [bowlingStyle, setBowlingStyle] = useState(null);
    const [nextStep, setNextStep] = useState('join'); // 'join' | 'create'

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (currentUser && !loading) {
            router.push('/onboarding');
        }
    }, [currentUser, loading, router]);

    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setIsSubmitting(true);
            await signInWithGoogle();
        } catch (err) {
            setError(err.message || 'Failed to sign in with Google');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            if (isSignUp) {
                const cricketProfile = {
                    playerRole,
                    battingStyle,
                    bowlingStyle
                };
                await signUpWithEmail(email, password, displayName, cricketProfile);

                // Redirect based on selection
                if (nextStep === 'create') {
                    router.push('/teams/register');
                } else {
                    router.push('/teams/join');
                }
            } else {
                await signInWithEmail(email, password);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid var(--card-border)',
                        borderTop: '4px solid var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ opacity: 0.7 }}>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--background)',
            padding: '2rem'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{
                    maxWidth: isSignUp ? '500px' : '400px',
                    width: '100%',
                    padding: '2rem'
                }}
            >
                {/* Logo/Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '2rem',
                        margin: '0 auto 1rem'
                    }}>
                        G
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                        {isSignUp ? 'Join Gully' : 'Welcome Back'}
                    </h1>
                    <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>
                        {isSignUp ? 'Create your profile to get started' : 'Sign in to your cricket club'}
                    </p>
                </div>

                {/* Google Sign In */}
                {!isSignUp && (
                    <>
                        <button
                            className="btn"
                            onClick={handleGoogleSignIn}
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'white',
                                color: '#1f2937',
                                border: '1px solid var(--card-border)',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                fontWeight: 600
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
                            <span style={{ opacity: 0.5, fontSize: '0.875rem' }}>or</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
                        </div>
                    </>
                )}

                {/* Form */}
                <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: isSignUp ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                        {isSignUp && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                                    <User size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="e.g., MS Dhoni"
                                    required={isSignUp}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'white' }}
                                />
                            </div>
                        )}

                        <div>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                                <Mail size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                Email
                            </label>
                            <input
                                type="email"
                                className="input-field"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'white' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                                <Lock size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                Password
                            </label>
                            <input
                                type="password"
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'white' }}
                            />
                        </div>
                    </div>

                    {isSignUp && (
                        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Cricket Profile</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, marginBottom: '0.4rem', display: 'block' }}>Role</label>
                                    <select
                                        value={playerRole}
                                        onChange={(e) => setPlayerRole(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'white' }}
                                    >
                                        {PLAYER_ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, marginBottom: '0.4rem', display: 'block' }}>Batting</label>
                                    <select
                                        value={battingStyle}
                                        onChange={(e) => setBattingStyle(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'white' }}
                                    >
                                        {BATTING_STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, marginBottom: '0.4rem', display: 'block' }}>Bowling Style</label>
                                    <select
                                        value={bowlingStyle || ''}
                                        onChange={(e) => setBowlingStyle(e.target.value || null)}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'white' }}
                                    >
                                        {BOWLING_STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value || ''}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Next Step</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div
                                    onClick={() => setNextStep('join')}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: `2px solid ${nextStep === 'join' ? 'var(--primary)' : 'var(--card-border)'}`,
                                        background: nextStep === 'join' ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    <Search size={24} style={{ marginBottom: '0.5rem', opacity: nextStep === 'join' ? 1 : 0.5 }} />
                                    <p style={{ fontSize: '0.875rem', fontWeight: nextStep === 'join' ? 700 : 500 }}>Join a Team</p>
                                </div>
                                <div
                                    onClick={() => setNextStep('create')}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: `2px solid ${nextStep === 'create' ? 'var(--primary)' : 'var(--card-border)'}`,
                                        background: nextStep === 'create' ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    <Plus size={24} style={{ marginBottom: '0.5rem', opacity: nextStep === 'create' ? 1 : 0.5 }} />
                                    <p style={{ fontSize: '0.875rem', fontWeight: nextStep === 'create' ? 700 : 500 }}>Create a Team</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn"
                        disabled={isSubmitting}
                        style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white', fontWeight: 600, marginTop: '0.5rem' }}
                    >
                        {isSubmitting ? 'Processing...' : (isSignUp ? 'Launch My Profile' : 'Sign In')}
                    </button>
                </form>

                {/* Toggle Sign Up/Sign In */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up Now"}
                    </button>
                </div>
            </motion.div>

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
