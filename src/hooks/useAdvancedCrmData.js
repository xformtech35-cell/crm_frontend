import { useState, useCallback } from 'react'
import { useCalendar } from './useCalendar'
import { useContact } from './useContact'
import { useDashboard } from './useDashboard'
import { useLead } from './useLead'
import { useOpportunity } from './useOpportunity'
import { useOrganization } from './useOrganization'
import { useProject } from './useProject'
import { useRole } from './useRole'
import { useTask } from './useTask'
import { useTeam } from './useTeam'

function stageProbability(status) {
  const s = status.toLowerCase()
  if (s.includes('won')) return 100
  if (s.includes('lost')) return 0
  if (s.includes('negoti')) return 72
  if (s.includes('proposal')) return 55
  if (s.includes('qual')) return 35
  if (s.includes('prospect')) return 20
  return 45
}

function stageColor(status) {
  const s = status.toLowerCase()
  if (s.includes('won')) return 'bg-emerald-500'
  if (s.includes('lost')) return 'bg-rose-500'
  if (s.includes('negoti')) return 'bg-amber-500'
  if (s.includes('proposal')) return 'bg-sky-500'
  if (s.includes('qual')) return 'bg-indigo-600'
  return 'bg-slate-600'
}

function priorityByAmount(amount) {
  if (amount >= 3000000) return 'Hot'
  if (amount >= 1200000) return 'Warm'
  return 'Cold'
}

function mapDeals(opps) {
  return opps.map((opp) => {
    const stage = String(opp.oppStatus || 'Open')
    const value = Number(opp.oppAmount || 0)
    return {
      id: Number(opp.oppId),
      title: String(opp.oppName || `Opportunity #${opp.oppId}`),
      company: String(opp.oppTitle || 'Unassigned Account'),
      stage,
      owner: opp.userIdFk ? `User ${opp.userIdFk}` : 'Unassigned',
      closeDate: String(opp.oppForcastCloseDate || opp.oppActualCloseDate || 'TBD'),
      value,
      probability: stageProbability(stage),
      priority: priorityByAmount(value),
    }
  })
}

function mapPipelineStages(deals) {
  const grouped = new Map()
  deals.forEach((deal) => {
    if (!grouped.has(deal.stage)) grouped.set(deal.stage, [])
    grouped.get(deal.stage).push(deal)
  })
  return Array.from(grouped.entries()).map(([name, items]) => ({
    name,
    color: stageColor(name),
    deals: items,
  }))
}

function mapActivity(tasks, leads) {
  const taskItems = tasks.slice(0, 16).map((task) => {
    const taskName = String(task.taskName || 'Task')
    const due = String(task.taskDueDate || task.taskStartDate || task.taskCompletedDate || 'No date')
    const owner = String(task.taskAssign || '').trim() || (task.taskAssignedTo ? `User ${task.taskAssignedTo}` : 'Unassigned')
    const priority = String(task.taskPriority || '').toLowerCase()
    const type = priority === 'email' ? 'Email' : priority === 'call' ? 'Call' : priority === 'note' ? 'Note' : 'Meeting'
    const iconMap = { Call: 'mdi:phone-outline', Email: 'mdi:email-outline', Meeting: 'mdi:calendar-clock-outline', Note: 'mdi:notebook-outline' }
    const colorMap = { Call: 'indigo', Email: 'blue', Meeting: 'orange', Note: 'purple' }
    return {
      id: Number(task.taskId),
      type,
      icon: iconMap[type],
      color: colorMap[type],
      title: taskName,
      subject: String(task.taskRelatedTo || 'Task'),
      owner,
      time: due,
      note: String(task.taskDescription || 'Task activity tracked from backend.'),
    }
  })

  const leadItems = leads.slice(0, 8).map((lead) => ({
    id: Number(lead.leadId) + 100000,
    type: 'Call',
    icon: 'mdi:phone-outline',
    color: 'indigo',
    title: `Lead follow-up: ${lead.leadFirstName}`,
    subject: String(lead.leadOrganisationName || 'Lead account'),
    owner: lead.userIdFk ? `User ${lead.userIdFk}` : 'Unassigned',
    time: String(lead.inquiryDate || lead.leadCreatedDate || 'No date'),
    note: String(lead.leadReason || 'Lead record synced from backend.'),
  }))

  return [...taskItems, ...leadItems].slice(0, 20)
}

function mapThreads(leads) {
  return leads
    .filter((lead) => lead.leadEmail)
    .slice(0, 30)
    .map((lead, index) => ({
      id: Number(lead.leadId),
      from: `${lead.leadFirstName} ${lead.leadLastName || ''}`.trim(),
      company: String(lead.leadOrganisationName || 'Unknown Account'),
      subject: `Follow-up for ${lead.leadStatus || 'Lead'}`,
      preview: String(lead.leadReason || lead.designation || 'CRM interaction note synced from backend.'),
      linked: String(lead.leadOrganisationName || 'No linked deal'),
      unread: index % 2 === 0,
      tag: String(lead.leadStatus || 'Open'),
      time: String(lead.inquiryDate || lead.leadCreatedDate || 'Recently'),
      leadId: Number(lead.leadId),
    }))
}

function countMapToList(input, labelKeys, valueKeys) {
  return input
    .map((item) => {
      const label = String(labelKeys.map((k) => item[k]).find(Boolean) || '')
      const valueRaw = valueKeys.map((k) => item[k]).find(Boolean)
      const value = Number(valueRaw || 0)
      return { label, value }
    })
    .filter((item) => item.label && item.value >= 0)
}

const EMPTY_STATE = {
  loaded: false,
  dealsList: [],
  pipelineStages: [],
  activityFeed: [],
  inboxThreads: [],
  leadSources: [],
  funnelSteps: [],
  repRanking: [],
  industryPerformance: [],
  reportLibrary: [],
  workflows: [],
  integrationCards: [],
  settingsSections: [],
}

export function useAdvancedCrmData() {
  const [state, setState] = useState(EMPTY_STATE)

  const { getAll: getLeads } = useLead()
  const { getAll: getOpps } = useOpportunity()
  const { getAll: getTasks } = useTask()
  const { getAll: getProjects } = useProject()
  const { getAll: getOrgs } = useOrganization()
  const { getAll: getTeams } = useTeam()
  const { getAll: getRoles } = useRole()
  const { getAll: getContacts } = useContact()
  const { getStats } = useDashboard()
  const { getEvents } = useCalendar()

  const load = useCallback(async (force = false) => {
    if (state.loaded && !force) return state

    const [leads, opportunities, tasks, projects, organizations, teams, roles, contacts, dashboard, calendar] =
      await Promise.all([
        getLeads().catch(() => []),
        getOpps().catch(() => []),
        getTasks().catch(() => []),
        getProjects().catch(() => []),
        getOrgs().catch(() => []),
        getTeams().catch(() => []),
        getRoles().catch(() => []),
        getContacts().catch(() => []),
        getStats().catch(() => null),
        getEvents().catch(() => ({ events: [], tasks: [], reminders: [] })),
      ])

    const deals = mapDeals(opportunities)
    const pipeline = mapPipelineStages(deals)

    const repMap = new Map()
    deals.forEach((deal) => {
      if (!repMap.has(deal.owner)) repMap.set(deal.owner, { name: deal.owner, pipeline: 0, won: 0, total: 0 })
      const row = repMap.get(deal.owner)
      row.pipeline += deal.value
      row.total += 1
      if (deal.stage.toLowerCase().includes('won')) row.won += 1
    })

    const repRanking = Array.from(repMap.values())
      .map((row) => ({
        name: row.name,
        pipeline: row.pipeline,
        winRate: row.total ? Math.round((row.won / row.total) * 100) : 0,
        quota: Math.min(150, Math.max(0, Math.round((row.pipeline / 5000000) * 100))),
      }))
      .sort((a, b) => b.pipeline - a.pipeline)
      .slice(0, 10)

    const industryMap = new Map()
    leads.forEach((lead) => {
      const key = String(lead.leadIndustry || 'Unspecified')
      industryMap.set(key, (industryMap.get(key) || 0) + 1)
    })
    const leadCount = Math.max(leads.length, 1)
    const industryPerformance = Array.from(industryMap.entries()).map(([industry, count]) => ({
      industry,
      winRate: Math.round((count / leadCount) * 100),
    }))

    const leadSources = dashboard
      ? countMapToList(dashboard.leadSourceWiseCount || [], ['label', 'source', 'leadSource', 'name'], ['count', 'total'])
      : []

    const funnelSteps = dashboard
      ? [
          { label: 'Captured', value: Number(dashboard.leadAll || 0) },
          { label: 'Qualified', value: Number(dashboard.leadQualified || 0) },
          { label: 'Proposal', value: Number(dashboard.leadQuotationSent || 0) },
          { label: 'Negotiation', value: Number(dashboard.leadNegotiation || 0) },
          { label: 'Won', value: Number(dashboard.opportunityWon || 0) },
        ]
      : []

    const reportLibrary = [
      { title: 'Lead Source Distribution', category: 'Leads', description: `Tracks ${leadSources.length} source buckets from dashboard metrics.`, uses: Number(dashboard?.leadAll || leads.length) },
      { title: 'Opportunity Outcome Summary', category: 'Sales', description: `Won: ${dashboard?.opportunityWon || 0}, Open: ${dashboard?.opportunityOpen || 0}, Lost: ${dashboard?.opportunityLost || 0}.`, uses: opportunities.length },
      { title: 'Task Execution Tracker', category: 'Delivery', description: `Total active tasks from backend: ${tasks.length}.`, uses: tasks.length },
      { title: 'Calendar Activity Load', category: 'Calendar', description: `Events: ${Array.isArray(calendar.events) ? calendar.events.length : 0}, reminders: ${Array.isArray(calendar.reminders) ? calendar.reminders.length : 0}.`, uses: Array.isArray(calendar.events) ? calendar.events.length : 0 },
    ]

    const workflows = [
      { id: 1, name: 'Lead Qualification Monitor', description: `Qualified leads: ${dashboard?.leadQualified || 0} of ${dashboard?.leadAll || leads.length}.`, enabled: Number(dashboard?.leadQualified || 0) > 0 },
      { id: 2, name: 'Opportunity Progress Monitor', description: `Open opportunities: ${dashboard?.opportunityOpen || opportunities.length}.`, enabled: Number(dashboard?.opportunityOpen || opportunities.length) > 0 },
      { id: 3, name: 'Task Throughput Monitor', description: `Task backlog currently at ${tasks.length}.`, enabled: tasks.length > 0 },
    ]

    const integrationCards = [
      { name: 'REST API', status: dashboard ? 'Connected' : 'Pending', description: 'Primary CRM API used by all frontend modules.' },
      { name: 'Calendar Feed', status: Array.isArray(calendar.events) ? 'Connected' : 'Pending', description: 'Calendar endpoint availability and event sync status.' },
      { name: 'Auth Session', status: leads.length > 0 || opportunities.length > 0 ? 'Enabled' : 'Pending', description: 'Authenticated session required for CRM module access.' },
    ]

    const settingsSections = [
      { title: 'CRM Objects', items: [`Leads (${leads.length})`, `Opportunities (${opportunities.length})`, `Projects (${projects.length})`, `Tasks (${tasks.length})`] },
      { title: 'Org Structure', items: [`Organizations (${organizations.length})`, `Teams (${teams.length})`, `Roles (${roles.length})`, `Contacts (${contacts.length})`] },
      { title: 'Automation Inputs', items: [`Lead sources (${leadSources.length})`, `Pipeline stages (${pipeline.length})`, `Reports (${reportLibrary.length})`, `Workflows (${workflows.length})`] },
    ]

    const newState = {
      loaded: true,
      dealsList: deals,
      pipelineStages: pipeline,
      activityFeed: mapActivity(tasks, leads),
      inboxThreads: mapThreads(leads),
      leadSources,
      funnelSteps,
      repRanking,
      industryPerformance,
      reportLibrary,
      workflows,
      integrationCards,
      settingsSections,
    }

    setState(newState)
    return newState
  }, []) // eslint-disable-line

  return { state, load }
}
