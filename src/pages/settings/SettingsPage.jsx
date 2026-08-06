import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useAuthStore } from '../../stores/auth';

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const settingSections = [
    {
      title: 'Security & Access Control',
      description: 'Manage user permissions, role matrices, and data visibility rules across all modules.',
      icon: 'mdi:shield-key-outline',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      items: [
        {
          name: 'Roles & Permissions',
          description: 'Configure module access privileges (Create, Edit, Delete, View) for each role.',
          to: '/role',
          icon: 'mdi:shield-account-outline',
          badge: 'Security Matrix',
        },
        {
          name: 'Data Access Scoping',
          description: 'Set data visibility rules (Global, Team, Own Data) and user-specific overrides.',
          to: '/settings/data-access',
          icon: 'mdi:eye-settings-outline',
          badge: 'Data Visibility',
        },
      ],
    },
    {
      title: 'Team & Organization Structure',
      description: 'Organize teams, assign team leads, and manage company staff members.',
      icon: 'mdi:account-group-outline',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      items: [
        {
          name: 'Manage Teams',
          description: 'Assign members to teams, set team leads, and manage team assignments.',
          to: '/create-team',
          icon: 'mdi:account-supervisor-circle-outline',
          badge: 'Team Building',
        },
        {
          name: 'Team Members',
          description: 'Add new team members, edit contact info, and manage user accounts.',
          to: '/team-member',
          icon: 'mdi:account-multiple-outline',
          badge: 'Staff Registry',
        },
        {
          name: 'Team Leads',
          description: 'View and manage team lead assignments and team portfolios.',
          to: '/team-lead',
          icon: 'mdi:account-star-outline',
          badge: 'Lead Portfolio',
        },
      ],
    },
    {
      title: 'CRM Configurations & Masters',
      description: 'Configure lead sources, lead classification groups, and API integrations.',
      icon: 'mdi:cog-outline',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      items: [
        {
          name: 'Lead Sources',
          description: 'Configure lead capture channels (Website, IndiaMART, Referrals, etc.).',
          to: '/leadsource',
          icon: 'mdi:vector-link',
          badge: 'Lead Masters',
        },
        {
          name: 'Lead Groups',
          description: 'Manage lead categorization and classification groups.',
          to: '/leadgroup',
          icon: 'mdi:folder-multiple-outline',
          badge: 'Lead Masters',
        },
        {
          name: 'Integrations & API Keys',
          description: 'Configure IndiaMART API key, TradeIndia key, Webhooks, and Meta Lead Ads.',
          to: '/integrations',
          icon: 'mdi:api',
          badge: 'API Hub',
        },
      ],
    },
    {
      title: 'Personal Account & Profile',
      description: 'Manage your admin credentials, change password, and customize display avatar.',
      icon: 'mdi:account-circle-outline',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      items: [
        {
          name: 'My Profile & Change Password',
          description: 'Update account details, change password, upload custom photo, and choose gradient themes.',
          to: '/profile',
          icon: 'mdi:account-badge-outline',
          badge: 'Account Management',
        },
      ],
    },
  ];

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <Icon name="mdi:cog-outline" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Admin System Settings</h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Command hub for system configuration, security permissions, team structures, and CRM data visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Icon name="mdi:account-circle-outline" className="h-4 w-4 text-purple-600" />
            My Admin Profile
          </button>
        </div>
      </div>

      {/* Admin Status Overview Banner */}
      <div className="rounded-3xl border border-purple-100 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-purple-300 text-xl font-bold backdrop-blur-md">
              <Icon name="mdi:shield-check" className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Admin System Configuration Center</h2>
              <p className="text-xs text-purple-200 mt-0.5">
                Logged in as <strong className="text-white">{user?.username || user?.userEmail}</strong> ({user?.role})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Status: Active & Secured
          </div>
        </div>
      </div>

      {/* Setting Sections */}
      <div className="space-y-6">
        {settingSections.map((section) => (
          <div key={section.title} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-white/5">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${section.color}`}>
                <Icon name={section.icon} className="inline w-4 h-4 mr-1" />
                {section.title}
              </span>
              <p className="text-xs text-gray-500 dark:text-slate-400 hidden sm:block">{section.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  to={item.to}
                  className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-slate-50/50 p-4 transition-all hover:bg-purple-50/30 hover:border-purple-200 dark:border-white/5 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:hover:border-purple-500/30"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm group-hover:scale-110 transition-transform">
                        <Icon name={item.icon} className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-end mt-4 pt-2 border-t border-gray-100 dark:border-white/5 text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                    <span>Manage</span>
                    <Icon name="mdi:chevron-right" className="w-4 h-4 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
