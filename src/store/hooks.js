/**
 * Redux Hooks
 * 
 * Custom typed hooks for Redux store interaction.
 * Provides type-safe dispatch and selector hooks.
 */

import { useSelector, useDispatch } from 'react-redux';

// Typed dispatch hook
export const useAppDispatch = () => useDispatch();

// Typed selector hook
export const useAppSelector = (selector) => useSelector(selector);
