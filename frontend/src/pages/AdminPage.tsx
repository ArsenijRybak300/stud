import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, FormControl, InputLabel, MenuItem, Select, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import { apiErrorMessage } from '../api/client'
import { copySchedule, createGroup, createSemester, createUser, getGroups, getSemesters, getUsers, updateUser } from '../api/admin'
import type { Semester, StudyGroup, User, UserRole } from '../types'

export default function AdminPage() {
  const [tab, setTab] = useState(0)
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [groupForm, setGroupForm] = useState({ code: '', name: '' })
  const [semesterForm, setSemesterForm] = useState({ name: '', starts_on: '', ends_on: '' })
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '', role: 'student' as UserRole, group_id: 0 })
  const [copyForm, setCopyForm] = useState({ source: 0, target: 0, group: 0 })

  const load = useCallback(async () => {
    try {
      const [g, s, u] = await Promise.all([getGroups(), getSemesters(), getUsers()])
      setGroups(g); setSemesters(s); setUsers(u)
      setUserForm((prev) => ({ ...prev, group_id: prev.group_id || g[0]?.id || 0 }))
      setCopyForm((prev) => ({ source: prev.source || s[1]?.id || s[0]?.id || 0, target: prev.target || s[0]?.id || 0, group: prev.group || g[0]?.id || 0 }))
      setError('')
    } catch (e) { setError(apiErrorMessage(e)) }
  }, [])
  useEffect(() => { void load() }, [load])

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setError(''); setMessage('')
    try { await fn(); setMessage(success); await load() } catch (e) { setError(apiErrorMessage(e)) }
  }

  const submitGroup = (e: FormEvent) => { e.preventDefault(); void run(async () => { await createGroup({ code: groupForm.code, name: groupForm.name || undefined }); setGroupForm({ code: '', name: '' }) }, 'Группа создана') }
  const submitSemester = (e: FormEvent) => { e.preventDefault(); void run(async () => { await createSemester(semesterForm); setSemesterForm({ name: '', starts_on: '', ends_on: '' }) }, 'Семестр создан') }
  const submitUser = (e: FormEvent) => { e.preventDefault(); void run(async () => { await createUser({ ...userForm, group_id: userForm.role === 'student' ? userForm.group_id : null }); setUserForm({ full_name: '', email: '', password: '', role: 'student', group_id: groups[0]?.id || 0 }) }, 'Пользователь создан') }

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    <Card><Tabs value={tab} onChange={(_, value) => setTab(value)}><Tab label="Группы" /><Tab label="Семестры" /><Tab label="Пользователи" /></Tabs></Card>
    {error && <Alert severity="error">{error}</Alert>}{message && <Alert severity="success">{message}</Alert>}

    {tab === 0 && <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems="stretch">
      <Card sx={{ p: 2, width: { lg: 380 } }}><Typography variant="h6" sx={{ mb: 1.5 }}>Новая учебная группа</Typography><form onSubmit={submitGroup}><Stack spacing={1.25}><TextField label="Код группы" required placeholder="НМТ-333901" value={groupForm.code} onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })} /><TextField label="Название" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} /><Button type="submit" variant="contained">Создать группу</Button></Stack></form></Card>
      <Card sx={{ flex: 1 }}><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Код</TableCell><TableCell>Название</TableCell><TableCell>Состояние</TableCell></TableRow></TableHead><TableBody>{groups.map((g) => <TableRow key={g.id}><TableCell sx={{ fontWeight: 600 }}>{g.code}</TableCell><TableCell>{g.name ?? '—'}</TableCell><TableCell>{g.is_active ? 'Активна' : 'Отключена'}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Card>
    </Stack>}

    {tab === 1 && <Stack spacing={1}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems="stretch"><Card sx={{ p: 2, width: { lg: 430 } }}><Typography variant="h6" sx={{ mb: 1.5 }}>Новый семестр</Typography><form onSubmit={submitSemester}><Stack spacing={1.25}><TextField label="Название" required placeholder="Весенний семестр 2026/2027" value={semesterForm.name} onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })} /><Stack direction="row" spacing={1}><TextField fullWidth type="date" label="Начало" InputLabelProps={{ shrink: true }} required value={semesterForm.starts_on} onChange={(e) => setSemesterForm({ ...semesterForm, starts_on: e.target.value })} /><TextField fullWidth type="date" label="Окончание" InputLabelProps={{ shrink: true }} required value={semesterForm.ends_on} onChange={(e) => setSemesterForm({ ...semesterForm, ends_on: e.target.value })} /></Stack><Button type="submit" variant="contained">Создать семестр</Button></Stack></form></Card>
      <Card sx={{ flex: 1 }}><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Название</TableCell><TableCell>Период</TableCell><TableCell>Состояние</TableCell></TableRow></TableHead><TableBody>{semesters.map((s) => <TableRow key={s.id}><TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell><TableCell>{s.starts_on} — {s.ends_on}</TableCell><TableCell>{s.is_active ? 'Активен' : 'Отключен'}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Card></Stack>
      <Card sx={{ p: 2 }}><Typography variant="h6" sx={{ mb: 1 }}>Повторить расписание в новом семестре</Typography><Typography color="text.secondary" sx={{ mb: 1.5, fontSize: 13 }}>Копируются недельные занятия выбранной группы. Отмены отдельных дат не копируются.</Typography><Stack direction={{ xs: 'column', md: 'row' }} spacing={1}><FormControl fullWidth><InputLabel>Исходный семестр</InputLabel><Select label="Исходный семестр" value={copyForm.source || ''} onChange={(e) => setCopyForm({ ...copyForm, source: Number(e.target.value) })}>{semesters.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl><FormControl fullWidth><InputLabel>Новый семестр</InputLabel><Select label="Новый семестр" value={copyForm.target || ''} onChange={(e) => setCopyForm({ ...copyForm, target: Number(e.target.value) })}>{semesters.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl><FormControl fullWidth><InputLabel>Группа</InputLabel><Select label="Группа" value={copyForm.group || ''} onChange={(e) => setCopyForm({ ...copyForm, group: Number(e.target.value) })}>{groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.code}</MenuItem>)}</Select></FormControl><Button variant="contained" disabled={!copyForm.source || !copyForm.target || !copyForm.group || copyForm.source === copyForm.target} onClick={() => void run(async () => { const result = await copySchedule(copyForm.source, copyForm.target, copyForm.group); setMessage(`Скопировано занятий: ${result.created}`) }, 'Расписание скопировано')}>Копировать</Button></Stack></Card>
    </Stack>}

    {tab === 2 && <Stack direction={{ xs: 'column', xl: 'row' }} spacing={1} alignItems="stretch">
      <Card sx={{ p: 2, width: { xl: 420 } }}><Typography variant="h6" sx={{ mb: 1.5 }}>Новый пользователь</Typography><form onSubmit={submitUser}><Stack spacing={1.25}><TextField label="ФИО" required value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} /><TextField label="Email" type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /><TextField label="Пароль" type="password" required inputProps={{ minLength: 8 }} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /><FormControl><InputLabel>Роль</InputLabel><Select label="Роль" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}><MenuItem value="student">Студент</MenuItem><MenuItem value="admin">Администратор</MenuItem></Select></FormControl>{userForm.role === 'student' && <FormControl><InputLabel>Группа</InputLabel><Select label="Группа" value={userForm.group_id || ''} onChange={(e) => setUserForm({ ...userForm, group_id: Number(e.target.value) })}>{groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.code}</MenuItem>)}</Select></FormControl>}<Button type="submit" variant="contained">Создать пользователя</Button></Stack></form></Card>
      <Card sx={{ flex: 1 }}><TableContainer sx={{ maxHeight: 'calc(100dvh - 150px)' }}><Table stickyHeader size="small"><TableHead><TableRow><TableCell>ФИО</TableCell><TableCell>Email</TableCell><TableCell>Роль</TableCell><TableCell>Группа</TableCell><TableCell>Состояние</TableCell><TableCell /></TableRow></TableHead><TableBody>{users.map((u) => <TableRow key={u.id}><TableCell sx={{ fontWeight: 600 }}>{u.full_name}</TableCell><TableCell>{u.email}</TableCell><TableCell>{u.role === 'admin' ? 'Администратор' : 'Студент'}</TableCell><TableCell>{u.group_code ?? '—'}</TableCell><TableCell>{u.is_active ? 'Активен' : 'Отключен'}</TableCell><TableCell><Button size="small" onClick={() => void run(() => updateUser(u.id, { is_active: !u.is_active }), u.is_active ? 'Пользователь отключен' : 'Пользователь включен')}>{u.is_active ? 'Отключить' : 'Включить'}</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer></Card>
    </Stack>}
  </Box>
}
