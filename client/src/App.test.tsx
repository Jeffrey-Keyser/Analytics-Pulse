import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock the containers and pages
vi.mock('./pages', () => ({
  Dashboard: () => <div>Dashboard Page</div>,
  CreateProject: () => <div>Create Project Page</div>,
  ProjectDetail: () => <div>Project Detail Page</div>,
  RealtimeView: () => <div>Realtime View Page</div>,
  CustomEvents: () => <div>Custom Events Page</div>,
  ProjectSettings: () => <div>Project Settings Page</div>,
  ApiKeys: () => <div>API Keys Page</div>,
  NotFound: () => <div>Not Found Page</div>
}));

// Mock the components
vi.mock('./components', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AuthGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Breadcrumbs: () => <div>Breadcrumbs</div>
}));

// Mock the context
vi.mock('./contexts/GlobalAuthModalContext', () => ({
  GlobalAuthModalProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('App Routing', () => {
  it('renders Dashboard on root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders 404 page for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Not Found Page')).toBeInTheDocument();
  });

  it('renders CreateProject page', () => {
    render(
      <MemoryRouter initialEntries={['/projects/new']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Create Project Page')).toBeInTheDocument();
  });

  it('renders ProjectDetail page with ID param', () => {
    render(
      <MemoryRouter initialEntries={['/projects/123']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Project Detail Page')).toBeInTheDocument();
  });
});
