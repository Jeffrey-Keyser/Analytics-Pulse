import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Button } from '@jeffrey-keyser/personal-ui-kit';
import styles from './Layout.module.css';

export interface NavigationItem {
  path: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface NavigationProps {
  items?: NavigationItem[];
}

const defaultNavigationItems: NavigationItem[] = [
  {
    path: '/',
    label: 'Home',
    description: 'System health and diagnostics'
  }
];

export function Navigation({ items = defaultNavigationItems }: NavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={styles.navigation} aria-label="Main navigation">
      <Container size="xl">
        <div className={styles.navigationContent}>
          <ul className={styles.navigationList}>
            {items.map((item) => (
              <li key={item.path} className={styles.navigationItem}>
                <Button
                  variant={isActive(item.path) ? 'primary' : 'secondary'}
                  onClick={() => navigate(item.path)}
                  title={item.description}
                  size="small"
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  {item.icon && (
                    <span style={{ marginRight: '0.5rem', display: 'inline-flex' }}>
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </nav>
  );
}

export default Navigation;
