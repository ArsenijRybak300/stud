import { useState } from 'react'
import { AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const width = 224

export default function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const items = [
    { label: 'Расписание', path: '/schedule' },
    { label: 'Задания', path: '/tasks' },
    ...(user?.role === 'admin' ? [{ label: 'Администрирование', path: '/admin' }] : []),
  ]
  const title = items.find((item) => location.pathname.startsWith(item.path))?.label ?? 'StudentPlan'

  const content = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#202a33', color: '#fff' }}>
      <Box sx={{ px: 2, height: 58, display: 'flex', alignItems: 'center', borderBottom: '1px solid #3a4650' }}>
        <Typography sx={{ fontSize: 17, fontWeight: 600 }}>StudentPlan</Typography>
      </Box>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{user?.full_name}</Typography>
        <Typography sx={{ fontSize: 11, color: '#b7c0c8' }} noWrap>{user?.role === 'admin' ? 'Администратор' : `Студент · ${user?.group_code ?? 'без группы'}`}</Typography>
      </Box>
      <Divider sx={{ borderColor: '#3a4650' }} />
      <List disablePadding sx={{ py: 1 }}>
        {items.map((item) => <ListItemButton key={item.path} selected={location.pathname.startsWith(item.path)} onClick={() => { navigate(item.path); setOpen(false) }} sx={{ minHeight: 40, px: 2, borderRadius: 0, color: '#dce2e7', '&.Mui-selected': { bgcolor: '#1f4e79', color: '#fff', '&:hover': { bgcolor: '#1f4e79' } }, '&:hover': { bgcolor: '#2c3944' } }}><ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5 }} /></ListItemButton>)}
      </List>
      <Box sx={{ mt: 'auto', px: 2, py: 1.5, borderTop: '1px solid #3a4650', color: '#aeb8c0', fontSize: 11 }}>Версия 1.0</Box>
    </Box>
  )

  return <Box sx={{ height: '100dvh', display: 'flex', overflow: 'hidden' }}>
    <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, width, '& .MuiDrawer-paper': { width, border: 0, position: 'relative' } }}>{content}</Drawer>
    <Drawer variant="temporary" open={open} onClose={() => setOpen(false)} sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width, border: 0 } }}>{content}</Drawer>
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#fff', color: '#1e2a33', borderBottom: '1px solid #c8d0d6' }}>
        <Toolbar sx={{ minHeight: '58px !important', px: 1.5 }}>
          <IconButton onClick={() => setOpen(true)} sx={{ display: { md: 'none' }, mr: 1 }}><MenuIcon /></IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 600, flex: 1 }}>{title}</Typography>
          <Typography sx={{ mr: 1.5, fontSize: 12, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>{user?.email}</Typography>
          <IconButton size="small" onClick={() => { logout(); navigate('/login') }} title="Выйти"><LogoutIcon fontSize="small" /></IconButton>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1.25, bgcolor: '#eef1f3' }}><Outlet /></Box>
    </Box>
  </Box>
}
