import { Navigate, Outlet } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Box sx={{ height: '100dvh', display: 'grid', placeItems: 'center' }}><CircularProgress size={28} /></Box>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
