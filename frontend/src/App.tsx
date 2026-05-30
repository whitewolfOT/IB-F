import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Shell from './components/layout/Shell';

import Login from './pages/Login';
import Dashboard from './pages/client/Dashboard';
import NewRequest from './pages/client/NewRequest';
import RequestDetail from './pages/client/RequestDetail';

import VerificationQueue from './pages/operator/VerificationQueue';
import VerifyEvent from './pages/operator/VerifyEvent';
import AssetRegistry from './pages/operator/AssetRegistry';

import FinancialQueue from './pages/financial/FinancialQueue';
import FinancialReview from './pages/financial/FinancialReview';
import LedgerView from './pages/financial/LedgerView';

import ShariahQueue from './pages/shariah/ShariahQueue';
import RulingWorkbench from './pages/shariah/RulingWorkbench';
import OverridePanel from './pages/shariah/OverridePanel';
import ReviewHistory from './pages/shariah/ReviewHistory';

import ComplianceQueue from './pages/compliance/ComplianceQueue';
import ScoreBreakdown from './pages/compliance/ScoreBreakdown';
import ExceptionReview from './pages/compliance/ExceptionReview';

import RatificationQueue from './pages/admin/RatificationQueue';
import WeightsEditor from './pages/admin/WeightsEditor';
import AuthorityMatrix from './pages/admin/AuthorityMatrix';
import ProhibitedIndustries from './pages/admin/ProhibitedIndustries';
import ThresholdsEditor from './pages/admin/ThresholdsEditor';
import UserManagement from './pages/admin/UserManagement';
import AuditLog from './pages/admin/AuditLog';

import SubmitException from './pages/exceptions/SubmitException';
import ExceptionStatus from './pages/exceptions/ExceptionStatus';

const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized</h1>
      <p className="text-gray-500 mb-4">You do not have permission to access this page.</p>
      <a href="/dashboard" className="text-client hover:underline">Go to Dashboard</a>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            {/* All authenticated users */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requests/new" element={<NewRequest />} />
            <Route path="/requests/:eventId" element={<RequestDetail />} />
            <Route path="/exceptions/new" element={<SubmitException />} />
            <Route path="/exceptions/:id" element={<ExceptionStatus />} />

            {/* Operator / Warehouse */}
            <Route element={<ProtectedRoute roles={['operator', 'warehouse_manager']} />}>
              <Route path="/verify" element={<VerificationQueue />} />
              <Route path="/verify/:eventId" element={<VerifyEvent />} />
              <Route path="/assets" element={<AssetRegistry />} />
            </Route>

            {/* Financial */}
            <Route element={<ProtectedRoute roles={['financial_controller']} />}>
              <Route path="/financial" element={<FinancialQueue />} />
              <Route path="/financial/:eventId" element={<FinancialReview />} />
              <Route path="/ledger" element={<LedgerView />} />
            </Route>

            {/* Shariah */}
            <Route element={<ProtectedRoute roles={['shariah_reviewer', 'senior_shariah_board']} />}>
              <Route path="/shariah" element={<ShariahQueue />} />
              <Route path="/shariah/:reviewId" element={<RulingWorkbench />} />
              <Route path="/shariah/:reviewId/override" element={<OverridePanel />} />
              <Route path="/shariah/history" element={<ReviewHistory />} />
            </Route>

            {/* Compliance */}
            <Route element={<ProtectedRoute roles={['compliance_officer']} />}>
              <Route path="/compliance" element={<ComplianceQueue />} />
              <Route path="/compliance/:eventId" element={<ScoreBreakdown />} />
              <Route path="/compliance/exceptions" element={<ExceptionReview />} />
            </Route>

            {/* Master admin */}
            <Route element={<ProtectedRoute masterOnly />}>
              <Route path="/admin" element={<RatificationQueue />} />
              <Route path="/admin/weights" element={<WeightsEditor />} />
              <Route path="/admin/matrix" element={<AuthorityMatrix />} />
              <Route path="/admin/industries" element={<ProhibitedIndustries />} />
              <Route path="/admin/thresholds" element={<ThresholdsEditor />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/audit" element={<AuditLog />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
