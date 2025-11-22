import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables
Object.defineProperty(import.meta, "env", {
  value: {
    DEV: true,
    VITE_PAY_URL: "http://localhost:3001",
    VITE_API_URL: "http://localhost:3001",
  },
  writable: true,
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock window.alert for tests
global.alert = vi.fn();

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock @jeffrey-keyser/personal-ui-kit globally
vi.mock('@jeffrey-keyser/personal-ui-kit', () => ({
  Button: ({ children, onClick, disabled, type, variant, size }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
  Badge: ({ children, variant, size }: any) => (
    <span data-variant={variant} data-size={size}>{children}</span>
  ),
  Card: ({ children, variant, style }: any) => (
    <div data-variant={variant} style={style}>{children}</div>
  ),
  Text: ({ children, variant, style }: any) => (
    <div data-variant={variant} style={style}>{children}</div>
  ),
  Alert: ({ children, variant, style }: any) => (
    <div role="alert" data-variant={variant} style={style}>{children}</div>
  ),
  Container: ({ children, size }: any) => (
    <div data-size={size}>{children}</div>
  ),
  ConfirmDialog: ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant }: any) =>
    isOpen ? (
      <div role="dialog" data-variant={variant}>
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText}</button>
        <button onClick={onClose}>{cancelText}</button>
      </div>
    ) : null,
  Modal: ({ isOpen, onClose, children, title, size }: any) =>
    isOpen ? (
      <div role="dialog" data-size={size}>
        <h2>{title}</h2>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
  Input: ({ label, value, onChange, placeholder, maxLength, helperText }: any) => {
    const id = `input-${label?.replace(/\s/g, '-').toLowerCase()}`;
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
        />
        {helperText && <span>{helperText}</span>}
      </div>
    );
  },
  TextArea: ({ label, value, onChange, placeholder, rows, helperText }: any) => {
    const id = `textarea-${label?.replace(/\s/g, '-').toLowerCase()}`;
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <textarea
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          rows={rows}
        />
        {helperText && <span>{helperText}</span>}
      </div>
    );
  },
  LoadingSpinner: ({ size }: any) => <div data-testid="loading-spinner" data-size={size}>Loading...</div>,
  EmptyState: ({ title, message }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  ),
  Toast: ({ message, variant, onClose, duration }: any) => (
    <div role="status" data-variant={variant} data-duration={duration}>
      {message}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));
