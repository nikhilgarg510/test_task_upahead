'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';

/**
 * Redux Provider Component
 * 
 * Wraps the application with Redux store provider
 * to enable state management across all components.
 */
export default function ReduxProvider({ children }) {
    return <Provider store={store}>{children}</Provider>;
}
