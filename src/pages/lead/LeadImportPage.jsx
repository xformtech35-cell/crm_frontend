import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLead } from '../../hooks/useLead'
import AppAlert from '../../components/common/AppAlert'
import AppCard from '../../components/common/AppCard'
import Icon from '../../components/Icon'
import * as XLSX from "xlsx";

const REQUIRED_DISPLAY = 'first name and either mobile or email'

const FIELD_ALIASES = {
  leadFirstName: ['first name', 'firstname', 'lead first name', 'leadfirstname', 'name', 'contact person', 'contact person name'],
  leadLastName: ['last name', 'lastname', 'lead last name', 'leadlastname'],
  leadMobileNo: ['mobile', 'mobile no', 'phone', 'phone no', 'contact', 'lead mobile', 'lead mobile no', 'contact phone'],
  leadPhoneNo: ['alternate phone', 'alt phone', 'telephone', 'landline'],
  leadEmail: ['email', 'email address', 'lead email'],
  leadOrganisationName: ['company', 'company name', 'organization', 'organisation', 'organization name', 'organisation name'],
  leadTitle: ['title', 'lead title'],
  designation: ['designation', 'job title'],
  leadAddress: ['address', 'lead address'],
  leadCity: ['city'],
  leadState: ['state'],
  leadCountry: ['country'],
  leadWebsite: ['website', 'web site', 'url'],
  leadIndustry: ['industry'],
  noOfEmployee: ['employees', 'employee count', 'no of employee', 'number of employees'],
  leadSource: ['source', 'lead source'],
  leadType: ['type', 'lead type'],
  leadStatus: ['status', 'lead status'],
  leadGroup: ['group', 'lead group', 'groups', 'category'],
  leadReason: ['notes', 'note', 'reason'],
  inquiryDate: ['inquiry date', 'enquiry date', 'date'],
  leadRef: ['ref', 'lead ref', 'salesperson ref', 'salesperson', 'salesperson initials'],
  enquiryStatus: ['enquiry status', 'enquiry_status', 'quotation status', 'enquiry status status', 'status of enquiry'],
  quotationRevision: ['revision', 'quotation revision', 'negotiation', 'revision no', 'quotation revision no'],
  quotationNumber: ['quotation number', 'quotation no', 'quotation_number', 'quotation no.'],
  quotationDate: ['quotation date', 'quotation_date', 'quotation date date'],
  quotationAmount: ['quotation amount', 'quotation_amount', 'amount', 'quotation value'],
  leadRating: ["lead rating", "rating", "stars"],

  leadOutcomeStatus: [
    "lead outcome status",
    "outcome status",
    "lead stage",
    "stage"
  ],

  followUpDate: [
    "follow up date",
    "next follow up",
    "followup date"
  ],

  quotationSentDate: [
    "quotation sent date",
    "sent quotation date"
  ],

  ongoingPriority: [
    "priority",
    "ongoing priority"
  ],

  followUpRemark: [
    "follow up remark",
    "followup remark",
    "follow up",
    "remark"
  ],

  companyContactPersonName: [
    "contact person",
    "contact person name",
    "company contact person"
  ],

  enquiryType: [
    "enquiry type",
    "inquiry type"
  ],

  enquiryDescription: [
    "enquiry description",
    "inquiry description",
    "description"
  ],

  remarks: [
    "remarks",
    "remark"
  ],

}

// const SAMPLE_HEADERS = [
//   'first name',
//   'last name',
//   'mobile',
//   'email',
//   'company',
//   'source',
//   'status',
//   'city',
//   'state',
//   'country',
//   'notes',
// ]

const SAMPLE_HEADERS = [
  "first name",
  "last name",
  "company",
  "contact person",
  "mobile",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "country",
  "website",
  "industry",
  "employees",

  "lead source",
  "lead type",
  "lead status",
  "lead group",
  "lead ref",

  "enquiry type",
  "enquiry status",
  "enquiry description",
  "inquiry date",

  "quotation number",
  "quotation revision",
  "quotation date",
  "quotation amount",

  "lead rating",
  "follow up remark",

  "designation",
  "remarks"
];

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell.trim())
      if (row.some((item) => item !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some((item) => item !== '')) rows.push(row)
  return rows
}

function buildHeaderMap(headers) {
  const normalized = headers.map(normalizeHeader)
  return Object.entries(FIELD_ALIASES).reduce((map, [field, aliases]) => {
    const index = normalized.findIndex((header) => aliases.includes(header))
    if (index >= 0) map[field] = index
    return map
  }, {})
}

function cleanDate(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function rowToLead(row, headerMap) {
  const lead = {}

  for (const [field, index] of Object.entries(headerMap)) {
    const value = row[index]?.trim()
    if (value) lead[field] = value
  }

  if (
    !lead.leadFirstName &&
    headerMap.leadFirstName != null &&
    row[headerMap.leadFirstName]
  ) {
    const [firstName, ...rest] =
      row[headerMap.leadFirstName].trim().split(/\s+/);

    lead.leadFirstName = firstName;
    lead.leadLastName = lead.leadLastName || rest.join(" ");
  }

  if (lead.noOfEmployee) {
    const employees = Number.parseInt(lead.noOfEmployee, 10)
    if (Number.isNaN(employees)) delete lead.noOfEmployee
    else lead.noOfEmployee = employees
  }

  if (lead.inquiryDate) {
    lead.inquiryDate = cleanDate(lead.inquiryDate)
    if (!lead.inquiryDate) delete lead.inquiryDate
  }

  if (lead.quotationDate) {
    lead.quotationDate = cleanDate(lead.quotationDate)
    if (!lead.quotationDate) delete lead.quotationDate
  }

  if (lead.quotationAmount) {
    const amount = Number(String(lead.quotationAmount).replace(/[^\d.]/g, ''))
    if (Number.isNaN(amount)) delete lead.quotationAmount
    else lead.quotationAmount = amount
  }

  // lead.leadStatus = lead.leadStatus || 'New Lead'
  // lead.leadSource = lead.leadSource || 'Other'
  // lead.leadType = lead.leadType || 'New'

  lead.leadStatus = lead.leadStatus || "New Lead";
  lead.leadSource = lead.leadSource || "Other";
  lead.leadType = lead.leadType || "New";

  lead.enquiryType = lead.enquiryType || "Qualified";
  lead.enquiryStatus = lead.enquiryStatus || "Pending";
  lead.leadOutcomeStatus = lead.leadOutcomeStatus || "Open";

  lead.leadRating = lead.leadRating
    ? Number(lead.leadRating)
    : 0;

  lead.quotationRevision = lead.quotationRevision || "R0";

  lead.leadCountry = lead.leadCountry || "India";
  lead.leadState = lead.leadState || "Maharashtra";

  lead.leadCity = lead.leadCity || "";
  lead.leadOrganisationName = lead.leadOrganisationName || "";
  lead.companyContactPersonName =
    lead.companyContactPersonName || "";

  lead.followUpRemark =
    lead.followUpRemark || "";

  lead.remarks =
    lead.remarks || "";

  lead.quotationAmount =
    lead.quotationAmount || 0;

  lead.noOfEmployee =
    lead.noOfEmployee || 0;

  if (!lead.inquiryDate) {
    lead.inquiryDate = new Date().toISOString().split("T")[0];
  }

  return lead
}

// function validateLead(lead, rowNumber) {
//   if (!lead.leadFirstName) return `Row ${rowNumber}: first name is required.`
//   if (!lead.leadMobileNo && !lead.leadEmail) {
//     return `Row ${rowNumber}: add a mobile number or email.`
//   }
//   return null
// }

function validateLead(lead, rowNumber) {

  // If first name is missing, derive it
  if (!lead.leadFirstName) {

    if (lead.companyContactPersonName) {
      lead.leadFirstName = lead.companyContactPersonName;
    } else if (lead.leadOrganisationName) {
      lead.leadFirstName = lead.leadOrganisationName;
    }

  }

  if (!lead.leadMobileNo && !lead.leadEmail) {
    return `Row ${rowNumber}: add a mobile number or email.`;
  }

  return null;
}

export default function LeadImportPage() {
  const { create } = useLead()
  const inputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [leads, setLeads] = useState([])
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)

  const previewRows = useMemo(() => leads.slice(0, 6), [leads])

  // async function handleFileChange(e) {
  //   const file = e.target.files?.[0]
  //   setAlert(null)
  //   setLeads([])
  //   setErrors([])
  //   setFileName(file?.name || '')

  //   if (!file) return
  //   if (!file.name.toLowerCase().endsWith('.csv')) {
  //     setErrors(['Please choose a CSV file.'])
  //     return
  //   }

  //   const text = await file.text()
  //   const rows = parseCsv(text)
  //   if (rows.length < 2) {
  //     setErrors(['The CSV needs a header row and at least one lead row.'])
  //     return
  //   }

  //   const [headers, ...dataRows] = rows
  //   const headerMap = buildHeaderMap(headers)
  //   const parsed = []
  //   const parseErrors = []

  //   dataRows.forEach((row, index) => {
  //     const lead = rowToLead(row, headerMap)
  //     const error = validateLead(lead, index + 2)
  //     if (error) parseErrors.push(error)
  //     else parsed.push(lead)
  //   })

  //   if (headerMap.leadFirstName == null) {
  //     parseErrors.unshift(
  //       'Missing a first name column. Use "first name" or "name".'
  //     );
  //   }

  //   if (
  //     headerMap.leadMobileNo == null &&
  //     headerMap.leadEmail == null
  //   ) {
  //     parseErrors.unshift(
  //       'Missing contact column. Add "mobile" or "email".'
  //     );
  //   }

  //   setLeads(parsed)
  //   setErrors(parseErrors)
  //   if (parsed.length > 0 && parseErrors.length === 0) {
  //     setAlert({ type: 'success', message: `${parsed.length} lead(s) are ready to import.` })
  //   }
  // }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    setAlert(null);
    setLeads([]);
    setErrors([]);
    setFileName(file.name);

    let rows = [];

    if (file.name.toLowerCase().endsWith(".csv")) {

      const text = await file.text();
      rows = parseCsv(text);

    } else if (
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls")
    ) {

      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const sheet =
        workbook.Sheets[workbook.SheetNames[0]];

      rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });

    } else {

      setErrors(["Please select CSV or Excel file."]);
      return;

    }

    if (rows.length < 2) {
      setErrors(["No data found"]);
      return;
    }

    // Automatically find the row containing the actual column headers
    let headerIndex = rows.findIndex(row =>
      row.some(cell =>
        String(cell || "").trim().toLowerCase() === "company name"
      )
    );

    if (headerIndex === -1) {
      setErrors(["Could not find header row."]);
      return;
    }

    // Read headers and data from the correct row
    const headers = rows[headerIndex];

    const dataRows = rows.slice(headerIndex + 1);

    const headerMap = buildHeaderMap(headers);

    console.log("Headers:", headers);
    console.log("Header Map:", headerMap);

    const parsed = [];
    const parseErrors = [];

    if (headerMap.leadFirstName == null) {
      parseErrors.unshift(
        'Missing a first name column. Use "first name" or "name".'
      );
    }

    if (
      headerMap.leadMobileNo == null &&
      headerMap.leadEmail == null
    ) {
      parseErrors.unshift(
        'Missing contact column. Add "mobile" or "email".'
      );
    }

  dataRows.forEach((row, index) => {

  // Skip completely empty rows
  if (row.every(cell => String(cell || "").trim() === "")) {
    return;
  }

  // Skip TOTAL row
  if (
    String(row[2] || "").trim().toUpperCase() === "TOTAL"
  ) {
    return;
  }

  const lead = rowToLead(row, headerMap);

  const error = validateLead(lead, index + 2);

  if (error) {
    parseErrors.push(error);
  } else {
    parsed.push(lead);
  }
});
    setLeads(parsed);
    setErrors(parseErrors);

    if (parsed.length > 0 && parseErrors.length === 0) {
      setAlert({
        type: "success",
        message: `${parsed.length} lead(s) are ready to import.`,
      });
    }
  }


  // function downloadSample() {
  //   const rows = [
  //     SAMPLE_HEADERS,
  //     [
  //       "Rahul",
  //       "Patil",
  //       "Garware Industrial",
  //       "Rahul Patil",
  //       "9876543210",
  //       "02012345678",
  //       "rahul@gmail.com",
  //       "Hanuman Nagar",
  //       "Pune",
  //       "Maharashtra",
  //       "India",
  //       "www.garware.com",
  //       "Manufacturing",
  //       "500",

  //       "IndiaMart",
  //       "New",
  //       "Qualified",
  //       "Dosing",
  //       "Yogita",

  //       "Qualified",
  //       "Pending",
  //       "Water treatment enquiry",
  //       "2026-06-30",

  //       "UWS/RRW/26-27/001/R0",
  //       "R0",
  //       "2026-06-30",
  //       "75000",

  //       "5",
  //       "Customer asked for discount",

  //       "Purchase Manager",
  //       "Priority customer"
  //     ]
  //   ]
  //   const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  //   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  //   const url = URL.createObjectURL(blob)
  //   const link = document.createElement('a')
  //   link.href = url
  //   link.download = 'lead-import-sample.csv'
  //   link.click()
  //   URL.revokeObjectURL(url)
  // }

  function downloadSample() {
    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.aoa_to_sheet([
      SAMPLE_HEADERS,
      [
        "Rahul",
        "Patil",
        "Garware Industrial",
        "Rahul Patil",
        "9876543210",
        "02012345678",
        "rahul@gmail.com",
        "Hanuman Nagar",
        "Pune",
        "Maharashtra",
        "India",
        "www.garware.com",
        "Manufacturing",
        "500",
        "IndiaMart",
        "New",
        "Qualified",
        "Dosing",
        "Yogita",
        "Qualified",
        "Pending",
        "Water treatment enquiry",
        "2026-06-30",
        "UWS/RRW/26-27/001/R0",
        "R0",
        "2026-06-30",
        "75000",
        "5",
        "Customer asked for discount",
        "Purchase Manager",
        "Priority customer"
      ]
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

    XLSX.writeFile(workbook, "lead-import-sample.xlsx");
  }

  async function handleImport() {
    if (!leads.length || errors.length) return
    setLoading(true)
    setAlert(null)
    try {
      // Create leads sequentially to avoid overwhelming backend; stop on first failure.
      let imported = 0
      for (const lead of leads) {
        await create(lead, {})
        imported += 1
      }

      setAlert({ type: 'success', message: `Imported ${imported} lead(s) successfully.` })
      setLeads([])
      setFileName('')
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      setAlert({ type: 'error', message: e?.response?.data?.message || 'Import failed. Please check the file and try again.' })
    } finally {
      setLoading(false);
    }
  }

  function updateDate(setter) {
    return (value) => {
      setter(value);

      if (alert) {
        setAlert(null);
      }
    };
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/lead"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Icon
            name="mdi:arrow-left"
            className="text-xl"
          />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload CSV or Excel (.xlsx) to create leads in bulk.
          </p>
        </div>
      </div>

      {alert && <AppAlert type={alert.type} message={alert.message} className="mb-4" />}
      {errors.length > 0 && (
        <AppAlert
          type="error"
          className="mb-4"
          message={`${errors.slice(0, 3).join(' ')}${errors.length > 3 ? ` ${errors.length - 3} more issue(s).` : ''}`}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <AppCard title="CSV / Excel Upload">
          <div className="space-y-5">
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
              <Icon name="mdi:microsoft-excel" className="w-10 h-10 text-blue-500 mb-3" />
              <span className="text-sm font-semibold text-gray-800">
                {fileName || 'Choose CSV or Excel File'}
              </span>
              <span className="mt-1 text-xs text-gray-500">
                Required: {REQUIRED_DISPLAY}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={loading || !leads.length || errors.length > 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Icon name="mdi:loading" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon name="mdi:cloud-upload-outline" className="w-4 h-4" />
                )}
                {loading ? 'Importing...' : `Import ${leads.length || ''} Leads`}
              </button>
              <button
                type="button"
                onClick={downloadSample}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Icon name="mdi:download-outline" className="w-4 h-4" />
                Sample CSV
              </button>
            </div>

            {previewRows.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Contact</th>
                      <th className="px-4 py-3 text-left font-semibold">Company</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {previewRows.map((lead, index) => (
                      <tr key={`${lead.leadEmail || lead.leadMobileNo}-${index}`}>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {lead.leadFirstName} {lead.leadLastName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {lead.leadMobileNo || lead.leadEmail}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {lead.leadOrganisationName || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {lead.leadStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AppCard>

        <AppCard title="Accepted Columns">
          <div className="space-y-3 text-sm text-gray-600">
            <p>Use a header row. Column names can be simple names like first name, mobile, email, company, source, status, city, state, country, notes.</p>
            <p>Default values are applied when optional columns are missing: status is New Lead, source is Other, and type is Imported.</p>
            <p className="text-xs text-gray-400">Only valid rows are imported. Fix any shown row errors before uploading.</p>
          </div>
        </AppCard>
      </div>
    </div>
  );
}