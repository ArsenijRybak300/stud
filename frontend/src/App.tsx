import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import SchedulePage from './pages/SchedulePage'
import TasksPage from './pages/TasksPage'
import { useAuth } from './context/AuthContext'

function AdminOnly() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <AdminPage /> : <Navigate to="/schedule" replace />
}

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AppShell />}>
      <Route index element={<Navigate to="/schedule" replace />} />
      <Route path="schedule" element={<SchedulePage />} />
      <Route path="tasks" element={<TasksPage />} />
      <Route path="admin" element={<AdminOnly />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route></Route>
  </Routes></BrowserRouter>
}
