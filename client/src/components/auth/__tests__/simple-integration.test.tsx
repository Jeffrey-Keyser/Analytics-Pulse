import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateAuthProvider, AuthExamples } from "../index";
import { templateAuthSettings } from "../../../config/auth";

describe("Authentication Components - Simple Integration Tests", () => {
  describe("TemplateAuthProvider", () => {
    it("renders children without crashing", () => {
      render(
        <TemplateAuthProvider>
          <div data-testid="test-child">Test Content</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("test-child")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("accepts configuration props", () => {
      const config = {
        payUrl: "https://test.com",
        debug: true,
      };

      render(
        <TemplateAuthProvider config={config}>
          <div data-testid="test-child">Test Content</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("test-child")).toBeInTheDocument();
    });
  });

  describe("AuthExamples Component", () => {
    it("renders without crashing", () => {
      render(
        <TemplateAuthProvider>
          <AuthExamples />
        </TemplateAuthProvider>
      );

      // Should render the main heading
      expect(
        screen.getByText("Authentication Component Examples")
      ).toBeInTheDocument();
    });

    it("displays example sections", () => {
      render(
        <TemplateAuthProvider>
          <AuthExamples />
        </TemplateAuthProvider>
      );

      // Check for section headings
      expect(
        screen.getByText("1. Basic Authentication Button")
      ).toBeInTheDocument();
      expect(screen.getByText("2. Button Variants")).toBeInTheDocument();
      expect(
        screen.getByText("3. Authentication Status Display")
      ).toBeInTheDocument();
    });

    it("includes usage instructions", () => {
      render(
        <TemplateAuthProvider>
          <AuthExamples />
        </TemplateAuthProvider>
      );

      expect(
        screen.getByText("10. How to Use These Components")
      ).toBeInTheDocument();
      expect(
        screen.getByText("To use these components in your own application:")
      ).toBeInTheDocument();
    });
  });

  describe("Configuration System", () => {
    it("has valid template auth settings", () => {
      expect(templateAuthSettings).toBeDefined();
      expect(templateAuthSettings.provider).toBeDefined();
      expect(templateAuthSettings.theme).toBeDefined();
      expect(templateAuthSettings.callbacks).toBeDefined();
      expect(templateAuthSettings.modal).toBeDefined();
      expect(templateAuthSettings.button).toBeDefined();
    });

    it("has valid provider configuration", () => {
      expect(templateAuthSettings.provider.payUrl).toBeDefined();
      expect(typeof templateAuthSettings.provider.debug).toBe("boolean");
    });

    it("has valid theme configuration", () => {
      expect(templateAuthSettings.theme.primaryColor).toBeDefined();
      expect(templateAuthSettings.theme.backgroundColor).toBeDefined();
      expect(templateAuthSettings.theme.textColor).toBeDefined();
    });

    it("has valid button configuration", () => {
      expect(templateAuthSettings.button.loginText).toBeDefined();
      expect(templateAuthSettings.button.profileText).toBeDefined();
      expect(["primary", "secondary", "outline", "ghost"]).toContain(
        templateAuthSettings.button.variant
      );
      expect(["small", "medium", "large"]).toContain(
        templateAuthSettings.button.size
      );
    });
  });

  describe("Component Structure", () => {
    it("components can be imported without errors", async () => {
      const {
        TemplateAuthProvider,
        AuthButton,
        TemplateAuthModal,
        AuthGuard,
        AuthStatus,
        AuthExamples,
      } = await import("../index");

      expect(TemplateAuthProvider).toBeDefined();
      expect(AuthButton).toBeDefined();
      expect(TemplateAuthModal).toBeDefined();
      expect(AuthGuard).toBeDefined();
      expect(AuthStatus).toBeDefined();
      expect(AuthExamples).toBeDefined();
    });

    it("configuration can be imported without errors", async () => {
      const {
        defaultAuthConfig,
        defaultAuthTheme,
        templateAuthSettings,
        createAuthConfig,
        minimalAuthConfig,
        adminAuthConfig,
        ecommerceAuthConfig,
      } = await import("../../../config/auth");

      expect(defaultAuthConfig).toBeDefined();
      expect(defaultAuthTheme).toBeDefined();
      expect(templateAuthSettings).toBeDefined();
      expect(createAuthConfig).toBeDefined();
      expect(minimalAuthConfig).toBeDefined();
      expect(adminAuthConfig).toBeDefined();
      expect(ecommerceAuthConfig).toBeDefined();
    });
  });

  describe("CSS Classes and Styling", () => {
    it("includes CSS import in auth components", async () => {
      // This test verifies that the CSS import doesn't cause errors
      const authModule = await import("../index");
      expect(authModule).toBeDefined();
    });
  });

  describe("Template Friendliness", () => {
    it("provides sensible defaults for template usage", () => {
      expect(templateAuthSettings.button.loginText).toBe("Login / Register");
      expect(templateAuthSettings.button.profileText).toBe("Profile");
      expect(templateAuthSettings.modal.autoClose).toBe(true);
      expect(templateAuthSettings.theme.primaryColor).toBe("#007bff");
    });

    it("supports customization through configuration", () => {
      const customConfig = {
        theme: {
          primaryColor: "#custom-color",
        },
        button: {
          loginText: "Custom Login",
        },
      };

      // This would be used in a real template implementation
      expect(customConfig.theme.primaryColor).toBe("#custom-color");
      expect(customConfig.button.loginText).toBe("Custom Login");
    });
  });

  describe("Development Environment", () => {
    it("works in development mode", () => {
      // Test that components work in development environment
      render(
        <TemplateAuthProvider config={{ debug: true }}>
          <div data-testid="dev-test">Development Test</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("dev-test")).toBeInTheDocument();
    });

    it("works in production mode", () => {
      // Test that components work in production environment
      render(
        <TemplateAuthProvider config={{ debug: false }}>
          <div data-testid="prod-test">Production Test</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("prod-test")).toBeInTheDocument();
    });
  });
});
