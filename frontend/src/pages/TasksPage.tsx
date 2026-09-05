import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { format, isBefore, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getGroups } from '../api/admin'
import { apiErrorMessage, downloadProtected } from '../api/client'
import { addSubmissionComment, completeSubmission, createTask, deleteTask, scoreSubmission, getTask, getTasks, reopenSubmission, startTask, submitTask, uploadSubmissionFile, uploadTaskAttachment } from '../api/tasks'
import { useAuth } from '../context/AuthContext'
import type { StudyGroup, Task, TaskPriority, TaskStatus, TaskSubmission } from '../types'

const statusLabels: Record<TaskStatus, string> = { assigned: 'Назначено', in_progress: 'В работе', submitted: 'Отправлено', completed: 'Выполнено' }
const statusColors: Record<TaskStatus, 'default' | 'primary' | 'warning' | 'success'> = { assigned: 'default', in_progress: 'primary', submitted: 'warning', completed: 'success' }

function TaskCreateDialog({ open, groups, defaultGroupId, onClose, onSaved }: { open: boolean; groups: StudyGroup[]; defaultGroupId: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ group_id: defaultGroupId, title: '', description: '', subject: '', due_at: '', priority: 'medium' as TaskPriority, max_score: 100 })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setForm({ group_id: defaultGroupId, title: '', description: '', subject: '', due_at: '', priority: 'medium', max_score: 100 }); setFile(null); setError('') } }, [open, defaultGroupId])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const task = await createTask({ ...form, description: form.description || null, subject: form.subject || null, due_at: form.due_at ? new Date(form.due_at).toISOString() : null })
      if (file) await uploadTaskAttachment(task.id, file)
      await onSaved(); onClose()
    } catch (e) { setError(apiErrorMessage(e)) } finally { setBusy(false) }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><form onSubmit={submit}>
    <DialogTitle>Новое задание для группы</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <FormControl><InputLabel>Группа</InputLabel><Select label="Группа" value={form.group_id || ''} onChange={(e) => setForm({ ...form, group_id: Number(e.target.value) })}>{groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.code}</MenuItem>)}</Select></FormControl>
      <TextField label="Название" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <TextField label="Дисциплина" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      <TextField label="Максимальный балл" type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: Number(e.target.value) })} />
      <TextField label="Описание" multiline minRows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField fullWidth label="Срок" type="datetime-local" InputLabelProps={{ shrink: true }} value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /><FormControl fullWidth><InputLabel>Приоритет</InputLabel><Select label="Приоритет" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}><MenuItem value="low">Низкий</MenuItem><MenuItem value="medium">Средний</MenuItem><MenuItem value="high">Высокий</MenuItem></Select></FormControl></Stack>
      <Button component="label" variant="outlined">{file ? file.name : 'Прикрепить файл задания'}<input hidden type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Button>
    </Stack></DialogContent><DialogActions><Button onClick={onClose}>Отмена</Button><Button type="submit" variant="contained" disabled={busy || !form.group_id}>{busy ? 'Сохранение…' : 'Создать'}</Button></DialogActions>
  </form></Dialog>
}

function StudentTaskDialog({ taskId, open, onClose, onChanged }: { taskId: number | null; open: boolean; onClose: () => void; onChanged: () => Promise<void> }) {
  const [task, setTask] = useState<Task | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => { if (!taskId) return; try { setTask(await getTask(taskId)); setError('') } catch (e) { setError(apiErrorMessage(e)) } }, [taskId])
  useEffect(() => { if (open) void load() }, [open, load])
  const action = async (fn: () => Promise<unknown>) => { try { setError(''); await fn(); await load(); await onChanged() } catch (e) { setError(apiErrorMessage(e)) } }
  const submission = task?.my_submission
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"><DialogTitle>{task?.title ?? 'Задание'}</DialogTitle><DialogContent>
    {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
    {task && <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center"><Chip label={statusLabels[submission?.status ?? 'assigned']} color={statusColors[submission?.status ?? 'assigned']} /><Typography variant="body2" color="text.secondary">{task.subject ?? 'Без дисциплины'} · группа {task.group_code}</Typography></Stack>
      {task.description && <Typography sx={{ whiteSpace: 'pre-wrap' }}>{task.description}</Typography>}
      <Typography variant="body2"><b>Срок:</b> {task.due_at ? format(parseISO(task.due_at), 'd MMMM yyyy, HH:mm', { locale: ru }) : 'не указан'}</Typography>
      {task.attachments.length > 0 && <Box><Typography sx={{ fontWeight: 600, mb: .5 }}>Материалы задания</Typography>{task.attachments.map((item) => <Button key={item.id} size="small" onClick={() => void downloadProtected(item.download_url, item.original_name)}>{item.original_name}</Button>)}</Box>}
      <Box sx={{ borderTop: '1px solid #d4dbe0', pt: 1.5 }}><Typography sx={{ fontWeight: 600, mb: 1 }}>Ответ студента</Typography>
        {submission?.files.map((item) => <Button key={item.id} size="small" onClick={() => void downloadProtected(item.download_url, item.original_name)}>{item.original_name}</Button>)}
        {(submission?.status === 'assigned' || submission?.status === 'in_progress') && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}><Button variant="outlined" component="label">{file ? file.name : 'Выбрать файл'}<input hidden type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Button><Button variant="outlined" disabled={!file} onClick={() => file && void action(async () => { await uploadSubmissionFile(task.id, file); setFile(null) })}>Загрузить</Button></Stack>}
      </Box>
      {submission?.comments.length ? <Box><Typography sx={{ fontWeight: 600, mb: .5 }}>Комментарии администратора</Typography>{submission.comments.map((comment) => <Box key={comment.id} sx={{ border: '1px solid #d4dbe0', p: 1, mb: .5 }}><Typography sx={{ fontSize: 12, fontWeight: 600 }}>{comment.author_name}</Typography><Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{comment.text}</Typography></Box>)}</Box> : null}
    </Stack>}
  </DialogContent><DialogActions>
    {task?.my_submission?.status === 'assigned' && <Button variant="contained" onClick={() => void action(() => startTask(task.id))}>Взять в работу</Button>}
    {task?.my_submission?.status === 'in_progress' && <Button variant="contained" disabled={!task.my_submission.files.length} onClick={() => void action(() => submitTask(task.id))}>Отправить выполненное</Button>}
    <Button onClick={onClose}>Закрыть</Button>
  </DialogActions></Dialog>
}

function AdminTaskDialog({ taskId, open, onClose, onChanged }: { taskId: number | null; open: boolean; onClose: () => void; onChanged: () => Promise<void> }) {
  const [task, setTask] = useState<Task | null>(null)
  const [selected, setSelected] = useState<TaskSubmission | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => { if (!taskId) return; try { const value = await getTask(taskId); setTask(value); const currentId = selected?.id; setSelected(value.submissions?.find((x) => x.id === currentId) ?? value.submissions?.[0] ?? null); setError('') } catch (e) { setError(apiErrorMessage(e)) } }, [taskId, selected?.id])
  useEffect(() => { if (open) { setSelected(null); void load() } }, [open, taskId])
  const action = async (fn: () => Promise<unknown>) => { try { await fn(); setComment(''); await load(); await onChanged() } catch (e) { setError(apiErrorMessage(e)) } }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg"><DialogTitle>{task?.title ?? 'Проверка задания'}</DialogTitle><DialogContent>
    {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
    {task && <Stack spacing={1.5}><Typography color="text.secondary">{task.group_code} · {task.subject ?? 'Без дисциплины'} · максимум {task.max_score} баллов · сдано {task.submitted_count}, выполнено {task.completed_count} из {task.submissions_total}</Typography>
      <TableContainer sx={{ border: '1px solid #d4dbe0', maxHeight: 280 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell>Студент</TableCell><TableCell>Статус</TableCell><TableCell>Файлы</TableCell><TableCell /></TableRow></TableHead><TableBody>{task.submissions?.map((item) => <TableRow key={item.id} selected={selected?.id === item.id}><TableCell>{item.student_name}<br /><Typography variant="caption" color="text.secondary">{item.student_email}</Typography></TableCell><TableCell><Chip size="small" label={statusLabels[item.status]} color={statusColors[item.status]} /></TableCell><TableCell>{item.files.length}</TableCell><TableCell><Button size="small" onClick={() => setSelected(item)}>Открыть</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>
      {selected && <Card sx={{ p: 1.5 }}><Stack spacing={1}><Typography sx={{ fontWeight: 600 }}>{selected.student_name}</Typography><Stack direction="row" spacing={.5} flexWrap="wrap">{selected.files.length ? selected.files.map((item) => <Button key={item.id} size="small" variant="outlined" onClick={() => void downloadProtected(item.download_url, item.original_name)}>{item.original_name}</Button>) : <Typography color="text.secondary">Файл не загружен</Typography>}</Stack>
        {selected.comments.map((item) => <Box key={item.id} sx={{ bgcolor: '#f1f3f5', border: '1px solid #d4dbe0', p: 1 }}><Typography sx={{ fontSize: 12, fontWeight: 600 }}>{item.author_name}</Typography><Typography sx={{ fontSize: 13 }}>{item.text}</Typography></Box>)}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><TextField fullWidth label="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} /><Button variant="outlined" disabled={!comment.trim()} onClick={() => void action(() => addSubmissionComment(selected.id, comment))}>Добавить</Button></Stack>
        <Stack direction="row" spacing={1} alignItems="center"><TextField size="small" type="number" label={`Оценка / ${task.max_score}`} inputProps={{ min: 0, max: task.max_score }} onChange={(e) => setSelected({ ...selected, score: Number(e.target.value) })} /><Button variant="outlined" onClick={() => selected.score !== null && void action(() => scoreSubmission(selected.id, selected.score!))}>Сохранить оценку</Button></Stack>
        <Stack direction="row" spacing={1}>{selected.status === 'submitted' && <Button color="success" variant="contained" onClick={() => void action(() => completeSubmission(selected.id))}>Отметить выполненным</Button>}{(selected.status === 'submitted' || selected.status === 'completed') && <Button variant="outlined" onClick={() => void action(() => reopenSubmission(selected.id))}>Вернуть в работу</Button>}</Stack>
      </Stack></Card>}
    </Stack>}
  </DialogContent><DialogActions><Button onClick={onClose}>Закрыть</Button></DialogActions></Dialog>
}

export default function TasksPage() {
  const { user } = useAuth()
  const admin = user?.role === 'admin'
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [groupId, setGroupId] = useState(0)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<'all' | TaskStatus>('all')
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  useEffect(() => { if (admin) getGroups().then((value) => { setGroups(value); if (value[0]) setGroupId(value[0].id) }).catch((e) => setError(apiErrorMessage(e))) }, [admin])
  const load = useCallback(async () => { if (admin && !groupId) return; try { setTasks(await getTasks(admin ? groupId : undefined)); setError('') } catch (e) { setError(apiErrorMessage(e)) } }, [admin, groupId])
  useEffect(() => { void load() }, [load])
  const visible = tasks.filter((task) => filter === 'all' || task.my_submission?.status === filter)
  return <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
    <Card sx={{ p: 1 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
      {admin ? <FormControl sx={{ minWidth: 210 }}><InputLabel>Группа</InputLabel><Select label="Группа" value={groupId || ''} onChange={(e) => setGroupId(Number(e.target.value))}>{groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.code}</MenuItem>)}</Select></FormControl> : <FormControl sx={{ minWidth: 190 }}><InputLabel>Статус</InputLabel><Select label="Статус" value={filter} onChange={(e) => setFilter(e.target.value as 'all' | TaskStatus)}><MenuItem value="all">Все задания</MenuItem>{Object.entries(statusLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl>}
      <Typography sx={{ ml: { md: 'auto' }, fontSize: 13, color: 'text.secondary' }}>{admin ? 'Задания назначаются всей учебной группе' : `Группа ${user?.group_code}`}</Typography>
      {admin && <Button variant="contained" onClick={() => setCreateOpen(true)}>Создать задание</Button>}
    </Stack></Card>
    {error && <Alert severity="error">{error}</Alert>}
    <Card sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><TableContainer sx={{ height: '100%' }}><Table stickyHeader size="small"><TableHead><TableRow><TableCell>Задание</TableCell><TableCell>Дисциплина</TableCell><TableCell>Срок</TableCell><TableCell>Статус</TableCell><TableCell>Результат</TableCell><TableCell /></TableRow></TableHead><TableBody>{visible.map((task) => {
      const status = task.my_submission?.status ?? 'assigned'; const overdue = Boolean(task.due_at && status !== 'completed' && isBefore(parseISO(task.due_at), new Date()))
      return <TableRow key={task.id} hover><TableCell><Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{task.title}</Typography><Typography variant="caption" color="text.secondary">Группа {task.group_code}</Typography></TableCell><TableCell>{task.subject ?? '—'}</TableCell><TableCell sx={{ color: overdue ? 'error.main' : 'inherit' }}>{task.due_at ? format(parseISO(task.due_at), 'dd.MM.yyyy HH:mm') : 'Без срока'}{overdue ? ' · просрочено' : ''}</TableCell><TableCell>{admin ? <Typography variant="body2">Сдано: {task.submitted_count}<br />Выполнено: {task.completed_count}/{task.submissions_total}</Typography> : <Chip size="small" label={statusLabels[status]} color={statusColors[status]} />}</TableCell><TableCell>{admin ? `${task.attachments.length} файл(ов)` : `${task.my_submission?.files.length ?? 0} файл(ов)`}</TableCell><TableCell><Stack direction="row" spacing={.5}><Button size="small" onClick={() => setDetailId(task.id)}>{admin ? 'Проверить' : 'Открыть'}</Button>{admin && <Button size="small" color="error" onClick={() => { if (confirm(`Удалить «${task.title}»?`)) void deleteTask(task.id).then(load).catch((e) => setError(apiErrorMessage(e))) }}>Удалить</Button>}</Stack></TableCell></TableRow>
    })}{visible.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>Заданий нет</TableCell></TableRow>}</TableBody></Table></TableContainer></Card>
    {admin ? <><TaskCreateDialog open={createOpen} groups={groups} defaultGroupId={groupId} onClose={() => setCreateOpen(false)} onSaved={load} /><AdminTaskDialog open={Boolean(detailId)} taskId={detailId} onClose={() => setDetailId(null)} onChanged={load} /></> : <StudentTaskDialog open={Boolean(detailId)} taskId={detailId} onClose={() => setDetailId(null)} onChanged={load} />}
  </Box>
}
