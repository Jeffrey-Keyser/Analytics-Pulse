import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import {
  TemplateAuthProvider,
  AuthButton,
  TemplateAuthModal,
  AuthGuard,
  AuthStatus,
} from "../index";
import {
  renderWithAuth,
  createMockAuthState,
  mockUser,
  setModalState,
  resetAuthMocks,
} from "../../../test/auth-test-utils";

describe("Authentication Components Integration", () => {
  const mockOpenModal = vi.fn();
  const mockCloseModal = vi.fn();

  beforeEach(() => {
    resetAuthMocks();
    setModalState(false, mockOpenModal, mockCloseModal);
  });

  describe("AuthButton + TemplateAuthModal integration", () => {
    it("opens modal when button is clicked", () => {
      renderWithAuth(
        <div>
          <AuthButton />
          <TemplateAuthModal />
        </div>,
        { authState: createMockAuthState({ isAuthenticated: false }) }
      );

      fireEvent.click(screen.getByText("Login / Register"));
      expect(mockOpenModal).toHaveBeenCalledWith("login");
    });

    it("opens profile modal when authenticated user clicks button", () => {
      renderWithAuth(
        <div>
          <AuthButton />
          <TemplateAuthModal />
        </div>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      fireEvent.click(screen.getByText("Profile"));
      expect(mockOpenModal).toHaveBeenCalledWith("profile");
    });
  });

  describe("AuthGuard + AuthButton integration", () => {
    it("shows login button in guard when unauthenticated", () => {
      renderWithAuth(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { authState: createMockAuthState({ isAuthenticated: false }) }
      );

      const loginButton = screen.getByText("Login");
      expect(loginButton).toBeInTheDocument();

      fireEvent.click(loginButton);
      expect(mockOpenModal).toHaveBeenCalledWith("login");
    });

    it("shows protected content when authenticated", () => {
      renderWithAuth(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
      expect(screen.queryByText("Login")).not.toBeInTheDocument();
    });
  });

  describe("AuthStatus + AuthButton consistency", () => {
    it("shows consistent authentication state", () => {
      renderWithAuth(
        <div>
          <AuthButton />
          <AuthStatus />
        </div>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      // Both components should reflect authenticated state
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Authenticated")).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it("shows consistent loading state", () => {
      renderWithAuth(
        <div>
          <AuthButton />
          <AuthStatus />
        </div>,
        { authState: createMockAuthState({ isLoading: true }) }
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(
        screen.getByText("Loading authentication status...")
      ).toBeInTheDocument();
    });
  });

  describe("Complete authentication flow simulation", () => {
    it("handles unauthenticated to authenticated transition", async () => {
      const { rerender } = renderWithAuth(
        <div>
          <AuthButton />
          <AuthStatus />
          <AuthGuard>
            <div>Dashboard Content</div>
          </AuthGuard>
        </div>,
        { authState: createMockAuthState({ isAuthenticated: false }) }
      );

      // Initial unauthenticated state
      expect(screen.getByText("Login / Register")).toBeInTheDocument();
      expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
      expect(screen.getByText("Authentication Required")).toBeInTheDocument();
      expect(screen.queryByText("Dashboard Content")).not.toBeInTheDocument();

      // Simulate authentication
      rerender(
        <div>
          <AuthButton />
          <AuthStatus />
          <AuthGuard>
            <div>Dashboard Content</div>
          </AuthGuard>
        </div>
      );

      // Update mock to authenticated state
      renderWithAuth(
        <div>
          <AuthButton />
          <AuthStatus />
          <AuthGuard>
            <div>Dashboard Content</div>
          </AuthGuard>
        </div>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      // Authenticated state
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Authenticated")).toBeInTheDocument();
      expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
    });
  });

  describe("Role-based access with status display", () => {
    it("shows role information consistently", () => {
      renderWithAuth(
        <div>
          <AuthStatus showRoles={true} />
          <AuthGuard requiredRoles={["user"]}>
            <div>User Content</div>
          </AuthGuard>
        </div>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("user")).toBeInTheDocument();
      expect(screen.getByText("User Content")).toBeInTheDocument();
    });

    it("shows access denied for insufficient roles", () => {
      renderWithAuth(
        <div>
          <AuthStatus showRoles={true} />
          <AuthGuard requiredRoles={["admin"]}>
            <div>Admin Content</div>
          </AuthGuard>
        </div>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("user")).toBeInTheDocument();
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.getByText("Required roles: admin")).toBeInTheDocument();
      expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    });
  });

  describe("Multiple components with different configurations", () => {
    it("handles multiple auth buttons with different variants", () => {
      renderWithAuth(
        <div>
          <AuthButton variant="primary" loginText="Primary Login" />
          <AuthButton variant="outline" loginText="Outline Login" />
          <AuthButton variant="ghost" loginText="Ghost Login" />
        </div>,
        { authState: createMockAuthState({ isAuthenticated: false }) }
      );

      expect(screen.getByText("Primary Login")).toBeInTheDocument();
      expect(screen.getByText("Outline Login")).toBeInTheDocument();
      expect(screen.getByText("Ghost Login")).toBeInTheDocument();

      // All buttons should open login modal
      fireEvent.click(screen.getByText("Primary Login"));
      expect(mockOpenModal).toHaveBeenCalledWith("login");
    });

    it("handles multiple auth guards with different requirements", () => {
      renderWithAuth(
        <div>
          <AuthGuard>
            <div>Basic Protected Content</div>
          </AuthGuard>
          <AuthGuard requiredRoles={["admin"]}>
            <div>Admin Protected Content</div>
          </AuthGuard>
          <AuthGuard requiredPermissions={["read:profile"]}>
            <div>Permission Protected Content</div>
          </AuthGuard>
        </div>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("Basic Protected Content")).toBeInTheDocument();
      expect(
        screen.getByText("Permission Protected Content")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Admin Protected Content")
      ).not.toBeInTheDocument();
    });
  });

  describe("Error handling and edge cases", () => {
    it("handles authentication errors gracefully", () => {
      renderWithAuth(
        <div>
          <AuthButton />
          <AuthStatus />
        </div>,
        {
          authState: createMockAuthState({ isAuthenticated: true, user: null }),
        }
      );

      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("User data unavailable")).toBeInTheDocument();
    });

    it("handles loading states consistently", () => {
      renderWithAuth(
        <div>
          <AuthButton />
          <AuthStatus />
          <AuthGuard>
            <div>Protected Content</div>
          </AuthGuard>
        </div>,
        { authState: createMockAuthState({ isLoading: true }) }
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(
        screen.getByText("Loading authentication status...")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Checking authentication...")
      ).toBeInTheDocument();
    });
  });

  describe("Provider integration", () => {
    it("works with TemplateAuthProvider wrapper", () => {
      const TestComponent = () => (
        <TemplateAuthProvider config={{ debug: true }}>
          <AuthButton />
          <AuthStatus />
        </TemplateAuthProvider>
      );

      renderWithAuth(<TestComponent />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Authenticated")).toBeInTheDocument();
    });
  });
});
