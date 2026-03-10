import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import HelpDrawer from './HelpDrawer';
import theme from '../../theme';

describe('HelpDrawer', () => {
    it('renders the selected topic content', () => {
        render(
            <ThemeProvider theme={theme}>
                <HelpDrawer open topicId="results-upload" onClose={() => undefined} />
            </ThemeProvider>
        );

        expect(screen.getByText('Results upload')).toBeInTheDocument();
        expect(screen.getByText(/Load CSV or JSONL output files/)).toBeInTheDocument();
        expect(screen.getByText('Supported files')).toBeInTheDocument();
    });
});
