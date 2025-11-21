import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AuthGuard } from "../AuthGuard";
import {
  renderWithAuth,
  createMockAuthState,
  mockUser,
  mockAdminUser,
  resetAuthMocks,
} from "../../../test/auth-test-utils";

describe("AuthGuard", () => {
  beforeEach(() => {
    resetAuthMocks();
  });

  describe("when loading", () => {
    it("shows loading state", () => {
      renderWithAuth(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { authState: createMockAuthState({ isLoading: true }) }
      );

      expect(
        screen.getByText("Checking authentication...")
      ).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("shows custom loading component", () => {
      const CustomLoading = () => <div>Custom Loading...</div>;

      renderWithAuth(
        <AuthGuard loadingComponent={CustomLoading}>
          <div>Protected Content</div>
        </AuthGuard>,
        { authState: createMockAuthState({ isLoading: true }) }
      );

      expect(screen.getByText("Custom Loading...")).toBeInTheDocument();
    });
  });

  describe("when not authenticated", () => {
    it("shows unauthenticated message", () => {
      renderWithAuth(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { authState: createMockAuthState({ isAuthenticated: false }) }
      );

      expect(screen.getByText("Authentication Required")).toBeInTheDocument();
      expect(
        screen.getByText("Please log in to access this content.")
      ).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("shows custom unauthenticated component", () => {
      const CustomUnauthenticated = () => <div>Please sign in</div>;

      renderWithAuth(
        <AuthGuard unauthenticatedComponent={CustomUnauthenticated}>
          <div>Protected Content</div>
        </AuthGuard>,
        { authState: createMockAuthState({ isAuthenticated: false }) }
      );

      expect(screen.getByText("Please sign in")).toBeInTheDocument();
    });

    it("shows login button", () => {
      renderWithAuth(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>,
        { authState: createMockAuthState({ isAuthenticated: false }) }
      );

      expect(screen.getByText("Login")).toBeInTheDocument();
    });
  });

  describe("when authenticated without role/permission requirements", () => {
    it("shows protected content", () => {
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
    });
  });

  describe("role-based access control", () => {
    it("allows access when user has required role", () => {
      renderWithAuth(
        <AuthGuard requiredRoles={["user"]}>
          <div>User Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("User Content")).toBeInTheDocument();
    });

    it("denies access when user lacks required role", () => {
      renderWithAuth(
        <AuthGuard requiredRoles={["admin"]}>
          <div>Admin Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.getByText("Required roles: admin")).toBeInTheDocument();
      expect(screen.getByText("Your roles: user")).toBeInTheDocument();
      expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    });

    it("allows access when user has one of multiple required roles", () => {
      renderWithAuth(
        <AuthGuard requiredRoles={["admin", "moderator"]}>
          <div>Admin/Moderator Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockAdminUser,
          }),
        }
      );

      expect(screen.getByText("Admin/Moderator Content")).toBeInTheDocument();
    });

    it("shows custom unauthorized component for role denial", () => {
      const CustomUnauthorized = () => <div>Insufficient privileges</div>;

      renderWithAuth(
        <AuthGuard
          requiredRoles={["admin"]}
          unauthorizedComponent={CustomUnauthorized}
        >
          <div>Admin Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("Insufficient privileges")).toBeInTheDocument();
    });
  });

  describe("permission-based access control", () => {
    it("allows access when user has required permission", () => {
      renderWithAuth(
        <AuthGuard requiredPermissions={["read:profile"]}>
          <div>Profile Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("Profile Content")).toBeInTheDocument();
    });

    it("denies access when user lacks required permission", () => {
      renderWithAuth(
        <AuthGuard requiredPermissions={["write:users"]}>
          <div>User Management</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText("Required permissions: write:users")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Your permissions: read:profile")
      ).toBeInTheDocument();
      expect(screen.queryByText("User Management")).not.toBeInTheDocument();
    });

    it("allows access when user has one of multiple required permissions", () => {
      renderWithAuth(
        <AuthGuard requiredPermissions={["read:sensitive_data", "write:users"]}>
          <div>Sensitive Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockAdminUser,
          }),
        }
      );

      expect(screen.getByText("Sensitive Content")).toBeInTheDocument();
    });
  });

  describe("combined role and permission requirements", () => {
    it("allows access when user meets both role and permission requirements", () => {
      renderWithAuth(
        <AuthGuard
          requiredRoles={["admin"]}
          requiredPermissions={["write:users"]}
        >
          <div>Admin User Management</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockAdminUser,
          }),
        }
      );

      expect(screen.getByText("Admin User Management")).toBeInTheDocument();
    });

    it("denies access when user meets role but not permission requirements", () => {
      const userWithAdminRole = {
        ...mockUser,
        roles: ["admin"],
        permissions: ["read:profile"], // Missing write:users permission
      };

      renderWithAuth(
        <AuthGuard
          requiredRoles={["admin"]}
          requiredPermissions={["write:users"]}
        >
          <div>Admin User Management</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: userWithAdminRole,
          }),
        }
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText("Required permissions: write:users")
      ).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles user without roles array", () => {
      const userWithoutRoles = { ...mockUser, roles: undefined };

      renderWithAuth(
        <AuthGuard requiredRoles={["user"]}>
          <div>User Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: userWithoutRoles,
          }),
        }
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });

    it("handles user without permissions array", () => {
      const userWithoutPermissions = { ...mockUser, permissions: undefined };

      renderWithAuth(
        <AuthGuard requiredPermissions={["read:profile"]}>
          <div>Profile Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: userWithoutPermissions,
          }),
        }
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });

    it("handles empty requirements arrays", () => {
      renderWithAuth(
        <AuthGuard requiredRoles={[]} requiredPermissions={[]}>
          <div>Open Content</div>
        </AuthGuard>,
        {
          authState: createMockAuthState({
            isAuthenticated: true,
            user: mockUser,
          }),
        }
      );

      expect(screen.getByText("Open Content")).toBeInTheDocument();
    });
  });

  describe("fallback content", () => {
    it("shows fallback when provided", () => {
      renderWithAuth(
        <AuthGuard fallback={<div>Fallback Content</div>}>
          <div>Protected Content</div>
        </AuthGuard>,
        { authState: createMockAuthState({ isAuthenticated: false }) }
      );

      // Should still show the default unauthenticated message, not fallback
      // Fallback is for when guard fails, not for unauthenticated state
      expect(screen.getByText("Authentication Required")).toBeInTheDocument();
    });
  });
});
