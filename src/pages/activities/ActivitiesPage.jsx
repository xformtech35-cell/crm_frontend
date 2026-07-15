import ModuleWorkspace from "../../components/module/ModuleWorkspace";
import { useActivity } from "../../hooks/useActivity";

export const ACTIVITY_TYPES = [
  "Call",
  "Email",
  "Meeting",
  "Note",
  "Reminder",
];

export const ACTIVITY_TYPE_COLORS = {
  Call: "indigo",
  Email: "blue",
  Meeting: "orange",
  Note: "purple",
  Reminder: "yellow",
};

export default function ActivitiesPage() {
  const api = useActivity();

  // Clean ugly metadata from notes
  const cleanNote = (note) => {
    if (!note) return "-";

    return note
      .replace(/_TASK_META_[^}]*}/g, "")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 100);
  };

  const config = {
    title: "Activities",
    singular: "Activity",
    subtitle: "",
    icon: "mdi:timeline-clock-outline",

    load: async () => {
      const data = await api.getAll();

      return data.map((item) => ({
        ...item,
        note: cleanNote(item.note),
      }));
    },

    create: api.create,
    update: api.update,
    remove: api.remove,

    getId: (item) => item.id,

    primaryKey: "title",
    secondaryKey: "subject",

    statusKey: "type",
    statusOptions: ACTIVITY_TYPES,
    statusColors: ACTIVITY_TYPE_COLORS,

    searchKeys: [
      "title",
      "type",
      "subject",
      "owner",
      "note",
    ],

    columns: [
      {
        label: "Activity",
        key: "title",
        strong: true,
        width: "w-[22%]",
      },
      {
        label: "Type",
        key: "type",
        status: true,
        width: "w-[10%]",
      },
      {
        label: "Subject",
        key: "subject",
        width: "w-[18%]",
      },
      {
        label: "Owner",
        key: "owner",
        width: "w-[12%]",
      },
      {
        label: "Time",
        key: "time",
        width: "w-[14%]",
      },
      {
        label: "Note",
        key: "note",
        width: "w-[24%]",
      },
    ],

    formFields: [
      {
        name: "title",
        label: "Activity Title",
        required: true,
        span: 2,
      },

      {
        name: "type",
        label: "Type",
        type: "select",
        options: ACTIVITY_TYPES,
        defaultValue: "Meeting",
      },

      {
        name: "subject",
        label: "Subject / Related To",
      },

      {
        name: "owner",
        label: "Owner",
      },

      {
        name: "time",
        label: "Due Date / Time",
        type: "date",
      },

      {
        name: "note",
        label: "Note",
        type: "textarea",
        span: 2,
      },
    ],

    toPayload: (form) => ({
      title: form.title,
      type: form.type,
      subject: form.subject,
      owner: form.owner,
      time: form.time,
      note: form.note,
    }),
  };

  return <ModuleWorkspace config={config} />;
}
