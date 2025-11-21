import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { vi } from "vitest";

// Mock user data for testing
export const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  roles: ["user"],
  permissions: ["read:profile"],
  firstName: "Test",
  lastName: "User",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

export const mockAdminUser = {
  ...mockUser,
  id: "admin-user-123",
  email: "admin@example.com",
  roles: ["admin", "user"],
  permissions: ["read:profile", "write:users", "read:sensitive_data"],
};

// Mock authentication states
export const createMockAuthState = (
  overrides: Partial<{
    isAuthenticated: boolean;
    user: any;
    isLoading: boolean;
  }> = {}
) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  ...overrides,
});

// Create mock functions
export const mockUsePayAuth = vi.fn();
export const mockUseAuthModal = vi.fn();

// Mock the Pay auth integration module
vi.mock("@jeffrey-keyser/pay-auth-integration/client/react", () => ({
  usePayAuth: mockUsePayAuth,
  useAuthModal: mockUseAuthModal,
  PayAuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-pay-auth-provider">{children}</div>
  ),
  AuthModal: ({ isOpen, onClose, children }: any) =>
    isOpen ? (
      <div data-testid="mock-auth-modal">
        <button onClick={onClose} data-testid="close-modal">
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  authState?: ReturnType<typeof createMockAuthState>;
}

export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  authState = createMockAuthState(),
}) => {
  // Set up the mock before rendering
  mockUsePayAuth.mockReturnValue(authState);

  return <div data-testid="test-wrapper">{children}</div>;
};

// Custom render function with authentication context
export const renderWithAuth = (
  ui: React.ReactElement,
  options: RenderOptions & {
    authState?: ReturnType<typeof createMockAuthState>;
  } = {}
) => {
  const { authState, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper authState={authState}>{children}</TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper to simulate authentication state changes
export const setAuthState = (state: ReturnType<typeof createMockAuthState>) => {
  mockUsePayAuth.mockReturnValue(state);
};

// Helper to simulate modal state changes
export const setModalState = (
  isOpen: boolean,
  openModal = vi.fn(),
  closeModal = vi.fn()
) => {
  mockUseAuthModal.mockReturnValue({
    isOpen,
    openModal,
    closeModal,
  });
};

// Reset all mocks
export const resetAuthMocks = () => {
  mockUsePayAuth.mockReset();
  mockUseAuthModal.mockReset();
  vi.clearAllMocks();

  // Set default return values
  mockUsePayAuth.mockReturnValue(createMockAuthState());
  mockUseAuthModal.mockReturnValue({
    isOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
  });
};
