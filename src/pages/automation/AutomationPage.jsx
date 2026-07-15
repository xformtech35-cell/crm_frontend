import { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icon";
import AppDrawer from "../../components/common/AppDrawer";
import { useAdvancedCrmData } from "../../hooks/useAdvancedCrmData";

const STATUS_STYLES = {
  Enabled:
    "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Paused:
    "bg-amber-100 text-amber-700 border border-amber-200",
};

const DEFAULT_FORM = {
  name: "",
  trigger: "",
  action: "",
  description: "",
};

export default function AutomationPage() {
  const { load } = useAdvancedCrmData();

  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);

      const state = await load(true);

      const rows = (state.workflows || []).map((workflow, index) => ({
        id: workflow.id || index + 1,
        name: workflow.name,
        description: workflow.description || "No description",
        enabled: workflow.enabled,
        trigger: workflow.trigger || "Lead Created",
        action: workflow.action || "Send Email",
        runs: workflow.runs || 0,
        lastRun: workflow.lastRun || "Never",
      }));

      setWorkflows(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((workflow) => {
      const matchesSearch =
        workflow.name.toLowerCase().includes(search.toLowerCase()) ||
        workflow.description
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All"
          ? true
          : statusFilter === "Enabled"
          ? workflow.enabled
          : !workflow.enabled;

      return matchesSearch && matchesStatus;
    });
  }, [workflows, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: workflows.length,
      enabled: workflows.filter((w) => w.enabled).length,
      paused: workflows.filter((w) => !w.enabled).length,
      runs: workflows.reduce((acc, w) => acc + w.runs, 0),
    };
  }, [workflows]);

  const toggleWorkflow = (id) => {
    setWorkflows((prev) =>
      prev.map((workflow) =>
        workflow.id === id
          ? { ...workflow, enabled: !workflow.enabled }
          : workflow,
      ),
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    setSaving(true);

    try {
      const newWorkflow = {
        id: Date.now(),
        name: form.name,
        description: form.description,
        trigger: form.trigger,
        action: form.action,
        enabled: true,
        runs: 0,
        lastRun: "Never",
      };

      setWorkflows((prev) => [newWorkflow, ...prev]);

      setForm(DEFAULT_FORM);

      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-5 pb-6">

      {/* HEADER */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Icon name="mdi:robot-outline" className="w-6 h-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                CRM Automation
              </h1>

              <p className="text-sm text-gray-500">
                Automate CRM workflows and actions.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold"
          >
            Create Workflow
          </button>

        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-gray-500">Total</p>
          <h2 className="text-3xl font-bold">{stats.total}</h2>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-gray-500">Enabled</p>
          <h2 className="text-3xl font-bold">{stats.enabled}</h2>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-gray-500">Paused</p>
          <h2 className="text-3xl font-bold">{stats.paused}</h2>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-gray-500">Executions</p>
          <h2 className="text-3xl font-bold">{stats.runs}</h2>
        </div>

      </div>

      {/* SEARCH */}
      <div className="bg-white rounded-2xl border p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workflows..."
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      {/* WORKFLOWS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {filteredWorkflows.map((workflow) => {
          const status = workflow.enabled ? "Enabled" : "Paused";

          return (
            <div
              key={workflow.id}
              className="bg-white rounded-2xl border p-5 shadow-sm"
            >

              <div className="flex justify-between items-start">

                <div>
                  <h3 className="text-lg font-bold">
                    {workflow.name}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    {workflow.description}
                  </p>
                </div>

                <button
                  onClick={() => toggleWorkflow(workflow.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status]}`}
                >
                  {status}
                </button>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase">
                    Trigger
                  </p>

                  <p className="mt-2 font-semibold">
                    {workflow.trigger}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase">
                    Action
                  </p>

                  <p className="mt-2 font-semibold">
                    {workflow.action}
                  </p>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* DRAWER */}
      <AppDrawer
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Workflow"
        subtitle="Set up a new automation rule with a trigger and action"
        icon="mdi:robot-outline"
        footer={
          <>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              form="workflow-form"
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Workflow'}
            </button>
          </>
        }
      >
        <form id="workflow-form" onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Workflow Name <span className="text-red-500">*</span></label>
            <input
              required
              placeholder="e.g. Welcome Email on Lead Created"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Trigger Event</label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value })}
              >
                <option value="">Select Trigger</option>
                <option>Lead Created</option>
                <option>Deal Won</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Action</label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
              >
                <option value="">Select Action</option>
                <option>Send Email</option>
                <option>Create Task</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
            <textarea
              rows={4}
              placeholder="Describe what this workflow does..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </form>
      </AppDrawer>

    </div>
  );
}