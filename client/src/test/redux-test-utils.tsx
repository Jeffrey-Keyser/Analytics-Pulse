import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createAppStore } from '@jeffrey-keyser/redux-app-toolkit';
import { diagnosticsApi, projectsApi } from '../reducers';

/**
 * Creates a mock Redux store for testing
 */
export function createMockStore(preloadedState?: any) {
  return createAppStore({
    apis: {
      [diagnosticsApi.reducerPath]: diagnosticsApi,
      [projectsApi.reducerPath]: projectsApi,
    },
    preloadedState,
  }).store;
}

/**
 * Wrapper component that provides Redux store
 */
interface ReduxWrapperProps {
  children: React.ReactNode;
  store?: ReturnType<typeof createMockStore>;
}

export const ReduxWrapper: React.FC<ReduxWrapperProps> = ({
  children,
  store = createMockStore(),
}) => {
  return <Provider store={store}>{children}</Provider>;
};

/**
 * Custom render function with Redux store
 */
export const renderWithRedux = (
  ui: React.ReactElement,
  options: RenderOptions & {
    preloadedState?: any;
    store?: ReturnType<typeof createMockStore>;
  } = {}
) => {
  const { preloadedState, store, ...renderOptions } = options;
  const testStore = store || createMockStore(preloadedState);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ReduxWrapper store={testStore}>{children}</ReduxWrapper>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    store: testStore,
  };
};
