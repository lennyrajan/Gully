"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/ThemeProvider';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import {
  Trophy,
  Users,
  DollarSign,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Play,
  UserPlus,
  Shield,
  LogIn
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LiveMatchBanner from '@/components/LiveMatchBanner';

export default function Home() {
  const { theme, clubSettings } = useTheme();
  const { currentUser, userProfile, signInWithGoogle, signOut } = useAuth();
  const [myDebt, setMyDebt] = useState(0);
  const [nextGame, setNextGame] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user's debt from fines
  useEffect(() => {
    if (!currentUser || !userProfile?.teams) {
      setLoading(false);
      return;
    }

    const loadDebt = async () => {
      try {
        if (userProfile.teams.length === 0) {
          setLoading(false);
          return;
        }

        const finesQuery = query(
          collection(db, 'fines'),
          where('teamId', 'in', userProfile.teams),
          where('playerId', '==', currentUser.uid),
          where('status', '==', 'unpaid')
        );

        const finesSnapshot = await getDocs(finesQuery);
        const totalDebt = finesSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
        setMyDebt(totalDebt);
      } catch (error) {
        console.error('Error loading debt:', error);
      }
    };

    loadDebt();
  }, [currentUser, userProfile]);

  // Load next upcoming game
  useEffect(() => {
    if (!currentUser || !userProfile?.teams) {
      setLoading(false);
      return;
    }

    const loadNextGame = async () => {
      try {
        if (userProfile.teams.length === 0) {
          setLoading(false);
          return;
        }

        const gamesQuery = query(
          collection(db, 'games'),
          where('teamId', 'in', userProfile.teams),
          orderBy('date', 'asc'),
          limit(1)
        );

        const gamesSnapshot = await getDocs(gamesQuery);
        if (!gamesSnapshot.empty) {
          const gameData = gamesSnapshot.docs[0].data();
          setNextGame(gameData);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading next game:', error);
        setLoading(false);
      }
    };

    loadNextGame();
  }, [currentUser, userProfile]);

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

  // Show login screen if not authenticated
  if (!currentUser) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center'
          }}
        >
          {/* Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '2rem',
            margin: '0 auto 2rem'
          }}>
            {clubSettings?.name?.charAt(0) || 'G'}
          </div>

          {/* Welcome Text */}
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
            Welcome to {clubSettings?.name || 'Gully'}
          </h1>
          <p style={{ opacity: 0.7, fontSize: '1.1rem', marginBottom: '3rem' }}>
            Your digital cricket pavilion. Track scores, manage teams, and connect with your club.
          </p>

          {/* Sign In Button */}
          <button
            onClick={signInWithGoogle}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '1.25rem',
              fontSize: '1.1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}
          >
            <LogIn size={24} />
            Sign In with Google
          </button>

          {/* Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginTop: '3rem',
            textAlign: 'left'
          }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <Trophy size={32} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Live Scoring</h3>
              <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Real-time match scoring and stats</p>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <Users size={32} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Team Management</h3>
              <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Manage rosters and players</p>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <Calendar size={32} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Availability</h3>
              <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Track player availability</p>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <DollarSign size={32} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Fines Ledger</h3>
              <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Manage club finances</p>
            </div>
          </div>
        </motion.div>
      </main>
    );
  }

  // Show authenticated home page
  return (
    <main style={{ paddingBottom: '5rem', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Premium Header */}
      <header className="glass" style={{
        padding: '2rem 1.5rem',
        borderBottomLeftRadius: '2rem',
        borderBottomRightRadius: '2rem',
        marginBottom: '2rem',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.5rem'
          }}>
            {clubSettings?.name?.charAt(0) || 'G'}
          </div>
          <div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Welcome back to</p>
            <h1 style={{ fontSize: '1.25rem' }}>{clubSettings?.name || 'Gully Pavilion'}</h1>
          </div>
        </motion.div>

        {/* User Profile */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            position: 'absolute',
            top: '2rem',
            right: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <Link href="/profile">
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
              fontSize: '0.875rem'
            }}
          >
            Sign Out
          </button>
        </motion.div>
      </header>

      <div style={{ padding: '0 1.5rem' }}>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {/* Live Match Banner */}
          <LiveMatchBanner />

          {/* Quick Actions */}
          <Link href="/scorer/setup" style={{ textDecoration: 'none' }}>
            <motion.div variants={item} className="card" style={{
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Start Scoring</h2>
                <p style={{ opacity: 0.9 }}>Set up a new match</p>
              </div>
              <div className="btn" style={{
                background: 'white',
                color: 'var(--primary)',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                padding: 0
              }}>
                <Play fill="currentColor" size={24} />
              </div>
            </motion.div>
          </Link>

          {/* Team Management Quick Links */}
          {userProfile?.teams && userProfile.teams.length > 0 ? (
            <motion.div variants={item}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Team Management</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Link href="/teams/manage" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}>
                    <Shield size={32} style={{ color: 'var(--primary)', margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Manage Team</h3>
                  </div>
                </Link>
                <Link href="/teams/join" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}>
                    <UserPlus size={32} style={{ color: 'var(--primary)', margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Join Team</h3>
                  </div>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div variants={item}>
              <Link href="/teams/join" style={{ textDecoration: 'none' }}>
                <div className="card" style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                  borderColor: 'var(--primary)',
                  borderStyle: 'dashed'
                }}>
                  <UserPlus size={48} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Join a Team</h3>
                  <p style={{ opacity: 0.7 }}>Get started by joining your cricket club</p>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Fun Corner Preview */}
          <motion.div variants={item}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>The Fun Corner</h2>
              <Link href="/fun-corner" style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600 }}>View All</Link>
            </div>
            <Link href="/fun-corner" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    flexShrink: 0
                  }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Banter Bot 🤖</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      Check out the latest banter from your teammates!
                    </p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem', marginTop: '0.5rem' }}>Tap to view posts</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Main Menu Links */}
          <motion.div variants={item} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/profile" style={{ textDecoration: 'none' }}>
              <MenuLink
                icon={<Users />}
                title="My Profile"
                subtitle={userProfile?.displayName || 'View your profile'}
              />
            </Link>
            <Link href="/fines" style={{ textDecoration: 'none' }}>
              <MenuLink
                icon={<DollarSign />}
                title="Fines Ledger"
                subtitle={myDebt > 0 ? `You owe $${myDebt.toFixed(2)}` : 'All clear!'}
                alert={myDebt > 0}
              />
            </Link>
            <Link href="/availability" style={{ textDecoration: 'none' }}>
              <MenuLink
                icon={<Calendar />}
                title="Availability"
                subtitle={nextGame ? `Next: ${new Date(nextGame.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : 'No upcoming games'}
              />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Nav Bar */}
      <nav className="glass" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        borderTopLeftRadius: '1.5rem',
        borderTopRightRadius: '1.5rem',
        zIndex: 100
      }}>
        <Link href="/">
          <NavItem active icon={<TrendingUp size={24} />} />
        </Link>
        <Link href="/profile">
          <NavItem icon={<Users size={24} />} />
        </Link>
        <Link href="/scorer/setup" style={{ marginTop: '-2.5rem' }}>
          <div style={{
            background: 'var(--primary)',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
          }}>
            <Play fill="white" size={24} />
          </div>
        </Link>
        <Link href="/fines">
          <NavItem icon={<DollarSign size={24} />} />
        </Link>
        <Link href="/availability">
          <NavItem icon={<Calendar size={24} />} />
        </Link>
      </nav>

      <style jsx>{`
        .theme-wrapper[data-theme='pvcc'] {
          --primary: #1e3a8a;
          --primary-hover: #1e40af;
        }
      `}</style>
    </main>
  );
}

function MenuLink({ icon, title, subtitle, count, alert }) {
  return (
    <div className="card" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      cursor: 'pointer'
    }}>
      <div style={{
        color: alert ? 'var(--error)' : 'var(--primary)',
        background: alert ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        padding: '0.75rem',
        borderRadius: '12px'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '1rem' }}>{title}</h3>
        {subtitle && <p style={{ opacity: 0.6, fontSize: '0.8rem' }}>{subtitle}</p>}
      </div>
      {count && <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>{count}</span>}
      {alert && <AlertCircle size={18} color="var(--error)" />}
      <ChevronRight size={20} opacity={0.3} />
    </div>
  );
}

function NavItem({ icon, active }) {
  return (
    <div style={{
      color: active ? 'var(--primary)' : 'var(--foreground)',
      opacity: active ? 1 : 0.4,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px'
    }}>
      {icon}
      {active && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />}
    </div>
  );
}
