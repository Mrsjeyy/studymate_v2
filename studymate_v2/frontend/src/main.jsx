import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import StudyMate from './StudyMate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StudyMate />
  </StrictMode>,
)
