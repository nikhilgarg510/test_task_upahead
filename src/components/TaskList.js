/**
 * Task List Component
 * 
 * Enhanced task management interface with:
 * - Smooth animations and micro-interactions
 * - Modern card-based design
 * - Interactive status progression
 * - Floating action button
 *     if (loading) {
        return <FullScreenLoader message="Loading your tasks..." size="lg" />;
    }ding states
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, LogOut, CheckCircle2, Clock, Circle, User, Filter, ChevronLeft, ChevronRight, Loader2, Lightbulb, MessageSquare, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    fetchTasks,
    editTask,
    selectTasks,
    selectTasksLoading,
    updateTaskLocal
} from '@/store/slices/tasksSlice';
import { FullScreenLoader } from '@/components/Loader';
import SuggestionModal from '@/components/SuggestionModal';
import { getTaskCommentCounts } from '@/lib/firestore';

export default function TaskList() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [updatingTasks, setUpdatingTasks] = useState(new Set());
    const [suggestionLoading, setSuggestionLoading] = useState(new Set());
    const [viewLoading, setViewLoading] = useState(new Set());
    const [commentCounts, setCommentCounts] = useState({});
    const [loadingCommentCounts, setLoadingCommentCounts] = useState(false);
    const [suggestionModal, setSuggestionModal] = useState({
        isOpen: false,
        suggestion: '',
        isFromCache: false,
        remainingCount: 20,
        isLimit: false,
        limitMessage: ''
    });

    // Filter and pagination state
    const [filters, setFilters] = useState({
        status: 'all',
        type: 'all'
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        itemsPerPage: 20
    });

    const tasks = useAppSelector(selectTasks);
    const loading = useAppSelector(selectTasksLoading);

    // Filter and pagination options
    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' }
    ];

    const typeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'task', label: 'Task' },
        { value: 'bug', label: 'Bug' },
        { value: 'feature', label: 'Feature' },
        { value: 'improvement', label: 'Improvement' }
    ];

    const itemsPerPageOptions = [5, 10, 20, 50, 100];

    // Filtered and paginated tasks
    const { filteredTasks, totalPages, displayedTasks } = useMemo(() => {
        let filtered = tasks;

        // Apply status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(task => task.status === filters.status);
        }

        // Apply type filter
        if (filters.type !== 'all') {
            filtered = filtered.filter(task => task.type === filters.type);
        }

        const totalPages = Math.ceil(filtered.length / pagination.itemsPerPage);
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        const displayedTasks = filtered.slice(startIndex, endIndex);

        return { filteredTasks: filtered, totalPages, displayedTasks };
    }, [tasks, filters, pagination]);

    // Reset to first page when filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, [filters]);

    useEffect(() => {
        if (user) {
            dispatch(fetchTasks(user.uid));
        }
    }, [user, dispatch]);

    // Fetch comment counts when tasks are loaded
    useEffect(() => {
        const fetchCommentCounts = async () => {
            if (tasks.length > 0) {
                setLoadingCommentCounts(true);
                try {
                    const taskIds = tasks.map(task => task.id);
                    const counts = await getTaskCommentCounts(taskIds);
                    setCommentCounts(counts);
                } catch (error) {
                    console.error('Error fetching comment counts:', error);
                } finally {
                    setLoadingCommentCounts(false);
                }
            }
        };

        fetchCommentCounts();
    }, [tasks]);

    // Handler functions
    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
    };

    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    };

    const handleItemsPerPageChange = (itemsPerPage) => {
        setPagination(prev => ({
            ...prev,
            itemsPerPage: parseInt(itemsPerPage),
            currentPage: 1
        }));
    };

    // Helper function to get status display info
    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pending',
                    icon: Circle,
                    color: 'gray',
                    bgClass: 'bg-gray-100 hover:bg-gray-200',
                    textClass: 'text-gray-700',
                    borderClass: 'border-gray-300'
                };
            case 'in-progress':
                return {
                    label: 'In Progress',
                    icon: Clock,
                    color: 'blue',
                    bgClass: 'bg-blue-100 hover:bg-blue-200',
                    textClass: 'text-blue-700',
                    borderClass: 'border-blue-300'
                };
            case 'completed':
                return {
                    label: 'Completed',
                    icon: CheckCircle2,
                    color: 'green',
                    bgClass: 'bg-green-100 hover:bg-green-200',
                    textClass: 'text-green-700',
                    borderClass: 'border-green-300'
                };
            default:
                return {
                    label: 'Pending',
                    icon: Circle,
                    color: 'gray',
                    bgClass: 'bg-gray-100 hover:bg-gray-200',
                    textClass: 'text-gray-700',
                    borderClass: 'border-gray-300'
                };
        }
    };

    const getNextStatus = (currentStatus) => {
        switch (currentStatus) {
            case 'pending':
                return 'in-progress';
            case 'in-progress':
                return 'completed';
            case 'completed':
                return 'pending';
            default:
                return 'pending';
        }
    };

    const handleToggleStatus = async (taskId, currentStatus) => {
        if (updatingTasks.has(taskId)) return;

        // Prevent changing status if task is completed
        if (currentStatus === 'completed') {
            return;
        }

        try {
            const newStatus = getNextStatus(currentStatus);
            const updates = { status: newStatus };

            // Add completion date when marking as completed
            if (newStatus === 'completed') {
                updates.completedAt = new Date().toISOString();
            }

            setUpdatingTasks(prev => new Set(prev).add(taskId));

            // Optimistic update
            dispatch(updateTaskLocal({
                taskId,
                updates
            }));

            // Update in backend
            await dispatch(editTask({
                taskId,
                taskData: updates
            })).unwrap();
        } catch (error) {
            console.error('Error updating task:', error);
            // Revert optimistic update on error
            dispatch(updateTaskLocal({
                taskId,
                updates: { status: currentStatus }
            }));
        } finally {
            setUpdatingTasks(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleGetTaskSuggestion = async (task) => {
        const taskId = task.id;

        if (suggestionLoading.has(taskId)) return;

        try {
            setSuggestionLoading(prev => new Set(prev).add(taskId));

            const response = await fetch('/api/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.uid,
                    taskName: task.title,
                    taskType: task.type,
                    taskDescription: task.description,
                    taskStatus: task.status
                }),
            });

            const data = await response.json();

            if (response.status === 429) {
                // Limit reached
                setSuggestionModal({
                    isOpen: true,
                    isLimit: true,
                    limitMessage: data.message || "You've reached your free suggestions limit.",
                    suggestion: '',
                    isFromCache: false,
                    remainingCount: 0
                });
            } else if (response.ok) {
                // Success
                setSuggestionModal({
                    isOpen: true,
                    isLimit: false,
                    suggestion: data.suggestion,
                    isFromCache: data.isFromCache,
                    remainingCount: data.remainingCount,
                    limitMessage: ''
                });
            } else {
                // Other errors
                alert(data.error || 'Failed to get suggestions. Please try again.');
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            alert('Failed to connect to suggestions service. Please try again.');
        } finally {
            setSuggestionLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    };

    const closeSuggestionModal = () => {
        setSuggestionModal(prev => ({ ...prev, isOpen: false }));
    };

    const navigateToAddTask = () => {
        router.push('/add-task');
    };

    const navigateToViewTask = (taskId) => {
        // Add loading state for this specific task
        setViewLoading(prev => new Set(prev).add(taskId));

        // Navigate to view task (loading state will be cleared when component unmounts)
        router.push(`/view-task/${taskId}`);
    };

    if (loading) {
        return <FullScreenLoader message="Loading your tasks..." size="lg" />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20"
            >
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    My Tasks
                                </h1>
                                <div className="flex items-center text-xs sm:text-sm text-gray-500 mt-1 min-w-0">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                                    <span className="truncate">
                                        {user?.displayName || user?.email}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <motion.button
                            onClick={handleLogout}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center space-x-2 px-3 py-2 sm:px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 text-sm sm:text-base"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sign Out</span>
                            <span className="sm:hidden">Logout</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
                {/* Filters and Controls */}
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 border border-white/20">
                    <div className="space-y-3 sm:space-y-4">
                        {/* Filter Controls */}
                        <div className="flex flex-col space-y-3 sm:space-y-4">
                            <div className="flex items-center space-x-2">
                                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Filters:</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                {/* Status Filter */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-500 mb-1">Status</label>
                                    <select
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                    >
                                        {statusOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Type Filter */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-500 mb-1">Type</label>
                                    <select
                                        value={filters.type}
                                        onChange={(e) => handleFilterChange('type', e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                    >
                                        {typeOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Per Page Control */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-500 mb-1">Per page</label>
                                    <select
                                        value={pagination.itemsPerPage}
                                        onChange={(e) => handleItemsPerPageChange(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                    >
                                        {itemsPerPageOptions.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Results Info */}
                                <div className="flex flex-col justify-end">
                                    <div className="text-sm text-gray-600 py-2">
                                        <span className="font-medium">{displayedTasks.length}</span> of <span className="font-medium">{filteredTasks.length}</span> tasks
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasks List */}
                <AnimatePresence>
                    {filteredTasks.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20"
                        >
                            <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {tasks.length === 0 ? 'No tasks yet!' : 'No tasks match your filters'}
                            </h3>
                            <p className="text-gray-500 mb-8">
                                {tasks.length === 0
                                    ? 'Create your first task to get organized.'
                                    : 'Try adjusting your filters to see more tasks.'
                                }
                            </p>
                        </motion.div>
                    ) : (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ staggerChildren: 0.1 }}
                                className="grid gap-4"
                            >
                                {displayedTasks.map((task, index) => {
                                    const statusInfo = getStatusInfo(task.status);
                                    const StatusIcon = statusInfo.icon;
                                    const isUpdating = updatingTasks.has(task.id);
                                    const isCompleted = task.status === 'completed';
                                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

                                    return (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            whileHover={{ y: -2, transition: { duration: 0.2 } }}
                                            className={clsx(
                                                "backdrop-blur-sm rounded-xl shadow-lg border p-4 sm:p-6 transition-all duration-300 hover:shadow-xl",
                                                isCompleted && "bg-gray-50/70 border-gray-200/50",
                                                isOverdue && "bg-red-50/70 border-red-200/50",
                                                !isCompleted && !isOverdue && "bg-white/70 border-white/20"
                                            )}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                                        <motion.button
                                                            onClick={() => handleToggleStatus(task.id, task.status)}
                                                            disabled={isUpdating || isCompleted}
                                                            whileHover={!isCompleted ? { scale: 1.05 } : {}}
                                                            whileTap={!isCompleted ? { scale: 0.95 } : {}}
                                                            className={clsx(
                                                                "flex items-center space-x-2 px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200",
                                                                statusInfo.bgClass,
                                                                statusInfo.textClass,
                                                                !isCompleted && "hover:shadow-md",
                                                                (isUpdating || isCompleted) && "cursor-not-allowed",
                                                                isUpdating && "opacity-50"
                                                            )}
                                                        >
                                                            {isUpdating ? (
                                                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                                            ) : (
                                                                <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                            )}
                                                            <span className="truncate">{statusInfo.label}</span>
                                                        </motion.button>

                                                        {/* Task Type Badge */}
                                                        {task.type && (
                                                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800">
                                                                {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className={clsx(
                                                        "text-base sm:text-lg font-semibold mb-2 transition-all duration-200 break-words",
                                                        isCompleted ? "line-through text-gray-500" : "text-gray-900"
                                                    )}>
                                                        {task.title}
                                                    </h3>

                                                    {task.description && (
                                                        <p className={clsx(
                                                            "text-sm leading-relaxed mb-3 break-words",
                                                            isCompleted ? "text-gray-400" : "text-gray-600"
                                                        )}>
                                                            {task.description.length > 100 ?
                                                                `${task.description.substring(0, 100)}...` :
                                                                task.description
                                                            }
                                                        </p>
                                                    )}

                                                    {/* Comment count and dates */}
                                                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                                        <div className="flex items-center space-x-2 sm:space-x-4">
                                                            <div className="flex items-center space-x-1">
                                                                <MessageSquare className="w-4 h-4 text-gray-400" />
                                                                <span className="text-sm text-gray-500">
                                                                    {loadingCommentCounts ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        `${commentCounts[task.id] || 0} comments`
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
                                                            {/* Created date */}
                                                            <div className="flex items-center space-x-1">
                                                                <Calendar className="w-3 h-3" />
                                                                <span className="whitespace-nowrap">
                                                                    Created: {task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                    }) : 'N/A'}
                                                                </span>
                                                            </div>

                                                            {/* Due date or completion date */}
                                                            {isCompleted && task.completedAt ? (
                                                                <div className="flex items-center space-x-1 text-green-600">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    <span className="whitespace-nowrap">
                                                                        Completed: {new Date(task.completedAt).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            ) : task.dueDate ? (
                                                                <div className={clsx(
                                                                    "flex items-center space-x-1",
                                                                    new Date(task.dueDate) < new Date() && !isCompleted
                                                                        ? "text-red-600"
                                                                        : "text-gray-500"
                                                                )}>
                                                                    <Clock className="w-3 h-3" />
                                                                    <span className="whitespace-nowrap">
                                                                        Due: {new Date(task.dueDate).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                        {new Date(task.dueDate) < new Date() && !isCompleted && (
                                                                            <span className="text-red-600 font-medium ml-1">(Overdue)</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-row sm:flex-col gap-2 sm:gap-3 flex-shrink-0">
                                                    {/* Suggestion Button - Only for non-completed tasks */}
                                                    {!isCompleted && (
                                                        <motion.button
                                                            onClick={() => handleGetTaskSuggestion(task)}
                                                            disabled={suggestionLoading.has(task.id)}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className={clsx(
                                                                "flex items-center justify-center px-2 py-2 sm:px-3 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium min-w-0",
                                                                suggestionLoading.has(task.id)
                                                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                                    : "bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                                                            )}
                                                            title="Get AI suggestion"
                                                        >
                                                            {suggestionLoading.has(task.id) ? (
                                                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                                            ) : (
                                                                <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
                                                            )}
                                                        </motion.button>
                                                    )}

                                                    {/* View Button */}
                                                    <motion.button
                                                        onClick={() => navigateToViewTask(task.id)}
                                                        disabled={viewLoading.has(task.id)}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        className={clsx(
                                                            "flex items-center justify-center px-2 py-2 sm:px-3 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium min-w-0",
                                                            viewLoading.has(task.id)
                                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                                : isCompleted
                                                                    ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                                        )}
                                                        title={viewLoading.has(task.id) ? "Loading..." : isCompleted ? "View completed task" : "View task"}
                                                    >
                                                        {viewLoading.has(task.id) ? (
                                                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                                                <span className="hidden sm:inline">View</span>
                                                            </>
                                                        )}
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex flex-col sm:flex-row items-center justify-between mt-6 sm:mt-8 bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 space-y-3 sm:space-y-0"
                                >
                                    <div className="flex items-center space-x-2 order-2 sm:order-1">
                                        <span className="text-xs sm:text-sm text-gray-600">
                                            Page {pagination.currentPage} of {totalPages}
                                        </span>
                                    </div>

                                    <div className="flex items-center space-x-1 order-1 sm:order-2">
                                        {/* Previous Button */}
                                        <button
                                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                                            disabled={pagination.currentPage === 1}
                                            className="p-1.5 sm:p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>

                                        {/* Page Numbers - Show fewer on mobile */}
                                        <div className="hidden sm:flex items-center space-x-1">
                                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (pagination.currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (pagination.currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = pagination.currentPage - 2 + i;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={clsx(
                                                            "w-10 h-10 rounded-lg font-medium text-sm transition-colors",
                                                            pagination.currentPage === pageNum
                                                                ? "bg-blue-600 text-white"
                                                                : "border border-gray-300 hover:bg-gray-50"
                                                        )}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Mobile version - show fewer pages */}
                                        <div className="flex sm:hidden items-center space-x-1">
                                            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 3) {
                                                    pageNum = i + 1;
                                                } else if (pagination.currentPage <= 2) {
                                                    pageNum = i + 1;
                                                } else if (pagination.currentPage >= totalPages - 1) {
                                                    pageNum = totalPages - 2 + i;
                                                } else {
                                                    pageNum = pagination.currentPage - 1 + i;
                                                }

                                                return (
                                                    <button
                                                        key={`mobile-${pageNum}`}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={clsx(
                                                            "w-8 h-8 rounded-lg font-medium text-xs transition-colors",
                                                            pagination.currentPage === pageNum
                                                                ? "bg-blue-600 text-white"
                                                                : "border border-gray-300 hover:bg-gray-50"
                                                        )}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Next Button */}
                                        <button
                                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                                            disabled={pagination.currentPage === totalPages}
                                            className="p-1.5 sm:p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center space-x-1 sm:space-x-2 order-3">
                                        <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline flex-shrink-0">Jump to:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={totalPages}
                                            value={pagination.currentPage}
                                            onChange={(e) => {
                                                const page = parseInt(e.target.value);
                                                if (page >= 1 && page <= totalPages) {
                                                    handlePageChange(page);
                                                }
                                            }}
                                            className="w-10 sm:w-16 px-1 sm:px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm text-center flex-shrink-0"
                                            placeholder="Page"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating Action Button */}
            <motion.button
                onClick={navigateToAddTask}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl flex items-center justify-center transition-all duration-300 z-50"
            >
                <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
            </motion.button>

            {/* Suggestion Modal */}
            <SuggestionModal
                isOpen={suggestionModal.isOpen}
                onClose={closeSuggestionModal}
                suggestion={suggestionModal.suggestion}
                isFromCache={suggestionModal.isFromCache}
                remainingCount={suggestionModal.remainingCount}
                isLimit={suggestionModal.isLimit}
                limitMessage={suggestionModal.limitMessage}
            />
        </div>
    );
}

