import React from 'react';
import { Container, Text, ThemeToggle, Spacer } from '@jeffrey-keyser/personal-ui-kit';
import styles from './Layout.module.css';

interface HeaderProps {
  appName?: string;
  appDescription?: string;
  showThemeToggle?: boolean;
  actions?: React.ReactNode;
}

export function Header({
  appName = import.meta.env.VITE_APP_NAME || 'System Dashboard',
  appDescription = import.meta.env.VITE_APP_DESCRIPTION || 'Serverless web application',
  showThemeToggle = true,
  actions
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <Container size="xl">
        <div className={styles.headerContent}>
          <div className={styles.headerBranding}>
            <div className={styles.headerLogo}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Modern geometric logo */}
                <rect
                  x="4"
                  y="4"
                  width="24"
                  height="24"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M12 16L16 20L24 12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.headerTitle}>
              <Text
                variant="subtitle1"
                weight="bold"
                as="h1"
                style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.2 }}
              >
                {appName}
              </Text>
              <Text
                variant="caption"
                color="secondary"
                style={{ margin: 0, lineHeight: 1.2 }}
                className={styles.headerDescription}
              >
                {appDescription}
              </Text>
            </div>
          </div>

          <div className={styles.headerActions}>
            {actions}
            {actions && showThemeToggle && <span style={{ width: '1px', height: '24px', background: '#e0e0e0' }} />}
            {showThemeToggle && (
              <ThemeToggle
                aria-label="Toggle theme"
              />
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}

export default Header;
