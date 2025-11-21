import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { AuthStatus } from "../AuthStatus";
import {
  renderWithAuth,
  createMockAuthState,
  mockUser,
  mockAdminUser,
  resetAuthMocks,
} from "../../../test/auth-test-utils";

describe("AuthStatus", () => {
  beforeEach(() => {
    resetAuthMocks();
  });

  describe("when loading", () => {
    it("shows loading state", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({ isLoading: true }),
      });

      expect(
        screen.getByText("Loading authentication status...")
      ).toBeInTheDocument();
    });

    it("applies loading CSS class", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({ isLoading: true }),
      });

      const container = screen.getByText(
        "Loading authentication status..."
      ).parentElement;
      expect(container).toHaveClass("auth-status--loading");
    });
  });

  describe("when not authenticated", () => {
    it("shows unauthenticated status", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      expect(screen.getByText("Authentication Status")).toBeInTheDocument();
      expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
    });

    it("applies unauthenticated CSS class", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      const container = screen.getByText("Authentication Status").parentElement;
      expect(container).toHaveClass("auth-status--unauthenticated");
    });

    it("hides title in compact mode", () => {
      renderWithAuth(<AuthStatus compact={true} />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      expect(
        screen.queryByText("Authentication Status")
      ).not.toBeInTheDocument();
      expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
    });
  });

  describe("when authenticated but no user data", () => {
    it("shows user data unavailable message", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({ isAuthenticated: true, user: null }),
      });

      expect(screen.getByText("User data unavailable")).toBeInTheDocument();
    });

    it("applies error CSS class", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({ isAuthenticated: true, user: null }),
      });

      const container = screen.getByText("Authentication Status").parentElement;
      expect(container).toHaveClass("auth-status--error");
    });
  });

  describe("when authenticated with user data", () => {
    it("shows authenticated status by default", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText("Authenticated")).toBeInTheDocument();
    });

    it("shows user email by default", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText("Email:")).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it("shows user roles by default", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText("Roles:")).toBeInTheDocument();
      expect(screen.getByText("user")).toBeInTheDocument();
    });

    it("hides user ID by default", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.queryByText("ID:")).not.toBeInTheDocument();
      expect(screen.queryByText(mockUser.id)).not.toBeInTheDocument();
    });

    it("hides permissions by default", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.queryByText("Permissions:")).not.toBeInTheDocument();
    });

    it("applies authenticated CSS class", () => {
      renderWithAuth(<AuthStatus />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      const container = screen.getByText("Authentication Status").parentElement;
      expect(container).toHaveClass("auth-status--authenticated");
    });
  });

  describe("configuration options", () => {
    it("shows user ID when enabled", () => {
      renderWithAuth(<AuthStatus showId={true} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText("ID:")).toBeInTheDocument();
      expect(screen.getByText(mockUser.id)).toBeInTheDocument();
    });

    it("hides user email when disabled", () => {
      renderWithAuth(<AuthStatus showEmail={false} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.queryByText("Email:")).not.toBeInTheDocument();
      expect(screen.queryByText(mockUser.email)).not.toBeInTheDocument();
    });

    it("hides user roles when disabled", () => {
      renderWithAuth(<AuthStatus showRoles={false} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.queryByText("Roles:")).not.toBeInTheDocument();
    });

    it("shows permissions when enabled", () => {
      renderWithAuth(<AuthStatus showPermissions={true} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText("Permissions:")).toBeInTheDocument();
      expect(screen.getByText("read:profile")).toBeInTheDocument();
    });

    it("hides authentication status when disabled", () => {
      renderWithAuth(<AuthStatus showStatus={false} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.queryByText("Authenticated")).not.toBeInTheDocument();
    });

    it("uses custom title", () => {
      renderWithAuth(<AuthStatus title="User Status" />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText("User Status")).toBeInTheDocument();
      expect(
        screen.queryByText("Authentication Status")
      ).not.toBeInTheDocument();
    });
  });

  describe("multiple roles and permissions", () => {
    it("displays multiple roles", () => {
      renderWithAuth(<AuthStatus showRoles={true} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockAdminUser,
        }),
      });

      expect(screen.getByText("admin")).toBeInTheDocument();
      expect(screen.getByText("user")).toBeInTheDocument();
    });

    it("displays multiple permissions", () => {
      renderWithAuth(<AuthStatus showPermissions={true} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockAdminUser,
        }),
      });

      expect(screen.getByText("read:profile")).toBeInTheDocument();
      expect(screen.getByText("write:users")).toBeInTheDocument();
      expect(screen.getByText("read:sensitive_data")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles user with empty roles array", () => {
      const userWithEmptyRoles = { ...mockUser, roles: [] };

      renderWithAuth(<AuthStatus showRoles={true} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: userWithEmptyRoles,
        }),
      });

      expect(screen.queryByText("Roles:")).not.toBeInTheDocument();
    });

    it("handles user with empty permissions array", () => {
      const userWithEmptyPermissions = { ...mockUser, permissions: [] };

      renderWithAuth(<AuthStatus showPermissions={true} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: userWithEmptyPermissions,
        }),
      });

      expect(screen.queryByText("Permissions:")).not.toBeInTheDocument();
    });

    it("handles user without roles property", () => {
      const userWithoutRoles = { ...mockUser, roles: undefined };

      renderWithAuth(<AuthStatus showRoles={true} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: userWithoutRoles,
        }),
      });

      expect(screen.queryByText("Roles:")).not.toBeInTheDocument();
    });

    it("handles user without permissions property", () => {
      const userWithoutPermissions = { ...mockUser, permissions: undefined };

      renderWithAuth(<AuthStatus showPermissions={true} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: userWithoutPermissions,
        }),
      });

      expect(screen.queryByText("Permissions:")).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies custom className", () => {
      renderWithAuth(<AuthStatus className="custom-status" />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      const container = screen.getByText("Authentication Status").parentElement;
      expect(container).toHaveClass("custom-status");
    });

    it("applies custom styles", () => {
      const customStyle = { backgroundColor: "blue", color: "white" };

      renderWithAuth(<AuthStatus style={customStyle} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      const container = screen.getByText("Authentication Status").parentElement;
      expect(container).toHaveStyle("background-color: blue");
      expect(container).toHaveStyle("color: white");
    });
  });
});
