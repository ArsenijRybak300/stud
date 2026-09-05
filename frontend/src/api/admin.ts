import api from './client'
import type { Semester, StudyGroup, User, UserRole } from '../types'

export async function getGroups(): Promise<StudyGroup[]> { return (await api.get('/groups')).data }
export async function createGroup(payload: { code: string; name?: string }): Promise<StudyGroup> { return (await api.post('/groups', payload)).data }

export async function getSemesters(): Promise<Semester[]> { return (await api.get('/semesters')).data }
export async function createSemester(payload: { name: string; starts_on: string; ends_on: string }): Promise<Semester> { return (await api.post('/semesters', payload)).data }
export async function copySchedule(sourceId: number, target_semester_id: number, group_id: number): Promise<{ created: number }> {
  return (await api.post(`/semesters/${sourceId}/copy-schedule`, { target_semester_id, group_id })).data
}

export async function getUsers(groupId?: number): Promise<User[]> { return (await api.get('/users', { params: groupId ? { group_id: groupId } : undefined })).data }
export async function createUser(payload: { email: string; full_name: string; password: string; role: UserRole; group_id: number | null }): Promise<User> {
  return (await api.post('/users', payload)).data
}
export async function updateUser(id: number, payload: Partial<{ full_name: string; password: string; role: UserRole; group_id: number | null; is_active: boolean }>): Promise<User> {
  return (await api.patch(`/users/${id}`, payload)).data
}
