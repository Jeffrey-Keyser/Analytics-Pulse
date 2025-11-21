import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { AuthButton } from "../AuthButton";
import {
  renderWithAuth,
  createMockAuthState,
  mockUser,
  setModalState,
  resetAuthMocks,
} from "../../../test/auth-test-utils";

describe("AuthButton", () => {
  const mockOpenModal = vi.fn();

  beforeEach(() => {
    resetAuthMocks();
    setModalState(false, mockOpenModal, vi.fn());
  });

  describe("when user is not authenticated", () => {
    it("renders login text", () => {
      renderWithAuth(<AuthButton />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      expect(screen.getByText("Login / Register")).toBeInTheDocument();
    });

    it("renders custom login text", () => {
      renderWithAuth(<AuthButton loginText="Sign In" />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("opens login modal when clicked", () => {
      renderWithAuth(<AuthButton />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      fireEvent.click(screen.getByText("Login / Register"));
      expect(mockOpenModal).toHaveBeenCalledWith("login");
    });
  });

  describe("when user is authenticated", () => {
    it("renders profile text", () => {
      renderWithAuth(<AuthButton />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    it("renders custom profile text", () => {
      renderWithAuth(<AuthButton profileText="My Account" />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText("My Account")).toBeInTheDocument();
    });

    it("opens profile modal when clicked", () => {
      renderWithAuth(<AuthButton />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      fireEvent.click(screen.getByText("Profile"));
      expect(mockOpenModal).toHaveBeenCalledWith("profile");
    });

    it("shows user info when enabled", () => {
      renderWithAuth(<AuthButton showUserInfo={true} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
      expect(screen.getByText(mockUser.roles.join(", "))).toBeInTheDocument();
    });

    it("does not show user info when disabled", () => {
      renderWithAuth(<AuthButton showUserInfo={false} />, {
        authState: createMockAuthState({
          isAuthenticated: true,
          user: mockUser,
        }),
      });

      expect(screen.queryByText(mockUser.email)).not.toBeInTheDocument();
    });
  });

  describe("when loading", () => {
    it("renders loading text", () => {
      renderWithAuth(<AuthButton />, {
        authState: createMockAuthState({ isLoading: true }),
      });

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders custom loading text", () => {
      renderWithAuth(<AuthButton loadingText="Please wait..." />, {
        authState: createMockAuthState({ isLoading: true }),
      });

      expect(screen.getByText("Please wait...")).toBeInTheDocument();
    });

    it("disables button when loading", () => {
      renderWithAuth(<AuthButton />, {
        authState: createMockAuthState({ isLoading: true }),
      });

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("styling and variants", () => {
    it("applies correct CSS classes for primary variant", () => {
      renderWithAuth(<AuthButton variant="primary" size="medium" />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      const button = screen.getByRole("button");
      expect(button).toHaveClass(
        "auth-button",
        "auth-button--primary",
        "auth-button--medium"
      );
    });

    it("applies correct CSS classes for secondary variant", () => {
      renderWithAuth(<AuthButton variant="secondary" size="large" />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      const button = screen.getByRole("button");
      expect(button).toHaveClass(
        "auth-button",
        "auth-button--secondary",
        "auth-button--large"
      );
    });

    it("applies custom className", () => {
      renderWithAuth(<AuthButton className="custom-button" />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-button");
    });

    it("applies custom styles", () => {
      const customStyle = { backgroundColor: "red", color: "white" };
      renderWithAuth(<AuthButton style={customStyle} />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      const button = screen.getByRole("button");
      expect(button).toHaveStyle("background-color: red");
      expect(button).toHaveStyle("color: white");
    });
  });

  describe("custom click handler", () => {
    it("calls custom onClick handler", () => {
      const customClick = vi.fn();
      renderWithAuth(<AuthButton onClick={customClick} />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      fireEvent.click(screen.getByText("Login / Register"));
      expect(customClick).toHaveBeenCalled();
      expect(mockOpenModal).toHaveBeenCalledWith("login");
    });
  });

  describe("accessibility", () => {
    it("has proper button role", () => {
      renderWithAuth(<AuthButton />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("is keyboard accessible", () => {
      renderWithAuth(<AuthButton />, {
        authState: createMockAuthState({ isAuthenticated: false }),
      });

      const button = screen.getByRole("button");
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});
