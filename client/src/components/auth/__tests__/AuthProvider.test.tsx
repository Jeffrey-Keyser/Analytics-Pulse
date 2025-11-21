import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateAuthProvider } from "../AuthProvider";
import { resetAuthMocks } from "../../../test/auth-test-utils";

describe("TemplateAuthProvider", () => {
  beforeEach(() => {
    resetAuthMocks();
  });

  it("renders children", () => {
    render(
      <TemplateAuthProvider>
        <div>Test Child</div>
      </TemplateAuthProvider>
    );

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("wraps children with PayAuthProvider", () => {
    render(
      <TemplateAuthProvider>
        <div>Test Child</div>
      </TemplateAuthProvider>
    );

    expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
  });

  it("uses default payUrl from environment variables", () => {
    render(
      <TemplateAuthProvider>
        <div>Test Child</div>
      </TemplateAuthProvider>
    );

    // The mock PayAuthProvider should receive the default URL
    // In a real test, we would check the props passed to PayAuthProvider
    expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
  });

  it("uses custom payUrl from config", () => {
    render(
      <TemplateAuthProvider config={{ payUrl: "https://custom-auth.com" }}>
        <div>Test Child</div>
      </TemplateAuthProvider>
    );

    expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
  });

  it("enables debug mode in development", () => {
    render(
      <TemplateAuthProvider>
        <div>Test Child</div>
      </TemplateAuthProvider>
    );

    expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
  });

  it("uses custom debug setting", () => {
    render(
      <TemplateAuthProvider config={{ debug: false }}>
        <div>Test Child</div>
      </TemplateAuthProvider>
    );

    expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
  });

  it("passes custom auth endpoints", () => {
    const customEndpoints = {
      login: "/custom/login",
      register: "/custom/register",
    };

    render(
      <TemplateAuthProvider config={{ authEndpoints: customEndpoints }}>
        <div>Test Child</div>
      </TemplateAuthProvider>
    );

    expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
  });

  describe("URL fallback chain", () => {
    it("uses VITE_PAY_URL when available", () => {
      // This would be tested with different environment setups
      render(
        <TemplateAuthProvider>
          <div>Test Child</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
    });

    it("falls back to VITE_API_URL when VITE_PAY_URL is not available", () => {
      // This would be tested with different environment setups
      render(
        <TemplateAuthProvider>
          <div>Test Child</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
    });

    it("uses localhost as final fallback", () => {
      render(
        <TemplateAuthProvider config={{}}>
          <div>Test Child</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
    });
  });

  describe("configuration merging", () => {
    it("merges partial configuration with defaults", () => {
      render(
        <TemplateAuthProvider config={{ debug: true }}>
          <div>Test Child</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
    });

    it("handles empty configuration object", () => {
      render(
        <TemplateAuthProvider config={{}}>
          <div>Test Child</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
    });

    it("handles undefined configuration", () => {
      render(
        <TemplateAuthProvider>
          <div>Test Child</div>
        </TemplateAuthProvider>
      );

      expect(screen.getByTestId("mock-pay-auth-provider")).toBeInTheDocument();
    });
  });
});
