/**
 * Tasks Redux Slice
 * 
 * Manages task state with async operations for:
 * - Fetching user tasks from Firestore
 * - Creating new tasks
 * - Updating existing tasks
 * - Local state management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addTask, getUserTasks, updateTask } from '@/lib/firestore';

// Async thunks
export const fetchTasks = createAsyncThunk(
    'tasks/fetchTasks',
    async (userId, { rejectWithValue }) => {
        try {
            const tasks = await getUserTasks(userId);
            return tasks;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const createTask = createAsyncThunk(
    'tasks/createTask',
    async ({ userId, taskData }, { rejectWithValue }) => {
        try {
            const taskId = await addTask(userId, taskData);
            return { id: taskId, ...taskData, userId };
        } catch (error) {
            console.error('Redux createTask error:', error);
            return rejectWithValue(error.message || 'Failed to create task');
        }
    }
);

export const editTask = createAsyncThunk(
    'tasks/editTask',
    async ({ taskId, taskData }, { rejectWithValue }) => {
        try {
            await updateTask(taskId, taskData);
            return { id: taskId, ...taskData };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    tasks: [],
    loading: false,
    error: null,
    lastUpdated: null
};

const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        clearTasks: (state) => {
            state.tasks = [];
            state.error = null;
            state.lastUpdated = null;
        },
        clearError: (state) => {
            state.error = null;
        },
        updateTaskLocal: (state, action) => {
            const { taskId, updates } = action.payload;
            const taskIndex = state.tasks.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
                state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updates };
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch tasks
            .addCase(fetchTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.tasks = action.payload;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(fetchTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Create task
            .addCase(createTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createTask.fulfilled, (state, action) => {
                state.loading = false;
                state.tasks.unshift(action.payload);
            })
            .addCase(createTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Edit task
            .addCase(editTask.pending, (state) => {
                state.error = null;
            })
            .addCase(editTask.fulfilled, (state, action) => {
                const taskIndex = state.tasks.findIndex(task => task.id === action.payload.id);
                if (taskIndex !== -1) {
                    state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...action.payload };
                }
            })
            .addCase(editTask.rejected, (state, action) => {
                state.error = action.payload;
            });
    }
});

export const { clearTasks, clearError, updateTaskLocal } = tasksSlice.actions;

// Selectors
export const selectTasks = (state) => state.tasks.tasks;
export const selectTasksLoading = (state) => state.tasks.loading;
export const selectTasksError = (state) => state.tasks.error;
export const selectTaskById = (taskId) => (state) =>
    state.tasks.tasks.find(task => task.id === taskId);

export default tasksSlice.reducer;
