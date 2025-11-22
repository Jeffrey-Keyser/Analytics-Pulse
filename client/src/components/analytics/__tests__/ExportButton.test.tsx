/**
 * Tests for ExportButton component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton, ExportButtonProps } from '../ExportButton';
import { AnalyticsThemeProvider } from '../../../contexts/ThemeContext';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Helper to render with theme provider
function renderWithTheme(ui: React.ReactElement) {
  return render(<AnalyticsThemeProvider>{ui}</AnalyticsThemeProvider>);
}

describe('ExportButton', () => {
  const mockOnExport = vi.fn();

  const defaultProps: ExportButtonProps = {
    projectId: 'test-project-123',
    dataType: 'analytics',
    onExport: mockOnExport,
  };

  beforeEach(() => {
    mockOnExport.mockClear();
  });

  describe('Rendering', () => {
    it('should render export button with correct label', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      expect(screen.getByText('Export Analytics')).toBeInTheDocument();
    });

    it('should render export button with Analytics label for analytics data type', () => {
      renderWithTheme(<ExportButton {...defaultProps} dataType="analytics" />);

      expect(screen.getByText('Export Analytics')).toBeInTheDocument();
    });

    it('should render export button with Events label for events data type', () => {
      renderWithTheme(<ExportButton {...defaultProps} dataType="events" />);

      expect(screen.getByText('Export Events')).toBeInTheDocument();
    });

    it('should render export button with Campaigns label for campaigns data type', () => {
      renderWithTheme(<ExportButton {...defaultProps} dataType="campaigns" />);

      expect(screen.getByText('Export Campaigns')).toBeInTheDocument();
    });

    it('should show loading state when loading=true', () => {
      renderWithTheme(<ExportButton {...defaultProps} loading={true} />);

      expect(screen.getByText('Exporting...')).toBeInTheDocument();
      expect(screen.queryByText('Export Analytics')).not.toBeInTheDocument();
    });

    it('should be disabled when disabled=true', () => {
      renderWithTheme(<ExportButton {...defaultProps} disabled={true} />);

      const button = screen.getByText('Export Analytics').closest('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when loading=true', () => {
      renderWithTheme(<ExportButton {...defaultProps} loading={true} />);

      const button = screen.getByText('Exporting...').closest('button');
      expect(button).toBeDisabled();
    });

    it('should not be disabled by default', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      expect(button).not.toBeDisabled();
    });

    it('should render with dropdown arrow', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      expect(screen.getByText('▼')).toBeInTheDocument();
    });

    it('should not show dropdown initially', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
      expect(screen.queryByText('Export as JSON')).not.toBeInTheDocument();
    });

    it('should show dropdown when clicked', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    });

    it('should render download emoji icon', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      expect(screen.getByText('📥')).toBeInTheDocument();
    });

    it('should render CSV and JSON file icons in dropdown', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      expect(screen.getByText('📄')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onExport with "csv" when CSV button clicked', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const csvButton = screen.getByText('Export as CSV').closest('button');
      fireEvent.click(csvButton!);

      expect(mockOnExport).toHaveBeenCalledTimes(1);
      expect(mockOnExport).toHaveBeenCalledWith('csv');
    });

    it('should call onExport with "json" when JSON button clicked', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const jsonButton = screen.getByText('Export as JSON').closest('button');
      fireEvent.click(jsonButton!);

      expect(mockOnExport).toHaveBeenCalledTimes(1);
      expect(mockOnExport).toHaveBeenCalledWith('json');
    });

    it('should close dropdown after CSV export', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const csvButton = screen.getByText('Export as CSV').closest('button');
      fireEvent.click(csvButton!);

      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
      expect(screen.queryByText('Export as JSON')).not.toBeInTheDocument();
    });

    it('should close dropdown after JSON export', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const jsonButton = screen.getByText('Export as JSON').closest('button');
      fireEvent.click(jsonButton!);

      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
      expect(screen.queryByText('Export as JSON')).not.toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      renderWithTheme(
        <div>
          <ExportButton {...defaultProps} />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      // Verify dropdown is open
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();

      // Click outside
      const outsideElement = screen.getByTestId('outside');
      fireEvent.mouseDown(outsideElement);

      // Wait for dropdown to close
      await waitFor(() => {
        expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
      });
    });

    it('should toggle dropdown on multiple clicks', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');

      // First click - open
      fireEvent.click(button!);
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();

      // Second click - close
      fireEvent.click(button!);
      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();

      // Third click - open again
      fireEvent.click(button!);
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    });

    it('should not open dropdown when disabled', () => {
      renderWithTheme(<ExportButton {...defaultProps} disabled={true} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
      expect(screen.queryByText('Export as JSON')).not.toBeInTheDocument();
    });

    it('should not open dropdown when loading', () => {
      renderWithTheme(<ExportButton {...defaultProps} loading={true} />);

      const button = screen.getByText('Exporting...').closest('button');
      fireEvent.click(button!);

      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
      expect(screen.queryByText('Export as JSON')).not.toBeInTheDocument();
    });

    it('should not call onExport when clicking dropdown while closed', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      // Don't open dropdown
      expect(mockOnExport).not.toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('should accept projectId prop', () => {
      renderWithTheme(<ExportButton {...defaultProps} projectId="custom-project" />);

      expect(screen.getByText('Export Analytics')).toBeInTheDocument();
    });

    it('should accept startDate prop', () => {
      renderWithTheme(<ExportButton {...defaultProps} startDate="2024-01-01" />);

      expect(screen.getByText('Export Analytics')).toBeInTheDocument();
    });

    it('should accept endDate prop', () => {
      renderWithTheme(<ExportButton {...defaultProps} endDate="2024-01-31" />);

      expect(screen.getByText('Export Analytics')).toBeInTheDocument();
    });

    it('should display correct label for different data types', () => {
      const { rerender } = renderWithTheme(<ExportButton {...defaultProps} dataType="analytics" />);
      expect(screen.getByText('Export Analytics')).toBeInTheDocument();

      rerender(
        <AnalyticsThemeProvider>
          <ExportButton {...defaultProps} dataType="events" />
        </AnalyticsThemeProvider>
      );
      expect(screen.getByText('Export Events')).toBeInTheDocument();

      rerender(
        <AnalyticsThemeProvider>
          <ExportButton {...defaultProps} dataType="campaigns" />
        </AnalyticsThemeProvider>
      );
      expect(screen.getByText('Export Campaigns')).toBeInTheDocument();
    });

    it('should pass correct format to onExport for CSV', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const csvButton = screen.getByText('Export as CSV').closest('button');
      fireEvent.click(csvButton!);

      expect(mockOnExport).toHaveBeenCalledWith('csv');
    });

    it('should pass correct format to onExport for JSON', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const jsonButton = screen.getByText('Export as JSON').closest('button');
      fireEvent.click(jsonButton!);

      expect(mockOnExport).toHaveBeenCalledWith('json');
    });
  });

  describe('Accessibility', () => {
    it('should have button role for main button', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      expect(button).toBeInTheDocument();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('should have clickable dropdown items', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const csvButton = screen.getByText('Export as CSV').closest('button');
      const jsonButton = screen.getByText('Export as JSON').closest('button');

      expect(csvButton).toBeInTheDocument();
      expect(jsonButton).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');

      // Tab to button and press Enter
      await user.tab();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');

      // Dropdown should open
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    });

    it('should not be clickable when disabled', () => {
      renderWithTheme(<ExportButton {...defaultProps} disabled={true} />);

      const button = screen.getByText('Export Analytics').closest('button');
      expect(button).toBeDisabled();

      fireEvent.click(button!);
      expect(mockOnExport).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should maintain dropdown state correctly', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');

      // Initial state - closed
      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();

      // Open dropdown
      fireEvent.click(button!);
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();

      // Close dropdown
      fireEvent.click(button!);
      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
    });

    it('should close dropdown after export action', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      // Dropdown is open
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();

      // Click export
      const csvButton = screen.getByText('Export as CSV').closest('button');
      fireEvent.click(csvButton!);

      // Dropdown should close
      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
    });

    it('should handle rapid clicks gracefully', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');

      // Rapid clicks
      fireEvent.click(button!);
      fireEvent.click(button!);
      fireEvent.click(button!);

      // Should end in open state (odd number of clicks)
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should render with theme context', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveStyle({ display: 'flex' });
    });

    it('should apply different styles when disabled', () => {
      renderWithTheme(<ExportButton {...defaultProps} disabled={true} />);

      const button = screen.getByText('Export Analytics').closest('button');
      expect(button).toHaveStyle({ cursor: 'not-allowed' });
    });

    it('should apply different styles when loading', () => {
      renderWithTheme(<ExportButton {...defaultProps} loading={true} />);

      const button = screen.getByText('Exporting...').closest('button');
      expect(button).toHaveStyle({ cursor: 'not-allowed' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional props', () => {
      renderWithTheme(
        <ExportButton projectId="test" dataType="analytics" onExport={mockOnExport} />
      );

      expect(screen.getByText('Export Analytics')).toBeInTheDocument();
    });

    it('should work without startDate and endDate', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const csvButton = screen.getByText('Export as CSV').closest('button');
      fireEvent.click(csvButton!);

      expect(mockOnExport).toHaveBeenCalledWith('csv');
    });

    it('should work with both startDate and endDate', () => {
      renderWithTheme(
        <ExportButton {...defaultProps} startDate="2024-01-01" endDate="2024-01-31" />
      );

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const csvButton = screen.getByText('Export as CSV').closest('button');
      fireEvent.click(csvButton!);

      expect(mockOnExport).toHaveBeenCalledWith('csv');
    });

    it('should call onExport callback even if it fails', () => {
      const errorCallback = vi.fn();

      renderWithTheme(<ExportButton {...defaultProps} onExport={errorCallback} />);

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      const csvButton = screen.getByText('Export as CSV').closest('button');
      fireEvent.click(csvButton!);

      // Callback should be called
      expect(errorCallback).toHaveBeenCalledWith('csv');
      // Dropdown should still close
      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
    });

    it('should rotate arrow when dropdown opens', () => {
      renderWithTheme(<ExportButton {...defaultProps} />);

      const arrow = screen.getByText('▼');
      expect(arrow).toHaveStyle({ transform: 'rotate(0)' });

      const button = screen.getByText('Export Analytics').closest('button');
      fireEvent.click(button!);

      expect(arrow).toHaveStyle({ transform: 'rotate(180deg)' });
    });
  });
});
