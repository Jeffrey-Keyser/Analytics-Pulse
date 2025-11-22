import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

/**
 * Breadcrumbs Component
 * Shows navigation path with links
 * Auto-generates from route if items not provided
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const location = useLocation();
  const params = useParams();

  // Auto-generate breadcrumbs from path if not provided
  const breadcrumbs = items || generateBreadcrumbsFromPath(location.pathname, params);

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs for single-level pages
  }

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <ol className={styles.breadcrumbList}>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.path} className={styles.breadcrumbItem}>
              {!isLast ? (
                <>
                  <Link to={crumb.path} className={styles.breadcrumbLink}>
                    {crumb.label}
                  </Link>
                  <span className={styles.breadcrumbSeparator} aria-hidden="true">
                    /
                  </span>
                </>
              ) : (
                <span className={styles.breadcrumbCurrent} aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Generate breadcrumbs from URL path
 */
function generateBreadcrumbsFromPath(pathname: string, params: Record<string, string | undefined>): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', path: '/' }
  ];

  // Handle specific routes
  if (pathname === '/') {
    return [{ label: 'Dashboard', path: '/' }];
  }

  if (pathname === '/projects/new') {
    crumbs.push({ label: 'Create Project', path: '/projects/new' });
    return crumbs;
  }

  if (pathname.startsWith('/projects/')) {
    const projectId = params.id;
    if (projectId) {
      const projectPath = `/projects/${projectId}`;
      crumbs.push({ label: 'Project', path: projectPath });

      if (pathname.includes('/realtime')) {
        crumbs.push({ label: 'Real-time', path: `${projectPath}/realtime` });
      } else if (pathname.includes('/events')) {
        crumbs.push({ label: 'Custom Events', path: `${projectPath}/events` });
      } else if (pathname.includes('/settings')) {
        crumbs.push({ label: 'Settings', path: `${projectPath}/settings` });
      } else if (pathname.includes('/api-keys')) {
        crumbs.push({ label: 'API Keys', path: `${projectPath}/api-keys` });
      }
    }
  }

  return crumbs;
}

export default Breadcrumbs;
