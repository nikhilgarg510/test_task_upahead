/**
 * Redux Store Configuration
 * 
 * Configures the main Redux store with:
 * - Authentication state slice
 * - Tasks state slice
 * - Custom middleware for Firebase compatibility
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tasksReducer from './slices/tasksSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        tasks: tasksReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore non-serializable Firebase objects and Firestore timestamps
                ignoredActions: [
                    'auth/setUser',
                    'tasks/setTasks',
                    'tasks/addTask',
                    'tasks/updateTask',
                    'tasks/fetchTasks/fulfilled',
                    'tasks/createTask/fulfilled',
                    'tasks/editTask/fulfilled'
                ],
                ignoredActionsPaths: [
                    'payload.createdAt',
                    'payload.updatedAt',
                    'payload.0.createdAt',
                    'payload.0.updatedAt'
                ],
                ignoredPaths: [
                    'auth.user',
                    'tasks.tasks'
                ],
            },
        }),
});
