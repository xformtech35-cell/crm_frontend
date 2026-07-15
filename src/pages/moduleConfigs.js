import {
  CONTACT_STATUSES,
  COUNTRIES,
  INDUSTRIES,
  OPP_STATUS_COLORS,
  OPP_STATUSES,
  ORG_STATUSES,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_PRIORITY_COLORS,
  TASK_STATUS_COLORS,
  TASK_STATUSES,
} from "../utils/constants";

const count = (items) => items.length;
const sum = (items, key) =>
  items.reduce((total, item) => total + Number(item[key] || 0), 0);

export function contactConfig(api) {
  return {
    title: "Contacts",
    singular: "Contact",
    subtitle: "",
    icon: "mdi:card-account-phone-outline",
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.contactId,
    primaryKey: "contactName",
    secondaryKey: "contactEmail",
    statusKey: "contactOccasion",
    statusOptions: CONTACT_STATUSES,
    searchKeys: [
      "contactName",
      "contactEmail",
      "contactMobileNo",
      "contactCity",
      "contactOccasion",
    ],
    metrics: [
      { label: "Contacts", value: count },
      {
        label: "With Email",
        value: (items) => items.filter((i) => i.contactEmail).length,
      },
      {
        label: "With Mobile",
        value: (items) => items.filter((i) => i.contactMobileNo).length,
      },
      {
        label: "Cities",
        value: (items) =>
          new Set(items.map((i) => i.contactCity).filter(Boolean)).size,
      },
    ],
    columns: [
      { label: "Name", key: "contactName", strong: true, width: "w-[22%]" },
      { label: "Email", key: "contactEmail", width: "w-[24%]" },
      { label: "Mobile", key: "contactMobileNo", width: "w-[16%]" },
      { label: "City", key: "contactCity", width: "w-[13%]" },
      { label: "State", key: "contactState", width: "w-[12%]" },
      {
        label: "Occasion",
        key: "contactOccasion",
        status: true,
        width: "w-[13%]",
      },
    ],
    formFields: [
      { name: "contactName", label: "Contact Name", required: true, span: 2 },
      { name: "contactEmail", label: "Email", type: "email" },
      { name: "contactMobileNo", label: "Mobile" },
      { name: "contactCity", label: "City" },
      { name: "contactState", label: "State" },
      {
        name: "contactCountry",
        label: "Country",
        type: "select",
        options: COUNTRIES,
      },
      { name: "contactAddress", label: "Address", type: "textarea", span: 2 },
      {
        name: "contactOccasion",
        label: "Status / Occasion",
        type: "select",
        options: CONTACT_STATUSES,
      },
    ],
    detailPath: (item) => `/contact/${item.contactId}`,
  };
}

export function opportunityConfig(api) {
  return {
    title: "Opportunities",
    singular: "Opportunity",
    subtitle: "",
    icon: "mdi:chart-timeline-variant-shimmer",
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.oppId,
    primaryKey: "oppName",
    secondaryKey: "oppTitle",
    statusKey: "oppStatus",
    statusOptions: OPP_STATUSES,
    statusColors: OPP_STATUS_COLORS,
    searchKeys: ["oppName", "oppTitle", "oppStatus", "oppDescription"],
    metrics: [
      { label: "Deals", value: count },
      {
        label: "Pipeline",
        value: (items) => sum(items, "oppAmount"),
        format: "currency",
      },
      {
        label: "Won",
        value: (items) => items.filter((i) => i.oppStatus === "Won").length,
      },
      {
        label: "Open",
        value: (items) =>
          items.filter((i) => !["Won", "Lost"].includes(i.oppStatus)).length,
      },
    ],
    columns: [
      { label: "Name", key: "oppName", strong: true, width: "w-[23%]" },
      { label: "Account", key: "oppTitle", width: "w-[20%]" },
      {
        label: "Amount",
        key: "oppAmount",
        type: "currency",
        align: "right",
        width: "w-[14%]",
      },
      { label: "Stage", key: "oppStatus", status: true, width: "w-[13%]" },
      {
        label: "Forecast Close",
        key: "oppForcastCloseDate",
        type: "date",
        width: "w-[15%]",
      },
      {
        label: "Actual Close",
        key: "oppActualCloseDate",
        type: "date",
        width: "w-[15%]",
      },
    ],
    formFields: [
      { name: "oppName", label: "Opportunity Name", required: true, span: 2 },
      { name: "oppTitle", label: "Account / Title" },
      {
        name: "oppStatus",
        label: "Stage",
        type: "select",
        options: OPP_STATUSES,
        defaultValue: "New",
      },
      { name: "oppAmount", label: "Amount", type: "number" },
      {
        name: "oppForcastCloseDate",
        label: "Forecast Close Date",
        type: "date",
      },
      { name: "oppActualCloseDate", label: "Actual Close Date", type: "date" },
      {
        name: "oppDescription",
        label: "Description",
        type: "textarea",
        span: 2,
      },
    ],
    toPayload: (form) => ({ ...form, oppAmount: Number(form.oppAmount || 0) }),
  };
}

export function organizationConfig(api) {
  return {
    title: "Organizations",
    singular: "Organization",
    subtitle: "",
    icon: "mdi:office-building-outline",
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.organizationId,
    primaryKey: "organizationName",
    secondaryKey: "organizationEmail",
    statusKey: "organizationOccasion",
    statusOptions: ORG_STATUSES,
    searchKeys: [
      "organizationName",
      "organizationEmail",
      "organizationMoblieNo",
      "organizationCity",
      "organizationBackground",
    ],
    metrics: [
      { label: "Organizations", value: count },
      {
        label: "With Email",
        value: (items) => items.filter((i) => i.organizationEmail).length,
      },
      {
        label: "Cities",
        value: (items) =>
          new Set(items.map((i) => i.organizationCity).filter(Boolean)).size,
      },
      {
        label: "Countries",
        value: (items) =>
          new Set(items.map((i) => i.organizationCountry).filter(Boolean)).size,
      },
    ],
    columns: [
      {
        label: "Name",
        key: "organizationName",
        strong: true,
        width: "w-[24%]",
      },
      { label: "Email", key: "organizationEmail", width: "w-[24%]" },
      { label: "Mobile", key: "organizationMoblieNo", width: "w-[15%]" },
      { label: "City", key: "organizationCity", width: "w-[13%]" },
      { label: "Country", key: "organizationCountry", width: "w-[12%]" },
      {
        label: "Status",
        key: "organizationOccasion",
        status: true,
        width: "w-[12%]",
      },
    ],
    formFields: [
      {
        name: "organizationName",
        label: "Organization Name",
        required: true,
        span: 2,
      },
      { name: "organizationEmail", label: "Email", type: "email" },
      { name: "organizationMoblieNo", label: "Mobile" },
      { name: "organizationCity", label: "City" },
      { name: "organizationState", label: "State" },
      {
        name: "organizationCountry",
        label: "Country",
        type: "select",
        options: COUNTRIES,
      },
      {
        name: "organizationOccasion",
        label: "Status",
        type: "select",
        options: ORG_STATUSES,
      },
      {
        name: "organizationAddress",
        label: "Address",
        type: "textarea",
        span: 2,
      },
      {
        name: "organizationBackground",
        label: "Background",
        type: "textarea",
        span: 2,
      },
    ],
    detailPath: (item) => `/organization/${item.organizationId}`,
  };
}

export function projectConfig(api) {
  return {
    title: "Projects",
    singular: "Project",
    subtitle: "",
    icon: "mdi:clipboard-text-clock-outline",
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.projectId,
    primaryKey: "projectName",
    secondaryKey: "organisationName",
    statusKey: "projectStatus",
    statusOptions: PROJECT_STATUSES,
    statusColors: PROJECT_STATUS_COLORS,
    searchKeys: [
      "projectName",
      "projectCode",
      "organisationName",
      "projectStatus",
      "projectDescription",
    ],
    metrics: [
      { label: "Projects", value: count },
      {
        label: "Active",
        value: (items) =>
          items.filter((i) =>
            ["Not Started", "In Progress", "On Hold"].includes(i.projectStatus),
          ).length,
      },
      {
        label: "Completed",
        value: (items) =>
          items.filter((i) => i.projectStatus === "Completed").length,
      },
      {
        label: "Organizations",
        value: (items) =>
          new Set(items.map((i) => i.organisationName).filter(Boolean)).size,
      },
    ],
    columns: [
      { label: "Name", key: "projectName", strong: true, width: "w-[25%]" },
      { label: "Organization", key: "organisationName", width: "w-[21%]" },
      { label: "Code", key: "projectCode", width: "w-[12%]" },
      { label: "Status", key: "projectStatus", status: true, width: "w-[14%]" },
      {
        label: "Start",
        key: "projectStartDate",
        type: "date",
        width: "w-[14%]",
      },
      {
        label: "Forecast End",
        key: "forecastCompletedDate",
        type: "date",
        width: "w-[14%]",
      },
    ],
    formFields: [
      { name: "projectName", label: "Project Name", required: true, span: 2 },
      { name: "projectCode", label: "Project Code" },
      { name: "organisationName", label: "Organization" },
      {
        name: "projectStatus",
        label: "Status",
        type: "select",
        options: PROJECT_STATUSES,
        defaultValue: "Not Started",
      },
      { name: "projectStartDate", label: "Start Date", type: "date" },
      { name: "forecastCompletedDate", label: "Forecast End", type: "date" },
      { name: "projectCompletedDate", label: "Completed Date", type: "date" },
      {
        name: "projectDescription",
        label: "Description",
        type: "textarea",
        span: 2,
      },
    ],
    detailPath: (item) => `/project/${item.projectId}`,
  };
}

export function taskConfig(api) {
  return {
    title: "Tasks",
    singular: "Task",
    subtitle: "",
    icon: "mdi:checkbox-marked-circle-plus-outline",
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.taskId,
    primaryKey: "taskName",
    secondaryKey: "taskRelatedTo",
    statusKey: "taskAssign",
    statusOptions: TASK_STATUSES,
    statusColors: { ...TASK_STATUS_COLORS, ...TASK_PRIORITY_COLORS },
    searchKeys: [
      "taskName",
      "taskAssign",
      "taskPriority",
      "taskRelatedTo",
      "taskDescription",
    ],
    metrics: [
      { label: "Tasks", value: count },
      {
        label: "Done",
        value: (items) => items.filter((i) => i.taskAssign === "Done").length,
      },
      {
        label: "High Priority",
        value: (items) =>
          items.filter((i) => ["High", "Critical"].includes(i.taskPriority))
            .length,
      },
      {
        label: "Avg Progress",
        value: (items) =>
          `${Math.round(sum(items, "taskPercentageCompleted") / Math.max(items.length, 1))}%`,
      },
    ],
    columns: [
      { label: "Task", key: "taskName", strong: true, width: "w-[26%]" },
      { label: "Related To", key: "taskRelatedTo", width: "w-[22%]" },
      {
        label: "Priority",
        key: "taskPriority",
        status: true,
        width: "w-[13%]",
      },
      { label: "Status", key: "taskAssign", status: true, width: "w-[13%]" },
      { label: "Due Date", key: "taskDueDate", type: "date", width: "w-[14%]" },
      {
        label: "Complete",
        key: (item) => `${item.taskPercentageCompleted || 0}%`,
        align: "right",
        width: "w-[12%]",
      },
    ],
    cardStats: [
      { label: "Priority", key: "taskPriority" },
      { label: "Due", key: "taskDueDate", type: "date" },
      {
        label: "Progress",
        key: (item) => `${item.taskPercentageCompleted || 0}%`,
      },
      { label: "Related", key: "taskRelatedTo" },
    ],
    formFields: [
      { name: "taskName", label: "Task Title", required: true, span: 2 },
      {
        name: "taskPriority",
        label: "Priority",
        type: "select",
        options: TASK_PRIORITIES,
        defaultValue: "Medium",
      },
      {
        name: "taskAssign",
        label: "Status",
        type: "select",
        options: TASK_STATUSES,
        defaultValue: "To Do",
      },
      { name: "taskStartDate", label: "Start Date", type: "date" },
      { name: "taskDueDate", label: "Due Date", type: "date" },
      {
        name: "taskPercentageCompleted",
        label: "Completion %",
        type: "number",
      },
      { name: "taskRelatedTo", label: "Related To" },
      {
        name: "taskDescription",
        label: "Description",
        type: "textarea",
        span: 2,
      },
    ],
    toPayload: (form) => ({
      ...form,
      taskPercentageCompleted: Number(form.taskPercentageCompleted || 0),
    }),
  };
}

export function teamConfig(api) {
  return {
    title: "Teams",
    singular: "Team",
    subtitle: "",
    icon: "mdi:account-group-outline",
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.teamId,
    primaryKey: "teamName",
    secondaryKey: (item) => `Team #${item.teamId}`,
    searchKeys: ["teamName"],
    metrics: [
      { label: "Teams", value: count },
      { label: "Visible", value: count },
      { label: "Assignable", value: count },
      { label: "Workspace", value: () => "Ready" },
    ],
    columns: [
      { label: "Team", key: "teamName", strong: true, width: "w-[72%]" },
      { label: "Team ID", key: "teamId", align: "right", width: "w-[28%]" },
    ],
    formFields: [
      { name: "teamName", label: "Team Name", required: true, span: 2 },
    ],
    detailPath: (item) => `/team/${item.teamId}`,
  };
}

export function teamMemberConfig(api) {
  return {
    title: "Team Members",
    singular: "Team Member",
    subtitle: "",
    icon: "mdi:account-tie-outline",
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.teamMemberId,
    primaryKey: "teamMemberName",
    secondaryKey: "teamMemberEmail",
    searchKeys: ["teamMemberName", "teamMemberEmail", "teamMemberMobile"],
    metrics: [
      { label: "Members", value: count },
      {
        label: "With Email",
        value: (items) => items.filter((i) => i.teamMemberEmail).length,
      },
      {
        label: "With Mobile",
        value: (items) => items.filter((i) => i.teamMemberMobile).length,
      },
      {
        label: "Roles",
        value: (items) =>
          new Set(items.map((i) => i.teamMemberRole).filter(Boolean)).size,
      },
    ],
    columns: [
      { label: "Name", key: "teamMemberName", strong: true, width: "w-[28%]" },
      { label: "Email", key: "teamMemberEmail", width: "w-[34%]" },
      { label: "Mobile", key: "teamMemberMobile", width: "w-[22%]" },
      {
        label: "Role ID",
        key: "teamMemberRole",
        align: "right",
        width: "w-[16%]",
      },
    ],
    formFields: [
      { name: "teamMemberName", label: "Name", required: true, span: 2 },
      { name: "teamMemberEmail", label: "Email", type: "email" },
      { name: "teamMemberMobile", label: "Mobile" },
      { name: "teamMemberRole", label: "Role ID", type: "number" },
      { name: "password", label: "Password", type: "password" },
    ],
  };
}

export function roleConfig(api) {
  return {
    title: "Roles",
    singular: "Role",
    subtitle: "",
    icon: "mdi:shield-account-outline",
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.roleId,
    primaryKey: "roleName",
    secondaryKey: (item) => `Role #${item.roleId}`,
    searchKeys: ["roleName"],
    metrics: [
      { label: "Roles", value: count },
      { label: "Configurable", value: count },
      { label: "Access Layer", value: () => "Active" },
      { label: "Security", value: () => "Enabled" },
    ],
    columns: [
      { label: "Role", key: "roleName", strong: true, width: "w-[72%]" },
      { label: "Role ID", key: "roleId", align: "right", width: "w-[28%]" },
    ],
    formFields: [
      { name: "roleName", label: "Role Name", required: true, span: 2 },
    ],
  };
}

export function createTeamConfig(api) {
  return {
    title: "Create Team",
    singular: "Team Assignment",
    subtitle: "",
    icon: "mdi:account-multiple-plus-outline",
    load: api.getAll,
    create: api.create,
    update: api.update,
    remove: api.remove,
    getId: (item) => item.createTeamId,
    primaryKey: (item) => `Assignment #${item.createTeamId}`,
    secondaryKey: (item) =>
      `Team ${item.teamIdFk || "-"} / Member ${item.teamMemberIdFk || "-"}`,
    searchKeys: ["createTeamId", "teamIdFk", "teamMemberIdFk", "roleIdFk"],
    metrics: [
      {
        label: "Teams Used",
        value: (items) =>
          new Set(items.map((i) => i.teamIdFk).filter(Boolean)).size,
      },
      {
        label: "Members Used",
        value: (items) =>
          new Set(items.map((i) => i.teamMemberIdFk).filter(Boolean)).size,
      },
    ],
    columns: [
      {
        label: "Team",
        key: "teamIdFk",
        strong: true,
        width: "w-[34%]",
      },
      {
        label: "Members",
        key: "teamMemberIdFk",
        align: "right",
        width: "w-[22%]",
      },
      {
        label: "Role",
        key: "roleIdFk",
        align: "right",
        width: "w-[22%]",
      },
      {
        label: "Actions",
        key: "createTeamId",
        align: "right",
        width: "w-[22%]",
        // display-only; real row actions are handled by ModuleWorkspace's built-in Action column
      },
    ],

    formFields: [
      { name: "teamIdFk", label: "Team ID", type: "number", required: true },
      {
        name: "teamMemberIdFk",
        label: "Team Member ID",
        type: "number",
        required: true,
      },
      { name: "roleIdFk", label: "Role ID", type: "number", required: true },
    ],
    toPayload: (form) => ({
      teamIdFk: Number(form.teamIdFk),
      teamMemberIdFk: Number(form.teamMemberIdFk),
      roleIdFk: Number(form.roleIdFk),
    }),
  };
}

export function staticWorkspaceConfig({
  title,
  singular,
  subtitle,
  icon,
  rows,
  columns,
  primaryKey,
  secondaryKey,
  statusKey,
  statusOptions,
}) {
  return {
    title,
    singular,
    subtitle,
    icon,
    load: async () => rows,
    getId: (item) => item.id,
    primaryKey,
    secondaryKey,
    statusKey,
    statusOptions,
    searchKeys: columns.map((column) => column.key),
    metrics: [
      { label: title, value: count },
      {
        label: "Active",
        value: (items) =>
          items.filter((i) =>
            ["Active", "Open", "Enabled", "Ready", "Unread"].includes(
              i[statusKey],
            ),
          ).length,
      },
      {
        label: "Linked",
        value: (items) =>
          items.filter((i) => i.linked || i.owner || i.module).length,
      },
      { label: "Updated", value: () => "Today" },
    ],
    columns,
  };
}

export { TASK_PRIORITY_COLORS };
