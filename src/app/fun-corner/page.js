"use client";

import React, { useState } from 'react';
import {
    ChevronLeft,
    Heart,
    MessageCircle,
    Share2,
    Plus,
    Zap,
    Flame,
    Camera
} from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_POSTS = [
    {
        id: 1,
        user: 'Lenny Rajan',
        avatar: 'LR',
        content: 'Huge win today against SVCC! PVCC moving up the table! 🏆🏏',
        image: null,
        likes: 12,
        comments: 3,
        time: '2 hours ago',
        type: 'post'
    },
    {
        id: 2,
        user: 'Banter Bot',
        avatar: '🤖',
        content: '🚨 OUCH! Sanjay just dropped a sitter at long-on. Start the fine meeting! 💸💸',
        image: null,
        likes: 24,
        comments: 8,
        time: '4 hours ago',
        type: 'banter'
    },
    {
        id: 3,
        user: 'PVCC Admin',
        avatar: 'PV',
        content: 'Poll: Who had the best tea this weekend at the Monarch ground? ☕️',
        image: null,
        likes: 5,
        comments: 15,
        time: 'Yesterday',
        type: 'poll'
    }
];

export default function FunCorner() {
    const [posts, setPosts] = useState(MOCK_POSTS);

    return (
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
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fun Corner</h1>
            </header>

            {/* Post Creator Bar */}
            <div style={{ padding: '1rem 1.5rem' }}>
                <div className="card" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1rem'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold'
                    }}>
                        P
                    </div>
                    <p style={{ opacity: 0.5, flex: 1 }}>Share the banter...</p>
                    <Camera size={20} style={{ opacity: 0.5 }} />
                </div>
            </div>

            {/* Feed */}
            <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {posts.map((post, idx) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="card"
                        style={{
                            padding: '1.25rem',
                            border: post.type === 'banter' ? '1px solid var(--error)' : '1px solid var(--card-border)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {post.type === 'banter' && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                background: 'var(--error)',
                                color: 'white',
                                fontSize: '0.6rem',
                                padding: '2px 8px',
                                borderBottomLeftRadius: '8px',
                                fontWeight: 800
                            }}>
                                HOT BANTER 🔥
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: post.type === 'banter' ? 'var(--error)' : 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '1rem'
                            }}>
                                {post.avatar}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{post.user}</h3>
                                <p style={{ opacity: 0.5, fontSize: '0.75rem' }}>{post.time}</p>
                            </div>
                        </div>

                        <p style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                            {post.content}
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: '1.5rem',
                            borderTop: '1px solid var(--card-border)',
                            paddingTop: '1rem'
                        }}>
                            <button style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)', opacity: 0.7 }}>
                                <Heart size={20} />
                                <span style={{ fontSize: '0.875rem' }}>{post.likes}</span>
                            </button>
                            <button style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)', opacity: 0.7 }}>
                                <MessageCircle size={20} />
                                <span style={{ fontSize: '0.875rem' }}>{post.comments}</span>
                            </button>
                            <button style={{ background: 'none', border: 'none', marginLeft: 'auto', color: 'var(--foreground)', opacity: 0.7 }}>
                                <Share2 size={20} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Floating Action Button */}
            <button style={{
                position: 'fixed',
                bottom: '2rem',
                right: '1.5rem',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                zIndex: 100
            }}>
                <Plus size={24} />
            </button>

            {/* Hot Topics Horizontal Scroll (Optional/Bonus) */}
            <div style={{ marginTop: '2rem', padding: '0 1.5rem' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                    Trending Topics
                </h2>
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                    <TopicBadge icon={<Zap size={14} />} label="#TheFan" />
                    <TopicBadge icon={<Flame size={14} />} label="#FineMeeting" />
                    <TopicBadge icon={<Trophy size={14} />} label="#PVCC" />
                    <TopicBadge label="#Saturdays" />
                </div>
            </div>
        </main>
    );
}

function TopicBadge({ icon, label }) {
    return (
        <div style={{
            whiteSpace: 'nowrap',
            background: 'var(--card-bg)',
            padding: '0.5rem 1rem',
            borderRadius: '50px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: '1px solid var(--card-border)'
        }}>
            {icon}
            {label}
        </div>
    );
}

function Trophy({ size }) {
    return <Zap size={size} />; // Fallback
}
