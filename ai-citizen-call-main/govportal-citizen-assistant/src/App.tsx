import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { CallCenterLayout } from './components/layout/CallCenterLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { RaiseComplaintPage } from './pages/raise-complaint/RaiseComplaintPage';
import { MyComplaintsPage } from './pages/MyComplaintsPage';
import { ComplaintTrackingPage } from './pages/ComplaintTrackingPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { ServicesPage, AboutHelpPage } from './pages/ServicesPage';

// Call Center Portal Pages
import { CallCenterDashboardPage } from './pages/call-center/CallCenterDashboardPage';
import { CallCenterLiveCallsPage } from './pages/call-center/CallCenterLiveCallsPage';
import { CallCenterComplaintsPage } from './pages/call-center/CallCenterComplaintsPage';
import { CallCenterComplaintDetailsPage } from './pages/call-center/CallCenterComplaintDetailsPage';
import { CallCenterExceptionsPage } from './pages/call-center/CallCenterExceptionsPage';
import { CallCenterNotificationsPage } from './pages/call-center/CallCenterNotificationsPage';
import { CallCenterProfilePage } from './pages/call-center/CallCenterProfilePage';

// Admin Portal Pages & Layout
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUserManagementPage } from './pages/admin/AdminUserManagementPage';
import { AdminDepartmentManagementPage } from './pages/admin/AdminDepartmentManagementPage';
import { AdminCallCenterManagementPage } from './pages/admin/AdminCallCenterManagementPage';
import { AdminComplaintManagementPage } from './pages/admin/AdminComplaintManagementPage';
import { AdminSLAEscalationsPage } from './pages/admin/AdminSLAEscalationsPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminProfilePage } from './pages/admin/AdminProfilePage';

// Officer Portal Pages & Layout
import { OfficerLayout } from './components/layout/OfficerLayout';
import { OfficerDashboardPage } from './pages/officer/OfficerDashboardPage';
import { OfficerAssignmentsPage } from './pages/officer/OfficerAssignmentsPage';
import { OfficerComplaintsPage } from './pages/officer/OfficerComplaintsPage';
import { OfficerComplaintDetailsPage } from './pages/officer/OfficerComplaintDetailsPage';
import { OfficerNotificationsPage } from './pages/officer/OfficerNotificationsPage';
import { OfficerProfilePage } from './pages/officer/OfficerProfilePage';

const AppRouter: React.FC = () => {
  const { currentRoute, portalType, user } = useApp();

  // Public non-sidebar pages
  if (currentRoute === 'landing') {
    return <LandingPage />;
  }

  if (currentRoute === 'login') {
    return <LoginPage />;
  }

  if (currentRoute === 'register') {
    return <RegisterPage />;
  }

  if (currentRoute === 'services') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10">
        <ServicesPage />
      </div>
    );
  }

  if (currentRoute === 'about' || currentRoute === 'help') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10">
        <AboutHelpPage mode={currentRoute} />
      </div>
    );
  }

  // Authentication guard: If not logged in, no portal screen is accessible
  if (!user) {
    return <LoginPage />;
  }

  // Admin Portal Routes
  if (portalType === 'admin') {
    let title = 'Welcome, Raj Kumar 👋';
    let subtitle = "Here's the overall system overview across GovPortal.";

    if (currentRoute === 'user-management') {
      title = 'User Management';
      subtitle = 'Manage users, roles, and access across the platform.';
    } else if (currentRoute === 'department-management') {
      title = 'Department Management';
      subtitle = 'Manage departments and map officers & supervisors.';
    } else if (currentRoute === 'call-center-management') {
      title = 'Call Center Management';
      subtitle = 'Monitor call center executives, activity, and performance.';
    } else if (currentRoute === 'complaint-management') {
      title = 'Complaint Management';
      subtitle = 'System-wide complaints tracking, reassignment, and overrides.';
    } else if (currentRoute === 'sla-escalations') {
      title = 'SLA & Escalations';
      subtitle = 'Monitor department SLA compliance, overdue cases, and escalation triggers.';
    } else if (currentRoute === 'admin-notifications' || currentRoute === 'notifications') {
      title = 'Notifications';
      subtitle = 'System alerts, escalation triggers, and administrative updates.';
    } else if (currentRoute === 'audit-logs') {
      title = 'Audit Logs';
      subtitle = 'Track all administrative activities and user changes across the system.';
    } else if (currentRoute === 'admin-profile' || currentRoute === 'profile') {
      title = 'Profile';
      subtitle = 'Manage your administrator account information';
    }

    return (
      <AdminLayout pageTitle={title} pageSubtitle={subtitle}>
        {currentRoute === 'dashboard' && <AdminDashboardPage />}
        {currentRoute === 'user-management' && <AdminUserManagementPage />}
        {currentRoute === 'department-management' && <AdminDepartmentManagementPage />}
        {currentRoute === 'call-center-management' && <AdminCallCenterManagementPage />}
        {currentRoute === 'complaint-management' && <AdminComplaintManagementPage />}
        {currentRoute === 'sla-escalations' && <AdminSLAEscalationsPage />}
        {(currentRoute === 'admin-notifications' || currentRoute === 'notifications') && <AdminNotificationsPage />}
        {currentRoute === 'audit-logs' && <AdminAuditLogsPage />}
        {(currentRoute === 'admin-profile' || currentRoute === 'profile') && <AdminProfilePage />}
      </AdminLayout>
    );
  }

  // Officer Portal Routes
  if (portalType === 'officer') {
    return (
      <OfficerLayout>
        {currentRoute === 'dashboard' && <OfficerDashboardPage />}
        {currentRoute === 'my-assignments' && <OfficerAssignmentsPage />}
        {currentRoute === 'complaints' && <OfficerComplaintsPage />}
        {(currentRoute === 'officer-complaint-details' || currentRoute === 'complaint-details') && (
          <OfficerComplaintDetailsPage />
        )}
        {(currentRoute === 'officer-notifications' || currentRoute === 'notifications') && (
          <OfficerNotificationsPage />
        )}
        {(currentRoute === 'officer-profile' || currentRoute === 'profile') && (
          <OfficerProfilePage />
        )}
        {currentRoute === 'my-complaints' && <OfficerAssignmentsPage />}
        {currentRoute === 'raise-complaint' && <OfficerComplaintsPage />}
      </OfficerLayout>
    );
  }

  // Call Center Portal Routes
  if (portalType === 'call-center') {
    let title = 'Welcome, Priya Sharma 👋';
    let subtitle = 'Call Center Executive';

    if (currentRoute === 'live-calls') {
      title = 'Live Calls';
      subtitle = 'Monitor real-time calls and AI processing';
    } else if (currentRoute === 'complaints') {
      title = 'Complaints';
      subtitle = 'View and track all complaints';
    } else if (currentRoute === 'complaint-details') {
      title = 'Complaint Details';
      subtitle = 'AI-generated complaint intelligence';
    } else if (currentRoute === 'exceptions') {
      title = 'Exceptions';
      subtitle = 'Review cases that need human attention';
    } else if (currentRoute === 'notifications') {
      title = 'Notifications';
      subtitle = 'Stay updated with alerts and updates';
    } else if (currentRoute === 'profile') {
      title = 'Profile';
      subtitle = 'Manage your account information';
    }

    return (
      <CallCenterLayout pageTitle={title} pageSubtitle={subtitle}>
        {currentRoute === 'dashboard' && <CallCenterDashboardPage />}
        {currentRoute === 'live-calls' && <CallCenterLiveCallsPage />}
        {currentRoute === 'complaints' && <CallCenterComplaintsPage />}
        {currentRoute === 'complaint-details' && <CallCenterComplaintDetailsPage />}
        {currentRoute === 'exceptions' && <CallCenterExceptionsPage />}
        {currentRoute === 'notifications' && <CallCenterNotificationsPage />}
        {currentRoute === 'profile' && <CallCenterProfilePage />}
        {currentRoute === 'raise-complaint' && <RaiseComplaintPage />}
        {currentRoute === 'my-complaints' && <CallCenterComplaintsPage />}
      </CallCenterLayout>
    );
  }

  // Citizen Dashboard & Authenticated Pages (wrapped with Sidebar and TopHeader)
  return (
    <AppLayout>
      {currentRoute === 'dashboard' && <DashboardPage />}
      {currentRoute === 'raise-complaint' && <RaiseComplaintPage />}
      {currentRoute === 'my-complaints' && <MyComplaintsPage />}
      {currentRoute === 'complaint-details' && <ComplaintTrackingPage />}
      {currentRoute === 'notifications' && <NotificationsPage />}
      {currentRoute === 'profile' && <UserProfilePage />}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

