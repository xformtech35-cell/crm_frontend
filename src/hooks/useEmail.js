import { useLead } from "./useLead";

const EMAIL_STATUSES = ["Sent", "Read", "Unread", "Draft"];

function mapLeadToEmail(lead) {
  const firstName = String(lead.leadFirstName || "");
  const lastName = String(lead.leadLastName || "");
  const from = `${firstName} ${lastName}`.trim() || "Unknown";
  const company = String(lead.leadOrganisationName || "Unknown Account");
  const status = String(lead.leadStatus || "Sent");

  return {
    id: Number(lead.leadId),
    from,
    firstName,
    lastName,
    email: String(lead.leadEmail || ""),
    company,
    subject: String(lead.leadReason || `Email to ${from}`),
    message: String(lead.designation || ""),
    preview: String(lead.designation || "Email composed in CRM."),
    linked: company,
    status: EMAIL_STATUSES.includes(status) ? status : "Sent",
    time: String(
      lead.inquiryDate || lead.leadCreatedDate || new Date().toISOString(),
    ),
    leadId: Number(lead.leadId),
  };
}

function mapFormToLeadPayload(form) {
  return {
    leadFirstName: form.firstName,
    leadLastName: form.lastName,
    leadEmail: form.email,
    leadOrganisationName: form.company,
    leadReason: form.subject,
    designation: form.message,
    leadStatus: form.status || "Sent",
    leadSource: "Email",
    inquiryDate: new Date().toISOString().slice(0, 10),
  };
}

export function useEmail() {
  const leadApi = useLead();

  async function getAll() {
    const leads = await leadApi.getAll();
    return Array.isArray(leads)
      ? leads.filter((l) => l.leadEmail).map(mapLeadToEmail)
      : [];
  }

  async function create(form) {
    const payload = mapFormToLeadPayload(form);
    const lead = await leadApi.create(payload, null);
    return mapLeadToEmail(lead);
  }

  async function update(id, form) {
    const payload = mapFormToLeadPayload(form);
    const lead = await leadApi.update(id, payload, null);
    return mapLeadToEmail(lead);
  }

  async function remove(id) {
    await leadApi.remove(id);
  }

  return { getAll, create, update, remove };
}
