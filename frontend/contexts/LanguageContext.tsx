import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.dashboard': 'Dashboard',
    'nav.files': 'Files',
    'nav.admin': 'Admin',
    'nav.logout': 'Logout',
    'home.title': 'Support Our Mission',
    'home.subtitle': 'Make a donation and get access to exclusive premium content',
    'home.donateButton': 'Make a Donation',
    'home.loginPrompt': 'Already have an account?',
    'home.loginLink': 'Login here',
    'login.title': 'Login',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.button': 'Login',
    'login.registerPrompt': "Don't have an account?",
    'login.registerLink': 'Register here',
    'register.title': 'Register',
    'register.firstName': 'First Name',
    'register.lastName': 'Last Name',
    'register.email': 'Email',
    'register.password': 'Password',
    'register.language': 'Language',
    'register.button': 'Register',
    'register.loginPrompt': 'Already have an account?',
    'register.loginLink': 'Login here',
    'dashboard.title': 'Dashboard',
    'dashboard.profile': 'Profile',
    'dashboard.totalDonated': 'Total Donated',
    'dashboard.editProfile': 'Edit Profile',
    'files.title': 'Premium Files',
    'files.folders': 'Folders',
    'files.noAccess': 'No access - Requires minimum donation of',
    'files.hasAccess': 'Access granted',
    'files.download': 'Download',
    'admin.title': 'Admin Panel',
    'admin.users': 'Users',
    'admin.totalUsers': 'Total Users',
    'admin.viewDetails': 'View Details',
    'donation.title': 'Make a Donation',
    'donation.amount': 'Amount (USD)',
    'donation.minAmount': 'Minimum: $5',
    'donation.maxAmount': 'Maximum: $1000',
    'donation.cardDetails': 'Card Details',
    'donation.donate': 'Donate',
    'donation.processing': 'Processing...',
    'language.english': 'English',
    'language.spanish': 'Español',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.login': 'Iniciar Sesión',
    'nav.register': 'Registrarse',
    'nav.dashboard': 'Panel',
    'nav.files': 'Archivos',
    'nav.admin': 'Administrador',
    'nav.logout': 'Cerrar Sesión',
    'home.title': 'Apoya Nuestra Misión',
    'home.subtitle': 'Haz una donación y obtén acceso a contenido premium exclusivo',
    'home.donateButton': 'Hacer Donación',
    'home.loginPrompt': '¿Ya tienes una cuenta?',
    'home.loginLink': 'Inicia sesión aquí',
    'login.title': 'Iniciar Sesión',
    'login.email': 'Correo Electrónico',
    'login.password': 'Contraseña',
    'login.button': 'Iniciar Sesión',
    'login.registerPrompt': '¿No tienes una cuenta?',
    'login.registerLink': 'Regístrate aquí',
    'register.title': 'Registrarse',
    'register.firstName': 'Nombre',
    'register.lastName': 'Apellido',
    'register.email': 'Correo Electrónico',
    'register.password': 'Contraseña',
    'register.language': 'Idioma',
    'register.button': 'Registrarse',
    'register.loginPrompt': '¿Ya tienes una cuenta?',
    'register.loginLink': 'Inicia sesión aquí',
    'dashboard.title': 'Panel',
    'dashboard.profile': 'Perfil',
    'dashboard.totalDonated': 'Total Donado',
    'dashboard.editProfile': 'Editar Perfil',
    'files.title': 'Archivos Premium',
    'files.folders': 'Carpetas',
    'files.noAccess': 'Sin acceso - Requiere donación mínima de',
    'files.hasAccess': 'Acceso concedido',
    'files.download': 'Descargar',
    'admin.title': 'Panel de Administración',
    'admin.users': 'Usuarios',
    'admin.totalUsers': 'Total de Usuarios',
    'admin.viewDetails': 'Ver Detalles',
    'donation.title': 'Hacer una Donación',
    'donation.amount': 'Cantidad (USD)',
    'donation.minAmount': 'Mínimo: $5',
    'donation.maxAmount': 'Máximo: $1000',
    'donation.cardDetails': 'Detalles de Tarjeta',
    'donation.donate': 'Donar',
    'donation.processing': 'Procesando...',
    'language.english': 'English',
    'language.spanish': 'Español',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState('en');

  const t = (key: string): string => {
    return translations[language as keyof typeof translations]?.[key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
