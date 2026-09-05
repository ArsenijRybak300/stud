import api from './client'
import type { FileInfo, Task, TaskPriority, TaskSubmission } from '../types'

export async function getTasks(groupId?: number): Promise<Task[]> { return (await api.get('/tasks', { params: groupId ? { group_id: groupId } : undefined })).data }
export async function getTask(id: number): Promise<Task> { return (await api.get(`/tasks/${id}`)).data }
export async function createTask(payload: { group_id: number; title: string; description?: string | null; subject?: string | null; due_at?: string | null; priority: TaskPriority; max_score?: number }): Promise<Task> {
  return (await api.post('/tasks', payload)).data
}
export async function deleteTask(id: number): Promise<void> { await api.delete(`/tasks/${id}`) }
export async function uploadTaskAttachment(id: number, file: File): Promise<FileInfo> {
  const form = new FormData(); form.append('file', file)
  return (await api.post(`/tasks/${id}/attachments`, form)).data
}
export async function startTask(id: number): Promise<TaskSubmission> { return (await api.post(`/tasks/${id}/start`)).data }
export async function uploadSubmissionFile(id: number, file: File): Promise<FileInfo> {
  const form = new FormData(); form.append('file', file)
  return (await api.post(`/tasks/${id}/submission-files`, form)).data
}
export async function submitTask(id: number): Promise<TaskSubmission> { return (await api.post(`/tasks/${id}/submit`)).data }
export async function completeSubmission(id: number): Promise<TaskSubmission> { return (await api.post(`/tasks/submissions/${id}/complete`)).data }
export async function scoreSubmission(id: number, score: number): Promise<TaskSubmission> { return (await api.post(`/tasks/submissions/${id}/score`, null, { params: { score } })).data }
export async function reopenSubmission(id: number): Promise<TaskSubmission> { return (await api.post(`/tasks/submissions/${id}/reopen`)).data }
export async function addSubmissionComment(id: number, text: string) { return (await api.post(`/tasks/submissions/${id}/comments`, { text })).data }
