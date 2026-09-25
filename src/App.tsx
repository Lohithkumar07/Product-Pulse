import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { DatasetProvider } from './context/DatasetContext';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { FeedbackDetailPage } from './pages/FeedbackDetailPage';
import { ImportPage } from './pages/ImportPage';
import { InsightsPage } from './pages/InsightsPage';
import { DecisionsPage } from './pages/DecisionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <ToastProvider>
      <DatasetProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Application Layout */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/feedback/:id" element={<FeedbackDetailPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/decisions" element={<DecisionsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </DatasetProvider>
    </ToastProvider>
  );
}
