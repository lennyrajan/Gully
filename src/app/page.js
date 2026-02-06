"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, onSnapshot, doc, updateDoc, or, and } from 'firebase/firestore';
import {
  Trophy,
  Calendar,
  MessageCircle,
  ChevronRight,
  Play,
  LogIn,
  User,
  Clock,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import LiveMatchBanner from '@/components/LiveMatchBanner';
import { getDeviceId } from '@/lib/utils';

export default function Home() {
  const router = useRouter();
  const { clubSettings } = useTheme();
  const { currentUser, userProfile, signInWithGoogle, signOut } = useAuth();
  const [recentMatches, setRecentMatches] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPortal, setShowPortal] = useState(false);
  const [activeMatches, setActiveMatches] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [transferCode, setTransferCode] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);

    const fetchActiveMatches = async () => {
      try {
        const matchesRef = collection(db, 'matches');
        let q;

        // Broaden status check to include innings breaks and pauses
        const activeStatuses = ['LIVE', 'live', 'INNINGS_BREAK', 'PAUSED'];

        if (currentUser) {
          // If logged in, show matches created by this user OR on this device
          q = query(
            matchesRef,
            and(
              where('status', 'in', activeStatuses),
              or(
                where('deviceId', '==', id),
                where('createdBy', '==', currentUser.uid),
                where('scorerId', '==', currentUser.uid)
              )
            )
          );
        } else {
          // Otherwise, just stick to the device pinning
          q = query(
            matchesRef,
            and(
              where('status', 'in', activeStatuses),
              where('deviceId', '==', id)
            )
          );
        }

        const snapshot = await getDocs(q);
        let matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Manual sort since composite indices might be missing or complex queries used
        matches.sort((a, b) => new Date(b.lastUpdated || b.createdAt) - new Date(a.lastUpdated || a.createdAt));

        setActiveMatches(matches);
      } catch (err) {
        console.error("Error fetching active matches:", err);
      }
    };
    fetchActiveMatches();
  }, [showPortal]);

  // Load recent matches (public)
  useEffect(() => {
    const loadRecentMatches = async () => {
      try {
        const matchesQuery = query(
          collection(db, 'matches'),
          orderBy('createdAt', 'desc'),
          limit(6)
        );

        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentMatches(matchesData);
      } catch (error) {
        console.error('Error loading matches:', error);
      }
    };

    loadRecentMatches();
  }, []);

  // Load recent posts (public) - REAL-TIME
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    // Real-time listener
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading posts:', error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <main style={{
      paddingBottom: '2rem',
      minHeight: '100vh',
      background: 'var(--background)',
      color: 'var(--foreground)'
    }}>
      {/* Header */}
      <header className="glass" style={{
        padding: '1.5rem',
        marginBottom: '2rem',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.25rem'
              }}>
                G
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Gully
                </h1>
                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Cricket Pavilion</p>
              </div>
            </div>
          </Link>

          {/* Auth Section */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/profile">
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}>
                  {userProfile?.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                </div>
              </Link>
              <button
                onClick={signOut}
                className="btn"
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  fontSize: '0.875rem',
                  color: 'var(--foreground)'
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <LogIn size={18} />
              Sign In
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
        >
          {/* Live Match Banner */}
          <LiveMatchBanner />

          {/* Hero Section */}
          {!currentUser && (
            <motion.div variants={item} className="card" style={{
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              color: 'white',
              padding: '3rem 2rem',
              textAlign: 'center'
            }}>
              <Trophy size={48} style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
                Welcome to Gully
              </h2>
              <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem' }}>
                Your digital cricket pavilion. Track live scores, view match history, and connect with your club.
              </p>
              <button
                onClick={signInWithGoogle}
                className="btn"
                style={{
                  background: 'white',
                  color: 'var(--primary)',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 700
                }}
              >
                <LogIn size={20} />
                Sign In to Get Started
              </button>
            </motion.div>
          )}

          {/* Recent Matches */}
          <motion.div variants={item}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Recent Matches</h2>
            </div>

            {loading ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ opacity: 0.7 }}>Loading matches...</p>
              </div>
            ) : recentMatches.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <Trophy size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>No matches yet</p>
                {currentUser && (
                  <Link href="/scorer/setup">
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }}>
                      <Play size={18} />
                      Start First Match
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {recentMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/match/${match.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <motion.div
                      className="card"
                      whileHover={{ scale: 1.02 }}
                      style={{
                        cursor: 'pointer',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      {/* Match Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          background: (match.status?.toUpperCase() === 'FINISHED' || match.status?.toUpperCase() === 'ABANDONED')
                            ? 'rgba(100, 100, 100, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                          color: (match.status?.toUpperCase() === 'FINISHED' || match.status?.toUpperCase() === 'ABANDONED')
                            ? 'rgba(200, 200, 200, 0.9)'
                            : '#ef4444',
                          fontWeight: 600
                        }}>
                          {(match.status?.toUpperCase() === 'FINISHED' || match.status?.toUpperCase() === 'ABANDONED') ? '✓ Completed' : '🔴 Live'}
                        </span>
                        <ChevronRight size={20} opacity={0.5} />
                      </div>

                      {/* Teams */}
                      <div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          marginBottom: '0.5rem'
                        }}>
                          {match.teamA?.name || 'Team A'}
                          {(() => {
                            // For ongoing matches, show current state
                            if (match.state && match.innings === 1) {
                              return (
                                <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                                  {match.state.totalRuns}/{match.state.wickets}
                                </span>
                              );
                            }
                            // For completed first innings, show from completedInnings
                            else if (match.completedInnings?.[0]) {
                              return (
                                <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                                  {match.completedInnings[0].totalRuns}/{match.completedInnings[0].wickets}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>vs</div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          marginTop: '0.5rem'
                        }}>
                          {match.teamB?.name || 'Team B'}
                          {(() => {
                            // For 2nd innings ongoing, show current state
                            if (match.state && match.innings === 2) {
                              return (
                                <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                                  {match.state.totalRuns}/{match.state.wickets}
                                </span>
                              );
                            }
                            // For completed second innings, show from completedInnings
                            else if (match.completedInnings?.[1]) {
                              return (
                                <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                                  {match.completedInnings[1].totalRuns}/{match.completedInnings[1].wickets}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      {/* Match Info */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        opacity: 0.7,
                        marginTop: 'auto'
                      }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          {match.date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={14} />
                              {new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                          {match.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={14} />
                              {match.location}
                            </div>
                          )}
                        </div>
                        {/* Match ID */}
                        <div style={{
                          fontSize: '0.7rem',
                          opacity: 0.5,
                          fontFamily: 'monospace',
                          borderTop: '1px solid var(--card-border)',
                          paddingTop: '0.5rem'
                        }}>
                          ID: {match.id}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Latest Banter */}
          <motion.div variants={item}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Latest Banter</h2>
              <Link href="/fun-corner" style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600 }}>
                View All Posts
              </Link>
            </div>

            {loading ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ opacity: 0.7 }}>Loading posts...</p>
              </div>
            ) : recentPosts.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <MessageCircle size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                <p style={{ opacity: 0.7 }}>No posts yet. Be the first to share!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentPosts.map((post) => (
                  <div key={post.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        flexShrink: 0
                      }}>
                        {post.userName?.charAt(0) || 'U'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {post.userName || 'Anonymous'}
                          </p>
                          <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                            {post.createdAt && new Date(post.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                          {post.content}
                        </p>
                        {post.likes > 0 && (
                          <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>
                            ❤️ {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Links for Authenticated Users */}
          {currentUser && (
            <motion.div variants={item}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Quick Actions</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div onClick={() => setShowPortal(true)} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                    color: 'white'
                  }}>
                    <Play size={24} style={{ marginBottom: '0.5rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Scoring Portal</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem' }}>
                      Start new, resume live, or transfer scoring
                    </p>
                  </div>
                </div>
                <Link href="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ cursor: 'pointer' }}>
                    <User size={24} style={{ marginBottom: '0.5rem', color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>My Profile</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.25rem' }}>
                      View your stats
                    </p>
                  </div>
                </Link>
                <Link href="/teams/join" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ cursor: 'pointer' }}>
                    <Trophy size={24} style={{ marginBottom: '0.5rem', color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Join Team</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.25rem' }}>
                      Connect with your club
                    </p>
                  </div>
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
      {/* Scoring Portal Modal */}
      <AnimatePresence>
        {showPortal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1000
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card"
              style={{ maxWidth: '450px', width: '100%', position: 'relative', overflow: 'hidden' }}
            >
              <button
                onClick={() => setShowPortal(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <LogIn style={{ transform: 'rotate(180deg)' }} />
              </button>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Scoring Portal</h2>
              <p style={{ opacity: 0.6, marginBottom: '2rem', fontSize: '0.9rem' }}>Choose how you want to proceed with scoring.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 1. New Match */}
                <Link href="/scorer/setup" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={20} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 800, color: 'var(--foreground)' }}>Start New Match</p>
                      <p style={{ fontSize: '0.75rem', opacity: 0.5, color: 'var(--foreground)' }}>Setup a fresh game from scratch</p>
                    </div>
                  </div>
                </Link>

                {/* 2. Resume Match */}
                <div style={{ padding: '1.25rem', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: activeMatches.length > 0 ? '1rem' : 0 }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--secondary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={20} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 800 }}>Resume Live Match</p>
                      <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Pick up from this browser/device</p>
                    </div>
                  </div>

                  {activeMatches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeMatches.map(match => (
                        <div key={match.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{match.teamA.name} vs {match.teamB.name}</span>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              // Spread match.state to ensure scoring progress is restored
                              localStorage.setItem('currentMatchConfig', JSON.stringify({
                                ...match,
                                ...match.state,
                                matchId: match.id
                              }));
                              router.push('/scorer');
                            }}
                          >
                            RESUME
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', opacity: 0.4, fontStyle: 'italic', marginTop: '0.5rem' }}>No live matches found for this device.</p>
                  )}
                </div>

                {/* 3. Transfer Match */}
                <div style={{ padding: '1.25rem', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--success)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LogIn size={20} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 800 }}>Transfer Scoring</p>
                      <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Enter 6-digit code from another device</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="ENTER CODE"
                      value={transferCode}
                      onChange={(e) => setTransferCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        textAlign: 'center',
                        fontSize: '1rem',
                        fontWeight: 800,
                        letterSpacing: '0.2rem'
                      }}
                    />
                    <button
                      className="btn btn-primary"
                      disabled={transferCode.length !== 6 || isTransferring}
                      style={{ padding: '0 1rem' }}
                      onClick={async () => {
                        setIsTransferring(true);
                        try {
                          const q = query(collection(db, 'matches'), where('transferCode.code', '==', transferCode));
                          const snap = await getDocs(q);
                          if (snap.empty) {
                            alert("Invalid or expired code.");
                          } else {
                            const matchDoc = snap.docs[0];
                            const matchData = matchDoc.data();
                            const now = new Date();
                            const expires = new Date(matchData.transferCode.expiresAt);
                            if (now > expires) {
                              alert("Code has expired.");
                            } else {
                              // Success!
                              const config = {
                                ...matchData,
                                ...matchData.state,
                                matchId: matchDoc.id,
                                deviceId
                              };
                              await updateDoc(doc(db, 'matches', matchDoc.id), {
                                deviceId: deviceId,
                                lastUpdated: new Date().toISOString(),
                                transferCode: null // Consume the code
                              });
                              localStorage.setItem('currentMatchConfig', JSON.stringify(config));
                              window.location.href = '/scorer';
                            }
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Transfer failed. Check connection.");
                        } finally {
                          setIsTransferring(false);
                        }
                      }}
                    >
                      {isTransferring ? '...' : 'JOIN'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
