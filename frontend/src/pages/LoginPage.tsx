import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, Stack, TextField, Typography } from '@mui/material'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/schedule" replace />
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await login(email, password); navigate('/schedule') } catch (e) { setError(apiErrorMessage(e)) } finally { setBusy(false) }
  }
  return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: '#e9edf0', p: 2 }}>
    <Card sx={{ width: '100%', maxWidth: 420, p: 3 }}>
      <Typography variant="h5">StudentPlan</Typography>
      <Typography color="text.secondary" sx={{ mt: .5, mb: 2.5 }}>Вход в учебную систему</Typography>
      <form onSubmit={submit}><Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Пароль" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Вход…' : 'Войти'}</Button>
        <Typography variant="body2" color="text.secondary">Нет учетной записи? <Link to="/register" style={{ color: '#1f4e79', fontWeight: 600 }}>Регистрация студента</Link></Typography>
      </Stack></form>
    </Card>
  </Box>
}
