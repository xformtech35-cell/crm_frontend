import { useState, useEffect } from 'react'
import Icon from '../Icon'
import { LEAD_SOURCES, INDUSTRIES, COUNTRIES, LEAD_GROUPS } from '../../utils/constants'
import { useTeamMember } from '../../hooks/useTeamMember'
import { useAuthStore } from '../../stores/auth'
import { useLeadSource, useLeadGroup } from "/src/hooks/useMaster";
import { getMemberId } from '../../utils/teamRelations'
import { getCurrencyConfig, convertToBase, convertFromBase } from '../../utils/currency'
import { Country, State, City } from "country-state-city";

const EMPTY = {
  leadFirstName: '',
  leadLastName: '',
  leadTitle: '',
  leadEmail: '',
  leadMobileNo: '',
  leadPhoneNo: '',
  leadOrganisationName: '',
  designation: '',
  leadWebsite: '',
  leadIndustry: '',
  leadOutcomeStatus: 'Open',
  leadSource: '',
  leadCountry: '',
  leadCity: '',
  leadState: '',
  leadAddress: '',
  leadType: '',
  leadReason: '',
  noOfEmployee: '',
  leadAssignedMember: '',
  inquiryDate: '',
  enquiryDescription: '',
  enquiryType: 'Qualified',
  companyContactPersonName: '',
  quotationNumber: '',
  quotationDate: '',
  quotationAmount: '',
  followUpRemark: '',
  ongoingPriority: '',
  leadGroup: '',
  leadRef: '',
  leadRefQuotation: '',
  enquiryStatus: 'Pending',
  quotationRevision: '',
}

function populate(data) {
  if (!data) return { ...EMPTY }
  return {
    leadFirstName: data.leadFirstName ?? '',
    leadLastName: data.leadLastName ?? '',
    leadTitle: data.leadTitle ?? '',
    leadEmail: data.leadEmail ?? '',
    leadMobileNo: data.leadMobileNo ?? '',
    leadPhoneNo: data.leadPhoneNo ?? '',
    leadOrganisationName: data.leadOrganisationName ?? '',
    designation: data.designation ?? '',
    leadWebsite: data.leadWebsite ?? '',
    leadIndustry: data.leadIndustry ?? '',
    leadOutcomeStatus: data.leadOutcomeStatus ?? 'Open',
    leadSource: data.leadSource ?? '',
    leadCountry: data.leadCountry ?? '',
    leadCity: data.leadCity ?? '',
    leadState: data.leadState ?? '',
    leadAddress: data.leadAddress ?? '',
    leadType: data.leadType ?? '',
    leadReason: data.leadReason ?? '',
    noOfEmployee: data.noOfEmployee ?? '',
    leadAssignedMember: data.leadAssignedMember ?? '',
    inquiryDate: data.inquiryDate ?? '',
    enquiryDescription: data.enquiryDescription ?? '',
    enquiryType: data.enquiryType ?? 'Qualified',
    companyContactPersonName: data.companyContactPersonName ?? '',
    quotationNumber: data.quotationNumber ?? '',
    quotationDate: data.quotationDate ?? '',
    quotationAmount: data.quotationAmount != null && data.quotationAmount !== '' ? convertFromBase(data.quotationAmount, data.leadCountry) : '',
    followUpRemark: data.followUpRemark ?? '',
    ongoingPriority: data.ongoingPriority ?? '',
    leadGroup: data.leadGroup ?? '',
    leadRef: data.leadRef ?? '',
    leadRefQuotation: data.leadRefQuotation ?? '',
    enquiryStatus: data.enquiryStatus ?? 'Pending',
    quotationRevision: data.quotationRevision ?? '',
  }
}

function getFinancialYear(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(date.getTime())) return '26-27';
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

function parseQuotationParts(qNum, orgName, inquiryDateVal) {
  const parts = {
    prefix: '',
    ref: '',
    year: getFinancialYear(inquiryDateVal),
    serial: '',
    revision: '',
  };

  if (orgName) {
    parts.prefix = orgName.split(/\s+/).map(w => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  if (!qNum) return parts;

  const clean = qNum.replace(/\s+/g, '/').split('/');
  if (clean.length >= 2) {
    parts.prefix = clean[0];
    const yearIndex = clean.findIndex(p => p.includes('-'));
    if (yearIndex === 1) {
      parts.year = clean[1];
      parts.serial = clean[2] || '';
      parts.revision = clean[3] || '';
    } else if (yearIndex === 2) {
      parts.ref = clean[1];
      parts.year = clean[2];
      parts.serial = clean[3] || '';
      parts.revision = clean[4] || '';
    } else {
      parts.serial = clean[clean.length - 1];
    }
  }
  return parts;
}

export default function LeadForm({ initial, loading, onSubmit, quotation }) {
  const sourceHook = useLeadSource();
  const groupHook = useLeadGroup();
  const { getAll } = useTeamMember();
  const isAdmin = useAuthStore(s => s.isAdmin());

  const [leadSources, setLeadSources] = useState([]);
  const [leadGroups, setLeadGroups] = useState([]);
  const [form, setForm] = useState(() => populate(initial));
  const [qPrefix, setQPrefix] = useState('');
  const [qSerial, setQSerial] = useState('');
  const [previousSerialNo, setPreviousSerialNo] = useState('');
  const [qYear, setQYear] = useState('');
  const [isManualQuotation, setIsManualQuotation] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  const currencyConfig = getCurrencyConfig(form.leadCountry);

  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");


  const firstQuotation = quotation?.[0];

  // Fetch last serial number
  const fetchLastSerialNumber = async () => {
    try {
      const response = await fetch('/api/get-last-serial');
      const data = await response.json();
      const lastSerial = data.lastSerialNumber || '000';
      setPreviousSerialNo(lastSerial);

      if (!initial?.id && !initial?.quotationNumber) {
        const nextSerial = String(Number(lastSerial || 0) + 1).padStart(3, '0');
        setQSerial(nextSerial);
      }
    } catch (error) {
      console.error('Error fetching last serial:', error);
      setPreviousSerialNo('000');
      if (!initial?.id && !initial?.quotationNumber) {
        setQSerial('000');
      }
    }
  };

  // Load masters (Lead Sources & Groups)
  const loadMasters = async () => {
    try {
      const sourceData = await sourceHook.getAll();
      const groupData = await groupHook.getAll();
      setLeadSources(sourceData);
      setLeadGroups(groupData);
    } catch (error) {
      console.error("Failed to load masters:", error);
    }
  };

  useEffect(() => {
    fetchLastSerialNumber();
    loadMasters();
  }, []);

  useEffect(() => {
    if (initial?.quotationNumber) {
      const qParts = parseQuotationParts(initial.quotationNumber, initial.leadOrganisationName, initial.inquiryDate);
      setQPrefix(qParts.prefix);
      setQSerial(qParts.serial);
      setQYear(qParts.year);
      setIsManualQuotation(true);
    } else if (!initial?.id) {
      setIsManualQuotation(false);
    }
  }, [initial?.quotationNumber, initial?.id]);

  // Auto-generate quotation number
  useEffect(() => {
    if (isManualQuotation) return;
    const parts = [qPrefix, form.leadRefQuotation, qYear, qSerial].filter(Boolean).join('/');
    const finalQ = form.quotationRevision ? `${parts}/${form.quotationRevision}` : parts;
    setForm(f => {
      if (f.quotationNumber !== finalQ) {
        return { ...f, quotationNumber: finalQ };
      }
      return f;
    });
  }, [qPrefix, form.leadRefQuotation, qYear, qSerial, form.quotationRevision, isManualQuotation]);

  // Prefix from company name
  useEffect(() => {
    if (form.leadOrganisationName && !initial?.quotationNumber && !isManualQuotation) {
      const initials = form.leadOrganisationName.split(/\s+/).map(w => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      setQPrefix();
    }
  }, [form.leadOrganisationName, initial?.quotationNumber, isManualQuotation]);

  // Year from inquiry date
  useEffect(() => {
    if (form.inquiryDate) {
      setQYear(getFinancialYear(form.inquiryDate));
    }
  }, [form.inquiryDate]);

  // Load team members for admin
  useEffect(() => {
    async function load() {
      try {
        const members = await getAll();
        console.log('Team Members:', members);
        setTeamMembers(Array.isArray(members) ? members : []);
      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, []);
  // Sync form when initial changes
  useEffect(() => {
    setForm(populate(initial));
  }, [initial]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleEnquiryTypeChange(val) {
    setForm((f) => ({
      ...f,
      enquiryType: val,
      enquiryStatus: val === "Qualified" ? "Working" : "",
      leadOutcomeStatus: val === "Qualified" ? "Open" : "",
    }));
  }

  function handleSubmit(e) {
    e?.preventDefault();

    // Convert quotationAmount to base currency (INR) before submitting
    const baseQuotationAmount = form.quotationAmount != null && form.quotationAmount !== ''
      ? convertToBase(form.quotationAmount, form.leadCountry)
      : undefined;

    onSubmit?.({
      ...form,
      noOfEmployee: form.noOfEmployee ? Number(form.noOfEmployee) : undefined,
      quotationAmount: baseQuotationAmount,
    });
  }


  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-gray-300 transition-colors';
  const selectCls = 'w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-700 transition-colors appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem_1.25rem] bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M7%209l3%203%203-3%27%20stroke%3D%27%239ca3af%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E")]';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';

  return (
    <form id="lead-form" onSubmit={handleSubmit} className="space-y-6">
      {/* SECTION 1: Basic Information */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
            <Icon name="mdi:account-outline" className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-sm font-bold text-slate-800">Section 1: Basic Information</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Company Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Icon
                name="mdi:domain"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={form.leadOrganisationName}
                onChange={(e) => set('leadOrganisationName', e.target.value)}
                placeholder="Enter Company Name"
                required
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Contact Phone</label>
            <div className="relative">
              <Icon name="mdi:phone-outline" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              {/* <input type="tel" value={form.leadMobileNo} onChange={(e) => set('leadMobileNo', e.target.value)} placeholder="Phone/Mobile Number" className={`${inputCls} pl-9`} /> */}
              <input
                type="tel"
                value={form.leadMobileNo}
                onChange={(e) =>
                  set("leadMobileNo", e.target.value.replace(/\D/g, ""))
                }
                placeholder="Phone/Mobile Number"
                maxLength={10}
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Contact Email</label>
            <div className="relative">
              <Icon name="mdi:email-outline" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="email" value={form.leadEmail} onChange={(e) => set('leadEmail', e.target.value)} placeholder="email@example.com" className={`${inputCls} pl-9`} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Company Contact Person Name</label>
            {/* <input type="text" value={form.companyContactPersonName} onChange={(e) => set('companyContactPersonName', e.target.value)} placeholder="Contact Person Name" className={inputCls} /> */}
            <input
              type="text"
              value={form.companyContactPersonName}
              onChange={(e) =>
                set(
                  "companyContactPersonName",
                  e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 30)
                )
              }
              placeholder="Contact Person Name"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Enquiry Date</label>
            <input type="date" value={form.inquiryDate} onChange={(e) => set('inquiryDate', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Team Members</label>
            <select
              value={form.leadRef}
              onChange={(e) => set('leadRef', e.target.value)}
              className={inputCls}
            >
              <option value="">Select Team Member</option>

              {teamMembers.map((member) => (
                <option
                  key={member.teamMemberId || member.userid || member.id}
                  value={member.teamMemberName}
                >
                  {member.teamMemberName}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Source */}
          <div>
            <label className={labelCls}>Lead Source</label>
            <select
              className={selectCls}
              value={form.leadSource || ""}
              onChange={(e) => set('leadSource', e.target.value)}
            >
              <option value="">Select Source</option>
              {leadSources.map((item) => (
                <option key={item.id} value={item.sourceName}>
                  {item.sourceName}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Group */}
          <div>
            <label className={labelCls}>Lead Group</label>
            <select
              className={selectCls}
              value={form.leadGroup || ""}
              onChange={(e) => set('leadGroup', e.target.value)}
            >
              <option value="">Select Group</option>
              {leadGroups.map((item) => (
                <option key={item.id} value={item.groupName}>
                  {item.groupName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Lead Status</label>
            <select
              value={form.leadOutcomeStatus}
              onChange={(e) => set('leadOutcomeStatus', e.target.value)}
              className={selectCls}
              required
            >
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Won">Won</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Country</label>

            <select
              value={countryCode}
              onChange={(e) => {
                const code = e.target.value;
                setCountryCode(code);
                setStateCode("");
                set("leadCountry", code ? Country.getCountryByCode(code)?.name : "");
                set("leadState", "");
                set("leadCity", "");
              }}
              className={inputCls}
            >
              <option value="">Select Country</option>

              {Country.getAllCountries().map((country) => (
                <option key={country.isoCode} value={country.isoCode}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>State</label>

            <select
              value={stateCode}
              onChange={(e) => {
                const code = e.target.value;
                setStateCode(code);
                set("leadState", code ? State.getStateByCodeAndCountry(code, countryCode)?.name : "");
                set("leadCity", "");
              }}
              className={inputCls}
              disabled={!countryCode}
            >
              <option value="">Select State</option>

              {State.getStatesOfCountry(countryCode).map((state) => (
                <option key={state.isoCode} value={state.isoCode}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>City</label>

            <select
              value={form.leadCity}
              onChange={(e) => set("leadCity", e.target.value)}
              className={inputCls}
              disabled={!stateCode}
            >
              <option value="">Select City</option>

              {City.getCitiesOfState(countryCode, stateCode).map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Address</label>
            <textarea
              value={form.leadAddress}
              onChange={(e) => set('leadAddress', e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Enquiry Details */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
            <Icon name="mdi:help-circle-outline" className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-sm font-bold text-slate-800">Section 2: Enquiry Details</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Enquiry Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.enquiryDescription}
              onChange={(e) => set('enquiryDescription', e.target.value)}
              rows={3}
              required
              placeholder="Describe the enquiry/requirements..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Enquiry Type</label>
            <select
              value={form.enquiryType}
              className={selectCls}
            // disabled
            >
              <option value="Qualified">Qualified</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 3: Quotation Details (Only if Enquiry Type is Qualified) */}
      {(
        initial?.leadId) && (
          <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 pb-2 border-b border-emerald-100/50">
              <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                <Icon name="mdi:file-document-outline" className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-emerald-800">Section 3: Quotation Details</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Quotation Status</label>
                <select
                  value={form.enquiryStatus || ''}
                  onChange={(e) => set('enquiryStatus', e.target.value)}
                  className={selectCls}
                >
                  <option value="Pending">Pending</option>
                  <option value="Working">Working</option>
                  <option value="Sent">Sent</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Quotation Revision</label>
                <select
                  value={form.quotationRevision || ''}
                  onChange={(e) => {
                    const newRevision = e.target.value;
                    set('quotationRevision', newRevision);

                    // Auto-update quotation number with the selected revision
                    const parts = [qPrefix, form.leadRefQuotation, qYear, qSerial].filter(Boolean).join('/');
                    const finalQ = newRevision ? `${parts}/${newRevision}` : parts;
                    set('quotationNumber', finalQ);
                  }}
                  className={selectCls}
                >
                  <option value="">R0</option>
                  <option value="R1">R1</option>
                  <option value="R2">R2</option>
                  <option value="R3">R3</option>
                  <option value="R4">R4</option>
                  <option value="R5">R5</option>
                  <option value="R6">R6</option>
                  <option value="R7">R7</option>
                  <option value="R8">R8</option>
                  <option value="R9">R9</option>
                  <option value="R10">R10</option>
                </select>
              </div>

              <div className="sm:col-span-2 bg-slate-50/80 p-3 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  {isManualQuotation && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualQuotation(false);
                        const parts = [qPrefix, form.leadRefQuotation, qYear, qSerial].filter(Boolean).join('/');
                        const finalQ = form.quotationRevision ? `${parts}/${form.quotationRevision}` : parts;
                        set('quotationNumber', finalQ);
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Reset to Auto-Generated Format
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium">
                      Prefix
                    </label>
                    <select
                      value={qPrefix}
                      onChange={(e) => {
                        setQPrefix(e.target.value);
                        setIsManualQuotation(false);
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                    >
                      <option value="">Select Prefix</option>
                      <option value="UWS">UWS</option>
                      <option value="UETPL">UETPL</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-medium">SP for Quotation</label>
                    <input
                      type="text"
                      value={form.leadRefQuotation}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 5);
                        set("leadRefQuotation", value);
                        setIsManualQuotation(false);
                      }}
                      placeholder="e.g. RRW"
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-medium">FY Year</label>
                    <input
                      type="text"
                      value={qYear}
                      onChange={(e) => {
                        setQYear(e.target.value);
                        setIsManualQuotation(false);
                      }}
                      placeholder="e.g. 26-27"
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-medium">Serial No.</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={qSerial}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ""); // Allow only digits
                          setQSerial(value);
                          setIsManualQuotation(false);
                        }}
                        placeholder="e.g. 001"
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                      />
                    </div>
                    {previousSerialNo && previousSerialNo !== '000' && (
                      <div className="mt-1.5 pt-1 border-t border-gray-100">
                        <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                          <span>📋</span>
                          <span>Previous Serial: <strong className="font-mono">{previousSerialNo}</strong></span>
                          {!initial?.quotationNumber && (
                            <>
                              <span className="text-gray-400">→</span>
                              <span>Next: <strong className="font-mono">{String(Number(previousSerialNo) + 1).padStart(3, '0')}</strong></span>
                            </>
                          )}
                        </div>
                        {initial?.quotationNumber && qSerial && qSerial !== previousSerialNo && (
                          <div className="text-[10px] text-blue-600 font-medium mt-1">
                            Current lead serial: <strong className="font-mono">{qSerial}</strong> (from existing lead)
                          </div>
                        )}
                      </div>
                    )}
                    {(!previousSerialNo || previousSerialNo === '000') && !initial?.quotationNumber && (
                      <div className="mt-1 text-[9px] text-gray-400">
                        {firstQuotation?.quotationNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Quotation Number</label>
                <input
                  type="text"
                  value={form.quotationNumber}
                  onChange={(e) => {
                    set('quotationNumber', e.target.value);
                    setIsManualQuotation(true);
                  }}
                  placeholder="e.g. UWS/RRW/26-27/001"
                  className={inputCls}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  {isManualQuotation ? "⚠️ Edited manually. Click reset link above to lock back to the format helper." : "ℹ️ Live formatted from the generation helper."}
                </p>
              </div>

              <div>
                <label className={labelCls}>Quotation Working Date</label>
                <input
                  type="date"
                  value={form.quotationDate}
                  onChange={(e) => set('quotationDate', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Quotation Amount ({currencyConfig.symbol} - {currencyConfig.code})</label>
                <input
                  type="number"
                  min="0"
                  value={form.quotationAmount}
                  onChange={(e) => set('quotationAmount', e.target.value)}
                  placeholder={`Amount in ${currencyConfig.code}`}
                  className={inputCls}
                />
              </div>



              <div className="sm:col-span-2">
                <label className={labelCls}>Follow Up Remark</label>
                <textarea
                  value={form.followUpRemark}
                  onChange={(e) => set('followUpRemark', e.target.value)}
                  rows={3}
                  placeholder="Add follow-up notes/remarks..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>
        )}
    </form>
  );
}