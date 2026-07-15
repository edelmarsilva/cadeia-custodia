import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OperationsPage from '@/pages/OperationsPage';
import OperationFormPage from '@/pages/OperationFormPage';
import OperationDetailPage from '@/pages/OperationDetailPage';
import TargetDetailPage from '@/pages/TargetDetailPage';
import TargetFormPage from '@/pages/TargetFormPage';
import TargetHistorySearchPage from '@/pages/TargetHistorySearchPage';
import TargetSearchPage from '@/pages/TargetSearchPage';
import DeploymentTeamFormPage from '@/pages/DeploymentTeamFormPage';
import DeviceDetailPage from '@/pages/DeviceDetailPage';
import DeviceFormPage from '@/pages/DeviceFormPage';
import CustodyMovementFormPage from '@/pages/CustodyMovementFormPage';
import AuditPage from '@/pages/AuditPage';
import UsersPage from '@/pages/UsersPage';
import UserFormPage from '@/pages/UserFormPage';
import ReportTemplatesPage from '@/pages/ReportTemplatesPage';
import GenerateReportPage from '@/pages/GenerateReportPage';
import GenerateDocumentPage from '@/pages/GenerateDocumentPage';
import GeneratedReportsPage from '@/pages/GeneratedReportsPage';
import StatisticsPage from '@/pages/StatisticsPage';
import FieldImportPage from '@/pages/FieldImportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: 13,
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/campo/importar" element={<FieldImportPage />} />

          {/* Operations */}
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/operations/new" element={<OperationFormPage />} />
          <Route path="/operations/:id" element={<OperationDetailPage />} />

          {/* Targets */}
          <Route path="/operations/:operationId/targets/new" element={<TargetFormPage />} />
          <Route path="/targets/search" element={<TargetSearchPage />} />
          <Route path="/targets/history" element={<TargetHistorySearchPage />} />
          <Route path="/targets/:id" element={<TargetDetailPage />} />

          {/* Deployment Teams */}
          <Route path="/operations/:operationId/teams/new" element={<DeploymentTeamFormPage />} />
          <Route path="/operations/:operationId/teams/:teamId/edit" element={<DeploymentTeamFormPage />} />

          {/* Devices */}
          <Route path="/targets/:targetId/devices/new" element={<DeviceFormPage />} />
          <Route path="/operations/:operationId/devices/new" element={<DeviceFormPage />} />
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
          <Route path="/devices/:deviceId/custody/new" element={<CustodyMovementFormPage />} />

          {/* ── Perícia ───────────────────────────────────────────── */}
          <Route path="/pericia/templates" element={<ReportTemplatesPage />} />
          {/* Rota legada para dispositivos */}
          <Route path="/devices/:id/gerar-laudo" element={<GenerateDocumentPage />} />
          {/* Novas rotas por entidade */}
          <Route path="/devices/:id/gerar-documento" element={<GenerateDocumentPage />} />
          <Route path="/operations/:id/gerar-documento" element={<GenerateDocumentPage />} />
          <Route path="/targets/:id/gerar-documento" element={<GenerateDocumentPage />} />
          <Route path="/pericia/historico" element={<GeneratedReportsPage />} />

          {/* Audit */}
          <Route path="/audit" element={<AuditPage />} />

          {/* Relatórios Estatísticos */}
          <Route path="/relatorios/estatisticos" element={<StatisticsPage />} />

          {/* Users */}
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/new" element={<UserFormPage />} />
          <Route path="/users/:userId/edit" element={<UserFormPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
