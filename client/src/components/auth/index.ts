// Legacy component (kept for backward compatibility)
import ProtectedRoute from "./ProtectedRoute";

// New template-friendly authentication components
export { ProtectedRoute };
export * from "./AuthProvider";
export * from "./AuthButton";
export * from "./AuthGuard";
export * from "./AuthStatus";
export * from "./AuthExamples";

// Legacy exports for tests (deprecated - use GlobalAuthModalContext instead)
export * from "./AuthModal";

// Import styles
import "./auth-components.css";
