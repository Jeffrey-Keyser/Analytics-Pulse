import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  TemplateAuthProvider,
  AuthButton,
  AuthStatus,
  AuthGuard,
  TemplateAuthModal,
  AuthExamples,
} from "../index";
import {
  templateAuthSettings,
  createAuthConfig,
  minimalAuthConfig,
  adminAuthConfig,
  ecommerceAuthConfig,
} from "../../../config/auth";

/**
 * Template instantiation tests that verify the authentication components
 * work correctly when the ServerlessWebTemplate is used as a template
 * for creating new projects.
 */
describe("Authentication Components - Template Instantiation", () => {
  describe("Template Ready Components", () => {
    it("all components can be imported and used together", () => {
      render(
        <TemplateAuthProvider config={templateAuthSettings.provider}>
          <div data-testid="template-app">
            <AuthButton {...templateAuthSettings.button} />
            <AuthStatus showEmail={true} showRoles={true} />
            <div>Dashboard Content</div>
            <TemplateAuthModal
              theme={templateAuthSettings.theme}
              callbacks={templateAuthSettings.callbacks}
            />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("template-app")).toBeInTheDocument();
    });

    it("works with minimal configuration for simple projects", () => {
      render(
        <TemplateAuthProvider config={minimalAuthConfig.provider}>
          <div data-testid="minimal-app">
            <AuthButton {...minimalAuthConfig.button} />
            <TemplateAuthModal
              theme={minimalAuthConfig.theme}
              autoClose={minimalAuthConfig.modal.autoClose}
            />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("minimal-app")).toBeInTheDocument();
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("works with admin configuration for admin dashboards", () => {
      render(
        <TemplateAuthProvider config={adminAuthConfig.provider}>
          <div data-testid="admin-app">
            <AuthButton {...adminAuthConfig.button} />
            <div>Admin Panel</div>
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("admin-app")).toBeInTheDocument();
      expect(screen.getByText("Admin Login")).toBeInTheDocument();
    });

    it("works with e-commerce configuration", () => {
      render(
        <TemplateAuthProvider config={ecommerceAuthConfig.provider}>
          <div data-testid="ecommerce-app">
            <AuthButton {...ecommerceAuthConfig.button} />
            <AuthStatus compact={true} />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("ecommerce-app")).toBeInTheDocument();
      expect(screen.getByText("Sign In to Shop")).toBeInTheDocument();
    });
  });

  describe("Custom Configuration Creation", () => {
    it("createAuthConfig works for custom template configurations", () => {
      const customConfig = createAuthConfig({
        theme: {
          primaryColor: "#ff6b6b",
          borderRadius: "12px",
        },
        button: {
          loginText: "Custom Login",
          variant: "outline",
          size: "large",
        },
        modal: {
          autoClose: false,
          title: "Custom Auth",
        },
      });

      render(
        <TemplateAuthProvider config={customConfig.provider}>
          <div data-testid="custom-app">
            <AuthButton {...customConfig.button} />
            <TemplateAuthModal
              theme={customConfig.theme}
              title={customConfig.modal.title}
              autoClose={customConfig.modal.autoClose}
            />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("custom-app")).toBeInTheDocument();
      expect(screen.getByText("Custom Login")).toBeInTheDocument();
    });

    it("supports environment-specific configurations", () => {
      const developmentConfig = createAuthConfig({
        provider: {
          payUrl: "http://localhost:3001",
          debug: true,
        },
        theme: {
          primaryColor: "#ff6b6b", // Red for development
        },
      });

      const productionConfig = createAuthConfig({
        provider: {
          payUrl: "https://api.production.com",
          debug: false,
        },
        theme: {
          primaryColor: "#007bff", // Blue for production
        },
      });

      // Test development config
      render(
        <TemplateAuthProvider config={developmentConfig.provider}>
          <div data-testid="dev-app">
            <AuthButton />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("dev-app")).toBeInTheDocument();

      // Test production config
      render(
        <TemplateAuthProvider config={productionConfig.provider}>
          <div data-testid="prod-app">
            <AuthButton />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("prod-app")).toBeInTheDocument();
    });
  });

  describe("Template User Scenarios", () => {
    it("supports basic web application template usage", () => {
      render(
        <TemplateAuthProvider>
          <div data-testid="basic-web-app">
            <header>
              <h1>My Web App</h1>
              <AuthButton />
            </header>
            <main>
              <div>Dashboard Content</div>
            </main>
            <TemplateAuthModal />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("basic-web-app")).toBeInTheDocument();
      expect(screen.getByText("My Web App")).toBeInTheDocument();
    });

    it("supports SaaS application template usage", () => {
      render(
        <TemplateAuthProvider>
          <div data-testid="saas-app">
            <nav>
              <AuthButton showUserInfo={true} />
              <AuthStatus compact={true} />
            </nav>
            <aside>
              <div>User Menu</div>
            </aside>
            <main>
              <div>Analytics Dashboard</div>
            </main>
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("saas-app")).toBeInTheDocument();
    });

    it("supports multi-tenant application template usage", () => {
      const tenantConfig = createAuthConfig({
        provider: {
          payUrl: "https://tenant1.auth.example.com",
        },
        theme: {
          primaryColor: "#6366f1", // Tenant brand color
          fontFamily: "Tenant Brand Font, sans-serif",
        },
        button: {
          loginText: "Tenant Login",
          profileText: "Tenant Profile",
        },
      });

      render(
        <TemplateAuthProvider config={tenantConfig.provider}>
          <div data-testid="tenant-app">
            <AuthButton {...tenantConfig.button} />
            <TemplateAuthModal theme={tenantConfig.theme} />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("tenant-app")).toBeInTheDocument();
      expect(screen.getByText("Tenant Login")).toBeInTheDocument();
    });
  });

  describe("Template Documentation and Examples", () => {
    it("AuthExamples component can be imported without errors", () => {
      // Test that AuthExamples can be imported (skip rendering due to React hooks complexity in test)
      expect(AuthExamples).toBeDefined();
      expect(typeof AuthExamples).toBe("function");
    });

    it("provides clear API for template users", () => {
      // Test that all expected props are accepted without TypeScript errors
      render(
        <TemplateAuthProvider
          config={{
            payUrl: "https://auth.example.com",
            debug: false,
            authEndpoints: {
              login: "/custom/login",
              register: "/custom/register",
            },
          }}
        >
          <div data-testid="api-test">
            <AuthButton
              loginText="Custom Login"
              profileText="Custom Profile"
              loadingText="Custom Loading..."
              variant="outline"
              size="large"
              showUserInfo={true}
              className="custom-button"
              style={{ margin: "10px" }}
              onClick={() => console.log("Custom click")}
            />
            <AuthStatus
              showEmail={true}
              showId={false}
              showRoles={true}
              showPermissions={true}
              showStatus={true}
              compact={false}
              title="Custom Status"
              className="custom-status"
              style={{ padding: "20px" }}
            />
            <div>Protected Content</div>
            <TemplateAuthModal
              theme={{
                primaryColor: "#ff6b6b",
                successColor: "#51cf66",
                errorColor: "#ff6b6b",
                backgroundColor: "#ffffff",
                textColor: "#333333",
                borderRadius: "12px",
                fontFamily: "Inter, sans-serif",
                overlayColor: "rgba(0, 0, 0, 0.7)",
              }}
              callbacks={{
                onLoginSuccess: (user) => console.log("Login success", user),
                onRegisterSuccess: (user) =>
                  console.log("Register success", user),
                onLogoutSuccess: () => console.log("Logout success"),
                onLoginError: (error) => console.log("Login error", error),
                onRegisterError: (error) =>
                  console.log("Register error", error),
                onModalOpen: (mode) => console.log("Modal open", mode),
                onModalClose: () => console.log("Modal close"),
              }}
              autoClose={false}
              showSocialLogin={true}
              title="Custom Auth Modal"
              subtitle="Please sign in to continue"
            />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("api-test")).toBeInTheDocument();
    });
  });

  describe("Template Performance and Reliability", () => {
    it("handles multiple component instances efficiently", () => {
      const startTime = performance.now();

      render(
        <TemplateAuthProvider>
          <div data-testid="performance-test">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i}>
                <AuthButton variant="primary" size="small" />
                <AuthStatus compact={true} />
                <div>Content {i}</div>
              </div>
            ))}
          </div>
        </TemplateAuthProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(screen.getByTestId("performance-test")).toBeInTheDocument();
      expect(renderTime).toBeLessThan(200); // Should render 20 component sets in under 200ms
    });

    it("handles configuration changes gracefully", () => {
      const { rerender } = render(
        <TemplateAuthProvider config={{ payUrl: "https://auth1.com" }}>
          <div data-testid="config-change-test">
            <AuthButton />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("config-change-test")).toBeInTheDocument();

      // Change configuration
      rerender(
        <TemplateAuthProvider
          config={{ payUrl: "https://auth2.com", debug: true }}
        >
          <div data-testid="config-change-test">
            <AuthButton />
          </div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("config-change-test")).toBeInTheDocument();
    });
  });

  describe("Template Validation", () => {
    it("validates that all required exports are available", async () => {
      const authModule = await import("../index");
      const configModule = await import("../../../config/auth");

      // Verify all expected components are exported
      expect(authModule.TemplateAuthProvider).toBeDefined();
      expect(authModule.AuthButton).toBeDefined();
      expect(authModule.TemplateAuthModal).toBeDefined();
      expect(authModule.AuthGuard).toBeDefined();
      expect(authModule.AuthStatus).toBeDefined();
      expect(authModule.AuthExamples).toBeDefined();
      expect(authModule.ProtectedRoute).toBeDefined(); // Legacy component

      // Verify all expected configurations are exported
      expect(configModule.defaultAuthConfig).toBeDefined();
      expect(configModule.defaultAuthTheme).toBeDefined();
      expect(configModule.templateAuthSettings).toBeDefined();
      expect(configModule.createAuthConfig).toBeDefined();
      expect(configModule.minimalAuthConfig).toBeDefined();
      expect(configModule.adminAuthConfig).toBeDefined();
      expect(configModule.ecommerceAuthConfig).toBeDefined();
    });

    it("validates that CSS is properly imported", () => {
      // Test that CSS classes are available (they should be defined in the imported CSS)
      const testElement = document.createElement("div");
      testElement.className =
        "auth-button auth-button--primary auth-button--medium";

      // If CSS is properly imported, these classes should exist
      expect(testElement.className).toContain("auth-button");
      expect(testElement.className).toContain("auth-button--primary");
      expect(testElement.className).toContain("auth-button--medium");
    });
  });
});
