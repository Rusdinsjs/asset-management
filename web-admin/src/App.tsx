import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Assets } from './pages/Assets';
import { Categories } from './pages/Categories';
import { WorkOrders } from './pages/WorkOrders';
import { WorkOrderDetails } from './pages/WorkOrderDetails';
import { ApprovalCenter } from './pages/ApprovalCenter';
import { PermissionGate } from './components/PermissionGate';
import { Users } from './pages/Users';
import { Profile } from './pages/Profile';
import Reports from './pages/Reports';
import { AuditMode } from './pages/AuditMode';
import { AssetLifecycle } from './pages/AssetLifecycle';
import { ConversionRequests } from './pages/ConversionRequests';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/assets/:id/lifecycle" element={<AssetLifecycle />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetails />} />
            <Route path="/approvals" element={<ApprovalCenter />} />
            <Route path="/conversions" element={<ConversionRequests />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={
              <PermissionGate requiredLevel={2}>
                <Users />
              </PermissionGate>
            } />
            <Route path="/profile" element={<Profile />} />
            <Route path="/audit" element={<AuditMode />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

