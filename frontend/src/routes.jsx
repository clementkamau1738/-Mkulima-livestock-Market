import RequireAuth, { AuthLoading } from './components/auth/RequireAuth'
import RouteError from './components/layout/RouteError'
import MainLayout from './layouts/MainLayout'
import AccountDashboard from './pages/account/AccountDashboard'
import Deposit from './pages/Deposit'
import Home from './pages/Home'
import HowItWorks from './pages/HowItWorks'
import LivestockDetails from './pages/LivestockDetails'
import Login from './pages/Login'
import Marketplace from './pages/Marketplace'
import NotFound from './pages/NotFound'
import PhotoCredits from './pages/PhotoCredits'
import Privacy from './pages/Privacy'
import Register from './pages/Register'
import Terms from './pages/Terms'
import Withdrawal from './pages/Withdrawal'

// The staff area loads on demand, so customers never download it.
const staff = (load, props = {}) => ({
  lazy: async () => {
    const { default: Page } = await load()
    return { element: <Page {...props} /> }
  },
})

const adminRoutes = [
  { index: true, ...staff(() => import('./pages/admin/AdminOverview')) },
  { path: 'listings', ...staff(() => import('./pages/admin/AdminListings')) },
  { path: 'listings/new', ...staff(() => import('./pages/admin/AdminListingEdit')) },
  { path: 'listings/:id', ...staff(() => import('./pages/admin/AdminListingEdit')) },
  ...['inquiries', 'deposits', 'withdrawals'].flatMap((kind) => [
    { path: kind, ...staff(() => import('./pages/admin/AdminRequests'), { kind }) },
    { path: `${kind}/:reference`, ...staff(() => import('./pages/admin/AdminRequestDetail'), { kind }) },
  ]),
  { path: 'customers', ...staff(() => import('./pages/admin/AdminCustomers')) },
  { path: 'audit-log', ...staff(() => import('./pages/admin/AdminAuditLog')) },
]

export const routes = [
  {
    element: <MainLayout />,
    // Shown while a lazy route loads on a direct visit (e.g. /admin/deposits).
    hydrateFallbackElement: <AuthLoading />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Home /> },
          { path: 'marketplace', element: <Marketplace /> },
          { path: 'marketplace/:id', element: <LivestockDetails /> },
          { path: 'how-it-works', element: <HowItWorks /> },
          { path: 'deposit', element: <Deposit /> },
          { path: 'withdraw', element: <Withdrawal /> },
          { path: 'login', element: <Login /> },
          { path: 'register', element: <Register /> },
          { path: 'terms', element: <Terms /> },
          { path: 'privacy', element: <Privacy /> },
          { path: 'photo-credits', element: <PhotoCredits /> },
          {
            element: <RequireAuth />,
            children: [{ path: 'account', element: <AccountDashboard /> }],
          },
          {
            path: 'admin',
            element: <RequireAuth reviewer />,
            children: [{ lazy: async () => ({ Component: (await import('./layouts/AdminLayout')).default }), children: adminRoutes }],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]
