import { createAppStore } from "@jeffrey-keyser/redux-app-toolkit";
import { ThunkAction, Action } from "@reduxjs/toolkit";
import { diagnosticsApi, userApi } from "../reducers";

// Create the store using the package
const storeConfig = createAppStore({
  apis: {
    [diagnosticsApi.reducerPath]: diagnosticsApi,
    [userApi.reducerPath]: userApi,
  },
});

// Export store instance and typed hooks
export const { store, useAppDispatch, useAppSelector } = storeConfig;

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type Store = typeof store;

// Keep the getStore function for backwards compatibility
export function getStore(): Store {
  return store;
}

// Keep the createStore function for testing compatibility
export function createStore(preloadedState?: any) {
  return createAppStore({
    apis: {
      [diagnosticsApi.reducerPath]: diagnosticsApi,
      [userApi.reducerPath]: userApi,
    },
    preloadedState,
  }).store;
}

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
