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
import RolePage from "../pages/role/RolePage";
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
import AttendancePage from "../pages/attendance/AttendancePage.jsx.jsx";

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
import NegotiationPage from "../pages/negotiation/NegotiationPage.jsx";
import NegotiationDetailPage from "../pages/Negotiation/NegotiationDetailPage.jsx";
import QuotationDetailPage from "../pages/Negotiation/QuotationDetailPage.jsx";


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
        <Route path="/home" element={<HomePage />} />
        
        {/* Core CRM */}
        <Route path="/lead" element={<LeadListPage />} />
        <Route path="/lead/import" element={<LeadImportPage />} />
        <Route path="/lead/pipeline" element={<LeadPipelinePage />} />
        <Route path="/lead/:id" element={<LeadDetailPage />} />
        <Route path="/negotiation" element={<NegotiationPage />} />
        <Route path="/negotiation/:id" element={<NegotiationDetailPage />} />
        <Route path="/quotation/:id" element={<QuotationDetailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/contact/:id" element={<ContactDetailPage />} />
        <Route path="/opportunity" element={<OpportunityPage />} />
        <Route path="/organization" element={<OrganizationPage />} />
        <Route path="/organization/:id" element={<OrganizationDetailPage />} />
        <Route path="/project" element={<ProjectPage />} />
        <Route path="/project/:id" element={<ProjectDetailPage />} />
        
        <Route path="/task" element={<TaskPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/leadsource" element={<LeadSource />} />
        <Route path="/leadgroup" element={<LeadGroup />} />
        <Route path="/team/:id" element={<TeamDetailPage />} />
        <Route path="/team-member" element={<TeamMemberPage />} />
        <Route path="/create-team" element={<CreateTeamPage />} />
        <Route path="/role" element={<RolePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/emails" element={<EmailsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        
        {/* Analytics & Configuration */}
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Global Configuration Modules (managed by Role Matrix) */}
        <Route path="/integrations" element={<IntegrationsPage />} />
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
        <Route path="/super-admin/team/:id" element={<TeamDetailPage />} />
        <Route path="/super-admin/team-member" element={<TeamMemberPage />} />
        <Route path="/super-admin/create-team" element={<CreateTeamPage />} />
        <Route path="/super-admin/role" element={<RolePage />} />
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
