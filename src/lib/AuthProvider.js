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
                    // Create new user profile
                    const newProfile = {
                        email: user.email,
                        displayName: user.displayName || user.email?.split('@')[0],
                        photoURL: user.photoURL || null,
                        tenantId: 'pvcc', // Default tenant, can be updated
                        role: 'member', // Default role
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    };

                    await setDoc(userRef, newProfile);
                    setUserProfile(newProfile);
                }

                // Update last login
                await setDoc(userRef, {
                    lastLogin: new Date().toISOString()
                }, { merge: true });
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

    const signUpWithEmail = async (email, password, displayName) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Create user profile
            const newProfile = {
                email,
                displayName: displayName || email.split('@')[0],
                photoURL: null,
                tenantId: 'pvcc',
                role: 'member',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', result.user.uid), newProfile);
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

    const value = {
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
