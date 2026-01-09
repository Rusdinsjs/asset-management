import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Assets } from './pages/Assets';
import { Categories } from './pages/Categories';
import { WorkOrders } from './pages/WorkOrders';
import { ApprovalCenter } from './pages/ApprovalCenter';
import { Text } from '@mantine/core';

// Placeholder components
const Reports = () => <Text>Reports Page (Coming Soon)</Text>;
const Users = () => <Text>Users Page (Coming Soon)</Text>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/approvals" element={<ApprovalCenter />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

