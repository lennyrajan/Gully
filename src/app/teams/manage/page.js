"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    onSnapshot
} from 'firebase/firestore';
import {
    ChevronLeft,
    Users,
    UserPlus,
    Shield,
    Crown,
    CheckCircle,
    XCircle,
    UserX,
    Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS, hasPermission, USER_ROLES } from '@/lib/permissions';
import { getPlayerRoleLabel, getBattingStyleLabel, getBowlingStyleLabel } from '@/lib/cricketConstants';
import GuestBadge, { isGuestPlayer } from '@/components/GuestBadge';

export default function TeamManagement() {
    const router = useRouter();
    const { currentUser, userProfile, updateUserProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [joinRequests, setJoinRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'requests'

    // Load user's teams
    useEffect(() => {
        if (!currentUser || !userProfile) return;

        const loadTeams = async () => {
            try {
                const userTeams = userProfile.teams || [];
                if (userTeams.length === 0) {
                    setLoading(false);
                    return;
                }

                const teamPromises = userTeams.map(async (teamId) => {
                    const teamDoc = await getDoc(doc(db, 'teams', teamId));
                    if (teamDoc.exists()) {
                        return { id: teamDoc.id, ...teamDoc.data() };
                    }
                    return null;
                });

                const loadedTeams = (await Promise.all(teamPromises)).filter(Boolean);
                setTeams(loadedTeams);

                // Auto-select primary team or first team
                if (userProfile.primaryTeamId) {
                    const primaryTeam = loadedTeams.find(t => t.id === userProfile.primaryTeamId);
                    if (primaryTeam) setSelectedTeam(primaryTeam);
                } else if (loadedTeams.length > 0) {
                    setSelectedTeam(loadedTeams[0]);
                }
            } catch (error) {
                console.error('Error loading teams:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTeams();
    }, [currentUser, userProfile]);

    // Load team members when team is selected
    useEffect(() => {
        if (!selectedTeam) return;

        const loadMembers = async () => {
            try {
                const memberPromises = selectedTeam.memberIds.map(async (memberId) => {
                    const userDoc = await getDoc(doc(db, 'users', memberId));
                    if (userDoc.exists()) {
                        return { uid: userDoc.id, ...userDoc.data() };
                    }
                    return null;
                });

                const members = (await Promise.all(memberPromises)).filter(Boolean);
                setTeamMembers(members);
            } catch (error) {
                console.error('Error loading team members:', error);
            }
        };

        loadMembers();
    }, [selectedTeam]);

    // Real-time listener for join requests
    useEffect(() => {
        if (!selectedTeam) return;

        const q = query(
            collection(db, 'teamRequests'),
            where('teamId', '==', selectedTeam.id),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setJoinRequests(requests);
        });

        return () => unsubscribe();
    }, [selectedTeam]);

    const handleApproveRequest = async (request) => {
        if (!selectedTeam || !currentUser) return;

        try {
            // Add player to team
            await updateDoc(doc(db, 'teams', selectedTeam.id), {
                memberIds: arrayUnion(request.playerId)
            });

            // Update player's teams array
            await updateDoc(doc(db, 'users', request.playerId), {
                teams: arrayUnion(selectedTeam.id),
                primaryTeamId: selectedTeam.id // Set as primary if first team
            });

            // Update request status
            await updateDoc(doc(db, 'teamRequests', request.id), {
                status: 'approved',
                reviewedAt: new Date().toISOString(),
                reviewedBy: currentUser.uid
            });

            alert(`${request.playerName} has been added to the team!`);
        } catch (error) {
            console.error('Error approving request:', error);
            alert('Failed to approve request. Please try again.');
        }
    };

    const handleRejectRequest = async (request) => {
        if (!currentUser) return;

        try {
            await updateDoc(doc(db, 'teamRequests', request.id), {
                status: 'rejected',
                reviewedAt: new Date().toISOString(),
                reviewedBy: currentUser.uid
            });

            alert(`Request from ${request.playerName} has been rejected.`);
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('Failed to reject request. Please try again.');
        }
    };

    const handleToggleAccountManager = async (member) => {
        if (!selectedTeam || !currentUser || !canManage) return;

        const isCurrentlyAO = member.role === USER_ROLES.ACCOUNTS_OFFICER;
        const confirmMsg = isCurrentlyAO
            ? `Remove Account Manager role from ${member.displayName}?`
            : `Make ${member.displayName} an Account Manager for ${selectedTeam.name}?`;

        if (!confirm(confirmMsg)) return;

        try {
            const newRole = isCurrentlyAO ? USER_ROLES.PLAYER : USER_ROLES.ACCOUNTS_OFFICER;
            await updateUserProfile(member.uid, { role: newRole });

            // Reload members to reflect change
            const memberPromises = selectedTeam.memberIds.map(async (memberId) => {
                const userDoc = await getDoc(doc(db, 'users', memberId));
                if (userDoc.exists()) {
                    return { uid: userDoc.id, ...userDoc.data() };
                }
                return null;
            });
            const members = (await Promise.all(memberPromises)).filter(Boolean);
            setTeamMembers(members);

            alert(`${member.displayName} is now ${isCurrentlyAO ? 'a regular Player' : 'an Account Manager'}.`);
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role. Please try again.');
        }
    };

    const handleRemovePlayer = async (playerId, playerName) => {
        if (!selectedTeam || !currentUser) return;

        const confirmed = confirm(`Are you sure you want to remove ${playerName} from the team?`);
        if (!confirmed) return;

        try {
            // Remove from team
            await updateDoc(doc(db, 'teams', selectedTeam.id), {
                memberIds: arrayRemove(playerId),
                adminIds: arrayRemove(playerId) // Also remove from admins if applicable
            });

            // Update player's teams array
            await updateDoc(doc(db, 'users', playerId), {
                teams: arrayRemove(selectedTeam.id),
                primaryTeamId: null // Clear primary team if it was this team
            });

            alert(`${playerName} has been removed from the team.`);

            // Reload members
            setTeamMembers(prev => prev.filter(m => m.uid !== playerId));
        } catch (error) {
            console.error('Error removing player:', error);
            alert('Failed to remove player. Please try again.');
        }
    };

    const isAdmin = selectedTeam && selectedTeam.adminIds?.includes(currentUser?.uid);
    const canManage = userProfile && (
        hasPermission(userProfile.role, PERMISSIONS.MANAGE_TEAM) && isAdmin
    );

    if (loading) {
        return (
            <ProtectedRoute>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <p>Loading teams...</p>
                </div>
            </ProtectedRoute>
        );
    }

    if (teams.length === 0) {
        return (
            <ProtectedRoute>
                <main style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem' }}>
                    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                        <Users size={64} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>No Teams Found</h2>
                        <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
                            You are not a member of any teams yet.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/teams/join')}
                        >
                            Join a Team
                        </button>
                    </div>
                </main>
            </ProtectedRoute>
        );
    }

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
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Team Management</h1>
                </header>

                <div style={{ padding: '1.5rem' }}>
                    {/* Team Selector */}
                    {teams.length > 1 && (
                        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Select Team
                            </label>
                            <select
                                value={selectedTeam?.id || ''}
                                onChange={(e) => {
                                    const team = teams.find(t => t.id === e.target.value);
                                    setSelectedTeam(team);
                                }}
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
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} ({team.shortName})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedTeam && (
                        <>
                            {/* Team Info Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="card"
                                style={{
                                    padding: '1.5rem',
                                    marginBottom: '1.5rem',
                                    background: `linear-gradient(135deg, ${selectedTeam.colors.primary}, ${selectedTeam.colors.secondary})`
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'white' }}>
                                    {selectedTeam.logo ? (
                                        <img
                                            src={selectedTeam.logo}
                                            alt={selectedTeam.name}
                                            style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem',
                                            fontWeight: 800
                                        }}>
                                            {selectedTeam.shortName}
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                                            {selectedTeam.name}
                                        </h2>
                                        <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>
                                            {selectedTeam.homeGround} • Est. {selectedTeam.foundedYear}
                                        </p>
                                        <p style={{ opacity: 0.9, fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                            {selectedTeam.memberIds.length} members
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <button
                                    className="btn"
                                    onClick={() => setActiveTab('roster')}
                                    style={{
                                        flex: 1,
                                        background: activeTab === 'roster' ? 'var(--primary)' : 'transparent',
                                        color: activeTab === 'roster' ? 'white' : 'var(--foreground)'
                                    }}
                                >
                                    <Users size={18} />
                                    Roster ({teamMembers.length})
                                </button>
                                {canManage && (
                                    <button
                                        className="btn"
                                        onClick={() => setActiveTab('requests')}
                                        style={{
                                            flex: 1,
                                            background: activeTab === 'requests' ? 'var(--primary)' : 'transparent',
                                            color: activeTab === 'requests' ? 'white' : 'var(--foreground)',
                                            position: 'relative'
                                        }}
                                    >
                                        <UserPlus size={18} />
                                        Requests
                                        {joinRequests.length > 0 && (
                                            <span style={{
                                                position: 'absolute',
                                                top: '0.25rem',
                                                right: '0.25rem',
                                                background: 'var(--error)',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 700
                                            }}>
                                                {joinRequests.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Roster Tab */}
                            {activeTab === 'roster' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {teamMembers.map((member, idx) => {
                                        const isTeamAdmin = selectedTeam.adminIds?.includes(member.uid);
                                        const isCurrentUser = member.uid === currentUser?.uid;

                                        return (
                                            <motion.div
                                                key={member.uid}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="card"
                                                style={{ padding: '1rem' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '12px',
                                                        background: isTeamAdmin ? 'var(--primary)' : 'var(--secondary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                        fontSize: '1.125rem'
                                                    }}>
                                                        {member.displayName?.charAt(0) || 'U'}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                                                                {member.displayName}
                                                            </h3>
                                                            {isTeamAdmin && (
                                                                <Shield size={16} style={{ color: 'var(--primary)' }} title="Team Admin" />
                                                            )}
                                                            {member.role === USER_ROLES.ACCOUNTS_OFFICER && (
                                                                <Briefcase size={16} style={{ color: '#fbbf24' }} title="Account Manager" />
                                                            )}
                                                            {isCurrentUser && (
                                                                <span style={{
                                                                    fontSize: '0.75rem',
                                                                    background: 'var(--primary)',
                                                                    color: 'white',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    You
                                                                </span>
                                                            )}
                                                            {isGuestPlayer(member) && (
                                                                <GuestBadge size="small" />
                                                            )}
                                                        </div>
                                                        <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                                                            {member.cricketProfile?.playerRole
                                                                ? getPlayerRoleLabel(member.cricketProfile.playerRole)
                                                                : 'Role not set'}
                                                        </p>
                                                        {member.cricketProfile?.battingStyle && (
                                                            <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                                                {getBattingStyleLabel(member.cricketProfile.battingStyle)}
                                                                {member.cricketProfile?.bowlingStyle && (
                                                                    ` • ${getBowlingStyleLabel(member.cricketProfile.bowlingStyle)}`
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {canManage && !isCurrentUser && (
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            {!isTeamAdmin && (
                                                                <button
                                                                    onClick={() => handleToggleAccountManager(member)}
                                                                    className="btn"
                                                                    style={{
                                                                        padding: '0.5rem',
                                                                        background: 'transparent',
                                                                        color: member.role === USER_ROLES.ACCOUNTS_OFFICER ? '#fbbf24' : 'var(--foreground)',
                                                                        opacity: member.role === USER_ROLES.ACCOUNTS_OFFICER ? 1 : 0.5
                                                                    }}
                                                                    title={member.role === USER_ROLES.ACCOUNTS_OFFICER ? "Revoke Account Manager" : "Make Account Manager"}
                                                                >
                                                                    <Briefcase size={18} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleRemovePlayer(member.uid, member.displayName)}
                                                                className="btn"
                                                                style={{
                                                                    padding: '0.5rem',
                                                                    background: 'transparent',
                                                                    color: 'var(--error)'
                                                                }}
                                                                title="Remove from team"
                                                            >
                                                                <UserX size={18} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Requests Tab */}
                            {activeTab === 'requests' && canManage && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {joinRequests.length === 0 ? (
                                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                                            <UserPlus size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                                            <p style={{ opacity: 0.7 }}>No pending join requests</p>
                                        </div>
                                    ) : (
                                        joinRequests.map((request, idx) => (
                                            <motion.div
                                                key={request.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="card"
                                                style={{ padding: '1rem' }}
                                            >
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                                                        {request.playerName}
                                                    </h3>
                                                    <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                                                        {request.playerEmail}
                                                    </p>
                                                    {request.message && (
                                                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                                            "{request.message}"
                                                        </p>
                                                    )}
                                                    <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.5rem' }}>
                                                        Requested {new Date(request.requestedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <button
                                                        onClick={() => handleApproveRequest(request)}
                                                        className="btn"
                                                        style={{
                                                            flex: 1,
                                                            background: 'var(--success)',
                                                            color: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '0.5rem'
                                                        }}
                                                    >
                                                        <CheckCircle size={18} />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(request)}
                                                        className="btn"
                                                        style={{
                                                            flex: 1,
                                                            background: 'var(--error)',
                                                            color: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '0.5rem'
                                                        }}
                                                    >
                                                        <XCircle size={18} />
                                                        Reject
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </ProtectedRoute>
    );
}
