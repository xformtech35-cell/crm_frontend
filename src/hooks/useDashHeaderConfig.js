import { useState, useEffect } from 'react';

export const DEFAULT_DASH_HEADER_CONFIG = {
  header: {
    showViewContext: true,
    showQuickCreate: true,
    showNotifications: true,
    showRefreshBtn: true,
    showBackBtn: true,
    showHeaderBadges: true,
  },
  dashboard: {
    showTotalLeadsCard: true,
    showRevenueCard: true,
    showNegotiationsCard: true,
    showTasksCard: true,
    showMarketplaceCard: true,
    showStarLeadsCard: true,
    showChartsCard: true,
    showActivityTimelineCard: true,
    showPipelineStageCard: true,
  }
};

export function getDashHeaderConfig() {
  try {
    const raw = localStorage.getItem('crm_dash_header_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        header: { ...DEFAULT_DASH_HEADER_CONFIG.header, ...(parsed.header || {}) },
        dashboard: { ...DEFAULT_DASH_HEADER_CONFIG.dashboard, ...(parsed.dashboard || {}) },
      };
    }
  } catch (e) {
    console.error('Failed to parse crm_dash_header_config:', e);
  }
  return DEFAULT_DASH_HEADER_CONFIG;
}

export function saveDashHeaderConfig(config) {
  try {
    localStorage.setItem('crm_dash_header_config', JSON.stringify(config));
    window.dispatchEvent(new Event('crm-dash-header-config-updated'));
  } catch (e) {
    console.error('Failed to save crm_dash_header_config:', e);
  }
}

export function useDashHeaderConfig() {
  const [config, setConfig] = useState(getDashHeaderConfig);

  useEffect(() => {
    const handleUpdate = () => {
      setConfig(getDashHeaderConfig());
    };
    window.addEventListener('crm-dash-header-config-updated', handleUpdate);
    return () => window.removeEventListener('crm-dash-header-config-updated', handleUpdate);
  }, []);

  return {
    config,
    updateConfig: (newConfig) => {
      saveDashHeaderConfig(newConfig);
      setConfig(newConfig);
    }
  };
}
