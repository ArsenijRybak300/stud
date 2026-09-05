import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, Stack, TextField, Typography } from '@mui/material'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', group_code: 'НМТ-333901' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/schedule" replace />
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await register(form); navigate('/schedule') } catch (e) { setError(apiErrorMessage(e)) } finally { setBusy(false) }
  }
  return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: '#e9edf0', p: 2 }}>
    <Card sx={{ width: '100%', maxWidth: 460, p: 3 }}>
      <Typography variant="h5">Регистрация студента</Typography>
      <Typography color="text.secondary" sx={{ mt: .5, mb: 2.5 }}>Код группы должен быть заранее создан администратором.</Typography>
      <form onSubmit={submit}><Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="ФИО" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <TextField label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextField label="Код группы" required value={form.group_code} onChange={(e) => setForm({ ...form, group_code: e.target.value.toUpperCase() })} />
        <TextField label="Пароль" type="password" required inputProps={{ minLength: 8 }} helperText="Не менее 8 символов" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Создание…' : 'Создать учетную запись'}</Button>
        <Typography variant="body2" color="text.secondary">Уже зарегистрированы? <Link to="/login" style={{ color: '#1f4e79', fontWeight: 600 }}>Войти</Link></Typography>
      </Stack></form>
    </Card>
  </Box>
}
