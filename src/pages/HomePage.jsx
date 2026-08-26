import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts'
import { useLead } from '../hooks/useLead'
import { useOpportunity } from '../hooks/useOpportunity'
import { useProject } from '../hooks/useProject'
import { useTask } from '../hooks/useTask'
import { useCalendar } from '../hooks/useCalendar'
import { useAdvancedCrmData } from '../hooks/useAdvancedCrmData'
import { useAuthStore } from '../stores/auth'
import Icon from '../components/Icon'
import { formatCurrency } from '../utils/format'
import { useDashHeaderConfig } from '../hooks/useDashHeaderConfig'

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
  const { config: dhConfig } = useDashHeaderConfig()
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
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)
  const groupDropdownRef = useRef(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const datePickerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target)) {
        setGroupDropdownOpen(false)
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setDatePickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [hl, tasks, calendarData, leads, opportunities, projects] = await Promise.all([
        getAllScores().catch(() => []),
        getAllTasks().catch(() => []),
        getAllEvents().catch(() => ({ events: [], reminders: [] })),
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
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
    // Load advanced CRM data in background without blocking UI loading state
    loadAdvancedCrm().catch(() => {})
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
      // Exclude IndiaMART and TradeIndia leads UNLESS sendToMainLeads is true
      // (mirrors the same rule in LeadListPage so counts stay in sync)
      const src = (lead?.leadSource || '').trim().toLowerCase();
      const isMarketplace =
        src.includes('indiamart') ||
        src.includes('tradeindia') ||
        src.includes('india mart') ||
        src.includes('trade india');
      if (isMarketplace) {
        const promoted =
          lead?.sendToMainLeads === true ||
          lead?.sendToMainLeads === 1 ||
          String(lead?.sendToMainLeads).toLowerCase() === 'true' ||
          String(lead?.sendToMainLeads) === '1';
        if (!promoted) return false;
      }

      const matchesDate = isInRange(
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
    // Start from leadsData with marketplace exclusion (same rule as LeadListPage)
    let list = (leadsData || []).filter((lead) => {
      const src = (lead?.leadSource || '').trim().toLowerCase();
      const isMarketplace =
        src.includes('indiamart') ||
        src.includes('tradeindia') ||
        src.includes('india mart') ||
        src.includes('trade india');
      if (!isMarketplace) return true;
      return (
        lead?.sendToMainLeads === true ||
        lead?.sendToMainLeads === 1 ||
        String(lead?.sendToMainLeads).toLowerCase() === 'true' ||
        String(lead?.sendToMainLeads) === '1'
      );
    });
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
      leadQualified: filteredLeads.filter(l => !(String(l.leadStatus).toLowerCase() === 'disqualified' || String(l.enquiryType).toLowerCase() === 'disqualified' || String(l.leadOutcomeStatus).toLowerCase() === 'disqualified')).length,
      leadWorking: countByStatus(leadStatuses, (s) => s.includes('working')),
      leadQuotationSent: countByStatus(leadStatuses, (s) => s.includes('quotation')),
      leadNegotiation: filteredLeads.filter(l => {
        const o = String(l.leadOutcomeStatus || '').toLowerCase();
        const s = String(l.leadStatus || '').toLowerCase();
        const n = String(l.negotiationStatus || '').toLowerCase();
        return o === 'negotiation' || s === 'negotiation' || n === 'negotiation';
      }).length,
      leadConverted: countByStatus(leadStatuses, (s) => s.includes('converted')),
      leadWon: filteredLeads.filter(l => {
        const o = String(l.leadOutcomeStatus || '').toLowerCase();
        const s = String(l.leadStatus || '').toLowerCase();
        return o === 'won' || o === 'converted' || s === 'won' || s === 'converted';
      }).length,
      leadOpen: filteredLeads.filter(l => {
        const o = String(l.leadOutcomeStatus || '').toLowerCase();
        const s = String(l.leadStatus || '').toLowerCase();
        return o === 'open' || o === 'hold' || o === 'budgetory' || o === 'budgetary' || (!o && (s === 'open' || s === 'hold' || s === 'budgetory' || s === 'budgetary' || s === 'new lead' || s === 'new'));
      }).length,
      leadClosed: filteredLeads.filter(l => {
        const o = String(l.leadOutcomeStatus || '').toLowerCase();
        const s = String(l.leadStatus || '').toLowerCase();
        return o === 'closed' || o === 'lost' || s === 'closed' || s === 'lost';
      }).length,
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

      const rawOutcome = String(lead.leadOutcomeStatus || '').trim().toLowerCase()
      const rawStatus = String(lead.leadStatus || '').trim().toLowerCase()
      const rawEnquiry = String(lead.enquiryType || '').trim().toLowerCase()
      const rawNego = String(lead.negotiationStatus || '').trim().toLowerCase()

      const isDisqualified = rawStatus === 'disqualified' || rawEnquiry === 'disqualified' || rawOutcome === 'disqualified'
      if (!isDisqualified) {
        qualifiedLeadsCount++
        qualifiedLeadsAmount += amt
      }
      // OPEN (Open + HOLD + Budgetory)
      if (rawOutcome === 'open' || rawOutcome === 'hold' || rawOutcome === 'budgetory' || rawOutcome === 'budgetary' || (!rawOutcome && (rawStatus === 'open' || rawStatus === 'hold' || rawStatus === 'budgetory' || rawStatus === 'budgetary' || rawStatus === 'new lead' || rawStatus === 'new'))) {
        openLeadsCount++
        openLeadsAmount += amt
      }
      // NEGOTIATION (Strictly LEAD STATUS 'Negotiation')
      if (rawOutcome === 'negotiation' || rawStatus === 'negotiation' || rawNego === 'negotiation') {
        negotiationCount++
        negotiationAmount += amt
      }
      // CLOSED (Closed + Lost)
      if (rawOutcome === 'closed' || rawOutcome === 'lost' || rawStatus === 'closed' || rawStatus === 'lost') {
        closedLeadsCount++
        closedLeadsAmount += amt
      }
      // WON (Won + Converted)
      if (rawOutcome === 'won' || rawOutcome === 'converted' || rawStatus === 'won' || rawStatus === 'converted') {
        wonLeadsCount++
        wonLeadsAmount += amt
      }
      if (rawStatus === 'ongoing') {
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

  const leadsByStar = useMemo(() => {
    const stars = { 5: [], 4: [], 3: [], 2: [], 1: [] };
    (filteredLeads || []).forEach((lead) => {
      const rating = Number(lead.leadRating || 0);
      if (rating >= 1 && rating <= 5) {
        stars[rating].push(lead);
      }
    });
    return stars;
  }, [filteredLeads]);

  const starCounts = useMemo(() => {
    return {
      5: leadsByStar[5].length,
      4: leadsByStar[4].length,
      3: leadsByStar[3].length,
      2: leadsByStar[2].length,
      1: leadsByStar[1].length,
    };
  }, [leadsByStar]);

  const quotationByStar = useMemo(() => {
    return {
      5: leadsByStar[5].reduce((sum, l) => sum + Number(l.quotationAmount || 0), 0),
      4: leadsByStar[4].reduce((sum, l) => sum + Number(l.quotationAmount || 0), 0),
      3: leadsByStar[3].reduce((sum, l) => sum + Number(l.quotationAmount || 0), 0),
      2: leadsByStar[2].reduce((sum, l) => sum + Number(l.quotationAmount || 0), 0),
      1: leadsByStar[1].reduce((sum, l) => sum + Number(l.quotationAmount || 0), 0),
    };
  }, [leadsByStar]);

  const leadsByGrade = useMemo(() => {
    return {
      A: leadsByStar[5],
      B: leadsByStar[4],
      C: leadsByStar[3],
      D: leadsByStar[2],
      E: leadsByStar[1],
    };
  }, [leadsByStar]);

  const gradeCounts = useMemo(() => {
    return {
      A: leadsByStar[5].length,
      B: leadsByStar[4].length,
      C: leadsByStar[3].length,
      D: leadsByStar[2].length,
      E: leadsByStar[1].length,
    };
  }, [leadsByStar]);

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
      { label: 'Open', value: calculatedStats.openLeadsCount },
      { label: 'Negotiation', value: calculatedStats.negotiationCount },
      { label: 'Won', value: calculatedStats.wonLeadsCount },
      { label: 'Closed', value: calculatedStats.closedLeadsCount },
    ].filter((i) => i.value > 0)
  }, [calculatedStats])

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

  const pipelineChartData = useMemo(() => {
    return [
      { label: "Captured", value: calculatedStats.totalLeadsCount },
      { label: "Qualified", value: calculatedStats.qualifiedLeadsCount },
      { label: "Open", value: calculatedStats.openLeadsCount },
      { label: "Negotiation", value: calculatedStats.negotiationCount },
      { label: "Won", value: calculatedStats.wonLeadsCount },
      { label: "Closed", value: calculatedStats.closedLeadsCount },
    ]
  }, [calculatedStats])

  const funnelSteps = useMemo(() => {
    const rawSteps = [
      { key: 'total', label: 'Total Leads', count: calculatedStats.totalLeadsCount, color: '#2563eb', icon: 'mdi:account-multiple-outline', filterType: 'all', filterValue: '' },
      { key: 'qualified', label: 'Qualified', count: calculatedStats.qualifiedLeadsCount, color: '#059669', icon: 'mdi:account-check-outline', filterType: 'status', filterValue: 'Qualified' },
      { key: 'open', label: 'Open', count: calculatedStats.openLeadsCount, color: '#0891b2', icon: 'mdi:folder-open-outline', filterType: 'leadOutcomeStatus', filterValue: 'Open' },
      { key: 'negotiation', label: 'Negotiation', count: calculatedStats.negotiationCount, color: '#d97706', icon: 'mdi:sync', filterType: 'leadOutcomeStatus', filterValue: 'Negotiation' },
      { key: 'won', label: 'Won', count: calculatedStats.wonLeadsCount, color: '#16a34a', icon: 'mdi:trophy-outline', filterType: 'leadOutcomeStatus', filterValue: 'Won' },
      { key: 'closed', label: 'Closed', count: calculatedStats.closedLeadsCount, color: '#6b7280', icon: 'mdi:close-circle-outline', filterType: 'leadOutcomeStatus', filterValue: 'Closed' },
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
    // { key: 'opp', label: 'Pipeline Stage' },
    { key: 'source', label: 'Lead Source' },
  ]

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
  const user = useAuthStore((s) => s.user)
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission)
  const userRole = user?.role?.toLowerCase()
  const isSuperAdmin = userRole === "super_admin" || userRole === "super admin"

  const hasAnyModuleAccess = isSuperAdmin || hasAnyPermission([
    "dashboard.view", "leads.view", "contacts.view", "opportunities.view",
    "projects.view", "tasks.view", "analytics.view", "reports.view",
    "settings.view", "roles.view", "data_access.view", "attendance.view", "teams.view"
  ]);

  if (!hasAnyModuleAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm my-6">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-amber-200/80">
          <Icon name="mdi:shield-lock-outline" className="w-10 h-10 text-amber-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">No Access Granted</h2>
        <p className="text-slate-600 max-w-md text-sm leading-relaxed mb-4">
          Please contact your administrator to give access to modules for this company.
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-slate-100 text-slate-600 rounded-full">
          <Icon name="mdi:information-outline" className="w-4 h-4 text-amber-600" />
          <span>Access is managed via Roles & Permissions or Data Access Config</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5 max-w-[1700px] mx-auto px-2 sm:px-4 overflow-x-hidden">
      {/* Executive Command Header Banner */}
      

      {/* Filter & Date Selector Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            {DATE_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateRange === range
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {DATE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Lead Group Dropdown Component */}
          <div className="relative" ref={groupDropdownRef}>
            <button
              onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
                selectedGroup
                  ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <Icon name="mdi:account-group-outline" className={`w-4 h-4 ${selectedGroup ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="truncate max-w-[140px] sm:max-w-[180px]">
                {selectedGroup || 'All Lead Groups'}
              </span>
              <Icon
                name="mdi:chevron-down"
                className={`w-4 h-4 transition-transform duration-200 ${
                  groupDropdownOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
                }`}
              />
            </button>

            {groupDropdownOpen && (
              <div className="absolute right-0 sm:left-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Select Lead Group
                </div>
                
                {/* All Lead Groups Option */}
                <button
                  onClick={() => {
                    setSelectedGroup(null)
                    setGroupDropdownOpen(false)
                  }}
                  className={`flex items-center justify-between w-full px-3.5 py-2 text-xs font-bold transition-colors ${
                    !selectedGroup
                      ? 'bg-blue-50/80 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${!selectedGroup ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    <span>All Lead Groups</span>
                  </div>
                  {!selectedGroup && <Icon name="mdi:check" className="w-4 h-4 text-blue-600" />}
                </button>

                {/* Lead Group Items */}
                {leadGroups.map((group) => {
                  const isSelected = selectedGroup === group.groupName
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group.groupName)
                        setGroupDropdownOpen(false)
                      }}
                      className={`flex items-center justify-between w-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                        <span className="truncate">{group.groupName}</span>
                      </div>
                      {isSelected && <Icon name="mdi:check" className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  )
                })}

                {!leadGroups.length && (
                  <div className="px-3.5 py-3 text-center text-xs text-slate-400 font-medium">No lead groups created</div>
                )}
              </div>
            )}
          </div>

          {/* Custom Date Range Picker Component */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setDatePickerOpen(!datePickerOpen)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
                dateFrom || dateTo
                  ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <Icon name="mdi:calendar-month-outline" className={`w-4 h-4 ${dateFrom || dateTo ? 'text-blue-600' : 'text-slate-500'}`} />
              <span>
                {dateFrom && dateTo
                  ? `${dateFrom} – ${dateTo}`
                  : dateFrom
                  ? `From ${dateFrom}`
                  : dateTo
                  ? `Until ${dateTo}`
                  : 'Custom Dates'}
              </span>
              {(dateFrom || dateTo) && (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className="ml-1 p-0.5 hover:bg-blue-200/60 rounded-full text-blue-700"
                  title="Clear custom dates"
                >
                  <Icon name="mdi:close" className="w-3 h-3" />
                </span>
              )}
              <Icon
                name="mdi:chevron-down"
                className={`w-4 h-4 transition-transform duration-200 ${
                  datePickerOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
                }`}
              />
            </button>

            {datePickerOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Icon name="mdi:calendar-filter" className="w-4 h-4 text-blue-600" />
                    Filter by Custom Dates
                  </span>
                  <button
                    onClick={() => setDatePickerOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <Icon name="mdi:close" className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Start Date (From)
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      End Date (To)
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setDateFrom('')
                        setDateTo('')
                        setDatePickerOpen(false)
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setDatePickerOpen(false)}
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-xl shadow-2xs transition-colors"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={fetchAll}
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
            title="Refresh dashboard data"
          >
            <Icon name="mdi:refresh" className="w-4 h-4" />
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
        <div className="space-y-6">
          {/* Top KPI Metrics Strip (7 Cards) */}
          {dhConfig?.dashboard?.showTotalLeadsCard !== false && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Card 1: Total Leads */}
            <div
              onClick={() => navigateToLeads('all', '')}
              className="group cursor-pointer rounded-2xl bg-white p-3.5 border border-slate-100 shadow-sm border-l-4 border-l-blue-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Total Leads</span>
                <div className="w-7 h-7 rounded-xl bg-blue-50 group-hover:bg-blue-500 group-hover:text-white text-blue-600 flex items-center justify-center transition-colors shrink-0">
                  <Icon name="mdi:account-multiple-outline" className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-900 leading-tight">{calculatedStats.totalLeadsCount}</p>
                <p className="text-[10px] xl:text-[11px] text-blue-600 mt-1 font-semibold truncate">
                  Amt: {formatCurrency(calculatedStats.totalLeadsAmount)}
                </p>
              </div>
            </div>

            {/* Card 2: Qualified Leads */}
            <div
              onClick={() => navigateToLeads('status', 'Qualified')}
              className="group cursor-pointer rounded-2xl bg-white p-3.5 border border-slate-100 shadow-sm border-l-4 border-l-purple-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Qualified</span>
                <div className="w-7 h-7 rounded-xl bg-purple-50 group-hover:bg-purple-500 group-hover:text-white text-purple-600 flex items-center justify-center transition-colors shrink-0">
                  <Icon name="mdi:account-check-outline" className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-900 leading-tight">{calculatedStats.qualifiedLeadsCount}</p>
                <p className="text-[10px] xl:text-[11px] text-purple-600 mt-1 font-semibold truncate">
                  Amt: {formatCurrency(calculatedStats.qualifiedLeadsAmount)}
                </p>
              </div>
            </div>

            {/* Card 3: Open Leads */}
            <div
              onClick={() => navigateToLeads('leadOutcomeStatus', 'Open')}
              className="group cursor-pointer rounded-2xl bg-white p-3.5 border border-slate-100 shadow-sm border-l-4 border-l-indigo-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Open</span>
                <div className="w-7 h-7 rounded-xl bg-indigo-50 group-hover:bg-indigo-500 group-hover:text-white text-indigo-600 flex items-center justify-center transition-colors shrink-0">
                  <Icon name="mdi:folder-open-outline" className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-900 leading-tight">{calculatedStats.openLeadsCount}</p>
                <p className="text-[10px] xl:text-[11px] text-indigo-600 mt-1 font-semibold truncate">
                  Amt: {formatCurrency(calculatedStats.openLeadsAmount)}
                </p>
              </div>
            </div>

            {/* Card 4: Negotiation Leads */}
            <div
              onClick={() => navigateToLeads("leadOutcomeStatus", "Negotiation")}
              className="group cursor-pointer rounded-2xl bg-white p-3.5 border border-slate-100 shadow-sm border-l-4 border-l-amber-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Negotiation</span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 group-hover:bg-amber-500 group-hover:text-white text-amber-600 flex items-center justify-center transition-colors shrink-0">
                  <Icon name="mdi:handshake-outline" className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-900 leading-tight">{calculatedStats.negotiationCount}</p>
                <p className="text-[10px] xl:text-[11px] text-amber-600 mt-1 font-semibold truncate">
                  Amt: {formatCurrency(calculatedStats.negotiationAmount)}
                </p>
              </div>
            </div>

            {/* Card 5: Closed Leads */}
            <div
              onClick={() => navigateToLeads('leadOutcomeStatus', 'Closed')}
              className="group cursor-pointer rounded-2xl bg-white p-3.5 border border-slate-100 shadow-sm border-l-4 border-l-slate-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Closed</span>
                <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-slate-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors shrink-0">
                  <Icon name="mdi:close-circle-outline" className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-900 leading-tight">{calculatedStats.closedLeadsCount}</p>
                <p className="text-[10px] xl:text-[11px] text-slate-500 mt-1 font-semibold truncate">
                  Amt: {formatCurrency(calculatedStats.closedLeadsAmount)}
                </p>
              </div>
            </div>

            {/* Card 6: Won Leads */}
            <div
              onClick={() => navigateToLeads('leadOutcomeStatus', 'Won')}
              className="group cursor-pointer rounded-2xl bg-white p-3.5 border border-slate-100 shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Won</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 group-hover:bg-emerald-500 group-hover:text-white text-emerald-600 flex items-center justify-center transition-colors shrink-0">
                  <Icon name="mdi:trophy-outline" className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-900 leading-tight">{calculatedStats.wonLeadsCount}</p>
                <p className="text-[10px] xl:text-[11px] text-emerald-600 mt-1 font-semibold truncate">
                  Amt: {formatCurrency(calculatedStats.wonLeadsAmount)}
                </p>
              </div>
            </div>

            {/* Card 7: Conversion Ratio */}
            <div className="group rounded-2xl bg-white p-3.5 border border-slate-100 shadow-sm border-l-4 border-l-cyan-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Conversion</span>
                <div className="w-7 h-7 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                  <Icon name="mdi:trending-up" className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-900 leading-tight">{calculatedStats.conversionRatioTotal}%</p>
                <p className="text-[10px] xl:text-[11px] text-cyan-600 mt-1 font-semibold truncate">
                  Qualified: {calculatedStats.conversionRatioQualified}%
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Main 12-Column Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN (8 Cols on XL / 7 Cols on LG) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
              
              {/* Sales Funnel & Stage Intelligence Card */}
              {dhConfig?.dashboard?.showPipelineStageCard !== false && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">Sales Funnel Performance</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Click any stage polygon or button to filter pipeline conversion</p>
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
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <span>Inspect stage</span>
                    <Icon name="mdi:arrow-right" className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 sm:p-5 items-center">
                  {/* Funnel SVG & Quick Stage Selector (Left 7 Cols) */}
                  <div className="md:col-span-7 flex flex-col justify-between min-w-0">
                    <div className="w-full flex items-center justify-center py-1">
                      <svg
                        viewBox="0 0 760 520"
                        role="img"
                        aria-label="Sales funnel conversion chart"
                        className="w-full h-auto max-h-[250px] mx-auto block drop-shadow-xs"
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
                            <g key={step.key} className="cursor-pointer group" onClick={() => setSelectedFunnelKey(step.key)}>
                              <polygon
                                points={`${topLeft},${topY} ${topRight},${topY} ${bottomRight},${bottomY} ${bottomLeft},${bottomY}`}
                                fill={step.color}
                                opacity={isSelected ? 1 : 0.88}
                                stroke={isSelected ? '#0f172a' : '#ffffff'}
                                strokeWidth={isSelected ? 3 : 2}
                                className="transition-all duration-200 group-hover:opacity-100"
                              />
                              <text
                                x={centerX}
                                y={topY + 32}
                                textAnchor="middle"
                                className="fill-white text-[17px] font-extrabold select-none"
                              >
                                {step.label}
                              </text>
                              <text
                                x={centerX}
                                y={topY + 56}
                                textAnchor="middle"
                                className="fill-white text-[13px] font-bold opacity-90 select-none"
                              >
                                {step.count.toLocaleString('en-IN')} | {step.pct}%
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    </div>

                    {/* Stage Filter Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 mt-3">
                      {funnelSteps.map((step) => (
                        <button
                          key={step.key}
                          onClick={() => setSelectedFunnelKey(step.key)}
                          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left transition-all ${
                            selectedFunnelStep?.key === step.key
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                              : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon name={step.icon} className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] font-bold">{step.label}</span>
                            <span className={`block text-[9px] ${selectedFunnelStep?.key === step.key ? 'text-slate-300' : 'text-slate-400'}`}>
                              {step.count.toLocaleString('en-IN')}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stage Intelligence Card (Right 5 Cols) */}
                  <div className="md:col-span-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-xs shrink-0" style={{ backgroundColor: selectedFunnelStep?.color }}>
                          <Icon name={selectedFunnelStep?.icon || 'mdi:chart-funnel'} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs sm:text-sm font-bold text-slate-900">{selectedFunnelStep?.label}</p>
                          <p className="text-[10px] text-slate-400">{DATE_LABELS[dateRange]}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{(selectedFunnelStep?.count ?? 0).toLocaleString('en-IN')}</p>
                        <p className="text-[11px] font-semibold text-slate-500">records in stage</p>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div>
                          <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>Of total leads</span>
                            <span>{selectedFunnelStep?.pct ?? 0}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white border border-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(selectedFunnelStep?.pct ?? 0, 100)}%`, backgroundColor: selectedFunnelStep?.color }} />
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>From previous stage</span>
                            <span>{selectedFunnelStep?.previousPct ?? 0}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white border border-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(selectedFunnelStep?.previousPct ?? 0, 100)}%`, backgroundColor: selectedFunnelStep?.color }} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-white p-2.5 border border-slate-100 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-800">Drop-off:</span>{' '}
                        {selectedFunnelStep?.dropOff ? `${selectedFunnelStep.dropOff.toLocaleString('en-IN')} fewer` : 'Top of funnel'}
                      </div>
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
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.99]"
                    >
                      <Icon name="mdi:open-in-new" className="h-3.5 w-3.5" />
                      Inspect records in lead list
                    </button>
                  </div>
                </div>
              </div>
              )}

              {/* Analytics Chart Section */}
              {dhConfig?.dashboard?.showChartsCard !== false && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl">
                    {chartTabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveChart(tab.key)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          activeChart === tab.key
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <Link
                    to="/lead"
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                  >
                    <span>View all leads</span>
                    <Icon name="mdi:arrow-right" className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="w-full relative" style={{ height: 240 }}>
                  {activeChart === 'status' && leadStatusItems.length > 0 && <Bar data={leadBarData} options={leadBarOptions} />}
                  {activeChart === 'status' && !leadStatusItems.length && <p className="text-sm text-slate-400 text-center pt-20">No lead status data available.</p>}
                  {activeChart === 'opp' && oppStatusItems.length > 0 && <Doughnut data={oppDoughnutData} options={doughnutOptions} />}
                  {activeChart === 'opp' && !oppStatusItems.length && <p className="text-sm text-slate-400 text-center pt-20">No pipeline stage data available.</p>}
                  {activeChart === 'source' && leadSourceItems.length > 0 && <Doughnut data={leadSourceDoughnutData} options={doughnutOptions} />}
                  {activeChart === 'source' && !leadSourceItems.length && <p className="text-sm text-slate-400 text-center pt-20">No lead source data available.</p>}
                </div>
              </div>
              )}

              {/* Pipeline Stage Funnel Card (like in /analytics) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">Pipeline Stage Funnel</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Distribution of potential deals across CRM milestones</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                    Live Data
                  </span>
                </div>
                <div className="w-full h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pipelineChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: "#1e293b", borderRadius: "16px", border: "none", color: "#fff" }}
                        itemStyle={{ color: "#a5b4fc" }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Activity Timeline Card */}
              {dhConfig?.dashboard?.showActivityTimelineCard !== false && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Recent Activity Timeline</h3>
                    <p className="text-xs text-slate-400">{DATE_LABELS[dateRange]} activity actions</p>
                  </div>
                  <Link to="/activities" className="text-xs font-bold text-blue-600 hover:text-blue-700">View all →</Link>
                </div>

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {filteredActivityFeed.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-start gap-3.5 px-5 py-3 hover:bg-slate-50/80 transition-colors">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.type === 'Call' ? 'bg-indigo-50 text-indigo-600' :
                        item.type === 'Email' ? 'bg-blue-50 text-blue-600' :
                        item.type === 'Meeting' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                        <Icon name={item.icon} className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.subject} · {item.owner}</p>
                        {item.note && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.note}</p>}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">{item.time}</span>
                    </div>
                  ))}
                  {!filteredActivityFeed.length && (
                    <div className="px-5 py-8 text-center text-xs text-slate-400">No recent activities logged in this date range.</div>
                  )}
                </div>
              </div>
              )}

            </div>

            {/* RIGHT COLUMN (4 Cols on XL / 5 Cols on LG) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 min-w-0">

              {/* Star Graded Leads Section */}
              {dhConfig?.dashboard?.showStarLeadsCard !== false && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Icon name="mdi:star" className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-slate-800">Leads by Star Rating</h3>
                  </div>
                  <Link to="/lead" className="text-xs font-bold text-blue-600 hover:text-blue-700">View all →</Link>
                </div>

                {/* Rating Badges Summary */}
                <div className="grid grid-cols-5 gap-1.5 p-3 border-b border-slate-100 bg-amber-50/30">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="text-center p-1.5 sm:p-2 rounded-xl bg-white border border-amber-200/70 shadow-2xs">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-800">{starCounts[star] || 0}</p>
                      <p className="text-amber-400 text-[10px] sm:text-xs">{"★".repeat(star)}</p>
                      <p className="text-[8px] sm:text-[9px] font-bold text-emerald-600 truncate mt-0.5" title={formatCurrency(quotationByStar[star] || 0)}>
                        {formatCurrency(quotationByStar[star] || 0)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 5-Star Leads */}
                {leadsByGrade.A.length > 0 && (
                  <div className="border-b border-slate-100">
                    <div className="px-4 py-1.5 bg-emerald-50/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-emerald-800">5-Star High Value Leads</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">{leadsByGrade.A.length} leads</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {[...leadsByGrade.A]
                        .sort((a, b) => Number(b.quotationAmount || 0) - Number(a.quotationAmount || 0))
                        .map((lead) => (
                          <Link key={lead.leadId} to={`/lead/${lead.leadId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {lead.companyContactPersonName?.[0]?.toUpperCase() || lead.leadOrganisationName?.[0]?.toUpperCase() || 'L'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`}
                              </p>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-xs font-bold text-emerald-600">
                                  {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Icon key={i} name="mdi:star" className="w-2.5 h-2.5 text-amber-400" />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 shrink-0">
                              {lead.leadOutcomeStatus || 'Open'}
                            </span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}

                {/* 4-Star Leads */}
                {leadsByGrade.B.length > 0 && (
                  <div className="border-b border-slate-100">
                    <div className="px-4 py-1.5 bg-blue-50/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs font-bold text-blue-800">4-Star Leads</span>
                      </div>
                      <span className="text-xs font-bold text-blue-700">{leadsByGrade.B.length} leads</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {leadsByGrade.B.map((lead) => (
                        <Link key={lead.leadId} to={`/lead/${lead.leadId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                          <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {lead.companyContactPersonName?.[0]?.toUpperCase() || lead.leadOrganisationName?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-xs font-bold text-emerald-600">
                                {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {[...Array(4)].map((_, i) => (
                                  <Icon key={i} name="mdi:star" className="w-2.5 h-2.5 text-amber-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 shrink-0">
                            {lead.leadOutcomeStatus || 'Open'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3-Star Leads */}
                {leadsByGrade.C.length > 0 && (
                  <div className="border-b border-slate-100">
                    <div className="px-4 py-1.5 bg-amber-50/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-xs font-bold text-amber-800">3-Star Leads</span>
                      </div>
                      <span className="text-xs font-bold text-amber-700">{leadsByGrade.C.length} leads</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {leadsByGrade.C.map((lead) => (
                        <Link key={lead.leadId} to={`/lead/${lead.leadId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                          <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {lead.companyContactPersonName?.[0]?.toUpperCase() || lead.leadOrganisationName?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-xs font-bold text-emerald-600">
                                {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {[...Array(3)].map((_, i) => (
                                  <Icon key={i} name="mdi:star" className="w-2.5 h-2.5 text-amber-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 shrink-0">
                            {lead.leadOutcomeStatus || 'Open'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2-Star Leads */}
                {leadsByGrade.D.length > 0 && (
                  <div className="border-b border-slate-100">
                    <div className="px-4 py-1.5 bg-slate-50/60 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="text-xs font-bold text-slate-700">2-Star Leads</span>
                      </div>
                      <span className="text-xs font-bold text-slate-600">{leadsByGrade.D.length} leads</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {leadsByGrade.D.map((lead) => (
                        <Link key={lead.leadId} to={`/lead/${lead.leadId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {lead.companyContactPersonName?.[0]?.toUpperCase() || lead.leadOrganisationName?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-xs font-bold text-emerald-600">
                                {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {[...Array(2)].map((_, i) => (
                                  <Icon key={i} name="mdi:star" className="w-2.5 h-2.5 text-amber-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 shrink-0">
                            {lead.leadOutcomeStatus || 'Open'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1-Star Leads */}
                {leadsByGrade.E.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 bg-slate-50/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="text-xs font-bold text-slate-600">1-Star Leads</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{leadsByGrade.E.length} leads</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {leadsByGrade.E.map((lead) => (
                        <Link key={lead.leadId} to={`/lead/${lead.leadId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
                            {lead.companyContactPersonName?.[0]?.toUpperCase() || lead.leadOrganisationName?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-xs font-bold text-emerald-600">
                                {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <Icon name="mdi:star" className="w-2.5 h-2.5 text-amber-400" />
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 shrink-0">
                            {lead.leadOutcomeStatus || 'Open'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Tasks Widget */}
              {dhConfig?.dashboard?.showTasksCard !== false && (
                <>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Tasks</h3>
                    <p className="text-xs text-slate-400">{completedVisibleTasks} / {todaysTasks.length} completed</p>
                  </div>
                  <Link to="/task" className="text-xs font-bold text-blue-600 hover:text-blue-700">View all →</Link>
                </div>
                <div className="h-1 bg-slate-100 mx-5 mt-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: todaysTasks.length ? `${Math.round((completedVisibleTasks / todaysTasks.length) * 100)}%` : '0%' }}
                  />
                </div>
                <div className="divide-y divide-slate-100 mt-2">
                  {todaysTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => toggleTask(task.id)}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-blue-500'
                      }`}>
                        {task.completed && <Icon name="mdi:check" className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold text-slate-800 truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{task.owner}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] ?? 'bg-amber-400'}`} />
                    </div>
                  ))}
                  {!todaysTasks.length && (
                    <div className="px-5 py-6 text-center text-xs text-slate-400">No active tasks for this period.</div>
                  )}
                </div>
              </div>

              {/* Reminders Widget */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Reminders</h3>
                    <p className="text-xs text-slate-400">{completedVisibleReminders} / {visibleReminders.length} completed</p>
                  </div>
                  <Link to="/calendar" className="text-xs font-bold text-blue-600 hover:text-blue-700">View all →</Link>
                </div>
                <div className="h-1 bg-slate-100 mx-5 mt-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: visibleReminders.length ? `${Math.round((completedVisibleReminders / visibleReminders.length) * 100)}%` : '0%' }}
                  />
                </div>
                <div className="divide-y divide-slate-100 mt-2">
                  {visibleReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => toggleReminder(reminder.id)}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        reminder.completed ? 'bg-rose-500 border-rose-500' : 'border-slate-300 hover:border-rose-400'
                      }`}>
                        {reminder.completed && <Icon name="mdi:check" className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold text-slate-800 truncate ${reminder.completed ? 'line-through text-slate-400' : ''}`}>{reminder.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{reminder.date || reminder.owner}</p>
                      </div>
                      <Icon name="mdi:bell-outline" className="w-4 h-4 text-rose-400 shrink-0" />
                    </div>
                  ))}
                  {!visibleReminders.length && (
                    <div className="px-5 py-6 text-center text-xs text-slate-400">No pending reminders.</div>
                  )}
                </div>
              </div>
                </>
              )}

              {/* Team Leaderboard Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800">Team Leaderboard</h3>
                  <Link to="/team-member" className="text-xs font-bold text-blue-600 hover:text-blue-700">View all →</Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {(advancedCrmState.repRanking ?? []).slice(0, 5).map((rep, idx) => (
                    <div key={rep.name} className="flex items-center gap-3 px-5 py-3">
                      <span className="text-base w-5 text-center shrink-0 font-bold">
                        {['🥇', '🥈', '🥉', '4', '5'][idx]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{rep.name}</p>
                          <span className={`text-xs font-extrabold shrink-0 ${
                            rep.quota >= 100 ? 'text-emerald-600' : rep.quota >= 80 ? 'text-blue-600' : 'text-amber-600'
                          }`}>
                            {rep.quota}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(rep.quota, 100)}%`,
                              backgroundColor: rep.quota >= 100 ? '#10b981' : rep.quota >= 80 ? '#3b82f6' : '#f59e0b',
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Win rate {rep.winRate}%</p>
                      </div>
                    </div>
                  ))}
                  {!(advancedCrmState.repRanking ?? []).length && (
                    <div className="px-5 py-6 text-center text-xs text-slate-400">No team data available.</div>
                  )}
                </div>
              </div>

              {/* Quick Actions Shortcuts Grid */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs font-bold text-slate-800 mb-3 px-1">Quick Shortcuts</p>
                <div className="grid grid-cols-3 gap-2">
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
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-[10px] font-bold transition-all text-center ${a.cls}`}
                    >
                      <Icon name={a.icon} className="w-4 h-4" />
                      <span>{a.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}