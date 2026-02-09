"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Fetch or create user profile in Firestore
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    setUserProfile(userSnap.data());
                } else {
                    // Create new user profile with enhanced schema
                    const newProfile = {
                        email: user.email,
                        displayName: user.displayName || user.email?.split('@')[0],
                        photoURL: user.photoURL || null,

                        // Role & Team Info
                        role: 'player', // Default role: 'super_admin' | 'team_admin' | 'player' | 'guest'
                        teams: [], // Array of team IDs user belongs to
                        primaryTeamId: null,

                        // Cricket Profile
                        cricketProfile: {
                            playerRole: null, // 'batsman' | 'bowler' | 'all-rounder' | 'wicketkeeper'
                            battingStyle: null, // 'right-hand' | 'left-hand'
                            bowlingStyle: null, // Various bowling styles
                            dateOfBirth: null,
                            gender: null, // 'male' | 'female' | 'other'
                            jerseyNumber: null
                        },

                        // Metadata
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                        isActive: true
                    };

                    await setDoc(userRef, newProfile);
                    setUserProfile(newProfile);
                }

                // Update last login
                const updates = {
                    lastLogin: new Date().toISOString()
                };

                // Promotion logic for super user
                if (user.email === 'lennyrajan@gmail.com' && (!userSnap.exists() || userSnap.data().role !== 'super_admin')) {
                    updates.role = 'super_admin';
                }

                await setDoc(userRef, updates, { merge: true });

                // Refresh local profile if promoted
                if (updates.role) {
                    const updatedSnap = await getDoc(userRef);
                    setUserProfile(updatedSnap.data());
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    const signInWithEmail = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Error signing in with email:', error);
            throw error;
        }
    };

    const signUpWithEmail = async (email, password, displayName, cricketProfile = {}) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Create user profile with enhanced schema
            const newProfile = {
                email,
                displayName: displayName || email.split('@')[0],
                photoURL: null,

                // Role & Team Info
                role: email === 'lennyrajan@gmail.com' ? 'super_admin' : 'player',
                teams: [],
                primaryTeamId: null,

                // Cricket Profile
                cricketProfile: {
                    playerRole: cricketProfile.playerRole || null,
                    battingStyle: cricketProfile.battingStyle || null,
                    bowlingStyle: cricketProfile.bowlingStyle || null,
                    dateOfBirth: cricketProfile.dateOfBirth || null,
                    gender: cricketProfile.gender || null,
                    jerseyNumber: cricketProfile.jerseyNumber || null
                },

                // Metadata
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                isActive: true
            };

            await setDoc(doc(db, 'users', result.user.uid), newProfile);
            return result.user;
        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    // Helper function to update user profile
    const updateUserProfile = async (userId, updates) => {
        try {
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, updates, { merge: true });

            // Update local state if updating current user
            if (userId === currentUser?.uid) {
                const updatedSnap = await getDoc(userRef);
                setUserProfile(updatedSnap.data());
            }
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    };

    // Helper function to check if user has specific permission
    const checkPermission = (permission) => {
        if (!userProfile) return false;

        const PERMISSIONS = {
            CREATE_TEAM: ['super_admin'],
            MANAGE_TEAM: ['super_admin', 'team_admin'],
            APPROVE_PLAYERS: ['super_admin', 'team_admin'],
            ADD_GUEST_PLAYERS: ['super_admin', 'team_admin'],
            CREATE_MATCH: ['super_admin', 'team_admin', 'player'],
            SCORE_MATCH: ['super_admin', 'team_admin', 'player'],
            CREATE_POST: ['super_admin', 'team_admin', 'player'],
            CREATE_FINE: ['super_admin', 'team_admin'],
            EDIT_OWN_PROFILE: ['super_admin', 'team_admin', 'player', 'guest'],
            VIEW_PROFILES: ['super_admin', 'team_admin', 'player', 'guest']
        };

        return PERMISSIONS[permission]?.includes(userProfile.role) || false;
    };

    // Helper function to check if user is admin of specific team
    const isTeamAdmin = async (teamId) => {
        if (!currentUser || !userProfile) return false;
        if (userProfile.role === 'super_admin') return true;
        if (userProfile.role !== 'team_admin') return false;

        try {
            const teamRef = doc(db, 'teams', teamId);
            const teamSnap = await getDoc(teamRef);

            if (teamSnap.exists()) {
                const teamData = teamSnap.data();
                return teamData.adminIds?.includes(currentUser.uid) || false;
            }
            return false;
        } catch (error) {
            console.error('Error checking team admin status:', error);
            return false;
        }
    };

    const value = {
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateUserProfile,
        checkPermission,
        isTeamAdmin
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
