/**
 * View Task Page
 * 
 * Enhanced task viewing interface with:
 * - Inline editing for title and description
 * - 2x2 grid layout (9:3 ratio)
 * - Real-time auto-save functionality
 * - Comments system with chronological ordering
 * - Status dropdown for task management
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    MessageSquare,
    Send,
    CheckCircle2,
    Clock,
    Circle,
    User,
    Calendar,
    Type,
    Tag,
    Lightbulb
} from 'lucide-react';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { editTask, selectTaskById, fetchTasks, selectTasksLoading } from '@/store/slices/tasksSlice';
import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc
} from 'firebase/firestore';
import AuthGuard from '@/components/AuthGuard';
import { FullScreenLoader } from '@/components/Loader';
import SuggestionModal from '@/components/SuggestionModal';

function ViewTaskContent() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const dispatch = useAppDispatch();
    const taskId = params.id;
    const commentInputRef = useRef(null);

    const task = useAppSelector(selectTaskById(taskId));
    const tasksLoading = useAppSelector(selectTasksLoading);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [addingComment, setAddingComment] = useState(false);
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [suggestionModal, setSuggestionModal] = useState({
        isOpen: false,
        suggestion: '',
        isFromCache: false,
        remainingCount: 20,
        isLimit: false,
        limitMessage: ''
    });

    // Local state for inline editing
    const [editableTask, setEditableTask] = useState({
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
        { value: 'task', label: 'Task', color: 'blue' },
        { value: 'bug', label: 'Bug', color: 'red' },
        { value: 'feature', label: 'Feature', color: 'green' },
        { value: 'improvement', label: 'Improvement', color: 'purple' }
    ];

    // Fetch tasks if not loaded (for direct URL access)
    useEffect(() => {
        if (user && !task && !tasksLoading) {
            dispatch(fetchTasks(user.uid));
        }
    }, [user, task, tasksLoading, dispatch]);

    // Initialize editable task when task loads
    useEffect(() => {
        if (task) {
            setEditableTask({
                title: task.title || '',
                description: task.description || '',
                status: task.status || 'pending',
                type: task.type || 'task',
                dueDate: task.dueDate || ''
            });
        }
    }, [task]);

    // Load comments
    useEffect(() => {
        if (taskId) {
            const commentsRef = collection(db, 'tasks', taskId, 'comments');
            const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));

            const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
                const commentsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setComments(commentsData);
            });

            return () => unsubscribe();
        }
    }, [taskId]);

    // Auto-save function with debounce
    const saveTaskChanges = useCallback(async (updates) => {
        if (!task || saving) return;

        try {
            setSaving(true);
            await dispatch(editTask({
                taskId,
                taskData: updates
            })).unwrap();
        } catch (error) {
            console.error('Error updating task:', error);
        } finally {
            setSaving(false);
        }
    }, [task, saving, dispatch, taskId]);

    // Debounced save for title, description, and dueDate
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (task && (
                editableTask.title !== task.title ||
                editableTask.description !== task.description ||
                editableTask.dueDate !== task.dueDate
            )) {
                saveTaskChanges({
                    title: editableTask.title,
                    description: editableTask.description,
                    dueDate: editableTask.dueDate
                });
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timeoutId);
    }, [editableTask.title, editableTask.description, editableTask.dueDate, task, saveTaskChanges]);

    const handleStatusChange = async (newStatus) => {
        const updates = { status: newStatus };

        // Add completion date when marking as completed
        if (newStatus === 'completed' && editableTask.status !== 'completed') {
            updates.completedAt = new Date().toISOString();
        }

        setEditableTask(prev => ({ ...prev, status: newStatus }));
        await saveTaskChanges(updates);
    };

    const handleDueDateChange = (e) => {
        const newDueDate = e.target.value;
        setEditableTask(prev => ({ ...prev, dueDate: newDueDate }));
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || addingComment) return;

        try {
            setAddingComment(true);
            const commentsRef = collection(db, 'tasks', taskId, 'comments');

            await addDoc(commentsRef, {
                text: newComment.trim(),
                authorId: user.uid,
                authorName: user.displayName || user.email,
                createdAt: serverTimestamp()
            });

            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setAddingComment(false);
        }
    };

    const handleBack = () => {
        router.push('/');
    };

    const handleGetTaskSuggestion = async () => {
        if (!task || suggestionLoading) return;

        try {
            setSuggestionLoading(true);

            // Calculate task urgency and context
            const now = new Date();
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const createdDate = task.createdAt ? new Date(task.createdAt) : null;
            const isOverdue = dueDate && dueDate < now && task.status !== 'completed';
            const daysSinceCreated = createdDate ? Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)) : 0;
            const daysUntilDue = dueDate ? Math.floor((dueDate - now) / (1000 * 60 * 60 * 24)) : null;

            const response = await fetch('/api/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.uid,
                    // Enhanced task context
                    taskName: task.title,
                    taskType: task.type,
                    taskDescription: task.description,
                    taskStatus: task.status,
                    // Date context
                    dueDate: task.dueDate,
                    createdAt: task.createdAt,
                    completedAt: task.completedAt,
                    // Calculated context
                    isOverdue,
                    daysSinceCreated,
                    daysUntilDue,
                    // Additional context
                    hasDescription: !!task.description?.trim(),
                    hasDueDate: !!task.dueDate,
                    taskAge: daysSinceCreated,
                    urgencyLevel: isOverdue ? 'overdue' : daysUntilDue !== null && daysUntilDue <= 1 ? 'urgent' : daysUntilDue !== null && daysUntilDue <= 3 ? 'soon' : 'normal'
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
            setSuggestionLoading(false);
        }
    };

    const closeSuggestionModal = () => {
        setSuggestionModal(prev => ({ ...prev, isOpen: false }));
    };

    const getStatusInfo = (status) => {
        const option = statusOptions.find(opt => opt.value === status);
        return option || statusOptions[0];
    };

    const getTypeInfo = (type) => {
        const option = taskTypeOptions.find(opt => opt.value === type);
        return option || taskTypeOptions[0];
    };

    if (!task || tasksLoading) {
        return <FullScreenLoader message="Loading task details..." size="md" />;
    }

    const statusInfo = getStatusInfo(editableTask.status);
    const typeInfo = getTypeInfo(editableTask.type);
    const StatusIcon = statusInfo.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-24">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-shrink">
                            <motion.button
                                onClick={handleBack}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </motion.button>
                            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                <StatusIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
                                    Task Details
                                </h1>
                                <div className="flex items-center text-xs sm:text-sm text-gray-500 mt-1">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                                    <span className="truncate">{user?.displayName || user?.email}</span>
                                    {saving && (
                                        <span className="ml-2 text-green-600 flex items-center flex-shrink-0">
                                            <Save className="w-3 h-3 mr-1 animate-pulse" />
                                            <span className="hidden sm:inline">Saving...</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Suggestion Button - Only for non-completed tasks */}
                        {editableTask.status !== 'completed' && (
                            <motion.button
                                onClick={handleGetTaskSuggestion}
                                disabled={suggestionLoading}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={clsx(
                                    "flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex-shrink-0",
                                    suggestionLoading
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : "bg-yellow-100 hover:bg-yellow-200 text-yellow-700 hover:shadow-md"
                                )}
                            >
                                {suggestionLoading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </motion.div>
                                ) : (
                                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                                <span className="hidden sm:inline">{suggestionLoading ? 'Getting...' : 'Get AI Suggestions'}</span>
                                <span className="sm:hidden">{suggestionLoading ? '...' : 'AI'}</span>
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Main Content - Responsive Layout */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    {/* Main Content */}
                    <div className="lg:col-span-9 space-y-4 sm:space-y-6">
                        {/* Task Title */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white/70 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20"
                        >
                            <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                Task Title
                            </label>
                            <input
                                type="text"
                                value={editableTask.title}
                                onChange={(e) => setEditableTask(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full text-lg sm:text-2xl font-semibold bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 focus:bg-white/50 rounded-lg p-2 sm:p-3 transition-colors"
                                placeholder="Enter task title..."
                            />
                        </motion.div>

                        {/* Task Description */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/70 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20"
                        >
                            <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                Description
                            </label>
                            <textarea
                                value={editableTask.description}
                                onChange={(e) => setEditableTask(prev => ({ ...prev, description: e.target.value }))}
                                rows={5}
                                className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 focus:bg-white/50 rounded-lg p-2 sm:p-3 transition-colors resize-none text-sm sm:text-base"
                                placeholder="Enter task description..."
                            />
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Task Info Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20"
                        >
                            {/* Task Type */}
                            <div className="mb-3 sm:mb-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                <div className={clsx(
                                    "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                                    typeInfo.color === 'blue' && "bg-blue-100 text-blue-800",
                                    typeInfo.color === 'red' && "bg-red-100 text-red-800",
                                    typeInfo.color === 'green' && "bg-green-100 text-green-800",
                                    typeInfo.color === 'purple' && "bg-purple-100 text-purple-800"
                                )}>
                                    <Type className="w-3 h-3 mr-1" />
                                    {typeInfo.label}
                                </div>
                            </div>

                            {/* Task Status */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                <select
                                    value={editableTask.status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs"
                                >
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Dates */}
                            <div className="space-y-3">
                                {/* Created Date */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        <Calendar className="w-3 h-3 inline mr-1" />
                                        Created
                                    </label>
                                    <div className="text-xs text-gray-600">
                                        {task?.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: '2-digit'
                                        }) : 'N/A'}
                                    </div>
                                </div>

                                {/* Due Date or Completion Date */}
                                {editableTask.status === 'completed' ? (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                            Completed
                                        </label>
                                        <div className="text-xs text-green-600">
                                            {task?.completedAt ? new Date(task.completedAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: '2-digit'
                                            }) : 'N/A'}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="dueDate" className="block text-xs font-medium text-gray-500 mb-1">
                                            <Calendar className="w-3 h-3 inline mr-1" />
                                            Due Date
                                        </label>
                                        <input
                                            type="date"
                                            id="dueDate"
                                            value={editableTask.dueDate}
                                            onChange={handleDueDateChange}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs"
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 mb-16 sm:mb-20"
                    >
                        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                                <span>Comments ({comments.length})</span>
                            </h3>
                        </div>

                        {/* Comments List */}
                        <div className="max-h-80 sm:max-h-96 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                            {comments.length === 0 ? (
                                <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
                                    No comments yet. Be the first to add a comment!
                                </p>
                            ) : (
                                comments.map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="border-l-4 border-blue-500 pl-3 sm:pl-4 py-2 bg-gray-50 rounded-r-lg"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                {comment.authorName}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {comment.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 text-sm leading-relaxed break-words">
                                            {comment.text}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>

                    {/* Add Comment - Fixed to Bottom */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 sm:p-4 lg:p-6 z-50">
                        <div className="max-w-7xl mx-auto px-3 sm:px-4">
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                <input
                                    ref={commentInputRef}
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                                    className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base min-w-0"
                                    placeholder="Add a comment..."
                                    disabled={addingComment}
                                />
                                <motion.button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || addingComment}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={clsx(
                                        "px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base flex-shrink-0",
                                        newComment.trim() && !addingComment
                                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    )}
                                >
                                    {addingComment ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </motion.div>
                                    ) : (
                                        <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                                    )}
                                    <span>Send</span>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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

export default function ViewTask() {
    return (
        <AuthGuard>
            <ViewTaskContent />
        </AuthGuard>
    );
}
