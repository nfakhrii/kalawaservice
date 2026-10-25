import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import OverviewPage from './pages/overview/OverviewPage';

// Registry Module
import RegistryLayout from './pages/registry/RegistryLayout';
import CustomersPage from './pages/registry/CustomersPage';
import VehiclesPage from './pages/registry/VehiclesPage';
import ServicesPage from './pages/registry/ServicesPage';
import SparepartsPage from './pages/registry/SparepartsPage';
import SuppliersPage from './pages/registry/SuppliersPage';

// Operations Module
import OperationsLayout from './pages/operations/OperationsLayout';
import WorkOrdersListPage from './pages/operations/WorkOrdersListPage';
import WorkOrderCreatePage from './pages/operations/WorkOrderCreatePage';
import WorkOrderDetailPage from './pages/operations/WorkOrderDetailPage';
import PaymentsPage from './pages/operations/PaymentsPage';

// Corporate B2B Module
import CorporateLayout from './pages/corporate/CorporateLayout';
import CorporateContractsPage from './pages/corporate/CorporateContractsPage';
import CollectiveBillingPage from './pages/corporate/CollectiveBillingPage';

// Analytics Module
import AnalyticsLayout from './pages/analytics/AnalyticsLayout';
import VehicleHistoryReportPage from './pages/analytics/VehicleHistoryReportPage';
import BranchRevenueReportPage from './pages/analytics/BranchRevenueReportPage';
import SparepartUsageReportPage from './pages/analytics/SparepartUsageReportPage';
import LowStockReportPage from './pages/analytics/LowStockReportPage';

// System Diagnostics Module
import SystemDiagnosticsPage from './pages/diagnostics/SystemDiagnosticsPage';


function ProtectedRoute({ children }) {
  const { isAuthenticated, checkingAuth } = useAuth();

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Memeriksa sesi pengguna...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
}


function RoleProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, checkingAuth } = useAuth();

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Memeriksa sesi pengguna...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  const role = String(user?.role || '').toLowerCase().trim();
  const allowed = allowedRoles.map((item) =>
    String(item).toLowerCase().trim()
  );

  if (!allowed.includes(role)) {
    return <Navigate to="/app/overview" replace />;
  }

  return children;
}

function RegistryIndexRedirect() {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase().trim();

  const destination =
    role === 'gudang'
      ? '/app/registry/spareparts'
      : role === 'mekanik'
        ? '/app/registry/vehicles'
        : '/app/registry/customers';

  return <Navigate to={destination} replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, checkingAuth } = useAuth();

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Memeriksa sesi pengguna...
        </p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/overview" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root redirect to /app/overview */}
          <Route path="/" element={<Navigate to="/auth/login" replace />} />

          {/* Authentication Route */}
          <Route
            path="/auth/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Main Application Nested Subpath Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            
            {/* Master Data CRUD Registry */}
            <Route path="registry" element={<RegistryLayout />}>
              <Route index element={<RegistryIndexRedirect />} />

              <Route
                path="customers"
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      'owner',
                      'admin_cabang',
                      'kasir',
                      'mekanik',
                      'auditor',
                    ]}
                  >
                    <CustomersPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="vehicles"
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      'owner',
                      'admin_cabang',
                      'kasir',
                      'mekanik',
                      'auditor',
                    ]}
                  >
                    <VehiclesPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="services"
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      'owner',
                      'admin_cabang',
                      'kasir',
                      'mekanik',
                      'auditor',
                    ]}
                  >
                    <ServicesPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="spareparts"
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      'owner',
                      'admin_cabang',
                      'kasir',
                      'mekanik',
                      'gudang',
                      'auditor',
                    ]}
                  >
                    <SparepartsPage />
                  </RoleProtectedRoute>
                }
              />

              <Route
                path="suppliers"
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      'owner',
                      'admin_cabang',
                      'gudang',
                      'auditor',
                    ]}
                  >
                    <SuppliersPage />
                  </RoleProtectedRoute>
                }
              />
            </Route>

            {/* Core Workshop Operations */}
            <Route path="operations" element={<OperationsLayout />}>
              <Route index element={<Navigate to="/app/operations/work-orders" replace />} />
              <Route path="work-orders" element={<WorkOrdersListPage />} />
              <Route path="work-orders/new" element={<WorkOrderCreatePage />} />
              <Route path="work-orders/:woId" element={<WorkOrderDetailPage />} />
              <Route path="payments" element={<PaymentsPage />} />
            </Route>

            {/* Corporate B2B Fleet Management & Collective Billing */}
            <Route path="corporate" element={<CorporateLayout />}>
              <Route index element={<Navigate to="/app/corporate/contracts" replace />} />
              <Route path="contracts" element={<CorporateContractsPage />} />
              <Route path="collective-billing" element={<CollectiveBillingPage />} />
            </Route>

            {/* 4 Multi-Table JOIN Reports */}
            <Route path="analytics" element={<AnalyticsLayout />}>
              <Route index element={<Navigate to="/app/analytics/vehicle-history" replace />} />
              <Route path="vehicle-history" element={<VehicleHistoryReportPage />} />
              <Route path="branch-revenue" element={<BranchRevenueReportPage />} />
              <Route path="sparepart-usage" element={<SparepartUsageReportPage />} />
              <Route path="low-stock" element={<LowStockReportPage />} />
            </Route>

            {/* System Diagnostics (5 Debugging Scenarios) */}
            <Route path="system/diagnostics" element={<SystemDiagnosticsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

