"use client";

import React from 'react';
import { useTheme } from '@/lib/ThemeProvider';
import {
  Trophy,
  Users,
  DollarSign,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LiveMatchBanner from '@/components/LiveMatchBanner';
import { useAuth } from '@/lib/AuthProvider';

export default function Home() {
  const { theme, clubSettings } = useTheme();
  const { currentUser, userProfile, signOut } = useAuth();

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
        {currentUser && (
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
              fontSize: '0.875rem'
            }}>
              {userProfile?.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
            </div>
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
        )}
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
          <Link href="/scorer" style={{ textDecoration: 'none' }}>
            <motion.div variants={item} className="card" style={{
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Start Scoring</h2>
                <p style={{ opacity: 0.9 }}>Live match vs Silicon Valley CC</p>
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

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <motion.div variants={item} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ color: 'var(--primary)' }}><Trophy size={20} /></div>
              <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Rank</p>
              <h3 style={{ fontSize: '1.25rem' }}>#2 In League</h3>
            </motion.div>
            <motion.div variants={item} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ color: 'var(--secondary)' }}><TrendingUp size={20} /></div>
              <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Last Innings</p>
              <h3 style={{ fontSize: '1.25rem' }}>42 (28)</h3>
            </motion.div>
          </div>

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
                      🚨 OUCH! Lenny just dropped a sitter at mid-wicket. Someone call the fine committee! 💸
                    </p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem', marginTop: '0.5rem' }}>2 mins ago</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Main Menu Links */}
          <motion.div variants={item} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/profile" style={{ textDecoration: 'none' }}>
              <MenuLink icon={<Users />} title="Teammates" count="18" />
            </Link>
            <Link href="/fines" style={{ textDecoration: 'none' }}>
              <MenuLink icon={<DollarSign />} title="Fines Ledger" subtitle="You owe $15" alert />
            </Link>
            <Link href="/availability" style={{ textDecoration: 'none' }}>
              <MenuLink icon={<Calendar />} title="Availability" subtitle="Next: Sat Feb 7" />
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
        <Link href="/scorer" style={{ marginTop: '-2.5rem' }}>
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
