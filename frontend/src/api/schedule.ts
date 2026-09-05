import api from './client'
import type { Lesson, LessonInput, WeekSchedule } from '../types'

export async function getLessons(groupId?: number, semesterId?: number): Promise<Lesson[]> {
  return (await api.get('/lessons', { params: { group_id: groupId, semester_id: semesterId } })).data
}
export async function createLesson(payload: LessonInput): Promise<Lesson> { return (await api.post('/lessons', payload)).data }
export async function updateLesson(id: number, payload: Partial<LessonInput>): Promise<Lesson> { return (await api.patch(`/lessons/${id}`, payload)).data }
export async function deleteLesson(id: number): Promise<void> { await api.delete(`/lessons/${id}`) }
export async function getWeekSchedule(date: string, groupId?: number, semesterId?: number): Promise<WeekSchedule> {
  return (await api.get('/schedule/week', { params: { date, group_id: groupId, semester_id: semesterId } })).data
}
export async function cancelOccurrence(lessonId: number, lesson_date: string, reason: string) {
  return (await api.post(`/lessons/${lessonId}/cancellations`, { lesson_date, reason })).data
}
export async function restoreOccurrence(cancellationId: number) { await api.delete(`/lessons/cancellations/${cancellationId}`) }
