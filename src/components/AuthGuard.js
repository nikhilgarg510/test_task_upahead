'use client';

import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectAuthLoading } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock } from 'lucide-react';

/**
 * Authentication Guard Component
 * 
 * Protects routes by redirecting unauthenticated users to login.
 * Enhanced with smooth animations and better visual feedback.
 */
export default function AuthGuard({ children }) {
    const router = useRouter();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const loading = useAppSelector(selectAuthLoading);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/');
        }
    }, [loading, isAuthenticated, router]);

    // Enhanced loading screen while checking authentication status
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Authenticating</h2>
                    <p className="text-gray-600">Verifying your access...</p>
                </motion.div>
            </div>
        );
    }

    // Enhanced redirect screen if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
                    <p className="text-gray-600">Redirecting to login...</p>
                </motion.div>
            </div>
        );
    }

    // Render protected content with smooth transition
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
}
