import { useEffect, useState } from "react";
import AppDrawer from "../common/AppDrawer";
import { STAGE_OPTIONS, makeOpportunityPayload } from "../../utils/opportunityPipeline";

const emptyForm = {
  oppName: "",
  oppTitle: "",
  oppStatus: "New",
  oppAmount: "",
  oppForcastCloseDate: "",
  oppActualCloseDate: "",
  oppDescription: "",
};

function toForm(deal, initialStage) {
  if (!deal) return { ...emptyForm, oppStatus: initialStage || "New" };
  return {
    oppName: deal.oppName || "",
    oppTitle: deal.oppTitle || "",
    oppStatus: deal.oppStatus || initialStage || "New",
    oppAmount: deal.oppAmount || "",
    oppForcastCloseDate: deal.oppForcastCloseDate || "",
    oppActualCloseDate: deal.oppActualCloseDate || "",
    oppDescription: deal.oppDescription || "",
  };
}

export default function OpportunityDealModal({
  open,
  deal,
  initialStage,
  saving,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => toForm(deal, initialStage));

  useEffect(() => {
    if (open) setForm(toForm(deal, initialStage));
  }, [deal, initialStage, open]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(makeOpportunityPayload(form));
  }

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={deal ? "Edit Deal" : "Create New Deal"}
      subtitle={deal ? "Update deal attributes, stage and amount" : "Create a new deal with status and forecast date"}
      icon="mdi:cash-multiple"
      footer={
        <>
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            form="deal-form"
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            disabled={saving}
          >
            {saving ? "Saving..." : deal ? "Update Deal" : "Create Deal"}
          </button>
        </>
      }
    >
      <form id="deal-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="form-label">Deal name</span>
            <input
              required
              className="form-input"
              value={form.oppName}
              onChange={(event) => update("oppName", event.target.value)}
              placeholder="Acme expansion"
            />
          </label>

          <label>
            <span className="form-label">Account / Company</span>
            <input
              className="form-input"
              value={form.oppTitle}
              onChange={(event) => update("oppTitle", event.target.value)}
              placeholder="Acme Corp"
            />
          </label>

          <label>
            <span className="form-label">Stage</span>
            <select
              className="form-select"
              value={form.oppStatus}
              onChange={(event) => update("oppStatus", event.target.value)}
            >
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="form-label">Amount</span>
            <input
              className="form-input"
              min="0"
              type="number"
              value={form.oppAmount}
              onChange={(event) => update("oppAmount", event.target.value)}
              placeholder="250000"
            />
          </label>

          <label>
            <span className="form-label">Forecast close date</span>
            <input
              className="form-input"
              type="date"
              value={form.oppForcastCloseDate}
              onChange={(event) => update("oppForcastCloseDate", event.target.value)}
            />
          </label>

          <label className="md:col-span-2">
            <span className="form-label">Description</span>
            <textarea
              className="form-input"
              rows={4}
              value={form.oppDescription}
              onChange={(event) => update("oppDescription", event.target.value)}
              placeholder="Notes, next steps, stakeholders..."
            />
          </label>
        </div>
      </form>
    </AppDrawer>
  );
}

