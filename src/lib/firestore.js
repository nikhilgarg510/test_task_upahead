/**
 * Firestore Database Operations
 * 
 * Handles all CRUD operations for tasks with Firebase Firestore.
 * Converts Firestore timestamps to ISO strings for Redux serialization.
 */

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    getCountFromServer
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Collection reference
const TASKS_COLLECTION = 'tasks';

// Add a new task
export const addTask = async (userId, taskData) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            console.log(`Adding task to Firestore (attempt ${attempt + 1}):`, { userId, taskData });

            if (!db) {
                throw new Error('Firestore database not initialized');
            }

            if (!userId) {
                throw new Error('User ID is required');
            }

            const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
                ...taskData,
                userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Add a unique identifier to help prevent duplicates
                clientId: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });

            console.log('Task added successfully with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error(`Firestore addTask error (attempt ${attempt + 1}):`, {
                message: error.message,
                code: error.code,
                stack: error.stack
            });

            // If it's a document already exists error and we have retries left, try again
            if ((error.message.includes('Document already exists') || error.code === 'already-exists') && attempt < maxRetries - 1) {
                attempt++;
                console.log(`Retrying task creation (attempt ${attempt + 1})...`);
                // Add a small delay before retrying
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                continue;
            }

            // If we've exhausted retries or it's a different error, throw it
            if (error.message.includes('Document already exists') || error.code === 'already-exists') {
                throw new Error('Unable to create task due to ID conflict. Please try again.');
            }

            throw error;
        }
    }
};

// Get all tasks for a user
export const getUserTasks = async (userId) => {
    try {
        console.log('Fetching tasks for user:', userId);

        // Helper function to convert Firestore data to serializable format
        const convertTaskData = (doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore timestamps to ISO strings for Redux serialization
                createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                completedAt: data.completedAt?.toDate?.() ? data.completedAt.toDate().toISOString() : data.completedAt
            };
        };

        // First, try the query with orderBy (requires index)
        try {
            const q = query(
                collection(db, TASKS_COLLECTION),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const tasks = [];
            querySnapshot.forEach((doc) => {
                tasks.push(convertTaskData(doc));
            });
            console.log('Tasks fetched with orderBy:', tasks.length);
            return tasks;
        } catch (indexError) {
            // If index is missing, fall back to simple query and sort client-side
            console.warn('Index missing, falling back to client-side sorting:', indexError.message);

            const q = query(
                collection(db, TASKS_COLLECTION),
                where('userId', '==', userId)
            );
            const querySnapshot = await getDocs(q);
            const tasks = [];
            querySnapshot.forEach((doc) => {
                tasks.push(convertTaskData(doc));
            });

            // Sort client-side by createdAt (now ISO strings)
            tasks.sort((a, b) => {
                if (!a.createdAt || !b.createdAt) return 0;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            console.log('Tasks fetched with client-side sorting:', tasks.length);
            return tasks;
        }
    } catch (error) {
        console.error('Error getting tasks:', error);
        throw error;
    }
};

// Update a task
export const updateTask = async (taskId, taskData) => {
    try {
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await updateDoc(taskRef, {
            ...taskData,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
};

// Get comment count for a task
export const getTaskCommentCount = async (taskId) => {
    try {
        const commentsRef = collection(db, TASKS_COLLECTION, taskId, 'comments');
        const snapshot = await getCountFromServer(commentsRef);
        return snapshot.data().count;
    } catch (error) {
        console.error('Error getting comment count for task:', taskId, error);
        return 0; // Return 0 if there's an error
    }
};

// Get comment counts for multiple tasks
export const getTaskCommentCounts = async (taskIds) => {
    try {
        const commentCounts = {};

        // Use Promise.all to fetch all comment counts in parallel
        await Promise.all(
            taskIds.map(async (taskId) => {
                commentCounts[taskId] = await getTaskCommentCount(taskId);
            })
        );

        return commentCounts;
    } catch (error) {
        console.error('Error getting comment counts:', error);
        return {};
    }
};
