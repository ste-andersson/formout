import { ClerkProvider } from '@clerk/clerk-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { AdminHome } from './routes/AdminHome.tsx'
import { FormEditor } from './routes/FormEditor.tsx'
import { FormViewer } from './routes/FormViewer.tsx'
import { RespondentHome } from './routes/RespondentHome.tsx'
import { ResponseEditor } from './routes/ResponseEditor.tsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<App />}>
                <Route index element={<RespondentHome />} />
                <Route path="forms/:slug" element={<FormViewer />} />
                <Route path="responses/:responseId" element={<ResponseEditor />} />
                <Route path="admin" element={<AdminHome />} />
                <Route path="admin/forms/new" element={<FormEditor />} />
                <Route path="admin/forms/:id/edit" element={<FormEditor />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
)
