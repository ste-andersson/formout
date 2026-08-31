import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import { AdminHome } from './routes/AdminHome.tsx'
import { FormViewer } from './routes/FormViewer.tsx'
import { RespondentHome } from './routes/RespondentHome.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<RespondentHome />} />
          <Route path="forms/:slug" element={<FormViewer />} />
          <Route path="admin" element={<AdminHome />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
