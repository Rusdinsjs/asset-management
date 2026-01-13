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
import { Rentals } from './pages/rentals/Rentals';
import { Clients } from './pages/Clients';
import { RentalForm } from './pages/rentals/RentalForm';
import { RentalDetail } from './pages/rentals/RentalDetail';
import { Loans } from './pages/Loans';
import { Locations } from './pages/Locations';
import { Employees } from './pages/Employees';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <WebSocketProvider>
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
              <Route path="/rentals" element={<Rentals />} />
              <Route path="/rentals/new" element={<RentalForm />} />
              <Route path="/rentals/:id" element={<RentalDetail />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/locations" element={<Locations />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </WebSocketProvider>
  );
}

export default App;
