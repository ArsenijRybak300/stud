import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { addWeeks, format, parseISO, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getGroups, getSemesters } from '../api/admin'
import { apiErrorMessage } from '../api/client'
import { cancelOccurrence, createLesson, deleteLesson, getWeekSchedule, restoreOccurrence, updateLesson } from '../api/schedule'
import { useAuth } from '../context/AuthContext'
import type { Lesson, LessonInput, Semester, StudyGroup, WeekSchedule, WeekType } from '../types'

const shortDays = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const fullDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
const slots = [
  ['08:30', '10:00'], ['10:15', '11:45'], ['12:00', '13:30'], ['14:15', '15:45'],
  ['16:00', '17:30'], ['17:40', '19:10'], ['19:15', '20:45'],
]
const brandBlue = '#1f4e79'
const emptyDayBlue = 'rgba(31, 78, 121, 0.08)'
const weekendBlue = 'rgba(31, 78, 121, 0.03)'
const todayBlue = 'rgba(31, 78, 121, 0.10)'
const gridBorder = '1px solid #c9d5e1'

const lessonStyle = (type: string | null) => {
  const value = (type ?? '').toLowerCase()
  if (value.includes('лаб')) return { bg: '#FFF3E0', border: '#E8CFA0', label: 'Лабораторная' }
  if (value.includes('практ')) return { bg: '#E8F7EE', border: '#B8DCC5', label: 'Практика' }
  if (value.includes('лек')) return { bg: '#E8F1FF', border: '#B8CDEB', label: 'Лекция' }
  return { bg: '#F4F7FA', border: '#C9D5E1', label: type || 'Занятие' }
}

const blank = (groupId: number, semesterId: number, weekday = 0): LessonInput => ({
  group_id: groupId, semester_id: semesterId, subject: '', teacher: '', room: '', lesson_type: 'Лекция', weekday,
  start_time: '08:30', end_time: '10:00', week_type: 'every', notes: '',
})

function LessonDialog({ open, lesson, groupId, semesterId, weekday, onClose, onSaved }: { open: boolean; lesson: Lesson | null; groupId: number; semesterId: number; weekday: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<LessonInput>(blank(groupId, semesterId, weekday))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setForm(lesson ? {
      group_id: lesson.group_id, semester_id: lesson.semester_id, subject: lesson.subject, teacher: lesson.teacher ?? '', room: lesson.room ?? '', lesson_type: lesson.lesson_type ?? '', weekday: lesson.weekday,
      start_time: lesson.start_time.slice(0, 5), end_time: lesson.end_time.slice(0, 5), week_type: lesson.week_type, notes: lesson.notes ?? '',
    } : blank(groupId, semesterId, weekday)); setError('')
  }, [open, lesson, groupId, semesterId, weekday])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const payload = { ...form, teacher: form.teacher || null, room: form.room || null, lesson_type: form.lesson_type || null, notes: form.notes || null }
      if (lesson) await updateLesson(lesson.id, payload); else await createLesson(payload)
      await onSaved(); onClose()
    } catch (e) { setError(apiErrorMessage(e)) } finally { setBusy(false) }
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><form onSubmit={submit}>
    <DialogTitle>{lesson ? 'Редактирование занятия' : 'Новое занятие'}</DialogTitle>
    <DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Дисциплина" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField fullWidth label="Преподаватель" value={form.teacher ?? ''} onChange={(e) => setForm({ ...form, teacher: e.target.value })} /><TextField fullWidth label="Аудитория" value={form.room ?? ''} onChange={(e) => setForm({ ...form, room: e.target.value })} /></Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><FormControl fullWidth><InputLabel>Тип занятия</InputLabel><Select label="Тип занятия" value={form.lesson_type ?? ''} onChange={(e) => setForm({ ...form, lesson_type: e.target.value })}><MenuItem value="Лекция">Лекция</MenuItem><MenuItem value="Практика">Практика</MenuItem><MenuItem value="Лабораторная">Лабораторная</MenuItem></Select></FormControl><FormControl fullWidth><InputLabel>День недели</InputLabel><Select label="День недели" value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>{fullDays.map((day, index) => <MenuItem key={day} value={index}>{day}</MenuItem>)}</Select></FormControl></Stack>
      <Stack direction="row" spacing={1.5}><TextField fullWidth label="Начало" type="time" InputLabelProps={{ shrink: true }} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /><TextField fullWidth label="Окончание" type="time" InputLabelProps={{ shrink: true }} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></Stack>
      <FormControl><InputLabel>Повторение</InputLabel><Select label="Повторение" value={form.week_type} onChange={(e) => setForm({ ...form, week_type: e.target.value as WeekType })}><MenuItem value="every">Каждую неделю</MenuItem><MenuItem value="odd">Нечетные недели</MenuItem><MenuItem value="even">Четные недели</MenuItem></Select></FormControl>
      <TextField label="Примечание" multiline minRows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    </Stack></DialogContent>
    <DialogActions><Button onClick={onClose}>Отмена</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить'}</Button></DialogActions>
  </form></Dialog>
}

export default function SchedulePage() {
  const { user } = useAuth()
  const admin = user?.role === 'admin'
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [groupId, setGroupId] = useState<number>(0)
  const [semesterId, setSemesterId] = useState<number>(0)
  const [anchor, setAnchor] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState<{ open: boolean; lesson: Lesson | null; weekday: number }>({ open: false, lesson: null, weekday: 0 })

  useEffect(() => {
    if (!admin) return
    Promise.all([getGroups(), getSemesters()]).then(([g, s]) => {
      setGroups(g); setSemesters(s); if (g[0]) setGroupId(g[0].id); if (s[0]) setSemesterId(s[0].id)
    }).catch((e) => setError(apiErrorMessage(e)))
  }, [admin])

  const load = useCallback(async () => {
    if (admin && (!groupId || !semesterId)) return
    setLoading(true); setError('')
    try { setSchedule(await getWeekSchedule(format(anchor, 'yyyy-MM-dd'), admin ? groupId : undefined, admin ? semesterId : undefined)) }
    catch (e) { setSchedule(null); setError(apiErrorMessage(e)) } finally { setLoading(false) }
  }, [admin, groupId, semesterId, anchor])
  useEffect(() => { void load() }, [load])

  const timeRows = useMemo(() => {
    const values = new Map(slots.map(([start, end]) => [start, end]))
    schedule?.days.forEach((day) => day.lessons.forEach((item) => values.set(item.lesson.start_time.slice(0, 5), item.lesson.end_time.slice(0, 5))))
    return [...values.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [schedule])

  const dayHasLessons = useMemo(() => Object.fromEntries((schedule?.days ?? []).map((day) => [day.date, day.lessons.length > 0])), [schedule])

  const remove = async (lesson: Lesson) => { if (confirm(`Удалить занятие «${lesson.subject}» из шаблона семестра?`)) { try { await deleteLesson(lesson.id); await load() } catch (e) { setError(apiErrorMessage(e)) } } }
  const cancel = async (lesson: Lesson, date: string) => { const reason = prompt('Причина отмены занятия:'); if (!reason) return; try { await cancelOccurrence(lesson.id, date, reason); await load() } catch (e) { setError(apiErrorMessage(e)) } }
  const restore = async (id: number) => { try { await restoreOccurrence(id); await load() } catch (e) { setError(apiErrorMessage(e)) } }

  return <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Card sx={{ p: 1.5 }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25} alignItems={{ lg: 'center' }}>
        {admin ? <><FormControl sx={{ minWidth: 210 }}><InputLabel>Группа</InputLabel><Select label="Группа" value={groupId || ''} onChange={(e) => setGroupId(Number(e.target.value))}>{groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.code}</MenuItem>)}</Select></FormControl><FormControl sx={{ minWidth: 250 }}><InputLabel>Семестр</InputLabel><Select label="Семестр" value={semesterId || ''} onChange={(e) => setSemesterId(Number(e.target.value))}>{semesters.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></> : <Typography sx={{ fontWeight: 700, mr: 1, fontSize: 18 }}>Группа {user?.group_code}</Typography>}
        <Stack direction="row" spacing={1}><Button variant="outlined" sx={{ minWidth: 54, minHeight: 40 }} onClick={() => setAnchor(addWeeks(anchor, -1))}>←</Button><Button variant="outlined" sx={{ minHeight: 40, px: 2 }} onClick={() => setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Текущая неделя</Button><Button variant="outlined" sx={{ minWidth: 54, minHeight: 40 }} onClick={() => setAnchor(addWeeks(anchor, 1))}>→</Button></Stack>
        <Typography sx={{ ml: { lg: 'auto' }, fontSize: 15, color: 'text.secondary', fontWeight: 500 }}>{schedule ? `${format(parseISO(schedule.week_start), 'd MMMM', { locale: ru })} — ${format(parseISO(schedule.week_end), 'd MMMM yyyy', { locale: ru })}` : ''}</Typography>
        {admin && <Button variant="contained" disabled={!groupId || !semesterId} onClick={() => setDialog({ open: true, lesson: null, weekday: 0 })}>Добавить занятие</Button>}
      </Stack>
    </Card>
    {error && <Alert severity="error">{error}</Alert>}
    <Card sx={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
      <TableContainer sx={{ height: '100%' }}>
        <Table stickyHeader size="medium" sx={{ minWidth: 1360, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 112, borderRight: gridBorder, borderBottom: gridBorder, fontSize: 16, fontWeight: 700 }}>Время</TableCell>
              {schedule?.days.map((day, index) => {
                const isToday = format(new Date(), 'yyyy-MM-dd') === day.date
                const isEmpty = !dayHasLessons[day.date]
                return <TableCell key={day.date} align="center" sx={{ borderRight: gridBorder, borderBottom: gridBorder, bgcolor: isToday ? todayBlue : isEmpty ? emptyDayBlue : day.weekday >= 5 ? weekendBlue : '#f4f7fa', py: 1.5 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, textTransform: 'lowercase' }}>{shortDays[index]} {format(parseISO(day.date), 'dd.MM')}</Typography>
                  {isEmpty && <Typography sx={{ mt: .5, fontSize: 12.5, color: brandBlue, opacity: .72 }}>Нет занятий</Typography>}
                </TableCell>
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeRows.map(([start, end], rowIndex) => <TableRow key={start} sx={{ height: 112 }}>
              <TableCell sx={{ verticalAlign: 'top', borderRight: gridBorder, borderBottom: gridBorder, bgcolor: '#f8fafc', px: 1.25, py: 1.25 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{start}</Typography>
                <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: 14, lineHeight: 1.2 }}>{end}</Typography>
              </TableCell>
              {schedule?.days.map((day) => {
                const entries = day.lessons.filter((item) => item.lesson.start_time.slice(0, 5) === start)
                const isEmptyDay = !dayHasLessons[day.date]
                const cellBackground = isEmptyDay ? emptyDayBlue : day.weekday >= 5 ? weekendBlue : '#fff'
                return <TableCell key={day.date} sx={{ verticalAlign: 'top', p: 1, borderRight: gridBorder, borderBottom: gridBorder, bgcolor: cellBackground }}>
                  {isEmptyDay && rowIndex === 0 && <Box sx={{ minHeight: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(31, 78, 121, 0.22)', bgcolor: 'rgba(255,255,255,0.24)', borderRadius: 1 }}>
                    <Typography sx={{ fontSize: 15, color: brandBlue, opacity: .8, fontWeight: 600 }}>Свободный день</Typography>
                  </Box>}
                  {entries.map((item) => {
                    const style = item.cancelled ? { bg: '#FDECEC', border: '#E2B4B4', label: 'Отменено' } : lessonStyle(item.lesson.lesson_type)
                    return <Box key={item.lesson.id} sx={{ border: '1px solid', borderColor: style.border, bgcolor: style.bg, p: 1.25, mb: .9, borderRadius: 1, minHeight: 88, opacity: item.cancelled ? .82 : 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary', mb: .5 }}>{style.label}</Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, textDecoration: item.cancelled ? 'line-through' : 'none' }}>{item.lesson.subject}</Typography>
                    <Typography sx={{ mt: .6, fontSize: 13.5, color: 'text.secondary', lineHeight: 1.35 }}>{[item.lesson.teacher, item.lesson.room && `ауд. ${item.lesson.room}`].filter(Boolean).join(' · ')}</Typography>
                    {item.cancelled && <Typography sx={{ mt: .75, fontSize: 12.5, color: 'error.main', fontWeight: 600 }}>Причина: {item.cancellation_reason}</Typography>}
                    {admin && <Stack direction="row" spacing={.5} sx={{ mt: 1, flexWrap: 'wrap' }}><Button size="small" variant="text" onClick={() => setDialog({ open: true, lesson: item.lesson, weekday: item.lesson.weekday })}>Изменить</Button>{item.cancelled ? <Button size="small" onClick={() => void restore(item.cancellation_id!)}>Вернуть</Button> : <Button size="small" color="warning" onClick={() => void cancel(item.lesson, item.date)}>Отменить дату</Button>}<Button size="small" color="error" onClick={() => void remove(item.lesson)}>Удалить</Button></Stack>}
                  </Box>})}
                  {admin && entries.length === 0 && !isEmptyDay && <Button fullWidth sx={{ minHeight: 88, color: 'text.secondary', fontSize: 14, border: '1px dashed #c3cfdb', bgcolor: '#fafbfd' }} onClick={() => setDialog({ open: true, lesson: null, weekday: day.weekday })}>+ добавить занятие</Button>}
                </TableCell>
              })}
            </TableRow>)}
          </TableBody>
        </Table>
      </TableContainer>
      {loading && <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />}
    </Card>
    {admin && <LessonDialog open={dialog.open} lesson={dialog.lesson} groupId={groupId} semesterId={semesterId} weekday={dialog.weekday} onClose={() => setDialog({ ...dialog, open: false })} onSaved={load} />}
  </Box>
}
