import { describe, it, expect } from "vitest";
import {
  defaultAuthConfig,
  defaultAuthTheme,
  defaultAuthCallbacks,
  templateAuthSettings,
  createAuthConfig,
  minimalAuthConfig,
  adminAuthConfig,
  ecommerceAuthConfig,
} from "../auth";

describe("Auth Configuration", () => {
  describe("defaultAuthConfig", () => {
    it("has correct default values", () => {
      expect(defaultAuthConfig).toEqual({
        payUrl: expect.any(String),
        debug: true, // Should be true in test environment
      });
    });

    it("uses environment variables for payUrl", () => {
      expect(defaultAuthConfig.payUrl).toBe("http://localhost:3001");
    });
  });

  describe("defaultAuthTheme", () => {
    it("has all required theme properties", () => {
      expect(defaultAuthTheme).toEqual({
        primaryColor: "#007bff",
        secondaryColor: "#6c757d",
        successColor: "#10b981",
        errorColor: "#ef4444",
        backgroundColor: "#ffffff",
        textColor: "#333333",
        borderRadius: "8px",
        fontFamily: expect.any(String),
        overlayColor: "rgba(0, 0, 0, 0.5)",
      });
    });

    it("uses system fonts", () => {
      expect(defaultAuthTheme.fontFamily).toContain("system-ui");
    });
  });

  describe("defaultAuthCallbacks", () => {
    it("has all required callback functions", () => {
      expect(typeof defaultAuthCallbacks.onLoginSuccess).toBe("function");
      expect(typeof defaultAuthCallbacks.onRegisterSuccess).toBe("function");
      expect(typeof defaultAuthCallbacks.onLogoutSuccess).toBe("function");
      expect(typeof defaultAuthCallbacks.onLoginError).toBe("function");
      expect(typeof defaultAuthCallbacks.onRegisterError).toBe("function");
      expect(typeof defaultAuthCallbacks.onModalOpen).toBe("function");
      expect(typeof defaultAuthCallbacks.onModalClose).toBe("function");
    });

    it("callbacks do not throw errors", () => {
      const mockUser = { id: "1", email: "test@example.com" };

      expect(() =>
        defaultAuthCallbacks.onLoginSuccess?.(mockUser as any)
      ).not.toThrow();
      expect(() =>
        defaultAuthCallbacks.onRegisterSuccess?.(mockUser as any)
      ).not.toThrow();
      expect(() => defaultAuthCallbacks.onLogoutSuccess?.()).not.toThrow();
      expect(() => defaultAuthCallbacks.onLoginError?.("error")).not.toThrow();
      expect(() =>
        defaultAuthCallbacks.onRegisterError?.("error")
      ).not.toThrow();
      expect(() => defaultAuthCallbacks.onModalOpen?.("login")).not.toThrow();
      expect(() => defaultAuthCallbacks.onModalClose?.()).not.toThrow();
    });
  });

  describe("templateAuthSettings", () => {
    it("has all required sections", () => {
      expect(templateAuthSettings).toHaveProperty("provider");
      expect(templateAuthSettings).toHaveProperty("theme");
      expect(templateAuthSettings).toHaveProperty("callbacks");
      expect(templateAuthSettings).toHaveProperty("modal");
      expect(templateAuthSettings).toHaveProperty("button");
    });

    it("has correct modal settings", () => {
      expect(templateAuthSettings.modal).toEqual({
        autoClose: true,
        showSocialLogin: false,
        title: undefined,
        subtitle: undefined,
      });
    });

    it("has correct button settings", () => {
      expect(templateAuthSettings.button).toEqual({
        loginText: "Login / Register",
        profileText: "Profile",
        loadingText: "Loading...",
        variant: "primary",
        size: "medium",
        showUserInfo: false,
      });
    });
  });

  describe("createAuthConfig", () => {
    it("creates config with defaults when no overrides provided", () => {
      const config = createAuthConfig({});

      expect(config.provider).toEqual(defaultAuthConfig);
      expect(config.theme).toEqual(defaultAuthTheme);
      expect(config.callbacks).toEqual(defaultAuthCallbacks);
      expect(config.modal).toEqual(templateAuthSettings.modal);
      expect(config.button).toEqual(templateAuthSettings.button);
    });

    it("merges provider overrides correctly", () => {
      const config = createAuthConfig({
        provider: {
          payUrl: "https://custom.com",
          debug: false,
        },
      });

      expect(config.provider.payUrl).toBe("https://custom.com");
      expect(config.provider.debug).toBe(false);
    });

    it("merges theme overrides correctly", () => {
      const config = createAuthConfig({
        theme: {
          primaryColor: "#ff0000",
          borderRadius: "12px",
        },
      });

      expect(config.theme.primaryColor).toBe("#ff0000");
      expect(config.theme.borderRadius).toBe("12px");
      expect(config.theme.secondaryColor).toBe(defaultAuthTheme.secondaryColor);
    });

    it("merges callback overrides correctly", () => {
      const customCallback = () => console.log("custom");
      const config = createAuthConfig({
        callbacks: {
          onLoginSuccess: customCallback,
        },
      });

      expect(config.callbacks.onLoginSuccess).toBe(customCallback);
      expect(config.callbacks.onLogoutSuccess).toBe(
        defaultAuthCallbacks.onLogoutSuccess
      );
    });

    it("merges modal overrides correctly", () => {
      const config = createAuthConfig({
        modal: {
          autoClose: false,
          title: "Custom Title",
        },
      });

      expect(config.modal.autoClose).toBe(false);
      expect(config.modal.title).toBe("Custom Title");
      expect(config.modal.showSocialLogin).toBe(false);
    });

    it("merges button overrides correctly", () => {
      const config = createAuthConfig({
        button: {
          variant: "outline",
          size: "large",
        },
      });

      expect(config.button.variant).toBe("outline");
      expect(config.button.size).toBe("large");
      expect(config.button.loginText).toBe("Login / Register");
    });

    it("handles partial overrides without affecting other properties", () => {
      const config = createAuthConfig({
        theme: {
          primaryColor: "#custom",
        },
      });

      expect(config.theme.primaryColor).toBe("#custom");
      expect(config.theme.secondaryColor).toBe(defaultAuthTheme.secondaryColor);
      expect(config.provider).toEqual(defaultAuthConfig);
      expect(config.button).toEqual(templateAuthSettings.button);
    });
  });

  describe("pre-built configurations", () => {
    describe("minimalAuthConfig", () => {
      it("has minimal button configuration", () => {
        expect(minimalAuthConfig.button.loginText).toBe("Sign In");
        expect(minimalAuthConfig.button.profileText).toBe("Account");
        expect(minimalAuthConfig.button.variant).toBe("outline");
        expect(minimalAuthConfig.button.size).toBe("small");
        expect(minimalAuthConfig.button.showUserInfo).toBe(false);
      });

      it("has minimal modal configuration", () => {
        expect(minimalAuthConfig.modal.autoClose).toBe(true);
        expect(minimalAuthConfig.modal.showSocialLogin).toBe(false);
      });

      it("inherits default theme and provider settings", () => {
        expect(minimalAuthConfig.theme).toEqual(defaultAuthTheme);
        expect(minimalAuthConfig.provider).toEqual(defaultAuthConfig);
      });
    });

    describe("adminAuthConfig", () => {
      it("has admin-specific button configuration", () => {
        expect(adminAuthConfig.button.loginText).toBe("Admin Login");
        expect(adminAuthConfig.button.profileText).toBe("Admin Profile");
        expect(adminAuthConfig.button.loadingText).toBe("Authenticating...");
        expect(adminAuthConfig.button.showUserInfo).toBe(true);
      });

      it("has admin-specific theme colors", () => {
        expect(adminAuthConfig.theme.primaryColor).toBe("#dc3545");
        expect(adminAuthConfig.theme.successColor).toBe("#28a745");
      });

      it("inherits other default settings", () => {
        expect(adminAuthConfig.provider).toEqual(defaultAuthConfig);
        expect(adminAuthConfig.modal.autoClose).toBe(true);
      });
    });

    describe("ecommerceAuthConfig", () => {
      it("has e-commerce specific theme", () => {
        expect(ecommerceAuthConfig.theme.primaryColor).toBe("#28a745");
        expect(ecommerceAuthConfig.theme.borderRadius).toBe("4px");
        expect(ecommerceAuthConfig.theme.fontFamily).toBe(
          '"Helvetica Neue", Arial, sans-serif'
        );
      });

      it("has e-commerce specific button configuration", () => {
        expect(ecommerceAuthConfig.button.loginText).toBe("Sign In to Shop");
        expect(ecommerceAuthConfig.button.profileText).toBe("My Account");
        expect(ecommerceAuthConfig.button.loadingText).toBe("Please wait...");
        expect(ecommerceAuthConfig.button.size).toBe("large");
      });

      it("inherits other default settings", () => {
        expect(ecommerceAuthConfig.provider).toEqual(defaultAuthConfig);
        expect(ecommerceAuthConfig.callbacks).toEqual(defaultAuthCallbacks);
      });
    });
  });

  describe("configuration validation", () => {
    it("all configurations have required properties", () => {
      const configs = [
        templateAuthSettings,
        minimalAuthConfig,
        adminAuthConfig,
        ecommerceAuthConfig,
      ];

      configs.forEach((config) => {
        expect(config).toHaveProperty("provider");
        expect(config).toHaveProperty("theme");
        expect(config).toHaveProperty("callbacks");
        expect(config).toHaveProperty("modal");
        expect(config).toHaveProperty("button");

        // Validate provider
        expect(config.provider).toHaveProperty("payUrl");
        expect(config.provider).toHaveProperty("debug");

        // Validate theme
        expect(config.theme).toHaveProperty("primaryColor");
        expect(config.theme).toHaveProperty("backgroundColor");

        // Validate callbacks
        expect(typeof config.callbacks.onLoginSuccess).toBe("function");
        expect(typeof config.callbacks.onLogoutSuccess).toBe("function");

        // Validate modal
        expect(typeof config.modal.autoClose).toBe("boolean");
        expect(typeof config.modal.showSocialLogin).toBe("boolean");

        // Validate button
        expect(config.button).toHaveProperty("loginText");
        expect(config.button).toHaveProperty("profileText");
        expect(["primary", "secondary", "outline", "ghost"]).toContain(
          config.button.variant
        );
        expect(["small", "medium", "large"]).toContain(config.button.size);
      });
    });
  });
});
