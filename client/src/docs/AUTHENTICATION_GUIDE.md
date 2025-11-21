# Authentication Integration Guide

This guide explains how to use the template-friendly authentication components and patterns in your ServerlessWebTemplate-based application.

## Overview

The ServerlessWebTemplate includes a comprehensive authentication system built on top of the Pay integration package. It provides:

- **Template-friendly components** that are easy to customize and integrate
- **Flexible theming** to match your brand
- **Configurable behavior** for different use cases
- **TypeScript support** with full type safety
- **Responsive design** that works on all devices

## Quick Start

### 1. Basic Setup

The authentication system is already configured in `src/index.tsx` with sensible defaults:

```typescript
import { TemplateAuthProvider } from "./components/auth";
import { templateAuthSettings } from "./config/auth";

// Wrap your app with the authentication provider
<TemplateAuthProvider config={templateAuthSettings.provider}>
  <YourApp />
</TemplateAuthProvider>;
```

### 2. Environment Configuration

Update your `.env` file with your authentication service URL:

```bash
# Point to your backend server (recommended)
VITE_PAY_URL=http://localhost:3001

# Alternative: Direct external service (requires CORS setup)
# VITE_PAY_URL=https://pay.jeffreykeyser.net
```

### 3. Add Authentication to Your Components

```typescript
import { AuthButton, TemplateAuthModal } from "./components/auth";

function MyComponent() {
  return (
    <div>
      <AuthButton />
      <TemplateAuthModal />
    </div>
  );
}
```

## Components Reference

### TemplateAuthProvider

The main authentication provider that wraps your application.

```typescript
import { TemplateAuthProvider } from "./components/auth";

<TemplateAuthProvider
  config={{
    payUrl: "http://localhost:3001",
    debug: true,
    authEndpoints: {
      login: "/auth/login",
      register: "/auth/register",
    },
  }}
>
  <App />
</TemplateAuthProvider>;
```

**Props:**

- `config.payUrl` - Authentication service URL
- `config.debug` - Enable debug logging
- `config.authEndpoints` - Custom endpoint paths (optional)

### AuthButton

A smart authentication button that adapts to the user's authentication state.

```typescript
import { AuthButton } from "./components/auth";

<AuthButton
  loginText="Sign In"
  profileText="My Account"
  variant="primary"
  size="medium"
  showUserInfo={true}
/>;
```

**Props:**

- `loginText` - Text when not authenticated (default: "Login / Register")
- `profileText` - Text when authenticated (default: "Profile")
- `loadingText` - Text while loading (default: "Loading...")
- `variant` - Button style: "primary" | "secondary" | "outline" | "ghost"
- `size` - Button size: "small" | "medium" | "large"
- `showUserInfo` - Show user email/roles below button
- `className` - Custom CSS class
- `style` - Custom inline styles

### TemplateAuthModal

A customizable authentication modal with theming support.

```typescript
import { TemplateAuthModal } from "./components/auth";

<TemplateAuthModal
  theme={{
    primaryColor: "#007bff",
    successColor: "#10b981",
  }}
  callbacks={{
    onLoginSuccess: (user) => console.log("Welcome!", user.email),
    onRegisterSuccess: (user) => console.log("Account created!", user.email),
  }}
  autoClose={true}
/>;
```

**Props:**

- `theme` - Color and styling configuration
- `callbacks` - Event handlers for authentication events
- `autoClose` - Close modal automatically after successful auth
- `showSocialLogin` - Enable social login options
- `title` - Custom modal title
- `subtitle` - Custom modal subtitle

### AuthGuard

Protect content based on authentication status, roles, or permissions.

```typescript
import { AuthGuard } from "./components/auth";

<AuthGuard
  requiredRoles={["admin"]}
  requiredPermissions={["read:users"]}
  autoOpenLogin={true}
>
  <AdminPanel />
</AuthGuard>;
```

**Props:**

- `requiredRoles` - Array of required user roles
- `requiredPermissions` - Array of required permissions
- `autoOpenLogin` - Auto-open login modal when unauthenticated
- `loadingComponent` - Custom loading component
- `unauthorizedComponent` - Custom unauthorized component
- `unauthenticatedComponent` - Custom unauthenticated component

### AuthStatus

Display current authentication status and user information.

```typescript
import { AuthStatus } from "./components/auth";

<AuthStatus
  showEmail={true}
  showRoles={true}
  showPermissions={false}
  compact={false}
/>;
```

**Props:**

- `showEmail` - Display user email
- `showId` - Display user ID
- `showRoles` - Display user roles
- `showPermissions` - Display user permissions
- `showStatus` - Display authentication status badge
- `compact` - Use compact display mode
- `className` - Custom CSS class
- `style` - Custom inline styles

## Configuration

### Authentication Settings

Customize authentication behavior in `src/config/auth.ts`:

```typescript
import { createAuthConfig } from "./config/auth";

// Create custom configuration
export const myAuthConfig = createAuthConfig({
  theme: {
    primaryColor: "#ff6b6b",
    borderRadius: "12px",
  },
  button: {
    variant: "outline",
    size: "large",
  },
  callbacks: {
    onLoginSuccess: (user) => {
      // Custom login logic
      analytics.track("user_login", { userId: user.id });
    },
  },
});
```

### Theme Customization

Customize the appearance to match your brand:

```typescript
const customTheme = {
  primaryColor: "#your-brand-color",
  successColor: "#your-success-color",
  errorColor: "#your-error-color",
  backgroundColor: "#ffffff",
  textColor: "#333333",
  borderRadius: "8px",
  fontFamily: "Your-Font-Family, sans-serif",
};
```

### Pre-built Configurations

The template includes several pre-built configurations:

```typescript
import {
  minimalAuthConfig,
  adminAuthConfig,
  ecommerceAuthConfig,
} from "./config/auth";

// Use a pre-built configuration
<TemplateAuthProvider config={adminAuthConfig.provider}>
  <App />
</TemplateAuthProvider>;
```

## Usage Patterns

### Basic Authentication

```typescript
import { usePayAuth } from "@jeffrey-keyser/pay-auth-integration/client/react";
import { AuthButton, TemplateAuthModal } from "./components/auth";

function Header() {
  const { isAuthenticated, user } = usePayAuth();

  return (
    <header>
      <h1>My App</h1>
      <AuthButton />
      <TemplateAuthModal />
    </header>
  );
}
```

### Protected Routes

```typescript
import { AuthGuard } from "./components/auth";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/dashboard"
        element={
          <AuthGuard autoOpenLogin={true}>
            <Dashboard />
          </AuthGuard>
        }
      />
    </Routes>
  );
}
```

### Role-based Access

```typescript
import { AuthGuard } from "./components/auth";

function AdminPanel() {
  return (
    <AuthGuard
      requiredRoles={["admin", "moderator"]}
      unauthorizedComponent={() => (
        <div>You need admin access to view this page.</div>
      )}
    >
      <AdminContent />
    </AuthGuard>
  );
}
```

### Custom Authentication UI

```typescript
import {
  usePayAuth,
  useAuthModal,
} from "@jeffrey-keyser/pay-auth-integration/client/react";

function CustomAuthButton() {
  const { isAuthenticated, user, isLoading } = usePayAuth();
  const { openModal } = useAuthModal();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="custom-auth">
      {isAuthenticated ? (
        <div>
          <span>Welcome, {user?.email}</span>
          <button onClick={() => openModal("profile")}>Profile</button>
        </div>
      ) : (
        <button onClick={() => openModal("login")}>Sign In</button>
      )}
    </div>
  );
}
```

## Styling

### CSS Classes

The authentication components include CSS classes for customization:

```css
/* Button variants */
.auth-button--primary {
  /* Primary button styles */
}
.auth-button--secondary {
  /* Secondary button styles */
}
.auth-button--outline {
  /* Outline button styles */
}
.auth-button--ghost {
  /* Ghost button styles */
}

/* Button sizes */
.auth-button--small {
  /* Small button styles */
}
.auth-button--medium {
  /* Medium button styles */
}
.auth-button--large {
  /* Large button styles */
}

/* Status display */
.auth-status {
  /* Main status container */
}
.auth-status__badge--success {
  /* Success badge */
}
.auth-status__badge--error {
  /* Error badge */
}

/* Guard components */
.auth-guard-loading {
  /* Loading state */
}
.auth-guard-unauthenticated {
  /* Unauthenticated state */
}
.auth-guard-unauthorized {
  /* Unauthorized state */
}
```

### Custom Styling

Override default styles with your own CSS:

```css
/* Custom button styling */
.my-auth-button {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  border: none;
  border-radius: 25px;
  color: white;
  font-weight: bold;
}

/* Custom status styling */
.my-auth-status {
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 12px;
  padding: 1.5rem;
}
```

## Advanced Usage

### Custom Callbacks

```typescript
const customCallbacks = {
  onLoginSuccess: (user) => {
    // Track analytics
    analytics.track("user_login", { userId: user.id });

    // Show welcome message
    toast.success(`Welcome back, ${user.email}!`);

    // Redirect to dashboard
    navigate("/dashboard");
  },

  onRegisterSuccess: (user) => {
    // Track analytics
    analytics.track("user_register", { userId: user.id });

    // Start onboarding flow
    startOnboarding();
  },

  onLoginError: (error) => {
    // Show user-friendly error
    toast.error("Login failed. Please check your credentials.");

    // Track error for debugging
    console.error("Login error:", error);
  },
};
```

### Environment-specific Configuration

```typescript
// Development configuration
const devConfig = createAuthConfig({
  provider: {
    debug: true,
    payUrl: "http://localhost:3001",
  },
  theme: {
    primaryColor: "#ff6b6b", // Red for development
  },
});

// Production configuration
const prodConfig = createAuthConfig({
  provider: {
    debug: false,
    payUrl: "https://your-api.com",
  },
  theme: {
    primaryColor: "#007bff", // Blue for production
  },
});

// Use environment-specific config
const authConfig = import.meta.env.DEV ? devConfig : prodConfig;
```

## Troubleshooting

### Common Issues

1. **Authentication not working**

   - Check that `VITE_PAY_URL` is set correctly
   - Verify your backend server is running
   - Check browser console for errors

2. **Styles not applying**

   - Ensure you're importing the auth components CSS
   - Check for CSS specificity conflicts
   - Verify CSS class names are correct

3. **TypeScript errors**
   - Update to latest Pay integration package version
   - Check that all imports are correct
   - Verify TypeScript configuration

### Debug Mode

Enable debug mode to see detailed logging:

```typescript
<TemplateAuthProvider
  config={{
    debug: true,
    payUrl: "http://localhost:3001",
  }}
>
  <App />
</TemplateAuthProvider>
```

### Network Issues

If authentication requests are failing:

1. Check CORS configuration on your backend
2. Verify the Pay service URL is accessible
3. Check network tab in browser dev tools
4. Ensure proper SSL certificates in production

## Migration from Legacy Components

If you're upgrading from the old authentication system:

### Before (Legacy)

```typescript
import {
  usePayAuth,
  AuthModal,
} from "@jeffrey-keyser/pay-auth-integration/client/react";

function OldAuthComponent() {
  const { isAuthenticated } = usePayAuth();
  return (
    <div>
      <button>{isAuthenticated ? "Profile" : "Login"}</button>
      <AuthModal isOpen={true} onClose={() => {}} />
    </div>
  );
}
```

### After (Template-friendly)

```typescript
import { AuthButton, TemplateAuthModal } from "./components/auth";

function NewAuthComponent() {
  return (
    <div>
      <AuthButton />
      <TemplateAuthModal />
    </div>
  );
}
```

The new components provide the same functionality with better customization options and template-friendly defaults.

## Support

For additional help:

1. Check the component source code in `src/components/auth/`
2. Review the configuration options in `src/config/auth.ts`
3. Look at the example usage in `src/containers/AuthContainer.tsx`
4. Refer to the Pay integration package documentation
