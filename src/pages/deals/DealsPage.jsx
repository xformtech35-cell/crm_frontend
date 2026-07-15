import { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icon";
import AppConfirmModal from "../../components/ui/AppConfirmModal";
import OpportunityDealModal from "../../components/pipeline/OpportunityDealModal";
import { useLead } from "../../hooks/useLead";
import {
  STAGE_BADGE_CLASS,
  STAGE_OPTIONS,
  amountOf,
  dealAccount,
  dealCloseDate,
  dealName,
  dealOwner,
  formatDate,
  formatMoney,
  matchesDeal,
  payloadFromDeal,
} from "../../utils/opportunityPipeline";

function getFullQuotationNumber(lead) {
  if (!lead?.quotationNumber) return "";
  const qNum = lead.quotationNumber;
  const rev = lead.quotationRevision;
  if (!rev) return qNum;
  if (qNum.endsWith(`/${rev}`) || qNum.endsWith(rev)) return qNum;
  return `${qNum}/${rev}`;
}

export default function DealsPage() {
  const leadApi = useLead();
  const [deals, setDeals] = useState([]);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [deleteDeal, setDeleteDeal] = useState(null);
  const [toast, setToast] = useState(null);

  function mapLeadToDeal(lead) {
    return {
      oppId: lead.leadId,
      oppName: `${lead.leadFirstName ?? ""} ${lead.leadLastName ?? ""}`.trim() || lead.leadTitle || "Untitled Lead",
      oppTitle: lead.leadOrganisationName || "No Company",
      oppStatus: lead.leadStatus || "New Lead",
      oppAmount: lead.quotationAmount || 0,
      oppForcastCloseDate: lead.quotationDate || "",
      oppActualCloseDate: lead.quotationDate || "",
      oppDescription: lead.enquiryDescription || lead.leadReason || "",
      owner: lead.companyContactPersonName || (lead.leadAssignedMember ? `Member ${lead.leadAssignedMember}` : "Unassigned"),
      leadIdFk: lead.leadId,
      _rawLead: lead,
    };
  }

  async function loadDeals() {
    setLoading(true);
    try {
      const data = await leadApi.getAll();
      const mapped = (Array.isArray(data) ? data : []).map(mapLeadToDeal);
      setDeals(mapped);
    } catch {
      setToast({ type: "error", text: "Unable to load deals." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeals();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesStage = stageFilter === "All" || (deal.oppStatus || "New Lead") === stageFilter;
      const matchesQuery = !query.trim() || matchesDeal(deal, query);
      return matchesStage && matchesQuery;
    });
  }, [deals, query, stageFilter]);

  const metrics = useMemo(() => {
    const total = filteredDeals.reduce((sum, deal) => sum + amountOf(deal), 0);
    const won = filteredDeals.filter((deal) => deal.oppStatus === "Won").reduce((sum, deal) => sum + amountOf(deal), 0);
    const open = filteredDeals.filter((deal) => !["Won", "Closed"].includes(deal.oppStatus)).length;
    const average = filteredDeals.length ? total / filteredDeals.length : 0;
    return { total, won, open, average };
  }, [filteredDeals]);

  function openCreate() {
    setEditingDeal(null);
    setModalOpen(true);
  }

  function openEdit(deal) {
    setEditingDeal(deal);
    setModalOpen(true);
  }

  async function saveDeal(payload) {
    setSaving(true);
    try {
      if (editingDeal) {
        const leadRequest = {
          ...editingDeal._rawLead,
          leadFirstName: payload.oppName,
          leadLastName: "",
          leadOrganisationName: payload.oppTitle,
          leadStatus: payload.oppStatus,
          quotationAmount: payload.oppAmount,
          quotationDate: payload.oppForcastCloseDate,
          enquiryDescription: payload.oppDescription,
          enquiryType: "Qualified",
        };
        const updatedLead = await leadApi.update(editingDeal.oppId, leadRequest);
        const updated = mapLeadToDeal(updatedLead);
        setDeals((current) => current.map((deal) => deal.oppId === editingDeal.oppId ? updated : deal));
        setToast({ type: "success", text: "Lead updated." });
      } else {
        const leadRequest = {
          leadFirstName: payload.oppName,
          leadLastName: "",
          leadOrganisationName: payload.oppTitle,
          leadStatus: payload.oppStatus || "New Lead",
          quotationAmount: payload.oppAmount,
          quotationDate: payload.oppForcastCloseDate,
          enquiryDescription: payload.oppDescription,
          enquiryType: "Qualified",
          inquiryDate: new Date().toISOString().split('T')[0],
        };
        const createdLead = await leadApi.create(leadRequest);
        const created = mapLeadToDeal(createdLead);
        setDeals((current) => [created, ...current]);
        setToast({ type: "success", text: "Lead created." });
      }
      setModalOpen(false);
      await loadDeals();
    } catch {
      setToast({ type: "error", text: "Unable to save lead." });
    } finally {
      setSaving(false);
    }
  }

  async function quickStageUpdate(deal, nextStage) {
    setSaving(true);
    try {
      await leadApi.updateStatus(deal.oppId, nextStage);
      await loadDeals();
      setToast({ type: "success", text: "Stage updated." });
    } catch {
      setToast({ type: "error", text: "Unable to update stage." });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteDeal) return;
    setSaving(true);
    try {
      await leadApi.remove(deleteDeal.oppId);
      setDeals((current) => current.filter((deal) => deal.oppId !== deleteDeal.oppId));
      setDeleteDeal(null);
      setToast({ type: "success", text: "Lead deleted." });
    } catch {
      setToast({ type: "error", text: "Unable to delete lead." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deals</h1>
          <p className="mt-1 text-sm text-slate-500">Manage revenue opportunities, owners, values, and close dates.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Icon name="mdi:plus" className="h-4 w-4" />
          Add Deal
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Filtered Value", value: formatMoney(metrics.total, true), icon: "mdi:cash-multiple" },
          { label: "Open Deals", value: metrics.open, icon: "mdi:briefcase-outline" },
          { label: "Won Revenue", value: formatMoney(metrics.won, true), icon: "mdi:trophy-outline" },
          { label: "Average Deal", value: formatMoney(metrics.average, true), icon: "mdi:chart-bell-curve" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <Icon name={metric.icon} className="h-5 w-5 text-slate-400" />
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</h2>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative">
            <Icon name="mdi:magnify" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by deal, account, stage, owner..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 lg:w-96"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", ...STAGE_OPTIONS].map((stage) => (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  stageFilter === stage
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Deal</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Close Date</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, index) => (
                  <tr key={index}>
                    <td className="px-4 py-4" colSpan={6}>
                      <div className="skeleton h-10 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : filteredDeals.length ? (
                filteredDeals.map((deal) => (
                  <tr key={deal.oppId} className="transition hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                          {dealName(deal).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{dealName(deal)}</p>
                          <div className="flex flex-col text-xs text-slate-500">
                            <span className="truncate">{dealAccount(deal)}</span>
                            {deal._rawLead && getFullQuotationNumber(deal._rawLead) && (
                              <span className="font-medium text-slate-600 truncate mt-0.5">
                                Quotation: {getFullQuotationNumber(deal._rawLead)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                     <select
                        value="Won"
                        disabled
                        className="status-select-badge rounded-full border px-3 py-1 text-xs font-semibold outline-none bg-green-100 text-green-700 border-green-300"
                      >
                        <option value="Won">Won</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-slate-900">{formatMoney(amountOf(deal))}</td>
                    <td className="px-4 py-4 text-slate-600">{dealOwner(deal)}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(dealCloseDate(deal))}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(deal)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteDeal(deal)}
                          className="rounded-lg border border-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Icon name="mdi:briefcase-search-outline" className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 font-semibold text-slate-700">No deals found</p>
                    <p className="mt-1 text-sm text-slate-500">Adjust filters or create a new deal.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <OpportunityDealModal
        open={modalOpen}
        deal={editingDeal}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSubmit={saveDeal}
      />

      <AppConfirmModal
        open={Boolean(deleteDeal)}
        title="Delete Deal"
        message={`Delete ${deleteDeal ? dealName(deleteDeal) : "this deal"} permanently?`}
        confirmLabel="Delete"
        loading={saving}
        onCancel={() => setDeleteDeal(null)}
        onConfirm={confirmDelete}
      />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[70] rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
