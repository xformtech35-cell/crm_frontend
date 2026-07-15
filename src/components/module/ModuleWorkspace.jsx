import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { createPortal } from "react-dom";
import Icon from "../Icon";
import AppConfirmModal from "../ui/AppConfirmModal";
import { formatCurrency, formatDate, getInitials } from "../../utils/format";

const badgeClass = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  purple: "bg-purple-50 text-purple-700 border-purple-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  red: "bg-red-50 text-red-700 border-red-100",
  gray: "bg-slate-100 text-slate-700 border-slate-200",
};

function valueOf(item, key) {
  if (!key) return "";
  if (typeof key === "function") return key(item);
  return item?.[key];
}

function display(value, type) {
  if (type === "currency") return formatCurrency(Number(value || 0));
  if (type === "date") return formatDate(value);
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "-";
  return value === undefined || value === null || value === ""
    ? "-"
    : String(value);
}

function normalizeForm(fields, item = {}) {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      item[field.name] ?? field.defaultValue ?? "",
    ]),
  );
}

function columnAlign(column) {
  if (column.align === "right" || ["currency", "number"].includes(column.type))
    return "text-right";
  if (column.align === "center" || column.status || column.type === "date")
    return "text-center";
  return "text-left";
}

function columnWidth(column, index) {
  if (column.width) return column.width;
  if (index === 0) return "w-[22%]";
  if (column.status) return "w-32";
  if (column.type === "date") return "w-32";
  if (column.type === "currency") return "w-32";
  return "w-[16%]";
}

export default function ModuleWorkspace({ config, hidePrimaryAction }) {
  const { setHeaderBadge } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState(config.defaultView || "table");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState(config.defaultSortKey || null);
  const [sortDir, setSortDir] = useState(config.defaultSortDir || "asc");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [panelMode, setPanelMode] = useState(null);
  const [form, setForm] = useState(() =>
    normalizeForm(config.formFields || []),
  );
  const [deleteItem, setDeleteItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);


  async function load() {
    setLoading(true);
    try {
      const data = await config.load();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
      setToast({
        type: "error",
        text: `Failed to load ${config.title.toLowerCase()}.`,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const statusOptions = useMemo(() => {
    if (config.statusOptions?.length) return config.statusOptions;
    if (!config.statusKey) return [];
    return Array.from(
      new Set(
        items.map((item) => valueOf(item, config.statusKey)).filter(Boolean),
      ),
    );
  }, [config.statusKey, config.statusOptions, items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const status = valueOf(item, config.statusKey);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const text = (
        config.searchKeys || config.columns.map((column) => column.key)
      )
        .map((key) => display(valueOf(item, key)))
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!q || text.includes(q));
    });
  }, [config, items, query, statusFilter]);

  useEffect(() => {
    setHeaderBadge?.(filteredItems.length);
    return () => setHeaderBadge?.(null);
  }, [filteredItems.length, setHeaderBadge]);

  const tableItems = useMemo(() => {
    if (!sortKey) return filteredItems;
    const column = config.columns.find(
      (col) => col.key === sortKey || col.label === sortKey,
    );
    if (!column) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      const rawA = valueOf(a, column.key);
      const rawB = valueOf(b, column.key);
      const aText =
        rawA === undefined || rawA === null ? "" : String(rawA).toLowerCase();
      const bText =
        rawB === undefined || rawB === null ? "" : String(rawB).toLowerCase();
      const aNum = Number(rawA);
      const bNum = Number(rawB);
      const result =
        !Number.isNaN(aNum) && !Number.isNaN(bNum)
          ? aNum - bNum
          : aText.localeCompare(bText);
      return sortDir === "asc" ? result : -result;
    });
  }, [config.columns, filteredItems, sortDir, sortKey]);


  const totalCount = tableItems.length;

  const totalPages = Math.ceil(totalCount / pageSize);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;

    return tableItems.slice(start, start + pageSize);
  }, [tableItems, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, pageSize]);


  const metrics = useMemo(
    () =>
      (config.metrics || []).map((metric) => ({
        ...metric,
        value: metric.value(items, filteredItems),
      })),
    [config.metrics, filteredItems, items],
  );

  const allVisibleSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) =>
      selectedIds.has(config.getId(item))
    );

  function toggleSort(column) {
    if (column.sortable === false) return;
    const key = typeof column.key === "string" ? column.key : column.label;
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIcon(column) {
    const key = typeof column.key === "string" ? column.key : column.label;
    if (sortKey !== key) return "mdi:unfold-more-horizontal";
    return sortDir === "asc" ? "mdi:chevron-up" : "mdi:chevron-down";
  }

  function toggleSelect(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        paginatedItems.forEach((item) =>
          next.delete(config.getId(item))
        );
      } else {
        paginatedItems.forEach((item) =>
          next.add(config.getId(item))
        );
      }
      return next;
    });
  }

  function openCreate(initialData = {}) {
    setSelected(null);
    setForm(normalizeForm(config.formFields || [], initialData));
    setPanelMode("edit");
  }

  function openEdit(item) {
    setSelected(item);
    setForm(normalizeForm(config.formFields || [], item));
    setPanelMode("edit");
  }

  function openView(item) {
    setSelected(item);
    setPanelMode("view");
  }

  async function save(e) {
    e.preventDefault();
    if (!config.create || !config.update) return;
    setSaving(true);
    try {
      const payload = config.toPayload
        ? config.toPayload(form, selected)
        : form;
      if (selected) {
        const updated = await config.update(config.getId(selected), payload);
        setItems((current) =>
          current.map((item) =>
            config.getId(item) === config.getId(selected) ? updated : item,
          ),
        );
        setSelected(updated);
        setToast({ type: "success", text: `${config.singular} updated.` });
      } else {
        const created = await config.create(payload);
        setItems((current) => [created, ...current]);
        setSelected(created);
        setToast({ type: "success", text: `${config.singular} created.` });
      }
      setPanelMode("view");
    } catch {
      setToast({
        type: "error",
        text: `Unable to save ${config.singular.toLowerCase()}.`,
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteItem || !config.remove) return;
    setSaving(true);
    try {
      await config.remove(config.getId(deleteItem));
      setItems((current) =>
        current.filter(
          (item) => config.getId(item) !== config.getId(deleteItem),
        ),
      );
      setDeleteItem(null);
      setPanelMode(null);
      setToast({ type: "success", text: `${config.singular} deleted.` });
    } catch {
      setToast({
        type: "error",
        text: `Unable to delete ${config.singular.toLowerCase()}.`,
      });
    } finally {
      setSaving(false);
    }
  }

  const primaryAction =
    !hidePrimaryAction && config.create && config.formFields?.length;
  const filtersActive = query || statusFilter !== "all";

  // Filter out any "Actions" column from config.columns to avoid duplicate
  const displayColumns = config.columns.filter(column => column.label !== "Actions");

  return (
    <div className="animate-fade-in flex flex-col gap-0 pb-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="-mt-0 mb-3 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Icon
              name="mdi:magnify"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder={
                config.searchPlaceholder ||
                `Search ${config.title.toLowerCase()}`
              }
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm placeholder-gray-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold leading-none text-gray-900"></h1>
              </div>
              <p className="mt-1 max-w-2xl truncate text-sm text-gray-500">
                {config.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="-mt-4 flex min-w-0 max-w-full flex-wrap items-center gap-1">
          <button
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === "all" ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600"}`}
            onClick={() => setStatusFilter("all")}
          >
            All
          </button>
          {statusOptions.map((status) => (
            <button
              key={status}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === status ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600"}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="-mt-4 ml-auto flex items-center gap-2">
          {config.customActions?.map((action) => (
            <button
              key={action.label}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700"
              onClick={
                action.action === "create"
                  ? () => openCreate(action.initialData || {})
                  : action.onClick
              }
            >
              <Icon name={action.icon} className="h-4 w-4" />
              {action.label}
            </button>
          ))}
          {primaryAction && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700"
              onClick={() => openCreate()}
            >
              <Icon name="mdi:plus" className="h-4 w-4" /> New {config.singular}
            </button>
          )}
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              className={`rounded-md p-1.5 transition-all ${viewMode === "table" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
              onClick={() => setViewMode("table")}
              title="Table view"
            >
              <Icon name="mdi:table" className="h-4 w-4" />
            </button>
            <button
              className={`rounded-md p-1.5 transition-all ${viewMode === "card" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
              onClick={() => setViewMode("card")}
              title="Card view"
            >
              <Icon name="mdi:view-grid-outline" className="h-4 w-4" />
            </button>
          </div>
          {filtersActive && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setQuery("");
              }}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              <Icon name="mdi:close-circle-outline" className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {!!metrics.length && items.length > 0 && (
        <section className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {metric.label}
              </p>
              <p className="mt-1 truncate text-xl font-bold text-slate-900">
                {metric.format === "currency"
                  ? formatCurrency(metric.value)
                  : metric.value}
              </p>
            </div>
          ))}
        </section>
      )}

      {loading ? (
        <section className="space-y-2">
          <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-12 rounded-lg bg-gray-50 animate-pulse" />
          ))}
        </section>
      ) : !filteredItems.length ? (
        <section className="rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Icon
              name={config.icon || "mdi:database-outline"}
              className="h-7 w-7"
            />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            No {config.title.toLowerCase()} found
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Adjust filters or add a record to start using this workspace.
          </p>
        </section>
      ) : viewMode === "card" ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const status = valueOf(item, config.statusKey);
            const color = config.statusColors?.[status] || "gray";
            return (
              <article
                key={config.getId(item)}
                className="cursor-pointer rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md"
                onClick={() => openView(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                      {getInitials(display(valueOf(item, config.primaryKey)))}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-snug text-gray-900">
                        {display(valueOf(item, config.primaryKey))}
                      </p>
                      <p className="truncate text-xs leading-snug text-gray-400">
                        {display(valueOf(item, config.secondaryKey))}
                      </p>
                    </div>
                  </div>
                  {status && (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass[color]}`}
                    >
                      {status}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(config.cardStats || config.columns.slice(2, 6))
                    .slice(0, 4)
                    .map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg bg-gray-50 p-2"
                      >
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">
                          {stat.label}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-gray-900">
                          {display(valueOf(item, stat.key), stat.type)}
                        </p>
                      </div>
                    ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span className="truncate">
                    {config.footer
                      ? config.footer(item)
                      : `${config.singular} #${config.getId(item)}`}
                  </span>
                  {config.detailPath && (
                    <Link
                      to={config.detailPath(item)}
                      className="shrink-0 font-semibold text-blue-700 hover:text-blue-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open detail
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (<>
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table
              className="w-full table-fixed text-left text-sm text-gray-700"
              style={{
                minWidth: `${Math.max(860, displayColumns.length * 126 + 156)}px`,
              }}
            >
              <thead className="bg-gray-50/95 text-xs uppercase tracking-[0.08em] text-gray-500">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Select all ${config.title.toLowerCase()}`}
                    />
                  </th>
                  {displayColumns.map((column, index) => (
                    <th
                      key={column.label}
                      className={`px-3 py-2.5 font-semibold ${columnWidth(column, index)} ${columnAlign(column)}`}
                    >
                      <button
                        type="button"
                        className={`inline-flex max-w-full items-center gap-1 transition-colors hover:text-gray-700 ${columnAlign(column) === "text-right" ? "justify-end" : columnAlign(column) === "text-center" ? "justify-center" : "justify-start"}`}
                        onClick={() => toggleSort(column)}
                      >
                        <span className="truncate uppercase">{column.label}</span>
                        {/* <Icon
                            name={sortIcon(column)}
                            className="h-3.5 w-3.5 shrink-0"
                          /> */}
                      </button>
                    </th>
                  ))}
                  {/* SINGLE ACTIONS COLUMN - Only one Actions column */}
                  <th className="sticky right-0 z-20 w-28 bg-gray-50/95 px-3 py-2.5 text-right font-semibold uppercase shadow-[-8px_0_12px_rgba(15,23,42,0.04)]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedItems.map((item, index) => {
                  const id = config.getId(item);
                  const rowTone = selectedIds.has(id)
                    ? "bg-blue-50/60"
                    : index % 2 === 0
                      ? "bg-white"
                      : "bg-gray-50/70";
                  return (
                    <tr
                      key={id}
                      className={`cursor-pointer border-t border-gray-100 transition-colors hover:bg-blue-50/60 ${rowTone}`}
                      onClick={() => openView(item)}
                    >
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select ${display(valueOf(item, config.primaryKey))}`}
                        />
                      </td>
                      {displayColumns.map((column, columnIndex) => {
                        const value = valueOf(item, column.key);
                        const statusColor = column.status
                          ? config.statusColors?.[value] || "gray"
                          : null;
                        const primary = display(
                          valueOf(item, config.primaryKey),
                        );
                        const secondary = display(
                          valueOf(item, config.secondaryKey),
                        );
                        return (
                          <td
                            key={column.label}
                            className={`px-3 py-2 align-middle ${columnAlign(column)}`}
                          >
                            {columnIndex === 0 ? (
                              <div className="flex min-w-0 items-center gap-2.5 text-left">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-xs font-bold text-cyan-700">
                                  {getInitials(primary)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold leading-snug text-gray-900">
                                    {primary}
                                  </p>
                                  {secondary !== "-" && (
                                    <p className="truncate text-xs leading-snug text-gray-400">
                                      {secondary}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : column.status ? (
                              <span
                                className={`inline-flex max-w-full rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 ${badgeClass[statusColor]}`}
                              >
                                <span className="truncate">
                                  {display(value)}
                                </span>
                              </span>
                            ) : column.type === "date" ? (
                              <span className="block whitespace-normal text-xs leading-5 text-gray-500">
                                {display(value, column.type)}
                              </span>
                            ) : (
                              <span>
                                {display(value, column.type)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {/* SINGLE ACTIONS CELL - Only one Actions column with all buttons */}
                      <td
                        className={`sticky right-0 px-3 py-2 align-middle shadow-[-8px_0_12px_rgba(15,23,42,0.04)] ${selectedIds.has(id) ? "bg-blue-50" : index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      >
                        <div className="flex justify-end gap-1">
                          <button
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              openView(item);
                            }}
                            title="Quick view"
                          >
                            <Icon name="mdi:eye-outline" className="h-4 w-4" />
                          </button>
                          {primaryAction && (
                            <button
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(item);
                              }}
                              title="Edit"
                            >
                              <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                            </button>
                          )}
                          {config.remove && (
                            <button
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteItem(item);
                              }}
                              title="Delete"
                            >
                              <Icon name="mdi:trash-can-outline" className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-4 py-3">

          <div className="flex items-center gap-2">

            <span className="text-xs text-gray-500">
              Showing{" "}
              {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–
              {Math.min(currentPage * pageSize, totalCount)} of{" "}
              {totalCount}
            </span>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

          </div>

          <div className="flex items-center gap-1">

            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:opacity-40"
            >
              <Icon name="mdi:chevron-left" className="h-4 w-4" />
            </button>

            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;

              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 &&
                  page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 w-8 rounded-lg text-xs font-medium ${page === currentPage
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    {page}
                  </button>
                );
              }

              if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return (
                  <span
                    key={page}
                    className="px-1 text-xs text-gray-400"
                  >
                    ...
                  </span>
                );
              }

              return null;
            })}

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:opacity-40"
            >
              <Icon name="mdi:chevron-right" className="h-4 w-4" />
            </button>

          </div>

        </div>
      </>
      )}

      {panelMode &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setPanelMode(null)}
            />
            <div className="relative w-full h-full max-w-[640px] bg-white shadow-2xl border-l border-gray-100 flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icon
                    name={
                      panelMode === "edit"
                        ? selected
                          ? "mdi:pencil-outline"
                          : "mdi:plus-circle-outline"
                        : config.icon || "mdi:eye-outline"
                    }
                    className="w-5 h-5 text-white"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-white leading-tight">
                    {panelMode === "edit"
                      ? selected
                        ? `Edit ${config.singular}`
                        : `New ${config.singular}`
                      : `${config.singular} Quick View`}
                  </h2>
                  <p className="text-xs text-blue-100 mt-0.5 truncate">
                    {panelMode === "edit"
                      ? selected
                        ? `Updating details for this ${config.singular.toLowerCase()}`
                        : `Fill in the details to create a new ${config.singular.toLowerCase()}`
                      : `Detailed view of the selected ${config.singular.toLowerCase()}`}
                  </p>
                </div>
                <button
                  onClick={() => setPanelMode(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <Icon name="mdi:close" className="w-5 h-5" />
                </button>
              </div>

              {panelMode === "view" && selected ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="rounded-2xl border border-gray-100 bg-slate-50/60 p-5 shadow-sm">
                    <p className="text-lg font-bold text-gray-900 leading-tight">
                      {display(valueOf(selected, config.primaryKey))}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {display(valueOf(selected, config.secondaryKey))}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {config.columns.map((column) => (
                      <div
                        key={column.label}
                        className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-3 text-sm hover:shadow-sm transition-shadow"
                      >
                        <span className="text-gray-500 font-medium">{column.label}</span>
                        <span className="max-w-[60%] text-right font-semibold text-gray-900 break-words">
                          {display(valueOf(selected, column.key), column.type)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    {primaryAction && (
                      <button
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm bg-white"
                        onClick={() => openEdit(selected)}
                      >
                        <Icon name="mdi:pencil-outline" className="h-4 w-4 text-gray-400" />
                        Edit details
                      </button>
                    )}
                    {config.remove && (
                      <button
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-sm font-semibold text-red-600 transition-colors"
                        onClick={() => setDeleteItem(selected)}
                      >
                        <Icon name="mdi:trash-can-outline" className="h-4 w-4 text-red-500" />
                        Delete record
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // <form className="flex flex-1 flex-col overflow-hidden" onSubmit={save}>
                //   <div className="flex-1 overflow-y-auto px-6 py-6">
                //     <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                //       {(config.formFields || []).map((field) => (
                //         <label
                //           key={field.name}
                //           className={field.span === 2 ? "md:col-span-2" : ""}
                //         >
                //           <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                //             {field.label} {field.required && <span className="text-red-500">*</span>}
                //           </span>
                //           {field.type === "textarea" ? (
                //             <textarea
                //               rows={field.rows || 3}
                //               className="input-field"
                //               value={form[field.name] || ""}
                //               onChange={(e) =>
                //                 setForm((current) => ({
                //                   ...current,
                //                   [field.name]: e.target.value,
                //                 }))
                //               }
                //               required={field.required}
                //             />
                //           ) : field.type === "select" ? (
                //             <select
                //               className="input-field appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem_1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M7%209l3%203%203-3%27%20stroke%3D%27%239ca3af%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E')]"
                //               value={form[field.name] || ""}
                //               onChange={(e) =>
                //                 setForm((current) => ({
                //                   ...current,
                //                   [field.name]: e.target.value,
                //                 }))
                //               }
                //               required={field.required}
                //             >
                //               <option value="">Select</option>
                //               {(field.options || []).map((option) => (
                //                 <option key={option} value={option}>
                //                   {option}
                //                 </option>
                //               ))}
                //             </select>
                //           ) : (
                //             <input
                //               type={field.type || "text"}
                //               className="input-field"
                //               value={form[field.name] || ""}
                //               onChange={(e) =>
                //                 setForm((current) => ({
                //                   ...current,
                //                   [field.name]: e.target.value,
                //                 }))
                //               }
                //               required={field.required}
                //             />
                //           )}
                //         </label>
                //       ))}
                //     </div>
                //   </div>
                //   <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
                //     <div className="text-xs text-gray-400">
                //       <span className="text-red-500">*</span> Required fields
                //     </div>
                //     <div className="flex items-center gap-2">
                //       <button
                //         type="button"
                //         className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors bg-white"
                //         onClick={() => setPanelMode(null)}
                //       >
                //         Cancel
                //       </button>
                //       <button
                //         type="submit"
                //         disabled={saving}
                //         className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
                //       >
                //         {saving ? (
                //           <Icon name="mdi:loading" className="w-4 h-4 animate-spin" />
                //         ) : (
                //           <Icon
                //             name={
                //               selected
                //                 ? "mdi:check-circle-outline"
                //                 : "mdi:plus-circle-outline"
                //             }
                //             className="w-4 h-4"
                //           />
                //         )}
                //         {saving
                //           ? "Saving…"
                //           : selected
                //             ? `Update ${config.singular}`
                //             : `Create ${config.singular}`}
                //       </button>
                //     </div>
                //   </div>
                // </form>
                <form className="flex flex-1 flex-col overflow-hidden" onSubmit={save}>
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {(config.formFields || []).map((field) => (
                        <label
                          key={field.name}
                          className={field.span === 2 ? "md:col-span-2" : ""}
                        >
                          <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                          </span>

                          {field.type === "textarea" ? (
                            <textarea
                              rows={field.rows || 3}
                              className="input-field"
                              value={form[field.name] || ""}
                              onChange={(e) =>
                                setForm((current) => ({
                                  ...current,
                                  [field.name]: e.target.value,
                                }))
                              }
                              required={field.required}
                            />
                          ) : field.type === "select" ? (
                            <select
                              className="input-field appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem_1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M7%209l3%203%203-3%27%20stroke%3D%27%239ca3af%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E')]"
                              value={form[field.name] || ""}
                              onChange={(e) =>
                                setForm((current) => ({
                                  ...current,
                                  [field.name]: e.target.value,
                                }))
                              }
                              required={field.required}
                            >
                              <option value="">Select</option>
                              {(field.options || []).map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type || "text"}
                              className="input-field"
                              value={form[field.name] || ""}
                              onChange={(e) => {
                                let value = e.target.value;
                                const fieldName = field.name.toLowerCase();

                                // Only allow letters and spaces for name/title/owner fields
                                if (
                                  fieldName.includes("name") ||
                                  fieldName.includes("title") ||
                                  fieldName === "owner"
                                ) {
                                  value = value.replace(/[^a-zA-Z\s]/g, "");
                                }

                                // Allow only numbers for phone/mobile fields
                                if (
                                  fieldName.includes("mobile") ||
                                  fieldName.includes("phone")
                                ) {
                                  value = value.replace(/\D/g, "");
                                }

                                setForm((current) => ({
                                  ...current,
                                  [field.name]: value,
                                }));
                              }}
                              required={field.required}
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
                    <div className="text-xs text-gray-400">
                      <span className="text-red-500">*</span> Required fields
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors bg-white"
                        onClick={() => setPanelMode(null)}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
                      >
                        {saving ? (
                          <Icon name="mdi:loading" className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icon
                            name={
                              selected
                                ? "mdi:check-circle-outline"
                                : "mdi:plus-circle-outline"
                            }
                            className="w-4 h-4"
                          />
                        )}

                        {saving
                          ? "Saving..."
                          : selected
                            ? `Update ${config.singular}`
                            : `Create ${config.singular}`}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}

      <AppConfirmModal
        open={Boolean(deleteItem)}
        title={`Delete ${config.singular}`}
        message={`Delete this ${config.singular.toLowerCase()} permanently?`}
        confirmLabel="Delete"
        variant="danger"
        loading={saving}
        onCancel={() => setDeleteItem(null)}
        onConfirm={confirmDelete}
      />

      {toast &&
        createPortal(
          <div
            className={`fixed bottom-6 right-6 z-[70] rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}
          >
            {toast.text}
          </div>,
          document.body,
        )}
    </div>
  );
}