import { useState, useEffect, useRef, useMemo } from 'react'
import {useSearchParams} from 'react-router-dom'
import Icon from '../Icon'
import { LEAD_SOURCES, INDUSTRIES, COUNTRIES, LEAD_GROUPS } from '../../utils/constants'
import { useTeamMember } from '../../hooks/useTeamMember'
import { useTeam } from '../../hooks/useTeam'
import { useCreateTeam } from '../../hooks/useCreateTeam'
import { useAuthStore } from '../../stores/auth'
import { useLeadSource, useLeadGroup, useLeadStatus } from "/src/hooks/useMaster";
import { getMemberId, getTeamId, getTeamLabel, groupMembersByTeam } from '../../utils/teamRelations'
import { getCurrencyConfig, convertToBase, convertFromBase } from '../../utils/currency'
import { Country, State, City } from "country-state-city";
import { useLead } from '../../hooks/useLead'

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
  quotationSentDate: '',
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
    quotationSentDate: data.quotationSentDate ?? '',
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

export default function LeadForm({ initial, loading, onSubmit, quotation, onUploadFiles }) {
    const { update} = useLead();
  
  const sourceHook = useLeadSource();
  const groupHook = useLeadGroup();
  const statusHook = useLeadStatus();
  const { getAll } = useTeamMember();
  const teamHook = useTeam();
  const createTeamHook = useCreateTeam();
  const isAdmin = useAuthStore(s => s.isAdmin());
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  const [leadSources, setLeadSources] = useState([]);
  const [leadGroups, setLeadGroups] = useState([]);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [form, setForm] = useState(() => populate(initial));
  const [qPrefix, setQPrefix] = useState('');
  const [qSerial, setQSerial] = useState('');
  const [previousSerialNo, setPreviousSerialNo] = useState('');
  const [qYear, setQYear] = useState('');
  const [isManualQuotation, setIsManualQuotation] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // New state for typing functionality
  const [isNewSource, setIsNewSource] = useState(false);
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [newSourceValue, setNewSourceValue] = useState('');
  const [newGroupValue, setNewGroupValue] = useState('');
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  // Search states for Country, State, City
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [stateSearchTerm, setStateSearchTerm] = useState('');
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const currencyConfig = getCurrencyConfig(form.leadCountry);

  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");

  const uploadInput = useRef(null);

  const firstQuotation = quotation?.[0];

  // Get files from initial lead data
  const filesFromLead = initial ? [
    initial.uploadDocument,
    initial.uploadDocument1,
    initial.uploadDocument2,
    initial.uploadDocument3
  ].filter(Boolean).map((path, idx) => ({
    id: `${idx}-${path}`,
    path,
    name: path.split('/').pop() || `Document ${idx + 1}`,
    uploadedAt: initial.leadCreatedDate || new Date().toISOString(),
    size: "Unknown"
  })) : [];

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Filter sources and groups based on search term
  const filteredSources = leadSources.filter(source => 
    source.sourceName?.toLowerCase().includes(sourceSearchTerm.toLowerCase())
  );

  const filteredGroups = leadGroups.filter(group => 
    group.groupName?.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  // Get all countries
  const allCountries = Country.getAllCountries();
  const filteredCountries = allCountries.filter(country =>
    country.name.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );

  // Get states based on selected country
  const allStates = countryCode ? State.getStatesOfCountry(countryCode) : [];
  const filteredStates = allStates.filter(state =>
    state.name.toLowerCase().includes(stateSearchTerm.toLowerCase())
  );

  // Get cities based on selected state
  const allCities = (countryCode && stateCode) ? City.getCitiesOfState(countryCode, stateCode) : [];
  const filteredCities = allCities.filter(city =>
    city.name.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

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
const apiiii = import.meta.env.VITE_API_BASE
  // Load masters (Lead Sources & Groups)
  const loadMasters = async () => {
    try {
      const sourceData = await sourceHook.getAll();
      const groupData = await groupHook.getAll();
      const statusData = await statusHook.getAll();
      setLeadSources(sourceData);
      setLeadGroups(groupData);
      setLeadStatuses(statusData);
    } catch (error) {
      console.error("Failed to load masters:", error);
    }
  };

  useEffect(() => {
    fetchLastSerialNumber();
    loadMasters();
  }, []);

  // Sync country and state codes from initial data
  useEffect(() => {
    if (initial?.leadCountry) {
      const country = allCountries.find(c => c.name === initial.leadCountry);
      if (country) {
        setCountryCode(country.isoCode);
        setCountrySearchTerm(initial.leadCountry);
      }
    }
    if (initial?.leadState && countryCode) {
      const state = State.getStatesOfCountry(countryCode).find(s => s.name === initial.leadState);
      if (state) {
        setStateCode(state.isoCode);
        setStateSearchTerm(initial.leadState);
      }
    }
    if (initial?.leadCity) {
      setCitySearchTerm(initial.leadCity);
    }
  }, [initial, countryCode]);

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

  // Load team members, teams, and assignments for team-wise display
  useEffect(() => {
    async function load() {
      try {
        const [membersRes, teamsRes, assignRes] = await Promise.all([
          getAll().catch(() => []),
          teamHook.getAll().catch(() => []),
          createTeamHook.getAll().catch(() => []),
        ]);
        const membersList = Array.isArray(membersRes) ? membersRes : Array.isArray(membersRes?.data) ? membersRes.data : [];
        const teamsList = Array.isArray(teamsRes) ? teamsRes : Array.isArray(teamsRes?.data) ? teamsRes.data : [];
        const assignList = Array.isArray(assignRes) ? assignRes : Array.isArray(assignRes?.data) ? assignRes.data : [];
        setTeamMembers(membersList);
        setTeams(teamsList);
        setAssignments(assignList);
      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, []);

  const groupedData = useMemo(() => {
    return groupMembersByTeam(teams, teamMembers, assignments);
  }, [teams, teamMembers, assignments]);
  
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

  // Handle lead source selection or creation
  const handleSourceSelect = (sourceName) => {
    if (sourceName === 'add-new') {
      setIsNewSource(true);
      setShowSourceDropdown(false);
      setSourceSearchTerm('');
      return;
    }
    set('leadSource', sourceName);
    setSourceSearchTerm(sourceName);
    setShowSourceDropdown(false);
    setIsNewSource(false);
  };

  const handleCreateNewSource = async () => {
    if (newSourceValue.trim()) {
      try {
        await sourceHook.create({ sourceName: newSourceValue.trim() });
        await loadMasters(); // Refresh the list
        set('leadSource', newSourceValue.trim());
        setSourceSearchTerm(newSourceValue.trim());
        setIsNewSource(false);
        setNewSourceValue('');
        setShowSourceDropdown(false);
      } catch (error) {
        console.error("Failed to create new source:", error);
      }
    }
  };

  // Handle lead group selection or creation
  const handleGroupSelect = (groupName) => {
    if (groupName === 'add-new') {
      setIsNewGroup(true);
      setShowGroupDropdown(false);
      setGroupSearchTerm('');
      return;
    }
    set('leadGroup', groupName);
    setGroupSearchTerm(groupName);
    setShowGroupDropdown(false);
    setIsNewGroup(false);
  };

  const handleCreateNewGroup = async () => {
    if (newGroupValue.trim()) {
      try {
        await groupHook.create({ groupName: newGroupValue.trim() });
        await loadMasters(); // Refresh the list
        set('leadGroup', newGroupValue.trim());
        setGroupSearchTerm(newGroupValue.trim());
        setIsNewGroup(false);
        setNewGroupValue('');
        setShowGroupDropdown(false);
      } catch (error) {
        console.error("Failed to create new group:", error);
      }
    }
  };

  // Handle country selection
  const handleCountrySelect = (country) => {
    setCountryCode(country.isoCode);
    setCountrySearchTerm(country.name);
    set('leadCountry', country.name);
    setShowCountryDropdown(false);
    // Reset state and city when country changes
    setStateCode('');
    setStateSearchTerm('');
    set('leadState', '');
    setCitySearchTerm('');
    set('leadCity', '');
  };

  // Handle state selection
  const handleStateSelect = (state) => {
    setStateCode(state.isoCode);
    setStateSearchTerm(state.name);
    set('leadState', state.name);
    setShowStateDropdown(false);
    // Reset city when state changes
    setCitySearchTerm('');
    set('leadCity', '');
  };

  // Handle city selection
  const handleCitySelect = (city) => {
    setCitySearchTerm(city.name);
    set('leadCity', city.name);
    setShowCityDropdown(false);
  };

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

  // Handle file upload
async function uploadFiles(files) {
  console.log("ooooo",initial)
    if (!files?.length) return;
    const fileList = Array.from(files);
    // setSelectedFiles(fileList);
    const slots = ["uploadDocument", "uploadDocument1", "uploadDocument2", "uploadDocument3"];
    const fileMap = {};
    Array.from(files).slice(0, 4).forEach((file, index) => { fileMap[slots[index]] = file; });
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await update(initial.leadId, { ...initial }, fileMap);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // await loadAll();
      console.log("ggggggggFiles uploaded successfully");
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) { 
      console.error(error); 
      // showToastMsg("error", "Upload failed");
      setUploading(false);
      setUploadProgress(0);
    }
  }

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
    <input
      type="tel"
      value={form.leadMobileNo}
      onChange={(e) =>
        set("leadMobileNo", e.target.value.replace(/\D/g, ""))
      }
      placeholder="Phone/Mobile Number"
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
              {groupedData.groupedTeams.map(({ team, members }) => (
                <optgroup key={getTeamId(team)} label={`📁 ${getTeamLabel(team)}`}>
                  {members.map((member) => (
                    <option
                      key={getMemberId(member)}
                      value={member.teamMemberName}
                    >
                      {member.teamMemberName} ({member.teamMemberRole || 'Member'})
                    </option>
                  ))}
                </optgroup>
              ))}
              {groupedData.unassigned.length > 0 && (
                <optgroup label="👤 General / Unassigned Members">
                  {groupedData.unassigned.map((member) => (
                    <option
                      key={getMemberId(member)}
                      value={member.teamMemberName}
                    >
                      {member.teamMemberName} ({member.teamMemberRole || 'Member'})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Lead Source - Updated with typing functionality */}
          <div className="relative">
            <label className={labelCls}>Lead Source</label>
            {!isNewSource ? (
              <div className="relative">
                <input
                  type="text"
                  value={sourceSearchTerm}
                  onChange={(e) => {
                    setSourceSearchTerm(e.target.value);
                    setShowSourceDropdown(true);
                    if (!e.target.value) {
                      set('leadSource', '');
                    }
                  }}
                  onFocus={() => setShowSourceDropdown(true)}
                  onBlur={() => {
                    // Delay hiding to allow click on dropdown items
                    setTimeout(() => setShowSourceDropdown(false), 200);
                  }}
                  placeholder="Search or type new source..."
                  className={inputCls}
                />
                {showSourceDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredSources.length > 0 ? (
                      filteredSources.map((source) => (
                        <div
                          key={source.id}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          onMouseDown={() => handleSourceSelect(source.sourceName)}
                        >
                          {source.sourceName}
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No matching sources found
                        </div>
                        <div
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-blue-600 border-t border-gray-100"
                          onMouseDown={() => handleSourceSelect('add-new')}
                        >
                          <Icon name="mdi:plus" className="inline w-4 h-4 mr-1" />
                          Add new source: "{sourceSearchTerm}"
                        </div>
                      </>
                    )}
                    {filteredSources.length > 0 && (
                      <div
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-blue-600 border-t border-gray-100"
                        onMouseDown={() => handleSourceSelect('add-new')}
                      >
                        <Icon name="mdi:plus" className="inline w-4 h-4 mr-1" />
                        Add new source
                      </div>
                    )}
                  </div>
                )}
                {sourceSearchTerm && !showSourceDropdown && (
                  <div className="text-xs text-gray-400 mt-1">
                    Selected: {sourceSearchTerm}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSourceValue}
                  onChange={(e) => setNewSourceValue(e.target.value)}
                  placeholder="Enter new source name..."
                  className={inputCls}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateNewSource}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewSource(false);
                    setNewSourceValue('');
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Lead Group - Updated with typing functionality */}
          <div className="relative">
            <label className={labelCls}>Lead Group</label>
            {!isNewGroup ? (
              <div className="relative">
                <input
                  type="text"
                  value={groupSearchTerm}
                  onChange={(e) => {
                    setGroupSearchTerm(e.target.value);
                    setShowGroupDropdown(true);
                    if (!e.target.value) {
                      set('leadGroup', '');
                    }
                  }}
                  onFocus={() => setShowGroupDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowGroupDropdown(false), 200);
                  }}
                  placeholder="Search or type new group..."
                  className={inputCls}
                />
                {showGroupDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => (
                        <div
                          key={group.id}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          onMouseDown={() => handleGroupSelect(group.groupName)}
                        >
                          {group.groupName}
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No matching groups found
                        </div>
                        <div
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-blue-600 border-t border-gray-100"
                          onMouseDown={() => handleGroupSelect('add-new')}
                        >
                          <Icon name="mdi:plus" className="inline w-4 h-4 mr-1" />
                          Add new group: "{groupSearchTerm}"
                        </div>
                      </>
                    )}
                    {filteredGroups.length > 0 && (
                      <div
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-blue-600 border-t border-gray-100"
                        onMouseDown={() => handleGroupSelect('add-new')}
                      >
                        <Icon name="mdi:plus" className="inline w-4 h-4 mr-1" />
                        Add new group
                      </div>
                    )}
                  </div>
                )}
                {groupSearchTerm && !showGroupDropdown && (
                  <div className="text-xs text-gray-400 mt-1">
                    Selected: {groupSearchTerm}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupValue}
                  onChange={(e) => setNewGroupValue(e.target.value)}
                  placeholder="Enter new group name..."
                  className={inputCls}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateNewGroup}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewGroup(false);
                    setNewGroupValue('');
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Lead Status</label>
            <select
              value={form.leadOutcomeStatus}
              onChange={(e) => set('leadOutcomeStatus', e.target.value)}
              className={selectCls}
              required
            >
              {leadStatuses.length > 0 ? (
                leadStatuses.map((st) => (
                  <option key={st.id || st.statusName} value={st.statusName}>
                    {st.statusName}
                  </option>
                ))
              ) : (
                <>
                  <option value="Open">Open</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Closed">Closed</option>
                </>
              )}
            </select>
          </div>

          {/* Country - Searchable */}
          <div className="relative">
            <label className={labelCls}>Country</label>
            <div className="relative">
              <input
                type="text"
                value={countrySearchTerm}
                onChange={(e) => {
                  setCountrySearchTerm(e.target.value);
                  setShowCountryDropdown(true);
                  if (!e.target.value) {
                    set('leadCountry', '');
                    setCountryCode('');
                  }
                }}
                onFocus={() => setShowCountryDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowCountryDropdown(false), 200);
                }}
                placeholder="Search country..."
                className={inputCls}
              />
              {showCountryDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                      <div
                        key={country.isoCode}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        onMouseDown={() => handleCountrySelect(country)}
                      >
                        {country.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No countries found
                    </div>
                  )}
                </div>
              )}
              {countrySearchTerm && !showCountryDropdown && (
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {countrySearchTerm}
                </div>
              )}
            </div>
          </div>

          {/* State - Searchable */}
          <div className="relative">
            <label className={labelCls}>State</label>
            <div className="relative">
              <input
                type="text"
                value={stateSearchTerm}
                onChange={(e) => {
                  setStateSearchTerm(e.target.value);
                  setShowStateDropdown(true);
                  if (!e.target.value) {
                    set('leadState', '');
                    setStateCode('');
                  }
                }}
                onFocus={() => {
                  if (countryCode) setShowStateDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowStateDropdown(false), 200);
                }}
                placeholder={countryCode ? "Search state..." : "Select country first"}
                className={inputCls}
                disabled={!countryCode}
              />
              {showStateDropdown && countryCode && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredStates.length > 0 ? (
                    filteredStates.map((state) => (
                      <div
                        key={state.isoCode}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        onMouseDown={() => handleStateSelect(state)}
                      >
                        {state.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {stateSearchTerm ? 'No states found' : 'Type to search states'}
                    </div>
                  )}
                </div>
              )}
              {stateSearchTerm && !showStateDropdown && (
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {stateSearchTerm}
                </div>
              )}
            </div>
          </div>

          {/* City - Searchable */}
          <div className="relative">
            <label className={labelCls}>City</label>
            <div className="relative">
              <input
                type="text"
                value={citySearchTerm}
                onChange={(e) => {
                  setCitySearchTerm(e.target.value);
                  setShowCityDropdown(true);
                  if (!e.target.value) {
                    set('leadCity', '');
                  }
                }}
                onFocus={() => {
                  if (stateCode) setShowCityDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowCityDropdown(false), 200);
                }}
                placeholder={stateCode ? "Search city..." : "Select state first"}
                className={inputCls}
                disabled={!stateCode}
              />
              {showCityDropdown && stateCode && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city) => (
                      <div
                        key={city.name}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        onMouseDown={() => handleCitySelect(city)}
                      >
                        {city.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {citySearchTerm ? 'No cities found' : 'Type to search cities'}
                    </div>
                  )}
                </div>
              )}
              {citySearchTerm && !showCityDropdown && (
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {citySearchTerm}
                </div>
              )}
            </div>
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
            >
              <option value="Qualified">Qualified</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 3: Quotation Details (Only if Enquiry Type is Qualified) */}
      {initial?.leadId && (
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

                {/* <div>
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
                </div> */}

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
                        const value = e.target.value.replace(/\D/g, "");
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

            <div>
              <label className={labelCls}>Final Quotation Sent Date</label>
              <input
                type="date"
                value={form.quotationSentDate}
                onChange={(e) => set('quotationSentDate', e.target.value)}
                className={inputCls}
              />
            </div>

            {/* ─── DOCUMENTS SECTION ─── */}
            <div className="sm:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center">
                  <Icon name="mdi:file-multiple-outline" className="w-3.5 h-3.5 text-cyan-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">Documents</p>
              </div>

              {/* Upload zone */}
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/20 transition-all cursor-pointer"
                onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer?.files); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => uploadInput.current?.click()}
              >
                <Icon name={uploading ? "mdi:loading" : "mdi:cloud-upload-outline"} className={`h-10 w-10 text-gray-400 mx-auto mb-3 ${uploading ? "animate-spin" : ""}`} />
                <p className="text-sm font-medium text-gray-700">{uploading ? "Uploading..." : "Drag & drop files here"}</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse · PDF, Images, Documents (up to 4 files)</p>
                <button type="button" className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 shadow-sm">
                  <Icon name="mdi:plus" className="h-4 w-4" /> Choose Files
                </button>
                <input ref={uploadInput} type="file" className="hidden" multiple onChange={(e) => uploadFiles(e.target.files)} />
                {uploading && (
                  <div className="mt-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">{uploadProgress}% uploaded</p>
                  </div>
                )}
              </div>
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