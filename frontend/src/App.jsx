import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { api } from './api';

// 15 Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ProjectList } from './pages/ProjectList';
import { ProjectForm } from './pages/ProjectForm';
import { ProjectDetail } from './pages/ProjectDetail';
import { CostPrediction } from './pages/CostPrediction';
import { DelayPrediction } from './pages/DelayPrediction';
import { RiskAssessment } from './pages/RiskAssessment';
import { Alerts } from './pages/Alerts';
import { Analytics } from './pages/Analytics';
import { Assistant } from './pages/Assistant';
import { DataImport } from './pages/DataImport';
import { UserManagement } from './pages/UserManagement';
import { Profile } from './pages/Profile';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editProjectId, setEditProjectId] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [alertCount, setAlertCount] = useState(0);

  // Poll or refresh alert count periodically
  const fetchAlertCount = async () => {
    if (isAuthenticated) {
      try {
        const sum = await api.getDashboardSummary();
        setAlertCount(sum.new_alerts_count || 0);
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlertCount();
      const interval = setInterval(fetchAlertCount, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Initializing National Infrastructure Monitoring Portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'login' ? (
      <Login onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  const navigateTo = (view, param = null) => {
    if (view === 'edit-project') {
      setEditProjectId(param);
      setCurrentView('edit-project');
    } else {
      setEditProjectId(null);
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentView('project-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden antialiased">
      {/* Sidebar */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={(v) => navigateTo(v)} 
        alertCount={alertCount}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar 
          onNavigateAlerts={() => navigateTo('alerts')}
          alertCount={alertCount}
        />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentView === 'dashboard' && (
            <Dashboard 
              onNavigate={(v) => navigateTo(v)} 
            />
          )}

          {currentView === 'projects' && (
            <ProjectList 
              onNavigate={(v, p) => navigateTo(v, p)}
              onSelectProject={handleSelectProject}
            />
          )}

          {currentView === 'new-project' && (
            <ProjectForm 
              onCancel={() => navigateTo('projects')}
              onSuccess={() => navigateTo('projects')}
            />
          )}

          {currentView === 'edit-project' && (
            <ProjectForm 
              projectId={editProjectId}
              onCancel={() => navigateTo('projects')}
              onSuccess={() => navigateTo('projects')}
            />
          )}

          {currentView === 'project-detail' && (
            <ProjectDetail 
              projectId={selectedProjectId}
              onBack={() => navigateTo('projects')}
              onEdit={(id) => navigateTo('edit-project', id)}
            />
          )}

          {currentView === 'cost-prediction' && (
            <CostPrediction 
              onSelectProject={handleSelectProject}
            />
          )}

          {currentView === 'delay-prediction' && (
            <DelayPrediction 
              onSelectProject={handleSelectProject}
            />
          )}

          {currentView === 'risk-assessment' && (
            <RiskAssessment 
              onSelectProject={handleSelectProject}
            />
          )}

          {currentView === 'alerts' && (
            <Alerts 
              onSelectProject={handleSelectProject}
            />
          )}

          {currentView === 'analytics' && (
            <Analytics 
              onSelectProject={handleSelectProject}
            />
          )}

          {currentView === 'assistant' && (
            <Assistant 
              onSelectProject={handleSelectProject}
            />
          )}

          {currentView === 'import' && (
            <DataImport 
              onNavigateProjects={() => navigateTo('projects')}
            />
          )}

          {currentView === 'users' && (
            <UserManagement />
          )}

          {currentView === 'profile' && (
            <Profile />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
