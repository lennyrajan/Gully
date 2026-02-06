"use client";

import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    Heart,
    MessageCircle,
    Share2,
    Plus,
    Zap,
    Flame,
    Trophy,
    LogIn
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthProvider';
import Link from 'next/link';

export default function FunCorner() {
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const { currentUser, userProfile, signInWithGoogle } = useAuth();

    // Real-time listener for posts
    useEffect(() => {
        const q = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPosts(postsData);
        });

        return () => unsubscribe();
    }, []);

    const handleCreatePost = async () => {
        if (!newPostContent.trim() || !currentUser) return;

        setIsPosting(true);
        try {
            await addDoc(collection(db, 'posts'), {
                content: newPostContent,
                userId: currentUser.uid,
                userName: userProfile?.displayName || currentUser.email,
                userAvatar: userProfile?.photoURL || currentUser.photoURL,
                teamId: userProfile?.teams?.[0] || null,
                likes: 0,
                likedBy: [],
                comments: [],
                createdAt: new Date().toISOString(),
                type: 'user'
            });

            setNewPostContent('');
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleLike = async (postId, likedBy = []) => {
        if (!currentUser) {
            alert('Please sign in to like posts');
            return;
        }

        try {
            const postRef = doc(db, 'posts', postId);
            const hasLiked = likedBy.includes(currentUser.uid);

            if (hasLiked) {
                await updateDoc(postRef, {
                    likes: Math.max(0, (likedBy.length - 1)),
                    likedBy: arrayRemove(currentUser.uid)
                });
            } else {
                await updateDoc(postRef, {
                    likes: (likedBy.length + 1),
                    likedBy: arrayUnion(currentUser.uid)
                });
            }
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    return (
        <main style={{
            minHeight: '100vh',
            background: 'var(--background)',
            color: 'var(--foreground)',
            paddingBottom: '3rem'
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
                    maxWidth: '800px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link href="/">
                            <button className="btn" style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                padding: '0.5rem 1rem'
                            }}>
                                <ChevronLeft size={18} />
                                Back
                            </button>
                        </Link>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>The Fun Corner</h1>
                    </div>

                    {!currentUser && (
                        <button
                            onClick={signInWithGoogle}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                            <LogIn size={18} />
                            Sign In
                        </button>
                    )}
                </div>
            </header>

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem' }}>
                {/* Create Post Section - Only for authenticated users */}
                {currentUser ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card"
                        style={{ marginBottom: '2rem' }}
                    >
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'var(--secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                flexShrink: 0
                            }}>
                                {userProfile?.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder="Share your cricket banter..."
                                    style={{
                                        width: '100%',
                                        minHeight: '100px',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--card-border)',
                                        background: 'var(--card-bg)',
                                        color: 'var(--foreground)',
                                        fontSize: '1rem',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <button
                                    onClick={handleCreatePost}
                                    disabled={!newPostContent.trim() || isPosting}
                                    className="btn btn-primary"
                                    style={{
                                        marginTop: '1rem',
                                        opacity: (!newPostContent.trim() || isPosting) ? 0.5 : 1
                                    }}
                                >
                                    <Plus size={18} />
                                    {isPosting ? 'Posting...' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card"
                        style={{
                            marginBottom: '2rem',
                            textAlign: 'center',
                            padding: '2rem',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                            borderColor: 'var(--primary)',
                            borderStyle: 'dashed'
                        }}
                    >
                        <MessageCircle size={48} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Sign In to Share Your Banter
                        </h3>
                        <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
                            Join the conversation and share your cricket moments
                        </p>
                        <button
                            onClick={signInWithGoogle}
                            className="btn btn-primary"
                        >
                            <LogIn size={20} />
                            Sign In with Google
                        </button>
                    </motion.div>
                )}

                {/* Posts Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {posts.length === 0 ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                            <MessageCircle size={64} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                            <p style={{ fontSize: '1.1rem', opacity: 0.7 }}>No posts yet. Be the first to share!</p>
                        </div>
                    ) : (
                        posts.map((post, index) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="card"
                            >
                                {/* Post Header */}
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: post.type === 'bot' ? '#8b5cf6' : 'var(--secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.1rem',
                                        flexShrink: 0
                                    }}>
                                        {post.type === 'bot' ? '🤖' : (post.userName?.charAt(0) || 'U')}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <p style={{ fontWeight: 700, fontSize: '1rem' }}>
                                                {post.userName || 'Anonymous'}
                                                {post.type === 'bot' && (
                                                    <span style={{
                                                        marginLeft: '0.5rem',
                                                        fontSize: '0.75rem',
                                                        background: '#8b5cf6',
                                                        color: 'white',
                                                        padding: '0.125rem 0.5rem',
                                                        borderRadius: '12px'
                                                    }}>
                                                        BOT
                                                    </span>
                                                )}
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
                                    </div>
                                </div>

                                {/* Post Content */}
                                <p style={{
                                    fontSize: '1rem',
                                    lineHeight: 1.6,
                                    marginBottom: '1rem',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {post.content}
                                </p>

                                {/* Post Actions */}
                                <div style={{
                                    display: 'flex',
                                    gap: '1.5rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid var(--card-border)'
                                }}>
                                    <button
                                        onClick={() => handleLike(post.id, post.likedBy)}
                                        disabled={!currentUser}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: currentUser ? 'pointer' : 'not-allowed',
                                            color: post.likedBy?.includes(currentUser?.uid) ? '#ef4444' : 'var(--foreground)',
                                            opacity: currentUser ? 1 : 0.5,
                                            fontSize: '0.9rem',
                                            fontWeight: 500,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Heart
                                            size={18}
                                            fill={post.likedBy?.includes(currentUser?.uid) ? '#ef4444' : 'none'}
                                        />
                                        {post.likes || 0}
                                    </button>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        opacity: 0.6,
                                        fontSize: '0.9rem'
                                    }}>
                                        <MessageCircle size={18} />
                                        {post.comments?.length || 0}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}


// Real-time listener for posts
useEffect(() => {
    const q = query(
        collection(db, 'posts'),
        where('tenantId', '==', 'pvcc'),
        orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setPosts(postsData);
    });

    return () => unsubscribe();
}, []);

const handleCreatePost = async () => {
    if (!newPostContent.trim() || !currentUser) return;

    setIsPosting(true);
    try {
        await addDoc(collection(db, 'posts'), {
            tenantId: 'pvcc',
            userId: currentUser.uid,
            userName: userProfile?.displayName || currentUser.email?.split('@')[0] || 'User',
            userAvatar: userProfile?.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U',
            content: newPostContent,
            image: null,
            type: 'post',
            matchId: null,
            likes: 0,
            likedBy: [],
            comments: 0,
            timestamp: new Date().toISOString()
        });
        setNewPostContent('');
    } catch (error) {
        console.error('Error creating post:', error);
    } finally {
        setIsPosting(false);
    }
};

const handleLikePost = async (postId, likedBy) => {
    if (!currentUser) return;

    const postRef = doc(db, 'posts', postId);
    const isLiked = likedBy?.includes(currentUser.uid);

    try {
        if (isLiked) {
            await updateDoc(postRef, {
                likes: Math.max(0, (likedBy?.length || 1) - 1),
                likedBy: arrayRemove(currentUser.uid)
            });
        } else {
            await updateDoc(postRef, {
                likes: (likedBy?.length || 0) + 1,
                likedBy: arrayUnion(currentUser.uid)
            });
        }
    } catch (error) {
        console.error('Error liking post:', error);
    }
};

const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
};

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
                        fontWeight: 'bold',
                        fontSize: '0.875rem'
                    }}>
                        {userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                    </div>
                    <input
                        type="text"
                        placeholder="Share the banter..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreatePost()}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--foreground)',
                            fontSize: '0.9375rem'
                        }}
                    />
                    <button
                        onClick={handleCreatePost}
                        disabled={!newPostContent.trim() || isPosting}
                        className="btn"
                        style={{
                            padding: '0.5rem 1rem',
                            background: newPostContent.trim() ? 'var(--primary)' : 'transparent',
                            opacity: newPostContent.trim() ? 1 : 0.5,
                            fontSize: '0.875rem'
                        }}
                    >
                        {isPosting ? '...' : 'Post'}
                    </button>
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
                                background: post.type === 'banter' ? 'var(--error)' : 'var(--secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '1.125rem'
                            }}>
                                {post.userAvatar || post.userName?.charAt(0) || 'U'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <p style={{ fontWeight: 600 }}>{post.userName || 'User'}</p>
                                    <span style={{ opacity: 0.5, fontSize: '0.875rem' }}>•</span>
                                    <p style={{ opacity: 0.5, fontSize: '0.875rem' }}>{formatTime(post.timestamp)}</p>
                                </div>
                                <p style={{ lineHeight: 1.6 }}>{post.content}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                onClick={() => handleLikePost(post.id, post.likedBy)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem',
                                    color: post.likedBy?.includes(currentUser?.uid) ? 'var(--error)' : 'var(--foreground)',
                                    opacity: post.likedBy?.includes(currentUser?.uid) ? 1 : 0.6
                                }}
                            >
                                <Heart size={18} fill={post.likedBy?.includes(currentUser?.uid) ? 'currentColor' : 'none'} />
                                <span style={{ fontSize: '0.875rem' }}>{post.likes || 0}</span>
                            </button>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem',
                                opacity: 0.6
                            }}>
                                <MessageCircle size={18} />
                                <span style={{ fontSize: '0.875rem' }}>{post.comments || 0}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Hot Topics Horizontal Scroll */}
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
    </ProtectedRoute>
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
