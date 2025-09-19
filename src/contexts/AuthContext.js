/**
 * Authentication Context
 * 
 * Provides Firebase authentication state and methods across the app.
 * Integrates with Redux store for centralized state management.
 */

'use client';

import { createContext, useContext, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    setUser,
    clearUser,
    setLoading,
    setError,
    selectUser,
    selectAuthLoading,
    selectIsAuthenticated
} from '@/store/slices/authSlice';
import { clearTasks } from '@/store/slices/tasksSlice';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/**
 * Authentication Provider Component
 * 
 * Manages Firebase authentication state and provides auth methods
 * to child components through React Context.
 */
export const AuthProvider = ({ children }) => {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const loading = useAppSelector(selectAuthLoading);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    // Listen to Firebase auth state changes
    useEffect(() => {
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // User signed in - store user data in Redux
                dispatch(setUser({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                }));
            } else {
                // User signed out - clear all user data
                dispatch(clearUser());
                dispatch(clearTasks());
            }
        });

        return () => unsubscribe();
    }, [dispatch]);

    // Google Sign-In handler
    const signInWithGoogle = async () => {
        try {
            dispatch(setLoading(true));

            if (!auth) {
                throw new Error('Firebase auth not initialized');
            }

            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error('Sign-in error:', error);
            dispatch(setError(error.message));
            throw error;
        }
    };

    // Sign out handler
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            dispatch(setError(error.message));
            console.error('Error signing out:', error);
            throw error;
        }
    };

    const value = {
        user,
        signInWithGoogle,
        logout,
        loading,
        isAuthenticated
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
