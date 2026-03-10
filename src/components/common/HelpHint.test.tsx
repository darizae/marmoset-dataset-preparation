import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import HelpHint from './HelpHint';
import theme from '../../theme';

describe('HelpHint', () => {
    it('renders the onboarding copy and dismiss action', () => {
        const onDismiss = vi.fn();

        render(
            <ThemeProvider theme={theme}>
                <HelpHint visible onDismiss={onDismiss} />
            </ThemeProvider>
        );

        expect(screen.getByText('Need guidance? Use the Help buttons in each section.')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Dismiss help hint'));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
