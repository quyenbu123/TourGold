import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import AnnouncementListener from "./components/notifications/AnnouncementListener";
import ProtectedRoute from "./components/common/ProtectedRoute";
import LoadingSpinner from "./components/common/LoadingSpinner";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentStatusChecker from "./pages/payment/PaymentStatusChecker";
import TestPaymentPage from "./pages/TestPaymentPage";
import AdminPendingPaymentsPage from "./pages/admin/AdminPendingPaymentsPage";
import AdminAllBookingsPage from "./pages/admin/AdminAllBookingsPage";
import UsersManagementPage from "./pages/admin/UsersManagementPage";
import FavoritePage from "./pages/FavoritePage";
import ChatAIWidget from "./components/ChatAIWidget";
import TawkChat from "./components/TawkChat";

// Lazy loading components for better performance
const Layout = lazy(() => import("./components/layouts/Layout"));
const AdminLayout = lazy(() => import("./components/layouts/AdminLayout"));
const HostLayout = lazy(() => import("./components/layouts/HostLayout"));
const HomePage = lazy(() => import("./pages/HomePage"));
const TourListPage = lazy(() => import("./pages/TourListPage"));
const TourDetailPage = lazy(() => import("./pages/TourDetailPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const RegisterSuccessPage = lazy(() =>
  import("./pages/auth/RegisterSuccessPage")
);
const LoginSuccessPage = lazy(() => import("./pages/auth/LoginSuccessPage"));
const UnauthorizedPage = lazy(() => import("./pages/auth/UnauthorizedPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const UserDashboardPage = lazy(() => import("./pages/user/DashboardPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const AdminTourListPage = lazy(() => import("./pages/admin/ToursListPage"));
const AddTourPage = lazy(() => import("./pages/admin/AddTourPage"));
const UpdateTourPage = lazy(() => import("./pages/admin/UpdateTourPage"));
const AdminPromotionsPage = lazy(() =>
  import("./pages/admin/AdminPromotionsPage")
);
const AdminHostRegistrationsPage = lazy(() =>
  import("./pages/admin/AdminHostRegistrationsPage")
);
const PaymentStatusPage = lazy(() =>
  import("./pages/payment/PaymentStatusPage")
);
const HostDashboardPage = lazy(() => import("./pages/host/HostDashboardPage"));
const HostAddTourPage = lazy(() => import("./pages/host/HostAddTourPage"));
const HostEditTourPage = lazy(() => import("./pages/host/HostEditTourPage"));
const HostApplicationPage = lazy(() => import("./pages/host/HostApplicationPage"));
const AdminBroadcastPage = lazy(() =>
  import("./pages/admin/AdminBroadcastPage")
);
const AdminAnnouncementsListPage = lazy(() =>
  import("./pages/admin/AdminAnnouncementsListPage")
);
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <NotificationsProvider>
          <AnnouncementListener />
          <TawkChat />
          <ChatAIWidget />
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="tours" element={<TourListPage />} />
              <Route path="tours/:tourId" element={<TourDetailPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route
                path="register-success"
                element={<RegisterSuccessPage />}
              />
              <Route path="login-success" element={<LoginSuccessPage />} />
              <Route path="unauthorized" element={<UnauthorizedPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />

              {/* Protected User Routes */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/bookings"
                element={
                  <ProtectedRoute>
                    <UserDashboardPage activeTab="bookings" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="favorites"
                element={
                  <ProtectedRoute>
                    <FavoritePage />
                  </ProtectedRoute>
                }
              />

              {/* Payment Routes */}
              <Route
                path="/payment"
                element={
                  <ProtectedRoute>
                    <PaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/success"
                element={
                  <ProtectedRoute>
                    <PaymentSuccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/check-status"
                element={
                  <ProtectedRoute>
                    <PaymentStatusChecker />
                  </ProtectedRoute>
                }
              />
              <Route path="payment/status" element={<PaymentStatusPage />} />
              <Route
                path="payment/status/:bookingId"
                element={<PaymentStatusPage />}
              />

              {/* Public Announcements List */}
              <Route path="announcements" element={<AnnouncementsPage />} />

              {/* Test Routes - For Development Only */}
              <Route
                path="/test-payment"
                element={
                  <ProtectedRoute requiredRoles={["ROLE_ADMIN"]}>
                    <TestPaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="host/apply"
                element={
                  <ProtectedRoute>
                    <HostApplicationPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRoles={["ROLE_ADMIN"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="tours" element={<AdminTourListPage />} />
              <Route path="tours/add" element={<AddTourPage />} />
              <Route path="tours/edit/:tourId" element={<UpdateTourPage />} />
              <Route path="users" element={<UsersManagementPage />} />
              <Route
                path="host-registrations"
                element={<AdminHostRegistrationsPage />}
              />
              <Route
                path="pending-payments"
                element={
                  <ProtectedRoute>
                    <AdminPendingPaymentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="bookings"
                element={
                  <ProtectedRoute>
                    <AdminAllBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="promotions" element={<AdminPromotionsPage />} />
              <Route path="announcements" element={<AdminAnnouncementsListPage />} />
              <Route path="broadcast" element={<AdminBroadcastPage />} />
            </Route>

            {/* Host Routes */}
            <Route
              path="/host"
              element={
                <ProtectedRoute requiredRoles={["ROLE_HOST", "ROLE_ADMIN"]}>
                  <HostLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<HostDashboardPage />} />
              <Route path="add-tour" element={<HostAddTourPage />} />
              <Route path="tours/:tourId/edit" element={<HostEditTourPage />} />
            </Route>

            {/* Redirects */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </NotificationsProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
