import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Toaster } from '@/components/ui/toaster';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import FilesPage from './pages/FilesPage';
import { stripePublishableKey } from './config';

const queryClient = new QueryClient();
const stripePromise = loadStripe(stripePublishableKey);

function App() {
  return (
    <div className="min-h-screen bg-background">
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <Elements stripe={stripePromise}>
              <Router>
                <Navbar />
                <main>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/files" element={<FilesPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                  </Routes>
                </main>
                <Toaster />
              </Router>
            </Elements>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
