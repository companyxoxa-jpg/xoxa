import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import AdminRoute from '@/components/AdminRoute';
import CommandCenterRoute from '@/components/CommandCenterRoute';
import './booking.css';
import './showcase.css';
import RinnoLoading from '@/components/RinnoLoading';
import Landing from '@/pages/Landing';
import CustomerRoute from '@/components/CustomerRoute';
import BusinessRoute from '@/components/BusinessRoute';
import BusinessWorkspaceRoute from '@/components/BusinessWorkspaceRoute';
import OwnerBusinessRoute from '@/components/OwnerBusinessRoute';
import { CartProvider } from '@/contexts/CartContext';
import { getLastStoreSlug } from '@/lib/storeContext';

const routeModules = import.meta.glob(['./pages/*.jsx', '!./pages/Landing.jsx']);
const lazyPage = (name) => lazy(routeModules[`./pages/${name}.jsx`]);
const Home=lazyPage('Home'), CommandCenter=lazyPage('CommandCenter'), BusinessDetail=lazyPage('BusinessDetail');
const Placeholder=lazyPage('Placeholder'), Orders=lazyPage('Orders'), OrderDetail=lazyPage('OrderDetail');
const Catalog=lazyPage('Catalog'), ProductEditor=lazyPage('ProductEditor'), QuickPrices=lazyPage('QuickPrices');
const Customers=lazyPage('Customers'), CustomerDetail=lazyPage('CustomerDetail'), Settings=lazyPage('Settings');
const CommercialDemoEditor=lazyPage('CommercialDemoEditor'), Login=lazyPage('Login'), Register=lazyPage('Register');
const ForgotPassword=lazyPage('ForgotPassword'), ResetPassword=lazyPage('ResetPassword'), Store=lazyPage('Store');
const BookingPage=lazyPage('BookingPage'), BookingAgenda=lazyPage('BookingAgenda'), MyAppointments=lazyPage('MyAppointments');
const DemoCatalog=lazyPage('DemoCatalog'), StoreCart=lazyPage('StoreCart'), StoreCheckout=lazyPage('StoreCheckout');
const TrackOrder=lazyPage('TrackOrder'), CustomerRegister=lazyPage('CustomerRegister'), MyAccount=lazyPage('MyAccount');
const MyOrders=lazyPage('MyOrders'), MyOrderDetail=lazyPage('MyOrderDetail'), MyAddresses=lazyPage('MyAddresses');
const MyProfile=lazyPage('MyProfile'), MyAssociationPortal=lazyPage('MyAssociationPortal'), OrderConfirmation=lazyPage('OrderConfirmation');
const StoreLogin=lazyPage('StoreLogin'), StoreRegister=lazyPage('StoreRegister'), StoreForgotPassword=lazyPage('StoreForgotPassword');
const GuestOrderLookup=lazyPage('GuestOrderLookup'), GuestBookingLookup=lazyPage('GuestBookingLookup');
const AssociationWorkspace=lazyPage('AssociationWorkspace'), CscWorkspace=lazyPage('CscWorkspace');
const CredentialScanner=lazyPage('CredentialScanner'), MemberProfile=lazyPage('MemberProfile'), AssociationShowcase=lazyPage('AssociationShowcase');
const AssociationRecords=lazyPage('AssociationRecords'), AssociationExport=lazyPage('AssociationExport');
const AssociationCompliance=lazyPage('AssociationCompliance'), AssociationSetup=lazyPage('AssociationSetup');
const MemberImport=lazyPage('MemberImport'), InitialImport=lazyPage('InitialImport'), Billing=lazyPage('Billing');

function LegacyAccountRedirect() {
  const location = useLocation();
  const slug = getLastStoreSlug();
  return <Navigate replace to={slug ? `/store/${slug}${location.pathname}${location.search}` : '/demos'} />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const isStorefront = location.pathname === '/' || location.pathname.startsWith('/store/') || location.pathname.startsWith('/track/') || location.pathname.startsWith('/account') || location.pathname.startsWith('/register-customer') || location.pathname.startsWith('/order-confirmed');
  const isPublicRoute = isStorefront || location.pathname === '/demos' || ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);

  useEffect(() => {
    document.documentElement.classList.toggle('light', isStorefront);
  }, [isStorefront]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <RinnoLoading />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required' && !isPublicRoute) {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<RinnoLoading />}><Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<CartProvider><Outlet /></CartProvider>}>
        <Route path="/store/:slug" element={<Store />} />
        <Route path="/store/:slug/booking" element={<BookingPage />} />
        <Route path="/store/:slug/cart" element={<StoreCart />} />
        <Route path="/store/:slug/checkout" element={<StoreCheckout />} />
        <Route path="/store/:slug/login" element={<StoreLogin />} />
        <Route path="/store/:slug/register" element={<StoreRegister />} />
        <Route path="/store/:slug/forgot-password" element={<StoreForgotPassword />} />
        <Route path="/store/:slug/order-lookup" element={<GuestOrderLookup />} />
        <Route path="/store/:slug/booking-lookup" element={<GuestBookingLookup />} />
      </Route>
      <Route path="/demos" element={<DemoCatalog />} />
      <Route path="/track/:token" element={<TrackOrder />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register-customer" element={<CustomerRegister />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<CustomerRoute />}>
          <Route path="/account/appointments" element={<MyAppointments />} />
          <Route path="/store/:slug/account" element={<MyAccount />} />
          <Route path="/store/:slug/account/orders" element={<MyOrders />} />
          <Route path="/store/:slug/account/orders/:id" element={<MyOrderDetail />} />
          <Route path="/store/:slug/account/addresses" element={<MyAddresses />} />
          <Route path="/store/:slug/account/profile" element={<MyProfile />} />
          <Route path="/store/:slug/account/appointments" element={<MyAppointments />} />
          <Route path="/store/:slug/account/association" element={<MyAssociationPortal />} />
          <Route path="/store/:slug/order-confirmed/:id" element={<OrderConfirmation />} />
          <Route path="/account" element={<LegacyAccountRedirect />} />
          <Route path="/account/orders" element={<LegacyAccountRedirect />} />
          <Route path="/account/orders/:id" element={<LegacyAccountRedirect />} />
          <Route path="/account/addresses" element={<LegacyAccountRedirect />} />
          <Route path="/account/profile" element={<LegacyAccountRedirect />} />
          <Route path="/order-confirmed/:id" element={<LegacyAccountRedirect />} />
        </Route>
        <Route element={<BusinessRoute />}>
          <Route element={<BusinessWorkspaceRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/panel" element={<Home />} />
              <Route path="/agenda" element={<BookingAgenda />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/catalog/prices" element={<QuickPrices />} />
              <Route path="/catalog/new" element={<ProductEditor />} />
              <Route path="/catalog/:id" element={<ProductEditor />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/members" element={<AssociationWorkspace section="members" />} />
              <Route path="/members/:id" element={<MemberProfile />} />
              <Route path="/activities" element={<AssociationWorkspace section="activities" />} />
              <Route path="/credential-scanner" element={<CredentialScanner />} />
              <Route path="/association-club" element={<CscWorkspace />} />
              <Route path="/association-records" element={<AssociationRecords />} />
              <Route element={<OwnerBusinessRoute />}>
                <Route path="/association-finances" element={<AssociationWorkspace section="finances" />} />
                <Route path="/credentials" element={<AssociationWorkspace section="credentials" />} />
                <Route path="/association-export" element={<AssociationExport />} />
                <Route path="/association-compliance" element={<AssociationCompliance />} />
                <Route path="/association-setup" element={<AssociationSetup />} />
                <Route path="/member-import" element={<MemberImport />} />
                <Route path="/initial-import" element={<InitialImport />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/billing" element={<Billing />} />
              </Route>
            </Route>
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/command-center/businesses/:id" element={<BusinessDetail />} />
            <Route path="/command-center/:id" element={<BusinessDetail />} />
          </Route>
        </Route>
        <Route element={<CommandCenterRoute />}>
          <Route path="/command-center" element={<CommandCenter />} />
          <Route path="/command-center/demos/:id" element={<CommercialDemoEditor />} />
          <Route path="/command-center/showcase/association" element={<AssociationShowcase />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes></Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App

