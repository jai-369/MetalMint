import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminProductTypesPage from "./pages/AdminProductTypesPage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MorePage from "./pages/MorePage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import ProductSearchPage from "./pages/ProductSearchPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import QrLabelPage from "./pages/QrLabelPage.jsx";
import QrRedirectPage from "./pages/QrRedirectPage.jsx";
import RepairInvoicePage from "./pages/RepairInvoicePage.jsx";
import RepairsPage from "./pages/RepairsPage.jsx";
import ScanSearchPage from "./pages/ScanSearchPage.jsx";
import SalesInvoicePage from "./pages/SalesInvoicePage.jsx";
import SalesPage from "./pages/SalesPage.jsx";
import StockPage from "./pages/StockPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/qr/:productCode"
        element={
          <ProtectedRoute>
            <QrRedirectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/qr-label/:productCode"
        element={
          <ProtectedRoute>
            <QrLabelPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/search" element={<ProductSearchPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="scan" element={<ScanSearchPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/invoices/:id" element={<SalesInvoicePage />} />
        <Route path="repairs" element={<RepairsPage />} />
        <Route path="repairs/:id" element={<RepairInvoicePage />} />
        <Route path="more" element={<MorePage />} />
        <Route
          path="admin/product-types"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminProductTypesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
