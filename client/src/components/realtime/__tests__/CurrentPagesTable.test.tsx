import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrentPagesTable } from '../CurrentPagesTable';
import { CurrentPage } from '../../../models/analytics';

describe('CurrentPagesTable', () => {
  const mockPages: CurrentPage[] = [
    {
      url: 'https://example.com/page1',
      active_visitors: 5,
      pageviews: 12,
    },
    {
      url: 'https://example.com/page2',
      active_visitors: 3,
      pageviews: 8,
    },
  ];

  it('renders the table title', () => {
    render(<CurrentPagesTable pages={mockPages} />);
    expect(screen.getByText('Current Pages')).toBeInTheDocument();
  });

  it('displays table headers', () => {
    render(<CurrentPagesTable pages={mockPages} />);
    expect(screen.getByText('Page URL')).toBeInTheDocument();
    expect(screen.getByText('Active Visitors')).toBeInTheDocument();
    expect(screen.getByText('Pageviews')).toBeInTheDocument();
  });

  it('renders all pages', () => {
    render(<CurrentPagesTable pages={mockPages} />);
    expect(screen.getByText('https://example.com/page1')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/page2')).toBeInTheDocument();
  });

  it('displays active visitor counts', () => {
    render(<CurrentPagesTable pages={mockPages} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays pageview counts', () => {
    render(<CurrentPagesTable pages={mockPages} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('truncates long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(100);
    const pagesWithLongUrl: CurrentPage[] = [
      {
        url: longUrl,
        active_visitors: 1,
        pageviews: 2,
      },
    ];

    const { container } = render(<CurrentPagesTable pages={pagesWithLongUrl} />);
    const link = container.querySelector('a');
    expect(link?.textContent).toContain('...');
    expect(link?.textContent?.length).toBeLessThan(longUrl.length);
  });

  it('shows empty state when no pages', () => {
    render(<CurrentPagesTable pages={[]} />);
    expect(screen.getByText('No active pages at the moment')).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    render(<CurrentPagesTable pages={mockPages} loading={true} />);
    // When loading, the page URLs should not be visible
    expect(screen.queryByText('https://example.com/page1')).not.toBeInTheDocument();
    expect(screen.queryByText('https://example.com/page2')).not.toBeInTheDocument();
  });

  it('creates clickable links for page URLs', () => {
    const { container } = render(<CurrentPagesTable pages={mockPages} />);
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(2);
    expect(links[0].href).toBe('https://example.com/page1');
    expect(links[1].href).toBe('https://example.com/page2');
  });
});
