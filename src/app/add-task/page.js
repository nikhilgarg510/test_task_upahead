/**
 * Add Task Page
 * 
 * Enhanced form interface with:
 * - Smooth animations and transitions
 * - Modern form design with floating labels
 * - Interactive elements and micro-interactions
 * - Better visual hierarchy
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, X, Plus, FileText, Clock, CheckCircle2, Circle, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { useAppDispatch } from '@/store/hooks';
import { createTask } from '@/store/slices/tasksSlice';
import AuthGuard from '@/components/AuthGuard';

function AddTaskContent() {
    const { user } = useAuth();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState(false);
    const [lastSubmitTime, setLastSubmitTime] = useState(0);
    const [submittedTaskHash, setSubmittedTaskHash] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'pending',
        type: 'task',
        dueDate: ''
    });

    const statusOptions = [
        { value: 'pending', label: 'Pending', icon: Circle, color: 'gray' },
        { value: 'in-progress', label: 'In Progress', icon: Clock, color: 'blue' },
        { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'green' }
    ];

    const taskTypeOptions = [
        { value: 'task', label: 'Task' },
        { value: 'bug', label: 'Bug' },
        { value: 'feature', label: 'Feature' },
        { value: 'improvement', label: 'Improvement' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            // Better error handling with toast-like notification
            return;
        }

        // Prevent multiple submissions
        if (loading) {
            return;
        }

        // Debounce rapid submissions (prevent within 2 seconds)
        const now = Date.now();
        if (now - lastSubmitTime < 2000) {
            console.log('Preventing rapid form submission');
            return;
        }

        // Create a simple hash of the task data to prevent duplicate submissions
        const taskHash = `${formData.title}_${formData.description}_${formData.type}_${formData.dueDate}`;
        if (submittedTaskHash === taskHash) {
            console.log('Preventing duplicate task submission');
            return;
        }

        setLastSubmitTime(now);
        setSubmittedTaskHash(taskHash);

        try {
            setLoading(true);
            await dispatch(createTask({
                userId: user.uid,
                taskData: formData
            })).unwrap();

            router.push('/');
        } catch (error) {
            console.error('Error adding task:', error);

            // Reset the hash on error so user can retry
            setSubmittedTaskHash(null);

            // Show user-friendly error message
            if (error.includes('Document already exists')) {
                alert('Task creation failed due to a duplicate ID. Please try again.');
            } else {
                alert('Failed to create task. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                            <motion.button
                                onClick={handleCancel}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </motion.button>
                            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
                                    Create New Task
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">Add a new task to your collection</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Form */}
            <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8"
                >
                    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                        {/* Task Type Field */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <label htmlFor="type" className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                Task Type
                            </label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="w-full px-3 py-3 sm:px-4 sm:py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm text-base"
                            >
                                {taskTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </motion.div>

                        {/* Title Field */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                Task Title *
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm text-base"
                                    placeholder="Enter a descriptive task title"
                                    required
                                />
                            </div>
                        </motion.div>

                        {/* Description Field */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full px-3 sm:px-4 py-3 sm:py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none bg-white/50 backdrop-blur-sm text-base"
                                placeholder="Provide additional details about this task"
                            />
                        </motion.div>

                        {/* Due Date Field */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.32 }}
                        >
                            <label htmlFor="dueDate" className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                Due Date (Optional)
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    type="date"
                                    id="dueDate"
                                    name="dueDate"
                                    value={formData.dueDate}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm text-base"
                                />
                            </div>
                        </motion.div>

                        {/* Status Field */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label className="block text-sm font-semibold text-gray-700 mb-4">
                                Initial Status
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {statusOptions.map((option) => {
                                    const IconComponent = option.icon;
                                    const isSelected = formData.status === option.value;

                                    return (
                                        <motion.button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, status: option.value }))}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={clsx(
                                                "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                                                isSelected
                                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                                    : "border-gray-200 bg-white/50 hover:border-gray-300 hover:bg-white/70"
                                            )}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={clsx(
                                                    "p-2 rounded-lg",
                                                    option.color === 'gray' && "bg-gray-100",
                                                    option.color === 'blue' && "bg-blue-100",
                                                    option.color === 'green' && "bg-green-100"
                                                )}>
                                                    <IconComponent className={clsx(
                                                        "w-5 h-5",
                                                        option.color === 'gray' && "text-gray-600",
                                                        option.color === 'blue' && "text-blue-600",
                                                        option.color === 'green' && "text-green-600"
                                                    )} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{option.label}</div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute top-2 right-2"
                                                >
                                                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Action Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6"
                        >
                            <motion.button
                                type="submit"
                                disabled={loading || !formData.title.trim()}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full sm:flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm sm:text-base"
                            >
                                {loading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </motion.div>
                                ) : (
                                    <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                                <span>{loading ? 'Creating Task...' : 'Create Task'}</span>
                            </motion.button>

                            <motion.button
                                type="button"
                                onClick={handleCancel}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full sm:flex-1 flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 text-sm sm:text-base"
                            >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Cancel</span>
                            </motion.button>
                        </motion.div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

export default function AddTask() {
    return (
        <AuthGuard>
            <AddTaskContent />
        </AuthGuard>
    );
}