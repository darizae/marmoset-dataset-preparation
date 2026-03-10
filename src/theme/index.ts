import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#005b96',
            dark: '#003f68',
            light: '#4c8fc0',
            contrastText: '#ffffff'
        },
        secondary: {
            main: '#2f6f4f',
            dark: '#224f39',
            light: '#5b9275',
            contrastText: '#ffffff'
        },
        background: {
            default: '#f4f7fb',
            paper: '#ffffff'
        },
        success: {
            main: '#2e7d32'
        },
        warning: {
            main: '#b26a00'
        },
        error: {
            main: '#c62828'
        },
        text: {
            primary: '#16202a',
            secondary: '#51606f'
        },
        divider: '#d6dee6'
    },
    shape: {
        borderRadius: 14
    },
    typography: {
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        h3: {
            fontWeight: 700
        },
        h4: {
            fontWeight: 700
        },
        h5: {
            fontWeight: 700
        },
        h6: {
            fontWeight: 700
        },
        subtitle1: {
            fontWeight: 600
        },
        button: {
            textTransform: 'none',
            fontWeight: 600
        }
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none'
                }
            }
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    border: '1px solid',
                    borderColor: '#d6dee6',
                    boxShadow: '0 16px 40px rgba(22, 32, 42, 0.08)'
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 700
                }
            }
        }
    }
});

export default theme;
