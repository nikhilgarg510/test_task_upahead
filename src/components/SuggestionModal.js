/**
 * Suggestion Modal Component
 * 
 * Displays task suggestions and limit messages in a popup modal with:
 * - Animated entrance/exit
 * - Different states for suggestions and limit reached
 * - Smooth backdrop blur effect
 * - Responsive design
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, AlertTriangle, Sparkles, Zap } from 'lucide-react';
import clsx from 'clsx';

export default function SuggestionModal({
    isOpen,
    onClose,
    suggestion,
    isFromCache,
    remainingCount,
    isLimit,
    limitMessage
}) {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
                onClick={handleBackdropClick}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-sm sm:max-w-lg w-full mx-2 sm:mx-4 overflow-hidden border border-gray-200 max-h-[90vh] overflow-y-auto overscroll-contain"
                >
                    {isLimit ? (
                        // Limit Reached State
                        <>
                            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 sm:p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                                        <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                                            <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base sm:text-lg font-semibold truncate">
                                                Suggestion Limit Reached
                                            </h3>
                                            <p className="text-xs sm:text-sm opacity-90">
                                                Free suggestions used up
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                                    >
                                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                <p className="text-gray-700 text-center mb-4 sm:mb-6 text-sm sm:text-base">
                                    {limitMessage}
                                </p>

                                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                                    <div className="text-center">
                                        <div className="text-xl sm:text-2xl font-bold text-red-500 mb-1">20/20</div>
                                        <div className="text-xs sm:text-sm text-gray-600">Suggestions Used</div>
                                    </div>
                                </div>

                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-200 text-sm sm:text-base"
                                >
                                    Got it
                                </motion.button>
                            </div>
                        </>
                    ) : (
                        // Suggestion Display State
                        <>
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                                        <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                                            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base sm:text-lg font-semibold truncate">
                                                Fresh Suggestion
                                            </h3>
                                            <p className="text-xs sm:text-sm opacity-90">
                                                Generated just for you by us
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                                    >
                                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                <div className="flex items-start space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                                    <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0 mt-1">
                                        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 leading-relaxed text-sm sm:text-base break-words">
                                            {suggestion}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs sm:text-sm text-gray-600">
                                            Remaining free suggestions
                                        </div>
                                        <div className={clsx(
                                            "text-base sm:text-lg font-semibold",
                                            remainingCount > 10 ? "text-green-600" :
                                                remainingCount > 5 ? "text-yellow-600" : "text-red-600"
                                        )}>
                                            {remainingCount}/20
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className={clsx(
                                                "h-2 rounded-full transition-all duration-300",
                                                remainingCount > 10 ? "bg-green-500" :
                                                    remainingCount > 5 ? "bg-yellow-500" : "bg-red-500"
                                            )}
                                            style={{
                                                width: `${(remainingCount / 20) * 100}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                    <motion.button
                                        onClick={onClose}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-200 text-sm sm:text-base"
                                    >
                                        Thanks!
                                    </motion.button>
                                    <motion.button
                                        onClick={onClose}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="sm:flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center"
                                    >
                                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </motion.button>
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
