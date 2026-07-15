import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js'
import { useLead } from '../hooks/useLead'
import { useOpportunity } from '../hooks/useOpportunity'
import { useProject } from '../hooks/useProject'
import { useTask } from '../hooks/useTask'
import { useCalendar } from '../hooks/useCalendar'
import { useAdvancedCrmData } from '../hooks/useAdvancedCrmData'
import Icon from '../components/Icon'
import { formatCurrency } from '../utils/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const GRADE_COLORS = {
  A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-amber-100 text-amber-700 border-amber-200',
  D: 'bg-red-100 text-red-700 border-red-200',
}

const GRADE_BG = {
  A: 'bg-emerald-500',
  B: 'bg-blue-500',
  C: 'bg-amber-500',
  D: 'bg-red-500',
}

const PRIORITY_COLORS = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-teal-400' }
const DATE_LABELS = { today: 'Today', week: 'This Week', month: 'This Month', quarter: 'This Quarter', all: 'All Data' }
const DATE_RANGES = ['today', 'week', 'month', 'quarter', 'all']
const STATUS_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#94a3b8', '#8b5cf6', '#06b6d4', '#f97316']
const OPP_PALETTE = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6']
const SOURCE_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316']

function getGradeFromRating(rating) {
  if (!rating || rating === 0) return null;
  if (rating === 5) return "A";
  if (rating === 4) return "B";
  if (rating === 3) return "C";
  if (rating <= 2) return "D";
  return null;
}

function getRangeBounds(range) {
  if (range === 'all') return { all: true }
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (range === 'week') {
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
  } else if (range === 'month') {
    start.setDate(1)
  } else if (range === 'quarter') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1)
  }
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isInRange(value, bounds) {
  if (bounds?.all) return true
  const date = parseDate(value)
  return !!date && date >= bounds.start && date <= bounds.end
}

function normalizeReminder(reminder) {
  const id = reminder.leadReminderId ?? reminder.id ?? `${reminder.reminderText || reminder.title}-${reminder.reminderDate || reminder.date || reminder.time}`
  const leadId = reminder.leadIdFk ?? reminder.leadId
  return {
    id,
    title: reminder.reminderText || reminder.title || 'Reminder',
    date: reminder.reminderDate || reminder.date || reminder.time,
    owner: reminder.owner || (leadId ? `Lead #${leadId}` : 'Lead reminder'),
    note: reminder.note || reminder.description || '',
  }
}

function mapCalendarReminders(calendarData) {
  const reminders = Array.isArray(calendarData?.reminders) ? calendarData.reminders : []
  const reminderEvents = Array.isArray(calendarData?.events)
    ? calendarData.events.filter((event) => String(event.type || '').toLowerCase() !== 'task')
    : []
  const seen = new Set()
  return [...reminders, ...reminderEvents]
    .map(normalizeReminder)
    .filter((reminder) => {
      const key = String(reminder.id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function groupByCount(items, getKey) {
  const map = new Map()
  items.forEach((item) => {
    const key = String(getKey(item) || 'Unknown')
    map.set(key, (map.get(key) || 0) + 1)
  })
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }))
}

function countByStatus(items, matcher) {
  return items.filter((item) => matcher(String(item || '').toLowerCase())).length
}

const doughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}` } },
  },
}

const leadBarOptions = {
  indexAxis: 'y', responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} leads` } },
  },
  scales: {
    x: { grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } },
  },
}

export default function HomePage() {
  const navigate = useNavigate()
  const { getAll: getAllLeads, getAllScores, update } = useLead()
  const { getAll: getAllOpportunities } = useOpportunity()
  const { getAll: getAllProjects } = useProject()
  const { getAll: getAllTasks } = useTask()
  const { getAllEvents } = useCalendar()
  const { state: advancedCrmState, load: loadAdvancedCrm } = useAdvancedCrmData()

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [activeChart, setActiveChart] = useState('status')
  const [selectedFunnelKey, setSelectedFunnelKey] = useState('total')
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set())
  const [completedReminderIds, setCompletedReminderIds] = useState(new Set())
  const [leadsData, setLeadsData] = useState([])
  const [opportunitiesData, setOpportunitiesData] = useState([])
  const [projectsData, setProjectsData] = useState([])
  const [hotLeadsData, setHotLeadsData] = useState([])
  const [tasksData, setTasksData] = useState([])
  const [remindersData, setRemindersData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [hl, tasks, calendarData] = await Promise.all([
        getAllScores().catch(() => []),
        getAllTasks().catch(() => []),
        getAllEvents().catch(() => ({ events: [], reminders: [] })),
      ])
      const [leads, opportunities, projects] = await Promise.all([
        getAllLeads().catch(() => []),
        getAllOpportunities().catch(() => []),
        getAllProjects().catch(() => []),
      ])
      setLeadsData(leads ?? [])
      setOpportunitiesData(opportunities ?? [])
      setProjectsData(projects ?? [])
      setHotLeadsData(hl ?? [])
      setTasksData(tasks ?? [])
      setRemindersData(mapCalendarReminders(calendarData))
      await loadAdvancedCrm()
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll();
    const handleCurrencyChange = () => {
      fetchAll();
    };
    window.addEventListener('app-currency-changed', handleCurrencyChange);
    return () => window.removeEventListener('app-currency-changed', handleCurrencyChange);
  }, [fetchAll])

  const rangeBounds = useMemo(() => getRangeBounds(dateRange), [dateRange])

  const filteredLeads = useMemo(() =>
    (leadsData ?? []).filter((lead) => {
      const matchesDate =
        isInRange(
          lead.inquiryDate || lead.leadCreatedDate,
          rangeBounds
        );
      const matchesGroup =
        !selectedGroup ||
        lead.leadGroup === selectedGroup;
      return matchesDate && matchesGroup;
    }),
    [leadsData, rangeBounds, selectedGroup]
  );

  const filteredLeadsDate = useMemo(() => {
    let list = [...(leadsData || [])];
    if (dateFrom) {
      list = list.filter((lead) => {
        if (!lead.quotationDate) return false;
        const quotationDate = lead.quotationDate.split("T")[0];
        return quotationDate >= dateFrom;
      });
    }
    if (dateTo) {
      list = list.filter((lead) => {
        if (!lead.quotationDate) return false;
        const quotationDate = lead.quotationDate.split("T")[0];
        return quotationDate <= dateTo;
      });
    }
    return list;
  }, [leadsData, dateFrom, dateTo]);

  const filteredOpportunities = useMemo(() =>
    (opportunitiesData ?? []).filter((opp) =>
      isInRange(opp.oppActualCloseDate || opp.oppForcastCloseDate, rangeBounds)
    ),
    [opportunitiesData, rangeBounds]
  )

  const filteredProjects = useMemo(() =>
    (projectsData ?? []).filter((project) =>
      isInRange(project.projectStartDate || project.projectCompletedDate || project.forecastCompletedDate, rangeBounds)
    ),
    [projectsData, rangeBounds]
  )

  const filteredTasks = useMemo(() =>
    (tasksData ?? []).filter((task) =>
      isInRange(task.taskDueDate || task.taskStartDate || task.taskCompletedDate, rangeBounds)
    ),
    [tasksData, rangeBounds]
  )

  const filteredReminders = useMemo(() =>
    (remindersData ?? []).filter((reminder) => isInRange(reminder.date, rangeBounds)),
    [remindersData, rangeBounds]
  )

  const rangeStats = useMemo(() => {
    const leadStatuses = filteredLeads.map((lead) => lead.leadStatus)
    const leadOutcomeStatuses = filteredLeads.map((lead) => lead.leadOutcomeStatus)
    const oppStatuses = filteredOpportunities.map((opp) => opp.oppStatus)
    return {
      leadAll: filteredLeads.length,
      leadQualified: countByStatus(leadStatuses, (s) => s.includes('qualified')),
      leadWorking: countByStatus(leadStatuses, (s) => s.includes('working')),
      leadQuotationSent: countByStatus(leadStatuses, (s) => s.includes('quotation')),
      leadNegotiation: countByStatus(leadStatuses, (s) => s.includes('negotiation')),
      leadConverted: countByStatus(leadStatuses, (s) => s.includes('converted')),
      leadWon: countByStatus(leadOutcomeStatuses, (s) => s === 'won'),
      leadOpen: countByStatus(leadOutcomeStatuses, (s) => s === 'open'),
      leadClosed: countByStatus(leadOutcomeStatuses, (s) => s === 'closed'),
      opportunityWon: countByStatus(oppStatuses, (s) => s.includes('won')),
      opportunityLost: countByStatus(oppStatuses, (s) => s.includes('closed')),
      opportunityOpen: countByStatus(oppStatuses, (s) => s.includes('open')),
      projectCount: filteredProjects.length,
      leadSourceWiseCount: groupByCount(filteredLeads, (lead) => lead.leadSource),
      opportunityStatusWiseCount: groupByCount(filteredOpportunities, (opp) => opp.oppStatus),
    }
  }, [filteredLeads, filteredOpportunities, filteredProjects])

  const calculatedStats = useMemo(() => {
    let totalLeadsCount = filteredLeads.length
    let totalLeadsAmount = 0
    let qualifiedLeadsCount = 0
    let qualifiedLeadsAmount = 0
    let closedLeadsCount = 0
    let closedLeadsAmount = 0
    let wonLeadsCount = 0
    let negotiationCount = 0
    let negotiationAmount = 0
    let wonLeadsAmount = 0
    let openLeadsCount = 0
    let openLeadsAmount = 0
    let ongoingLeadsCount = 0
    let ongoingImportantCount = 0
    let ongoingMostImportantCount = 0


    filteredLeads.forEach((lead) => {
      const amt = Number(lead.quotationAmount || 0)
      totalLeadsAmount += amt
      if (lead.enquiryType === 'Qualified' || lead.leadStatus === 'Qualified') {
        qualifiedLeadsCount++
        qualifiedLeadsAmount += amt
      }
      if (lead.leadOutcomeStatus === 'Open') {
        openLeadsCount++
        openLeadsAmount += amt
      }
      if (lead.leadOutcomeStatus === "Negotiation") {
        negotiationCount++;
        negotiationAmount += amt;
      }
      if (lead.leadOutcomeStatus === 'Closed') {
        closedLeadsCount++
        closedLeadsAmount += amt
      }
      if (lead.leadOutcomeStatus === 'Won') {
        wonLeadsCount++
        wonLeadsAmount += amt
      }
      if (lead.leadStatus === 'Ongoing') {
        ongoingLeadsCount++
        if (lead.ongoingPriority === 'A') {
          ongoingImportantCount++
        } else if (lead.ongoingPriority === 'B') {
          ongoingMostImportantCount++
        }
      }
    })

    const conversionRatioTotal = totalLeadsCount ? Math.round((wonLeadsCount / totalLeadsCount) * 100) : 0
    const conversionRatioQualified = qualifiedLeadsCount ? Math.round((wonLeadsCount / qualifiedLeadsCount) * 100) : 0

    return {
      totalLeadsCount,
      totalLeadsAmount,
      qualifiedLeadsCount,
      qualifiedLeadsAmount,
      openLeadsCount,
      openLeadsAmount,
      closedLeadsCount,
      closedLeadsAmount,
      wonLeadsCount,
      wonLeadsAmount,
      ongoingLeadsCount,
      ongoingImportantCount,
      ongoingMostImportantCount,
      conversionRatioTotal,
      conversionRatioQualified,
      negotiationCount,
      negotiationAmount
    }
  }, [filteredLeads])

  const leadsByGrade = useMemo(() => {
    const grades = {
      A: [], B: [], C: [], D: [],
    };
    filteredLeads.forEach((lead) => {
      if (lead.leadOutcomeStatus !== "Open") return;
      const rating = Number(lead.leadRating || 0);
      if (rating === 5) {
        grades.A.push(lead);
      } else if (rating === 4) {
        grades.B.push(lead);
      } else if (rating === 3) {
        grades.C.push(lead);
      } else if (rating <= 2 && rating > 0) {
        grades.D.push(lead);
      }
    });
    return grades;
  }, [filteredLeads]);

  const gradeCounts = useMemo(() => {
    return {
      A: leadsByGrade.A.length,
      B: leadsByGrade.B.length,
      C: leadsByGrade.C.length,
      D: leadsByGrade.D.length,
    }
  }, [leadsByGrade])

  const winRate = useMemo(() => {
    const total = calculatedStats.wonLeadsCount + calculatedStats.closedLeadsCount
    return total ? Math.round((calculatedStats.wonLeadsCount / total) * 100) : 0
  }, [calculatedStats])

  const conversionRate = useMemo(() => {
    const all = calculatedStats.totalLeadsCount
    const won = calculatedStats.wonLeadsCount
    return all ? Math.round((won / all) * 100) : 0
  }, [calculatedStats])

  const pipelineValue = useMemo(() => {
    const total = calculatedStats.totalLeadsAmount
    if (total >= 10000000) return `₹${(total / 10000000).toFixed(1)}Cr`
    if (total >= 100000) return `₹${(total / 100000).toFixed(1)}L`
    return `₹${total.toLocaleString('en-IN')}`
  }, [calculatedStats])

  const todaysTasks = useMemo(() =>
    filteredTasks.slice(0, 6).map((t) => ({
      id: t.taskId,
      title: t.taskName,
      owner: t.taskAssign || (t.taskAssignedTo ? `User ${t.taskAssignedTo}` : 'Unassigned'),
      priority: (t.taskPriority?.toLowerCase() ?? 'medium'),
      completed: completedTaskIds.has(t.taskId),
      dueDate: t.taskDueDate || t.taskStartDate,
      pct: t.taskPercentageCompleted ?? 0,
    })),
    [filteredTasks, completedTaskIds]
  )

  const completedVisibleTasks = useMemo(
    () => todaysTasks.filter((task) => task.completed).length,
    [todaysTasks]
  )

  const visibleReminders = useMemo(() =>
    filteredReminders.slice(0, 6).map((reminder) => ({
      ...reminder,
      completed: completedReminderIds.has(reminder.id),
    })),
    [filteredReminders, completedReminderIds]
  )

  const completedVisibleReminders = useMemo(
    () => visibleReminders.filter((reminder) => reminder.completed).length,
    [visibleReminders]
  )

  const filteredActivityFeed = useMemo(() =>
    (advancedCrmState.activityFeed ?? []).filter((item) => isInRange(item.time, rangeBounds)),
    [advancedCrmState.activityFeed, rangeBounds]
  )

  function toggleTask(id) {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleReminder(id) {
    setCompletedReminderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const navigateToLeads = (filterType, filterValue) => {
    navigate(`/lead?filter=${filterType}&value=${encodeURIComponent(filterValue)}`)
  }

  const leadStatusItems = useMemo(() => {
    const leadStatuses = filteredLeads.map((lead) => lead.leadStatus)
    return [
      { label: 'New Lead', value: countByStatus(leadStatuses, (s) => s === 'new lead') },
      { label: 'Qualified', value: countByStatus(leadStatuses, (s) => s === 'qualified') },
      { label: 'Ongoing', value: countByStatus(leadStatuses, (s) => s === 'ongoing') },
      { label: 'Disqualified', value: countByStatus(leadStatuses, (s) => s === 'disqualified') },
    ].filter((i) => i.value > 0)
  }, [filteredLeads])

  const leadBarData = useMemo(() => ({
    labels: leadStatusItems.map((i) => i.label),
    datasets: [{
      data: leadStatusItems.map((i) => i.value),
      backgroundColor: leadStatusItems.map((_, idx) => STATUS_PALETTE[idx % STATUS_PALETTE.length]),
      borderRadius: 6, borderSkipped: false,
    }],
  }), [leadStatusItems])

  const oppStatusItems = useMemo(() => {
    return [
      { label: 'Open', value: filteredLeads.filter(l => l.leadOutcomeStatus === 'Open').length },
      { label: 'Negotiation', value: filteredLeads.filter(l => l.leadOutcomeStatus === 'Negotiation').length },
      // { label: 'Ongoing', value: filteredLeads.filter(l => l.leadStatus === 'Ongoing').length },
      { label: 'Won', value: filteredLeads.filter(l => l.leadOutcomeStatus === 'Won').length },
      { label: 'Closed', value: filteredLeads.filter(l => l.leadOutcomeStatus === 'Closed').length },
    ].filter((i) => i.value > 0)
  }, [filteredLeads])

  const oppDoughnutData = useMemo(() => ({
    labels: oppStatusItems.map((i) => i.label),
    datasets: [{
      data: oppStatusItems.map((i) => i.value),
      backgroundColor: oppStatusItems.map((_, idx) => OPP_PALETTE[idx % OPP_PALETTE.length]),
      borderWidth: 2, borderColor: '#ffffff', hoverOffset: 6,
    }],
  }), [oppStatusItems])

  const leadSourceItems = useMemo(() =>
    (rangeStats.leadSourceWiseCount ?? []).map((m) => ({
      label: String(m.label ?? m.source ?? m.leadSource ?? m.name ?? 'Unknown'),
      value: Number(m.count ?? m.total ?? 0),
    })).filter((i) => i.value > 0),
    [rangeStats]
  )

  const leadSourceDoughnutData = useMemo(() => ({
    labels: leadSourceItems.map((i) => i.label),
    datasets: [{
      data: leadSourceItems.map((i) => i.value),
      backgroundColor: leadSourceItems.map((_, idx) => SOURCE_PALETTE[idx % SOURCE_PALETTE.length]),
      borderWidth: 2, borderColor: '#ffffff', hoverOffset: 6,
    }],
  }), [leadSourceItems])

  const funnelSteps = useMemo(() => {
    const rawSteps = [
      { key: 'total', label: 'Total Leads', count: filteredLeads.length, color: '#2563eb', icon: 'mdi:account-multiple-outline', filterType: 'all', filterValue: '' },
      { key: 'qualified', label: 'Qualified', count: filteredLeads.filter(l => l.enquiryType === 'Qualified' || l.leadStatus === 'Qualified').length, color: '#059669', icon: 'mdi:account-check-outline', filterType: 'status', filterValue: 'Qualified' },
      { key: 'open', label: 'Open', count: filteredLeads.filter(l => l.leadOutcomeStatus === 'Open').length, color: '#0891b2', icon: 'mdi:folder-open-outline', filterType: 'leadOutcomeStatus', filterValue: 'Open' },
      { key: 'negotiation', label: 'Negotiation', count: filteredLeads.filter(l => l.leadOutcomeStatus === 'Negotiation').length, color: '#d97706', icon: 'mdi:sync', filterType: 'leadOutcomeStatus', filterValue: 'Negotiation' },
      // { key: 'ongoing', label: 'Ongoing', count: filteredLeads.filter(l => l.leadStatus === 'Ongoing').length, color: '#d97706', icon: 'mdi:sync', filterType: 'status', filterValue: 'Ongoing' },
      { key: 'won', label: 'Won', count: filteredLeads.filter(l => l.leadOutcomeStatus === 'Won').length, color: '#16a34a', icon: 'mdi:trophy-outline', filterType: 'leadOutcomeStatus', filterValue: 'Won' },
      { key: 'closed', label: 'Closed', count: filteredLeads.filter(l => l.leadOutcomeStatus === 'Closed').length, color: '#6b7280', icon: 'mdi:close-circle-outline', filterType: 'leadOutcomeStatus', filterValue: 'Closed' },
    ]
    const total = Math.max(Number(rawSteps[0].count) || 0, 1)
    const maxCount = Math.max(...rawSteps.map((step) => Number(step.count) || 0), 1)

    return rawSteps.map((step, idx) => {
      const previousCount = idx === 0 ? total : Math.max(Number(rawSteps[idx - 1].count) || 0, 1)
      const count = Number(step.count) || 0
      return {
        ...step,
        count,
        pct: Math.round((count / total) * 100),
        previousPct: idx === 0 ? 100 : Math.round((count / previousCount) * 100),
        dropOff: idx === 0 ? 0 : Math.max((Number(rawSteps[idx - 1].count) || 0) - count, 0),
        widthPct: Math.max((count / maxCount) * 100, count > 0 ? 20 : 10),
      }
    })
  }, [filteredLeads])

  const selectedFunnelStep = useMemo(
    () => funnelSteps.find((step) => step.key === selectedFunnelKey) || funnelSteps[0],
    [funnelSteps, selectedFunnelKey]
  )

  const chartTabs = [
    { key: 'status', label: 'Lead Status' },
    { key: 'opp', label: 'Pipeline Stage' },
    { key: 'source', label: 'Lead Source' },
  ]

  const starCounts = useMemo(() => ({
    5: leadsByGrade.A.length,
    4: leadsByGrade.B.length,
    3: leadsByGrade.C.length,
    2: leadsByGrade.D.filter(l => Number(l.leadRating) === 2).length,
    1: leadsByGrade.D.filter(l => Number(l.leadRating) === 1).length,
  }), [leadsByGrade]);

  const quotationByStar = {
    5: leadsByGrade.A.reduce((sum, lead) => sum + Number(lead.quotationAmount || 0), 0),
    4: leadsByGrade.B.reduce((sum, lead) => sum + Number(lead.quotationAmount || 0), 0),
    3: leadsByGrade.C.reduce((sum, lead) => sum + Number(lead.quotationAmount || 0), 0),
    2: leadsByGrade.D.reduce((sum, lead) => sum + Number(lead.quotationAmount || 0), 0),
  };

  const leadGroups = useMemo(() => {
    const groups = [
      ...new Set(
        (leadsData || [])
          .map((lead) => lead.leadGroup)
          .filter(Boolean)
      ),
    ];
    return groups.map((group, index) => ({
      id: index + 1,
      groupName: group,
    }));
  }, [leadsData]);

  return (
    <div className="animate-fade-in space-y-5 max-w-[1700px] mx-auto px-2 sm:px-4 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {DATE_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all duration-150 ${dateRange === range ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >{DATE_LABELS[range]}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* <div
            className={`relative rounded-xl transition-all ${selectedGroup
                ? "bg-blue-50 border border-blue-300"
                : "bg-white border border-gray-200"
              }`}
          >
            <select
              value={selectedGroup || ""}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="appearance-none bg-transparent px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-xs sm:text-sm font-medium outline-none min-w-[140px] sm:min-w-[180px] cursor-pointer w-full"
            >
              <option value="">👥 All Lead Groups</option>
              {leadGroups.map((group) => (
                <option key={group.id} value={group.groupName}>
                  {group.groupName}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 sm:right-3 flex items-center">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div> */}

          {/* Date range picker */}
          {/* <div className="flex items-center gap-1 sm:gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-[10px] sm:text-xs border border-gray-200 rounded-lg px-1.5 sm:px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 max-w-[100px] sm:max-w-full"
            />
            <span className="text-gray-400 text-[10px] sm:text-xs px-0.5 sm:px-1">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-[10px] sm:text-xs border border-gray-200 rounded-lg px-1.5 sm:px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 max-w-[100px] sm:max-w-full"
            />
          </div> */}

          <button
            onClick={fetchAll}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
            title="Refresh dashboard"
          >
            <Icon name="mdi:refresh" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 2xl:grid-cols-[3fr_1.35fr] xl:grid-cols-1 gap-5">
            <div className="space-y-4">
              <div className="skeleton h-64 rounded-xl" />
              <div className="skeleton h-48 rounded-xl" />
              <div className="skeleton h-56 rounded-xl" />
            </div>
            <div className="space-y-4">
              <div className="skeleton h-56 rounded-xl" />
              <div className="skeleton h-44 rounded-xl" />
              <div className="skeleton h-40 rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-8 sm:p-12 text-center">
          <Icon name="mdi:alert-circle-outline" className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-semibold">Failed to load dashboard data.</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Check your backend connection and try again.</p>
          <button onClick={fetchAll} className="btn-primary btn-sm">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
            {/* Card 1: Total Leads */}
            <div onClick={() => navigateToLeads('all', '')} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow group cursor-pointer">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400">Total Leads</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                  <Icon name="mdi:account-multiple-outline" className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{calculatedStats.totalLeadsCount}</p>
              <p className="text-[8px] sm:text-xs text-blue-500 mt-0.5 sm:mt-1 font-semibold truncate">
                Amt: {formatCurrency(calculatedStats.totalLeadsAmount)}
              </p>
            </div>

            {/* Card 2: Qualified Leads */}
            <div onClick={() => navigateToLeads('status', 'Qualified')} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow group cursor-pointer">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400">Qualified</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                  <Icon name="mdi:account-check-outline" className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{calculatedStats.qualifiedLeadsCount}</p>
              <p className="text-[8px] sm:text-xs text-purple-500 mt-0.5 sm:mt-1 font-semibold truncate">
                Amt: {formatCurrency(calculatedStats.qualifiedLeadsAmount)}
              </p>
            </div>

            {/* Card 3: Open Leads */}
            <div onClick={() => navigateToLeads('leadOutcomeStatus', 'Open')} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow group cursor-pointer">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400">Open</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                  <Icon name="mdi:folder-open-outline" className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{calculatedStats.openLeadsCount}</p>
              <p className="text-[8px] sm:text-xs text-indigo-500 mt-0.5 sm:mt-1 font-semibold truncate">
                Amt: {formatCurrency(calculatedStats.openLeadsAmount)}
              </p>
            </div>

            {/* Card 4: Negotiation Leads */}
            <div
              onClick={() => navigateToLeads("leadOutcomeStatus", "Negotiation")}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Negotiation
                </span>

                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-yellow-50 group-hover:bg-yellow-100 flex items-center justify-center transition-colors">
                  <Icon
                    name="mdi:handshake-outline"
                    className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600"
                  />
                </div>
              </div>

              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {calculatedStats.negotiationCount}
              </p>

              <p className="text-[8px] sm:text-xs text-yellow-600 mt-0.5 sm:mt-1 font-semibold truncate">
                Amt: {formatCurrency(calculatedStats.negotiationAmount)}
              </p>
            </div>
            {/* Card 5: Closed Leads */}
            <div onClick={() => navigateToLeads('leadOutcomeStatus', 'Closed')} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 border-l-4 border-l-gray-500 hover:shadow-md transition-shadow group cursor-pointer">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400">Closed</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <Icon name="mdi:close-circle-outline" className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{calculatedStats.closedLeadsCount}</p>
              <p className="text-[8px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-semibold truncate">
                Amt: {formatCurrency(calculatedStats.closedLeadsAmount)}
              </p>
            </div>

            {/* Card 6: Won Leads */}
            <div onClick={() => navigateToLeads('leadOutcomeStatus', 'Won')} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow group cursor-pointer">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400">Won</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <Icon name="mdi:trophy-outline" className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{calculatedStats.wonLeadsCount}</p>
              <p className="text-[8px] sm:text-xs text-emerald-500 mt-0.5 sm:mt-1 font-semibold truncate">
                Amt: {formatCurrency(calculatedStats.wonLeadsAmount)}
              </p>
            </div>

            {/* Card 7: Conversion Ratio */}
            <div className="block bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400">Conversion</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                  <Icon name="mdi:trending-up" className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{calculatedStats.conversionRatioTotal}%</p>
              <p className="text-[8px] sm:text-xs text-indigo-500 mt-0.5 sm:mt-1 font-semibold truncate">
                Qualified: {calculatedStats.conversionRatioQualified}%
              </p>
            </div>
          </div>

          {/* Main 2-col Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5">
            {/* LEFT COLUMN */}
            <div className="space-y-5">
              {/* Chart Section */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 pt-4 pb-0">
                  <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
                    {chartTabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveChart(tab.key)}
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold rounded-t-lg transition-all ${activeChart === tab.key
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                      >{tab.label}</button>
                    ))}
                  </div>
                  <Link
                    to={activeChart === 'opp' ? '/lead' : '/lead'}
                    className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-semibold pb-1"
                  >View all →</Link>
                </div>
                <div className="px-3 sm:px-5 pb-5 pt-4" style={{ height: 220 }}>
                  {activeChart === 'status' && leadStatusItems.length > 0 && <Bar data={leadBarData} options={leadBarOptions} />}
                  {activeChart === 'status' && !leadStatusItems.length && <p className="text-sm text-gray-400 text-center pt-16">No lead data available.</p>}
                  {activeChart === 'opp' && oppStatusItems.length > 0 && <Doughnut data={oppDoughnutData} options={doughnutOptions} />}
                  {activeChart === 'opp' && !oppStatusItems.length && <p className="text-sm text-gray-400 text-center pt-16">No pipeline stage data available.</p>}
                  {activeChart === 'source' && leadSourceItems.length > 0 && <Doughnut data={leadSourceDoughnutData} options={doughnutOptions} />}
                  {activeChart === 'source' && !leadSourceItems.length && <p className="text-sm text-gray-400 text-center pt-16">No lead source data available.</p>}
                </div>
              </div>

              {/* Sales Funnel */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 pt-4 pb-3 border-b border-gray-50">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">Sales Funnel</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Click a stage to inspect conversion</p>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedFunnelStep?.filterType === 'all') {
                        navigateToLeads('all', '')
                      } else if (selectedFunnelStep?.filterType === 'status') {
                        navigateToLeads('status', selectedFunnelStep.filterValue)
                      } else if (selectedFunnelStep?.filterType === 'leadOutcomeStatus') {
                        navigateToLeads('leadOutcomeStatus', selectedFunnelStep.filterValue)
                      }
                    }}
                    className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Open stage →
                  </button>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_240px] gap-5 p-3 sm:p-5">
                  <div className="min-w-0">
                    <svg
                      viewBox="0 0 760 520"
                      role="img"
                      aria-label="Sales funnel conversion chart"
                      className="w-full h-[320px] sm:h-[420px] xl:h-[500px] 2xl:h-[560px]"
                    >
                      {funnelSteps.map((step, idx) => {
                        const sectionHeight = 78
                        const topY = 20 + idx * sectionHeight
                        const bottomY = topY + sectionHeight
                        const maxWidth = 700
                        const minWidth = 150
                        const totalSteps = funnelSteps.length
                        const topWidth = maxWidth - ((maxWidth - minWidth) / totalSteps) * idx
                        const bottomWidth = maxWidth - ((maxWidth - minWidth) / totalSteps) * (idx + 1)
                        const centerX = 380
                        const topLeft = centerX - topWidth / 2
                        const topRight = centerX + topWidth / 2
                        const bottomLeft = centerX - bottomWidth / 2
                        const bottomRight = centerX + bottomWidth / 2
                        const isSelected = selectedFunnelStep?.key === step.key

                        return (
                          <g key={step.key} className="cursor-pointer" onClick={() => setSelectedFunnelKey(step.key)}>
                            <polygon
                              points={`${topLeft},${topY} ${topRight},${topY} ${bottomRight},${bottomY} ${bottomLeft},${bottomY}`}
                              fill={step.color}
                              opacity={isSelected ? 1 : 0.88}
                              stroke={isSelected ? '#111827' : '#ffffff'}
                              strokeWidth={isSelected ? 3 : 2}
                              className="transition-all duration-200 hover:opacity-100"
                            />
                            <text
                              x={centerX}
                              y={topY + 32}
                              textAnchor="middle"
                              className="fill-white text-[18px] font-bold"
                            >
                              {step.label}
                            </text>
                            <text
                              x={centerX}
                              y={topY + 56}
                              textAnchor="middle"
                              className="fill-white text-[14px] font-semibold opacity-90"
                            >
                              {step.count.toLocaleString('en-IN')} | {step.pct}%
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {funnelSteps.map((step) => (
                        <button
                          key={step.key}
                          onClick={() => setSelectedFunnelKey(step.key)}
                          className={`flex items-center gap-1 sm:gap-2 rounded-lg border px-2 sm:px-3 py-2 text-left transition-colors ${selectedFunnelStep?.key === step.key
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                          <Icon name={step.icon} className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] sm:text-xs font-semibold">{step.label}</span>
                            <span className={`block text-[9px] sm:text-[11px] ${selectedFunnelStep?.key === step.key ? 'text-gray-300' : 'text-gray-400'}`}>
                              {step.count.toLocaleString('en-IN')}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: selectedFunnelStep?.color }}>
                        <Icon name={selectedFunnelStep?.icon || 'mdi:chart-funnel'} className="h-4 w-4 sm:h-5 sm:w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs sm:text-sm font-semibold text-gray-800">{selectedFunnelStep?.label}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400">{DATE_LABELS[dateRange]}</p>
                      </div>
                    </div>
                    <p className="mt-3 sm:mt-4 text-xl sm:text-2xl xl:text-3xl font-bold text-gray-900">{(selectedFunnelStep?.count ?? 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] sm:text-xs font-medium text-gray-500">records in this stage</p>
                    <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                      <div>
                        <div className="mb-1 flex justify-between text-[10px] sm:text-xs font-semibold text-gray-500">
                          <span>Of total leads</span>
                          <span>{selectedFunnelStep?.pct ?? 0}%</span>
                        </div>
                        <div className="h-1.5 sm:h-2 rounded-full bg-white">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(selectedFunnelStep?.pct ?? 0, 100)}%`, backgroundColor: selectedFunnelStep?.color }} />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-[10px] sm:text-xs font-semibold text-gray-500">
                          <span>From previous</span>
                          <span>{selectedFunnelStep?.previousPct ?? 0}%</span>
                        </div>
                        <div className="h-1.5 sm:h-2 rounded-full bg-white">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(selectedFunnelStep?.previousPct ?? 0, 100)}%`, backgroundColor: selectedFunnelStep?.color }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4 rounded-lg bg-white p-2 sm:p-3 text-[10px] sm:text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">Drop-off:</span>{' '}
                      {selectedFunnelStep?.dropOff ? `${selectedFunnelStep.dropOff.toLocaleString('en-IN')} fewer` : 'Top of funnel'}
                    </div>
                    <button
                      onClick={() => {
                        if (selectedFunnelStep?.filterType === 'all') {
                          navigateToLeads('all', '')
                        } else if (selectedFunnelStep?.filterType === 'status') {
                          navigateToLeads('status', selectedFunnelStep.filterValue)
                        } else if (selectedFunnelStep?.filterType === 'leadOutcomeStatus') {
                          navigateToLeads('leadOutcomeStatus', selectedFunnelStep.filterValue)
                        }
                      }}
                      className="mt-3 sm:mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[10px] sm:text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <Icon name="mdi:open-in-new" className="h-3 w-3 sm:h-4 sm:w-4" />
                      View records
                    </button>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 pt-4 pb-3 border-b border-gray-50">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">Recent Activity</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{DATE_LABELS[dateRange]} actions</p>
                  </div>
                  <Link to="/activities" className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-semibold">View all →</Link>
                </div>
                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {filteredActivityFeed.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-start gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 hover:bg-gray-50/80 transition-colors cursor-default">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.type === 'Call' ? 'bg-indigo-100' : item.type === 'Email' ? 'bg-blue-100' : item.type === 'Meeting' ? 'bg-orange-100' : 'bg-purple-100'
                        }`}>
                        <Icon name={item.icon} className={`w-3 h-3 sm:w-4 sm:h-4 ${item.type === 'Call' ? 'text-indigo-500' : item.type === 'Email' ? 'text-blue-500' : item.type === 'Meeting' ? 'text-orange-500' : 'text-purple-500'
                          }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 leading-snug truncate">{item.title}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{item.subject} · {item.owner}</p>
                        {item.note && <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 line-clamp-1">{item.note}</p>}
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">{item.time}</span>
                    </div>
                  ))}
                  {!filteredActivityFeed.length && (
                    <div className="px-3 sm:px-5 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-400">No recent activity.</div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Leads by Grade Section */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 pt-4 pb-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {['A', 'B', 'C', 'D'].map((grade) => (
                        <div key={grade} className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${GRADE_BG[grade]}`} />
                      ))}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-800">Leads by Stars</p>
                    </div>
                  </div>
                  <Link to="/lead" className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-semibold">View all →</Link>
                </div>

                <div className="grid grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 border-b border-gray-50">
                  {[5, 4, 3, 2].map((star) => (
                    <div key={star} className="text-center p-1.5 sm:p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="text-base sm:text-lg font-bold">{starCounts[star]}</p>
                      <p className="text-yellow-500 text-[10px] sm:text-sm">{"★".repeat(star)}</p>
                      <p className="text-[8px] sm:text-[10px] font-semibold text-green-600 truncate">
                        {formatCurrency(quotationByStar[star] || 0)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Grade A Leads - 5 Stars */}
                {leadsByGrade.A.length > 0 && (
                  <div className="border-b border-gray-50">
                    <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-50/30">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] sm:text-xs font-semibold text-emerald-700">5 Stars</span>
                        <span className="text-[10px] sm:text-xs text-emerald-600 ml-auto">{leadsByGrade.A.length} leads</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                      {[...leadsByGrade.A]
                        .sort((a, b) => Number(b.quotationAmount || 0) - Number(a.quotationAmount || 0))
                        .map((lead) => (
                          <Link key={lead.leadId} to={`/lead/${lead.leadId}`} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50/80 transition-colors">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                              {lead.companyContactPersonName?.[0]?.toUpperCase() || lead.leadOrganisationName?.[0]?.toUpperCase() || 'L'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                                {lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-0.5 sm:mt-1">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] sm:text-xs font-semibold text-green-600">
                                    {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
                                  </span>
                                  <span className="text-[8px] sm:text-[10px] text-gray-500 truncate cursor-help" title={lead.enquiryDescription || "No enquiry description"}>
                                    {(lead.enquiryDescription || "No enquiry description").length > 30
                                      ? `${lead.enquiryDescription.substring(0, 30)}...`
                                      : lead.enquiryDescription || "No enquiry description"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5 ml-0 sm:ml-2">
                                  {[...Array(5)].map((_, i) => (
                                    <Icon key={i} name="mdi:star" className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-400" />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] font-semibold ${lead.leadOutcomeStatus === 'Won' ? 'bg-green-100 text-green-700' :
                                lead.leadOutcomeStatus === 'Open' ? 'bg-purple-100 text-purple-700' :
                                  lead.leadOutcomeStatus === 'Closed' ? 'bg-gray-100 text-gray-600' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                {lead.leadOutcomeStatus || lead.leadStatus || 'New'}
                              </span>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}

                {/* Grade B Leads - 4 Stars */}
                {leadsByGrade.B.length > 0 && (
                  <div className="border-b border-gray-50">
                    <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50/30">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500" />
                        <span className="text-[10px] sm:text-xs font-semibold text-blue-700">4 Stars</span>
                        <span className="text-[10px] sm:text-xs text-blue-600 ml-auto">{leadsByGrade.B.length} leads</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                      {leadsByGrade.B.slice(0, 5).map((lead) => (
                        <Link key={lead.leadId} to={`/lead/${lead.leadId}`} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50/80 transition-colors">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                            {lead.companyContactPersonName?.[0]?.toUpperCase() || lead.leadOrganisationName?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                              {lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-0.5 sm:mt-1">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] sm:text-xs font-semibold text-green-600">
                                  {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
                                </span>
                                <span className="text-[8px] sm:text-[10px] text-gray-500 truncate cursor-help" title={lead.enquiryDescription || "No enquiry description"}>
                                  {(lead.enquiryDescription || "No enquiry description").length > 30
                                    ? `${lead.enquiryDescription.substring(0, 30)}...`
                                    : lead.enquiryDescription || "No enquiry description"}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 ml-0 sm:ml-2">
                                {[...Array(4)].map((_, i) => (
                                  <Icon key={i} name="mdi:star" className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] font-semibold ${lead.leadOutcomeStatus === 'Won' ? 'bg-green-100 text-green-700' :
                              lead.leadOutcomeStatus === 'Open' ? 'bg-purple-100 text-purple-700' :
                                lead.leadOutcomeStatus === 'Closed' ? 'bg-gray-100 text-gray-600' :
                                  'bg-gray-100 text-gray-600'
                              }`}>
                              {lead.leadOutcomeStatus || lead.leadStatus || 'New'}
                            </span>
                          </div>
                        </Link>
                      ))}
                      {leadsByGrade.B.length > 5 && (
                        <Link to="/lead?gradeFilter=B" className="block px-3 sm:px-4 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs text-blue-600 hover:bg-blue-50 font-semibold">
                          +{leadsByGrade.B.length - 5} more 4 Star leads
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Grade C Leads - 3 Stars */}
                {leadsByGrade.C.length > 0 && (
                  <div className="border-b border-gray-50">
                    <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-50/30">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500" />
                        <span className="text-[10px] sm:text-xs font-semibold text-amber-700">3 Stars</span>
                        <span className="text-[10px] sm:text-xs text-amber-600 ml-auto">{leadsByGrade.C.length} leads</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto overflow-x-visible">
                      {leadsByGrade.C.slice(0, 5).map((lead) => (
                        <Link key={lead.leadId} to={`/lead/${lead.leadId}`} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50/80 transition-colors">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                            {lead.companyContactPersonName?.[0]?.toUpperCase() || lead.leadOrganisationName?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                              {lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-0.5 sm:mt-1">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] sm:text-xs font-semibold text-green-600">
                                  {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
                                </span>
                                <span className="text-[8px] sm:text-[10px] text-gray-500 truncate cursor-help" title={lead.enquiryDescription || "No enquiry description"}>
                                  {(lead.enquiryDescription || "No enquiry description").length > 30
                                    ? `${lead.enquiryDescription.substring(0, 30)}...`
                                    : lead.enquiryDescription || "No enquiry description"}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 ml-0 sm:ml-2">
                                {[...Array(3)].map((_, i) => (
                                  <Icon key={i} name="mdi:star" className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] font-semibold ${lead.leadOutcomeStatus === 'Won' ? 'bg-green-100 text-green-700' :
                              lead.leadOutcomeStatus === 'Open' ? 'bg-purple-100 text-purple-700' :
                                lead.leadOutcomeStatus === 'Closed' ? 'bg-gray-100 text-gray-600' :
                                  'bg-gray-100 text-gray-600'
                              }`}>
                              {lead.leadOutcomeStatus || lead.leadStatus || 'New'}
                            </span>
                          </div>
                        </Link>
                      ))}
                      {leadsByGrade.C.length > 5 && (
                        <Link to="/lead?gradeFilter=C" className="block px-3 sm:px-4 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs text-amber-600 hover:bg-amber-50 font-semibold">
                          +{leadsByGrade.C.length - 5} more 3 Star leads
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Grade D Leads - 1-2 Stars */}
                {leadsByGrade.D.length > 0 && (
                  <div>
                    <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50/30">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500" />
                        <span className="text-[10px] sm:text-xs font-semibold text-red-700">2 Stars</span>
                        <span className="text-[10px] sm:text-xs text-red-600 ml-auto">{leadsByGrade.D.length} leads</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                      {leadsByGrade.D.slice(0, 5).map((lead) => (
                        <Link key={lead.leadId} to={`/lead/${lead.leadId}`} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50/80 transition-colors">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                            {lead.companyContactPersonName?.[0]?.toUpperCase() || lead.leadOrganisationName?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                              {lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-0.5 sm:mt-1">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] sm:text-xs font-semibold text-green-600">
                                  {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
                                </span>
                                <span className="text-[8px] sm:text-[10px] text-gray-500 truncate cursor-help" title={lead.enquiryDescription || "No enquiry description"}>
                                  {(lead.enquiryDescription || "No enquiry description").length > 30
                                    ? `${lead.enquiryDescription.substring(0, 30)}...`
                                    : lead.enquiryDescription || "No enquiry description"}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 ml-0 sm:ml-2">
                                {[...Array(2)].map((_, i) => (
                                  <Icon key={i} name="mdi:star" className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] font-semibold ${lead.leadOutcomeStatus === 'Won' ? 'bg-green-100 text-green-700' :
                              lead.leadOutcomeStatus === 'Open' ? 'bg-purple-100 text-purple-700' :
                                lead.leadOutcomeStatus === 'Closed' ? 'bg-gray-100 text-gray-600' :
                                  'bg-gray-100 text-gray-600'
                              }`}>
                              {lead.leadOutcomeStatus || lead.leadStatus || 'New'}
                            </span>
                          </div>
                        </Link>
                      ))}
                      {leadsByGrade.D.length > 5 && (
                        <Link to="/lead?gradeFilter=D" className="block px-3 sm:px-4 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs text-red-600 hover:bg-red-50 font-semibold">
                          +{leadsByGrade.D.length - 5} more 2 Star leads
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {(!leadsByGrade.A.length && !leadsByGrade.B.length && !leadsByGrade.C.length && !leadsByGrade.D.length) && (
                  <div className="px-3 sm:px-5 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-400">
                    <Icon name="mdi:star-outline" className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-300" />
                    No graded leads yet. Rate leads with stars to see them here.
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 pt-4 pb-3 border-b border-gray-50">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">Tasks - {DATE_LABELS[dateRange]}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400">{completedVisibleTasks} / {todaysTasks.length} done</p>
                  </div>
                  <Link to="/task" className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-semibold">View all →</Link>
                </div>
                <div className="h-1 bg-gray-100 mx-3 sm:mx-5 mt-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: todaysTasks.length ? `${Math.round((completedVisibleTasks / todaysTasks.length) * 100)}%` : '0%' }}
                  />
                </div>
                <div className="divide-y divide-gray-50 mt-1">
                  {todaysTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => toggleTask(task.id)}
                    >
                      <div className={`w-[14px] h-[14px] sm:w-[18px] sm:h-[18px] rounded border-2 flex items-center justify-center shrink-0 transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-blue-400'
                        }`}>
                        {task.completed && <Icon name="mdi:check" className="w-2 h-2 sm:w-3 sm:h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm text-gray-700 truncate transition-all ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{task.owner}</p>
                      </div>
                      <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] ?? 'bg-amber-400'}`} />
                    </div>
                  ))}
                  {!todaysTasks.length && (
                    <div className="px-3 sm:px-5 py-4 sm:py-5 text-center text-xs sm:text-sm text-gray-400">No tasks found.</div>
                  )}
                </div>
              </div>

              {/* Reminders */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 pt-4 pb-3 border-b border-gray-50">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">Reminders - {DATE_LABELS[dateRange]}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400">{completedVisibleReminders} / {visibleReminders.length} done</p>
                  </div>
                  <Link to="/calendar" className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-semibold">View all →</Link>
                </div>
                <div className="h-1 bg-gray-100 mx-3 sm:mx-5 mt-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: visibleReminders.length ? `${Math.round((completedVisibleReminders / visibleReminders.length) * 100)}%` : '0%' }}
                  />
                </div>
                <div className="divide-y divide-gray-50 mt-1">
                  {visibleReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => toggleReminder(reminder.id)}
                    >
                      <div className={`w-[14px] h-[14px] sm:w-[18px] sm:h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${reminder.completed ? 'bg-rose-500 border-rose-500' : 'border-gray-300 hover:border-rose-400'
                        }`}>
                        {reminder.completed && <Icon name="mdi:check" className="w-2 h-2 sm:w-3 sm:h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm text-gray-700 truncate transition-all ${reminder.completed ? 'line-through text-gray-400' : ''}`}>{reminder.title}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{reminder.date || reminder.owner}</p>
                      </div>
                      <Icon name="mdi:bell-outline" className="w-3 h-3 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
                    </div>
                  ))}
                  {!visibleReminders.length && (
                    <div className="px-3 sm:px-5 py-4 sm:py-5 text-center text-xs sm:text-sm text-gray-400">No reminders found.</div>
                  )}
                </div>
              </div>

              {/* Team Leaderboard */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 pt-4 pb-3 border-b border-gray-50">
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">Team Leaderboard</p>
                  <Link to="/team-member" className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-semibold">View all →</Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {(advancedCrmState.repRanking ?? []).slice(0, 5).map((rep, idx) => (
                    <div key={rep.name} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3">
                      <span className="text-base sm:text-lg w-4 sm:w-5 shrink-0 text-center select-none">
                        {['🥇', '🥈', '🥉', '4', '5'][idx]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                          <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{rep.name}</p>
                          <span className={`text-[10px] sm:text-xs font-bold ml-2 shrink-0 ${rep.quota >= 100 ? 'text-emerald-600' : rep.quota >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>
                            {rep.quota}%
                          </span>
                        </div>
                        <div className="h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(rep.quota, 100)}%`,
                              backgroundColor: rep.quota >= 100 ? '#10b981' : rep.quota >= 80 ? '#3b82f6' : '#f59e0b',
                            }}
                          />
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Win rate {rep.winRate}%</p>
                      </div>
                    </div>
                  ))}
                  {!(advancedCrmState.repRanking ?? []).length && (
                    <div className="px-3 sm:px-5 py-4 sm:py-6 text-center text-xs sm:text-sm text-gray-400">No team data available.</div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              {/* <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="px-3 sm:px-5 pt-4 pb-3 border-b border-gray-50">
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">Quick Actions</p>
                </div>
                <div className="p-2 sm:p-4 grid grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  {[
                    { to: '/lead', icon: 'mdi:account-plus-outline', label: 'New Lead', cls: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
                    { to: '/task', icon: 'mdi:clipboard-plus-outline', label: 'New Task', cls: 'bg-violet-50 hover:bg-violet-100 text-violet-700' },
                    { to: '/opportunity', icon: 'mdi:briefcase-plus-outline', label: 'New Opp.', cls: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' },
                    { to: '/contact', icon: 'mdi:card-account-details-outline', label: 'New Contact', cls: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
                    { to: '/activities', icon: 'mdi:lightning-bolt-outline', label: 'Log Activity', cls: 'bg-rose-50 hover:bg-rose-100 text-rose-700' },
                    { to: '/calendar', icon: 'mdi:calendar-plus', label: 'Add Event', cls: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700' },
                  ].map((a) => (
                    <Link
                      key={a.label}
                      to={a.to}
                      className={`flex flex-col items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-3 rounded-xl text-[8px] sm:text-xs font-semibold transition-colors text-center ${a.cls}`}
                    >
                      <Icon name={a.icon} className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline">{a.label}</span>
                      <span className="xs:hidden">{a.label.split(' ')[0]}</span>
                    </Link>
                  ))}
                </div>
              </div> */}
            </div>
          </div>
        </>
      )}
    </div>
  )
}