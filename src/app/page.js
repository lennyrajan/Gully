"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/ThemeProvider';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
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

export default function Home() {
  const { clubSettings } = useTheme();
  const { currentUser, userProfile, signInWithGoogle, signOut } = useAuth();
  const [recentMatches, setRecentMatches] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Load recent posts (public)
  useEffect(() => {
    const loadRecentPosts = async () => {
      try {
        const postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentPosts(postsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading posts:', error);
        setLoading(false);
      }
    };

    loadRecentPosts();
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
                          background: match.status === 'live' ? 'var(--error)' : 'var(--success)',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {match.status === 'live' ? '🔴 Live' : '✓ Completed'}
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
                          {match.teamA?.score && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                              {match.teamA.score}/{match.teamA.wickets}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>vs</div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          marginTop: '0.5rem'
                        }}>
                          {match.teamB?.name || 'Team B'}
                          {match.teamB?.score && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                              {match.teamB.score}/{match.teamB.wickets}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Match Info */}
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        fontSize: '0.75rem',
                        opacity: 0.7,
                        marginTop: 'auto'
                      }}>
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
                <Link href="/scorer/setup" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                    color: 'white'
                  }}>
                    <Play size={24} style={{ marginBottom: '0.5rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Start Scoring</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem' }}>
                      Set up a new match
                    </p>
                  </div>
                </Link>
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
    </main>
  );
}
