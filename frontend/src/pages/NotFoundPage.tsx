import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
export default function NotFoundPage() { const navigate = useNavigate(); return <Box sx={{ p: 4 }}><Typography variant="h5">Страница не найдена</Typography><Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/schedule')}>К расписанию</Button></Box> }
