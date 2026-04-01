import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SalesOrders from './pages/SalesOrders';
import StockPurchases from './pages/StockPurchases';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Expenses from './pages/Expenses';
import ManageRates from './pages/ManageRates';
import ManageUsers from './pages/ManageUsers';

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes with layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/sales" element={<SalesOrders />} />
        <Route path="/purchases" element={<StockPurchases />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute ownerOnly>
              <Expenses />
            </ProtectedRoute>
          }
        />

        {/* Owner-only routes */}
        <Route
          path="/rates"
          element={
            <ProtectedRoute ownerOnly>
              <ManageRates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute ownerOnly>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
