import { formatDate as _fmtDate } from './format.js';

export const PIPELINE_STAGES = [
  { key: "New Lead", title: "New Lead", color: "blue", probability: 10 },
  { key: "Qualified", title: "Qualified", color: "purple", probability: 30 },
  { key: "Open", title: "Open", color: "indigo", probability: 50 },
  { key: "Ongoing", title: "Ongoing", color: "amber", probability: 75 },
  { key: "Won", title: "Won", color: "emerald", probability: 100 },
  { key: "Closed", title: "Closed", color: "slate", probability: 0 },
  { key: "Disqualified", title: "Disqualified", color: "rose", probability: 0 },
];

export const ACTIVE_PIPELINE_STAGES = PIPELINE_STAGES.filter((stage) =>
  !["Closed", "Disqualified"].includes(stage.key)
);

export const STAGE_OPTIONS = PIPELINE_STAGES.map((stage) => stage.key);

export const STAGE_BADGE_CLASS = {
  "New Lead": "bg-blue-50 text-blue-700 border-blue-100",
  "Qualified": "bg-purple-50 text-purple-700 border-purple-100",
  "Open": "bg-indigo-50 text-indigo-700 border-indigo-100",
  "Ongoing": "bg-amber-50 text-amber-700 border-amber-100",
  "Won": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Closed": "bg-slate-100 text-slate-700 border-slate-200",
  "Disqualified": "bg-rose-50 text-rose-700 border-rose-100",
};

export const STAGE_ACCENT_CLASS = {
  "New Lead": "bg-blue-500",
  "Qualified": "bg-purple-500",
  "Open": "bg-indigo-500",
  "Ongoing": "bg-amber-500",
  "Won": "bg-emerald-500",
  "Closed": "bg-slate-500",
  "Disqualified": "bg-rose-500",
};

export function amountOf(deal) {
  return Number(deal?.oppAmount || deal?.quotationAmount || 0);
}

export function formatMoney(value, compact = false) {
  const amount = Number(value || 0);
  if (compact && amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(1)}Cr`;
  if (compact && amount >= 100000) return `Rs ${(amount / 100000).toFixed(1)}L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function dealName(deal) {
  if (deal?.oppName) return deal.oppName;
  if (deal?.leadFirstName) {
    return `${deal.leadFirstName} ${deal.leadLastName ?? ""}`.trim();
  }
  return deal?.leadTitle || "Untitled Lead";
}

export function dealAccount(deal) {
  return deal?.oppTitle || deal?.leadOrganisationName || "No Company";
}

export function dealOwner(deal) {
  return deal?.owner || deal?.oppOwner || deal?.companyContactPersonName || (deal?.userIdFk ? `User ${deal.userIdFk}` : "Unassigned");
}

export function dealCloseDate(deal) {
  return deal?.oppActualCloseDate || deal?.oppForcastCloseDate || deal?.quotationDate || "";
}

export function formatDate(value) {
  if (!value) return 'No date';
  const r = _fmtDate(value);
  return r === '—' ? 'No date' : r;
}

export function matchesDeal(deal, query) {
  const text = [
    deal?.oppName,
    deal?.leadFirstName,
    deal?.leadLastName,
    deal?.oppTitle,
    deal?.leadOrganisationName,
    deal?.oppStatus,
    deal?.leadStatus,
    dealOwner(deal),
  ].join(" ").toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

export function groupDealsByStage(deals, stages = ACTIVE_PIPELINE_STAGES) {
  return stages.map((stage) => {
    const stageDeals = deals.filter((deal) => (deal.oppStatus || deal.leadStatus || "New Lead") === stage.key);
    return {
      ...stage,
      deals: stageDeals,
      value: stageDeals.reduce((sum, deal) => sum + amountOf(deal), 0),
    };
  });
}

export function makeOpportunityPayload(form) {
  return {
    oppName: form.oppName?.trim(),
    oppTitle: form.oppTitle?.trim(),
    oppStatus: form.oppStatus || "New Lead",
    oppAmount: Number(form.oppAmount || 0),
    oppForcastCloseDate: form.oppForcastCloseDate || undefined,
    oppActualCloseDate: form.oppActualCloseDate || undefined,
    oppDescription: form.oppDescription?.trim(),
    leadIdFk: form.leadIdFk || undefined,
  };
}

export function payloadFromDeal(deal, overrides = {}) {
  return makeOpportunityPayload({
    oppName: dealName(deal),
    oppTitle: dealAccount(deal),
    oppStatus: deal?.oppStatus || deal?.leadStatus || "New Lead",
    oppAmount: amountOf(deal),
    oppForcastCloseDate: dealCloseDate(deal),
    oppActualCloseDate: dealCloseDate(deal),
    oppDescription: deal?.oppDescription || deal?.enquiryDescription || "",
    leadIdFk: deal?.leadIdFk || deal?.leadId,
    ...overrides,
  });
}
