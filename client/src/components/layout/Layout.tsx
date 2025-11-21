import React from 'react';
import { Header } from './Header';
import { Navigation, NavigationItem } from './Navigation';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  navigationItems?: NavigationItem[];
  headerActions?: React.ReactNode;
  showNavigation?: boolean;
  showHeader?: boolean;
  showThemeToggle?: boolean;
  showFooter?: boolean;
  appName?: string;
  appDescription?: string;
}

export function Layout({
  children,
  navigationItems,
  headerActions,
  showNavigation = true,
  showHeader = true,
  showThemeToggle = true,
  showFooter = false,
  appName,
  appDescription
}: LayoutProps) {
  return (
    <div className={styles.layout}>
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      {/* Header */}
      {showHeader && (
        <Header
          appName={appName}
          appDescription={appDescription}
          showThemeToggle={showThemeToggle}
          actions={headerActions}
        />
      )}

      {/* Navigation */}
      {showNavigation && <Navigation items={navigationItems} />}

      {/* Main Content */}
      <div className={styles.layoutContent}>
        <main id="main-content" className={styles.main}>
          {children}
        </main>

        {/* Optional Footer */}
        {showFooter && (
          <footer className={styles.footer}>
            <div className={styles.footerContent}>
              <div>
                {/* Footer content can be added here */}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

export default Layout;
