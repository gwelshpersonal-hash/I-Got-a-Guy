
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { Staff } from './pages/Staff';
import { Vendors } from './pages/Vendors';
import { TimeClock } from './pages/TimeClock';
import { Payroll } from './pages/Payroll';
import { JobBoard } from './pages/JobBoard';
import { PublicJobBoard } from './pages/PublicJobBoard';
import { Sites } from './pages/Sites';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Support } from './pages/Support';
import { Referrals } from './pages/Referrals'; 
import { PriceGuide } from './pages/PriceGuide';
import { AccountProfile } from './pages/AccountProfile';
import { TaxCenter } from './pages/TaxCenter';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

const App = () => {
  return (
    <DataProvider>
      <AuthProvider>
        <HashRouter>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/public/jobs" element={<PublicJobBoard />} />

              {/* Protected Routes */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/sites" element={<Sites />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/time-clock" element={<TimeClock />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/jobs" element={<JobBoard />} />
              <Route path="/support" element={<Support />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/pricing" element={<PriceGuide />} />
              <Route path="/profile" element={<AccountProfile />} />
              <Route path="/taxes" element={<TaxCenter />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
      </AuthProvider>
    </DataProvider>
  );
};

export default App;
