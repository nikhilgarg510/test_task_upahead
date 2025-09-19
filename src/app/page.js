'use client';

import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import TaskList from '@/components/TaskList';
import Login from '@/components/Login';

/**
 * Home Page Component
 * 
 * Main entry point that handles routing between authentication
 * and task management based on user login status with enhanced loading UI.
 */
export default function Home() {
  const { user, loading } = useAuth();

  // Enhanced loading screen with smooth animation
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Manager</h2>
          <p className="text-gray-600">Loading your workspace...</p>
        </motion.div>
      </div>
    );
  }

  // Route to appropriate screen based on authentication status
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen"
    >
      {user ? <TaskList /> : <Login />}
    </motion.main>
  );
}
