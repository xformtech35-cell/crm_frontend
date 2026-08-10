import { Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import DefaultLayout from "../layouts/DefaultLayout";
import ProtectedRoute from "../middleware/ProtectedRoute";

import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/HomePage";
import LeadListPage from "../pages/lead/LeadListPage.jsx";
import LeadDetailPage from "../pages/lead/LeadDetailPage";
import LeadImportPage from "../pages/lead/LeadImportPage";
import LeadPipelinePage from "../pages/lead/LeadPipelinePage";
import ContactPage from "../pages/contact/ContactPage";
import ContactDetailPage from "../pages/contact/ContactDetailPage";
import OpportunityPage from "../pages/opportunity/OpportunityPage";
import OrganizationPage from "../pages/organization/OrganizationPage";
import OrganizationDetailPage from "../pages/organization/OrganizationDetailPage";
import ProjectPage from "../pages/project/ProjectPage";
import ProjectDetailPage from "../pages/project/ProjectDetailPage";
import TaskPage from "../pages/task/TaskPage";
import TeamPage from "../pages/team/TeamPage";
import TeamDetailPage from "../pages/team/TeamDetailPage";
import TeamMemberPage from "../pages/team-member/TeamMemberPage";
import TeamLeadPage from "../pages/team-lead/TeamLeadPage";
import RolePage from "../pages/role/RolePage";
import DataAccessConfigPage from "../pages/settings/DataAccessConfigPage";
import SettingsPage from "../pages/settings/SettingsPage";
import PipelinePage from "../pages/pipeline/PipelinePage";
import DealsPage from "../pages/deals/DealsPage";
import ActivitiesPage from "../pages/activities/ActivitiesPage";
import EmailsPage from "../pages/emails/EmailsPage";
import CalendarPage from "../pages/calendar/CalendarPage";
import AnalyticsPage from "../pages/analytics/AnalyticsPage";
import ReportsPage from "../pages/reports/ReportsPage";
import AutomationPage from "../pages/automation/AutomationPage";
import CreateTeamPage from "../pages/create-team/CreateTeamPage";
import AttendancePage from "../pages/attendance/AttendancePage.jsx";
import TrashPage from "../pages/settings/TrashPage";

// Generic Modules previously restricted to Super Admin
import CompaniesPage from "../pages/super-admin/CompaniesPage";
import SuperAdminAuditPage from "../pages/super-admin/SuperAdminAuditPage";
import IntegrationsPage from "../pages/super-admin/IntegrationsPage";

// Super Admin Layout and Dashboard Pages
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import SuperAdminHomePage from "../pages/super-admin/SuperAdminHomePage";
import SuperAdminSettingsPage from "../pages/super-admin/SuperAdminSettingsPage";
import SuperAdminAnalyticsPage from "../pages/super-admin/SuperAdminAnalyticsPage";
import LeadSource from "../pages/Masters/LeadSource.jsx";
import LeadGroup from "../pages/Masters/LeadGroup.jsx";
import NegotiationPage from "../pages/Negotiation/NegotiationPage.jsx";
import NegotiationDetailPage from "../pages/Negotiation/NegotiationDetailPage.jsx";
import QuotationDetailPage from "../pages/Negotiation/QuotationDetailPage.jsx";
import ProfilePage from "../pages/profile/ProfilePage";


export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* ─── GENERIC MODULES (Role-based access via DefaultLayout) ─── */}
      <Route
        element={
          <ProtectedRoute>
            <DefaultLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<ProtectedRoute requiredPermission="dashboard.view"><HomePage /></ProtectedRoute>} />
        
        {/* Core CRM */}
        <Route path="/lead" element={<ProtectedRoute requiredPermission="leads.view"><LeadListPage /></ProtectedRoute>} />
        <Route path="/lead/import" element={<ProtectedRoute requiredPermission="leads.view"><LeadImportPage /></ProtectedRoute>} />
        <Route path="/lead/pipeline" element={<ProtectedRoute requiredPermission="leads.view"><LeadPipelinePage /></ProtectedRoute>} />
        <Route path="/lead/:id" element={<ProtectedRoute requiredPermission="leads.view"><LeadDetailPage /></ProtectedRoute>} />
        <Route path="/negotiation" element={<ProtectedRoute requiredPermission="leads.view"><NegotiationPage /></ProtectedRoute>} />
        <Route path="/negotiation/:id" element={<ProtectedRoute requiredPermission="leads.view"><NegotiationDetailPage /></ProtectedRoute>} />
        <Route path="/quotation/:id" element={<ProtectedRoute requiredPermission="leads.view"><QuotationDetailPage /></ProtectedRoute>} />
        <Route path="/contact" element={<ProtectedRoute requiredPermission="contacts.view"><ContactPage /></ProtectedRoute>} />
        <Route path="/contact/:id" element={<ProtectedRoute requiredPermission="contacts.view"><ContactDetailPage /></ProtectedRoute>} />
        <Route path="/opportunity" element={<ProtectedRoute requiredPermission="opportunities.view"><OpportunityPage /></ProtectedRoute>} />
        <Route path="/organization" element={<ProtectedRoute requiredPermission="organizations.view"><OrganizationPage /></ProtectedRoute>} />
        <Route path="/organization/:id" element={<ProtectedRoute requiredPermission="organizations.view"><OrganizationDetailPage /></ProtectedRoute>} />
        <Route path="/project" element={<ProtectedRoute requiredPermission="projects.view"><ProjectPage /></ProtectedRoute>} />
        <Route path="/project/:id" element={<ProtectedRoute requiredPermission="projects.view"><ProjectDetailPage /></ProtectedRoute>} />
        
        <Route path="/task" element={<ProtectedRoute requiredPermission="tasks.view"><TaskPage /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute requiredPermission="teams.view"><TeamPage /></ProtectedRoute>} />
        <Route path="/team-lead" element={<ProtectedRoute requiredPermission="team_leads.view"><TeamLeadPage /></ProtectedRoute>} />
        <Route path="/leadsource" element={<ProtectedRoute requiredPermission="leads.view"><LeadSource /></ProtectedRoute>} />
        <Route path="/leadgroup" element={<ProtectedRoute requiredPermission="leads.view"><LeadGroup /></ProtectedRoute>} />
        <Route path="/team/:id" element={<ProtectedRoute requiredPermission="teams.view"><TeamDetailPage /></ProtectedRoute>} />
        <Route path="/team-member" element={<ProtectedRoute requiredPermission="users.view"><TeamMemberPage /></ProtectedRoute>} />
        <Route path="/create-team" element={<ProtectedRoute requiredPermission="teams.view"><CreateTeamPage /></ProtectedRoute>} />
        <Route path="/role" element={<ProtectedRoute requiredPermission="roles.view"><RolePage /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute requiredPermission="attendance.view"><AttendancePage /></ProtectedRoute>} />
        
        <Route path="/pipeline" element={<ProtectedRoute requiredPermission="opportunities.view"><PipelinePage /></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute requiredPermission="opportunities.view"><DealsPage /></ProtectedRoute>} />
        <Route path="/activities" element={<ProtectedRoute requiredPermission="activities.view"><ActivitiesPage /></ProtectedRoute>} />
        <Route path="/emails" element={<ProtectedRoute requiredPermission="emails.view"><EmailsPage /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute requiredPermission="calendar.view"><CalendarPage /></ProtectedRoute>} />
        
        {/* Analytics & Configuration */}
        <Route path="/analytics" element={<ProtectedRoute requiredPermission="analytics.view"><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute requiredPermission="reports.view"><ReportsPage /></ProtectedRoute>} />
        <Route path="/automation" element={<ProtectedRoute requiredPermission="automation.view"><AutomationPage /></ProtectedRoute>} />
        <Route path="/settings/data-access" element={<ProtectedRoute requiredPermission="roles.view"><DataAccessConfigPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute requiredPermission="settings.view"><SettingsPage /></ProtectedRoute>} />
        <Route path="/trash" element={<ProtectedRoute requiredPermission="trash.view"><TrashPage /></ProtectedRoute>} />

        {/* Global Configuration Modules (managed by Role Matrix) */}
        <Route path="/integrations" element={<ProtectedRoute requiredPermission="integrations.view"><IntegrationsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Route>

      {/* ─── SUPER ADMIN CONSOLE (via SuperAdminLayout) ─── */}
      <Route
        element={
          <ProtectedRoute>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/super-admin" element={<SuperAdminHomePage />} />
        <Route path="/super-admin/companies" element={<CompaniesPage />} />
        <Route path="/super-admin/integrations" element={<IntegrationsPage />} />
        <Route path="/super-admin/analytics" element={<SuperAdminAnalyticsPage />} />
        <Route path="/super-admin/audit" element={<SuperAdminAuditPage />} />
        <Route path="/super-admin/settings" element={<SuperAdminSettingsPage />} />
        <Route path="/super-admin/profile" element={<ProfilePage />} />

        {/* CRM Modules inside SuperAdminLayout to maintain design symmetry */}
        <Route path="/super-admin/home" element={<HomePage />} />
        <Route path="/super-admin/lead" element={<LeadListPage />} />
        <Route path="/super-admin/lead/import" element={<LeadImportPage />} />
        <Route path="/super-admin/lead/pipeline" element={<LeadPipelinePage />} />
        <Route path="/super-admin/lead/:id" element={<LeadDetailPage />} />
        <Route path="/super-admin/contact" element={<ContactPage />} />
        <Route path="/super-admin/contact/:id" element={<ContactDetailPage />} />
        <Route path="/super-admin/opportunity" element={<OpportunityPage />} />
        <Route path="/super-admin/organization" element={<OrganizationPage />} />
        <Route path="/super-admin/organization/:id" element={<OrganizationDetailPage />} />
        <Route path="/super-admin/project" element={<ProjectPage />} />
        <Route path="/super-admin/project/:id" element={<ProjectDetailPage />} />
        <Route path="/super-admin/task" element={<TaskPage />} />
        <Route path="/super-admin/team" element={<TeamPage />} />
        <Route path="/super-admin/team-lead" element={<TeamLeadPage />} />
        <Route path="/super-admin/team/:id" element={<TeamDetailPage />} />
        <Route path="/super-admin/team-member" element={<TeamMemberPage />} />
        <Route path="/super-admin/create-team" element={<CreateTeamPage />} />
        <Route path="/super-admin/role" element={<RolePage />} />
        <Route path="/super-admin/data-access" element={<DataAccessConfigPage />} />
        <Route path="/super-admin/trash" element={<TrashPage />} />
        <Route path="/super-admin/attendance" element={<AttendancePage />} />
        <Route path="/super-admin/leadsource" element={<LeadSource />} />
        <Route path="/super-admin/leadgroup" element={<LeadGroup />} />
        <Route path="/super-admin/pipeline" element={<PipelinePage />} />
        <Route path="/super-admin/deals" element={<DealsPage />} />
        <Route path="/super-admin/activities" element={<ActivitiesPage />} />
        <Route path="/super-admin/emails" element={<EmailsPage />} />
        <Route path="/super-admin/calendar" element={<CalendarPage />} />
        <Route path="/super-admin/crm-analytics" element={<AnalyticsPage />} />
        <Route path="/super-admin/reports" element={<ReportsPage />} />
        <Route path="/super-admin/automation" element={<AutomationPage />} />
        <Route path="/super-admin/crm-settings" element={<SettingsPage />} />
      </Route>

      

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
