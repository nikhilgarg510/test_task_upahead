/**
 * Loader Component
 * 
 * Reusable loading indicator with:
 * - Smooth animations
 * - Customizable size and message
 * - Consistent styling across the app
 */

'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Loader({
    size = 'md',
    message = 'Loading...',
    className = '',
    showMessage = true
}) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const textSizeClasses = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-xl',
        xl: 'text-2xl'
    };

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center space-y-3"
            >
                <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
                {showMessage && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`${textSizeClasses[size]} text-gray-600 font-medium`}
                    >
                        {message}
                    </motion.p>
                )}
            </motion.div>
        </div>
    );
}

// Full-screen loader variant
export function FullScreenLoader({ message = 'Loading...', size = 'lg' }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
            <Loader size={size} message={message} />
        </div>
    );
}

// Inline loader variant
export function InlineLoader({ message = 'Loading...', size = 'sm' }) {
    return (
        <div className="flex items-center justify-center py-8">
            <Loader size={size} message={message} />
        </div>
    );
}
