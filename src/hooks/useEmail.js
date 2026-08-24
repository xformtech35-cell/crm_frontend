import { useLead } from "./useLead";

const EMAIL_STATUSES = ["Sent", "Read", "Unread", "Draft"];

function mapLeadToEmail(lead) {
  const contactPerson = String(
    lead.companyContactPersonName ||
    lead.contactPersonName ||
    `${lead.leadFirstName || ''} ${lead.leadLastName || ''}`.trim() ||
    ''
  ).trim();

  const company = String(lead.leadOrganisationName || lead.company || "Unknown Account");

  // Determine From / Contact Person Name cleanly
  const from = contactPerson || (lead.leadEmail ? lead.leadEmail.split('@')[0] : '') || (company !== "Unknown Account" ? company : "Sales Contact");

  // Determine Subject cleanly without showing "Email to Unknown"
  let subject = String(
    lead.leadReason ||
    lead.enquiryDescription ||
    lead.leadTitle ||
    ''
  ).trim();

  if (!subject || subject.toLowerCase().includes('unknown')) {
    if (company && company !== "Unknown Account") {
      subject = `Email Inquiry - ${company}`;
    } else if (from && from !== "Unknown") {
      subject = `Email Communication - ${from}`;
    } else {
      subject = `CRM Email Communication`;
    }
  }

  const status = String(lead.leadStatus || "Sent");

  return {
    id: Number(lead.leadId),
    from,
    firstName: lead.leadFirstName || (contactPerson ? contactPerson.split(' ')[0] : ''),
    lastName: lead.leadLastName || (contactPerson ? contactPerson.split(' ').slice(1).join(' ') : ''),
    companyContactPersonName: contactPerson || from,
    email: String(lead.leadEmail || ""),
    company,
    subject,
    message: String(lead.enquiryDescription || lead.designation || ""),
    preview: String(lead.enquiryDescription || lead.designation || "Email message details"),
    linked: company,
    status: EMAIL_STATUSES.includes(status) ? status : "Sent",
    time: String(
      lead.inquiryDate || lead.leadCreatedDate || new Date().toISOString()
    ).slice(0, 10),
    leadId: Number(lead.leadId),
  };
}

function mapFormToLeadPayload(form) {
  const contactName = form.companyContactPersonName || `${form.firstName || ''} ${form.lastName || ''}`.trim();
  return {
    leadFirstName: form.firstName || contactName,
    leadLastName: form.lastName || '',
    companyContactPersonName: contactName,
    leadEmail: form.email,
    leadOrganisationName: form.company,
    leadReason: form.subject,
    designation: form.message,
    enquiryDescription: form.message,
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
