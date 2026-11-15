import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { RoleGuard } from './components/RoleGuard.js';
import { AppShell } from './components/AppShell.js';

import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { CreateCirclePage } from './pages/CreateCirclePage.js';
import { ElderTodayPage } from './pages/ElderTodayPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { MedicationsPage } from './pages/MedicationsPage.js';
import { ApprovalsPage } from './pages/ApprovalsPage.js';
import { AppointmentsPage } from './pages/AppointmentsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { EmergencyPage } from './pages/EmergencyPage.js';
import { ForbiddenPage } from './pages/ForbiddenPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Unauthenticated Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/create-circle" element={<CreateCirclePage />} />

              {/* Protected App Routes inside AppShell */}
              <Route element={<RoleGuard><AppShell /></RoleGuard>}>
                <Route path="/today" element={<ElderTodayPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/medications" element={<MedicationsPage />} />
                <Route
                  path="/approvals"
                  element={
                    <RoleGuard allowedRoles={['elder']}>
                      <ApprovalsPage />
                    </RoleGuard>
                  }
                />
                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/emergency" element={<EmergencyPage />} />
                <Route path="/403" element={<ForbiddenPage />} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
