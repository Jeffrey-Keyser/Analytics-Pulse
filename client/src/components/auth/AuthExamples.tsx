import React from "react";
import { usePayAuth } from "@jeffrey-keyser/pay-auth-integration/client/react";
import { AuthButton, AuthGuard, AuthStatus } from "./index";

/**
 * Example component demonstrating different authentication patterns
 * Template users can reference this component to understand usage patterns
 */
export const AuthExamples: React.FC = () => {
  const { isAuthenticated } = usePayAuth();

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Authentication Component Examples</h2>
      <p>
        This page demonstrates the template-friendly authentication components.
      </p>

      {/* Basic Authentication Button */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>1. Basic Authentication Button</h3>
        <p>A smart button that adapts to authentication state:</p>
        <AuthButton />
      </section>

      {/* Button Variants */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>2. Button Variants</h3>
        <p>Different button styles for different use cases:</p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <AuthButton variant="primary" size="small" loginText="Primary" />
          <AuthButton variant="secondary" size="small" loginText="Secondary" />
          <AuthButton variant="outline" size="small" loginText="Outline" />
          <AuthButton variant="ghost" size="small" loginText="Ghost" />
        </div>
      </section>

      {/* Authentication Status */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>3. Authentication Status Display</h3>
        <p>Shows current authentication state and user information:</p>
        <AuthStatus
          showEmail={true}
          showRoles={true}
          showPermissions={true}
          compact={false}
        />
      </section>

      {/* Compact Status */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>4. Compact Status Display</h3>
        <p>A more compact version for headers or sidebars:</p>
        <AuthStatus
          showEmail={true}
          showRoles={false}
          showPermissions={false}
          compact={true}
        />
      </section>

      {/* Protected Content */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>5. Protected Content (Authentication Required)</h3>
        <p>Content that requires authentication to view:</p>
        <AuthGuard autoOpenLogin={false}>
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#e7f3ff",
              border: "1px solid #b3d9ff",
              borderRadius: "8px",
            }}
          >
            🎉 This content is only visible to authenticated users!
            <br />
            <small>
              You are logged in as:{" "}
              {isAuthenticated ? "authenticated user" : "not authenticated"}
            </small>
          </div>
        </AuthGuard>
      </section>

      {/* Role-based Content */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>6. Role-based Content (Admin Only)</h3>
        <p>Content that requires specific roles to view:</p>
        <AuthGuard requiredRoles={["admin"]} autoOpenLogin={false}>
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "8px",
            }}
          >
            🔐 This is admin-only content!
            <br />
            <small>Only users with 'admin' role can see this.</small>
          </div>
        </AuthGuard>
      </section>

      {/* Permission-based Content */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>7. Permission-based Content</h3>
        <p>Content that requires specific permissions to view:</p>
        <AuthGuard
          requiredPermissions={["read:sensitive_data"]}
          autoOpenLogin={false}
        >
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "8px",
            }}
          >
            🛡️ This content requires special permissions!
            <br />
            <small>
              Only users with 'read:sensitive_data' permission can see this.
            </small>
          </div>
        </AuthGuard>
      </section>

      {/* Button with User Info */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>8. Button with User Information</h3>
        <p>Authentication button that shows user details when logged in:</p>
        <AuthButton showUserInfo={true} variant="outline" size="large" />
      </section>

      {/* Custom Styled Components */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>9. Custom Styled Components</h3>
        <p>Components with custom styling:</p>
        <AuthButton
          className="custom-auth-button"
          style={{
            background: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
            border: "none",
            borderRadius: "25px",
            color: "white",
            fontWeight: "bold",
            padding: "0.75rem 1.5rem",
          }}
          loginText="Custom Styled Login"
          profileText="Custom Profile"
        />
      </section>

      {/* Usage Instructions */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>11. How to Use These Components</h3>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
          }}
        >
          <p>
            <strong>To use these components in your own application:</strong>
          </p>
          <ol>
            <li>
              Import the components you need from <code>./components/auth</code>
            </li>
            <li>
              Customize the configuration in <code>./config/auth.ts</code>
            </li>
            <li>Add the components to your JSX</li>
            <li>Style them with CSS classes or inline styles</li>
          </ol>
          <p>
            <strong>Example:</strong>
          </p>
          <pre
            style={{
              backgroundColor: "#f1f3f4",
              padding: "0.5rem",
              borderRadius: "4px",
              fontSize: "0.875rem",
              overflow: "auto",
            }}
          >
            {`import { AuthButton, AuthGuard } from './components/auth';

function MyComponent() {
  return (
    <div>
      <AuthButton variant="primary" />
      <AuthGuard requiredRoles={['user']}>
        <ProtectedContent />
      </AuthGuard>
    </div>
  );
}`}
          </pre>
        </div>
      </section>

      {/* Note: Authentication modal is provided globally by GlobalAuthModalProvider */}
      <section style={{ marginBottom: "2rem" }}>
        <h3>10. Global Authentication Modal</h3>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#e7f3ff",
            border: "1px solid #b3d9ff",
            borderRadius: "8px",
          }}
        >
          <p>
            <strong>Authentication Modal:</strong> The authentication modal is now 
            provided globally by the GlobalAuthModalProvider. Any AuthButton or 
            protected route will automatically trigger the modal when authentication 
            is required.
          </p>
          <p>
            No need to manually include TemplateAuthModal - it's handled automatically!
          </p>
        </div>
      </section>
    </div>
  );
};

export default AuthExamples;
