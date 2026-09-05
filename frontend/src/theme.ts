import { createTheme } from '@mui/material/styles'

export default createTheme({
  palette: {
    primary: { main: '#1f4e79' },
    secondary: { main: '#4c5d6b' },
    success: { main: '#2f6b4f' },
    warning: { main: '#8a6117' },
    error: { main: '#9d3838' },
    background: { default: '#eef1f3', paper: '#ffffff' },
    text: { primary: '#1e2a33', secondary: '#65717b' },
    divider: '#cfd6dc',
  },
  shape: { borderRadius: 2 },
  typography: { fontFamily: '"Segoe UI", Arial, sans-serif', fontSize: 14, h5: { fontWeight: 600 }, h6: { fontWeight: 600 }, button: { textTransform: 'none', fontWeight: 600 } },
  components: {
    MuiCard: { styleOverrides: { root: { border: '1px solid #cfd6dc', boxShadow: 'none', borderRadius: 2 } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 2 } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 2, minHeight: 34 } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 2 } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: '#d4dbe0', padding: '8px 10px' }, head: { background: '#f1f3f5', fontWeight: 600 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 2, height: 24, fontWeight: 600 } } },
  },
})
