import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../Icon'
import { LEAD_SOURCES, INDUSTRIES, COUNTRIES, LEAD_GROUPS } from '../../utils/constants'
import { useTeamMember } from '../../hooks/useTeamMember'
import { useTeam } from '../../hooks/useTeam'
import { useCreateTeam } from '../../hooks/useCreateTeam'
import { useRole } from '../../hooks/useRole'
import { useAuthStore } from '../../stores/auth'
import { useLeadSource, useLeadGroup, useLeadStatus, useQuotationStatus } from "/src/hooks/useMaster";
import { getMemberId, getTeamId, getTeamLabel, groupMembersByTeam } from '../../utils/teamRelations'

import { getCurrencyConfig, convertToBase, convertFromBase } from '../../utils/currency'
import { Country, State, City } from "country-state-city";
import { useLead } from '../../hooks/useLead'
import { useOrganization } from '../../hooks/useOrganization'
import { useNegotiation } from '../../hooks/useNegotiation'
import { cleanFileName } from '../../utils/format'

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
  leadAssignedTeam: '',
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
  assignedMemberIds: [],
}

function populate(data) {
  if (!data) return { ...EMPTY }
  const initialMemberIds = Array.isArray(data.assignedMemberIds) && data.assignedMemberIds.length > 0
    ? data.assignedMemberIds
    : (data.leadAssignedMember ? [Number(data.leadAssignedMember)] : []);

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
    leadAssignedTeam: data.leadAssignedTeam ?? '',
    leadAssignedMember: data.leadAssignedMember ?? '',
    assignedMemberIds: initialMemberIds,
    inquiryDate: data.inquiryDate ?? '',
    enquiryDescription: data.enquiryDescription ?? '',
    enquiryType: data.enquiryType ?? 'Qualified',
    companyContactPersonName: data.companyContactPersonName ?? '',
    quotationNumber: data.quotationNumber ?? '',
    quotationDate: (data.quotationDate || data.quotationWorkingDate) ? String(data.quotationDate || data.quotationWorkingDate).split("T")[0] : '',
    quotationWorkingDate: (data.quotationWorkingDate || data.quotationDate) ? String(data.quotationWorkingDate || data.quotationDate).split("T")[0] : '',
    quotationSentDate: (data.quotationSentDate || data.sentQuotationDate || data.QuotationSentDate) ? String(data.quotationSentDate || data.sentQuotationDate || data.QuotationSentDate).split("T")[0] : '',
    sentQuotationDate: (data.sentQuotationDate || data.quotationSentDate || data.QuotationSentDate) ? String(data.sentQuotationDate || data.quotationSentDate || data.QuotationSentDate).split("T")[0] : '',
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

// Generates Indian FY options: 3 years back → current → 2 years ahead
function getFYYearOptions(anchorDateStr) {
  const anchor = anchorDateStr ? new Date(anchorDateStr) : new Date();
  const safeAnchor = isNaN(anchor.getTime()) ? new Date() : anchor;
  const month = safeAnchor.getMonth();
  const year = safeAnchor.getFullYear();
  const currentFYStart = month >= 3 ? year : year - 1;
  const options = [];
  for (let offset = -3; offset <= 2; offset++) {
    const start = currentFYStart + offset;
    const end = start + 1;
    options.push(`${String(start).slice(-2)}-${String(end).slice(-2)}`);
  }
  return options;
}

function parseQuotationParts(qNum, inquiryDateVal) {
  const parts = {
    prefix: 'UWS',
    ref: '',
    year: getFinancialYear(inquiryDateVal),
    serial: '',
    revision: '',
  };

  if (!qNum) return parts;

  const rawTokens = qNum.replace(/\s+/g, '/').split('/').filter(Boolean);
  if (rawTokens.length === 0) return parts;

  let tokens = [...rawTokens];

  // Extract revision at the end (e.g. R0, R1, R2...)
  if (tokens.length > 1 && /^R\d+$/i.test(tokens[tokens.length - 1])) {
    parts.revision = tokens.pop().toUpperCase();
  }

  if (tokens.length === 0) return parts;

  if (tokens[0].toUpperCase() === 'UETPL') {
    parts.prefix = 'UETPL';
  } else {
    parts.prefix = 'UWS';
  }

  const yearIdx = tokens.findIndex(t => t.includes('-') && /\d/.test(t));
  if (yearIdx === 1) {
    parts.year = tokens[1];
    parts.serial = tokens[2] || '';
  } else if (yearIdx === 2) {
    parts.ref = tokens[1];
    parts.year = tokens[2];
    parts.serial = tokens[3] || '';
  } else if (tokens.length >= 2) {
    parts.serial = tokens[tokens.length - 1];
  }

  return parts;
}

export default function LeadForm({ initial, loading, onSubmit, quotation, onUploadFiles }) {
  const leadApi = useLead();
  const orgApi = useOrganization();
  const { update } = leadApi;

  const sourceHook = useLeadSource();
  const groupHook = useLeadGroup();
  const statusHook = useLeadStatus();
  const quotationHook = useQuotationStatus();
  const { getAll } = useTeamMember();
  const teamHook = useTeam();
  const createTeamHook = useCreateTeam();
  const roleHook = useRole();
  const isAdmin = useAuthStore(s => s.isAdmin());
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  const [leadSources, setLeadSources] = useState([]);
  const [leadGroups, setLeadGroups] = useState([]);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [quotationStatuses, setQuotationStatuses] = useState([]);
  const [roles, setRoles] = useState([]);

  const [form, setForm] = useState(() => populate(initial));
  const [qPrefix, setQPrefix] = useState('UWS');
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

  // Existing Companies / Lead Names autocomplete state
  const [existingCompanies, setExistingCompanies] = useState([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const currencyConfig = getCurrencyConfig(form.leadCountry);

  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewModalDoc, setPreviewModalDoc] = useState(null);

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
    name: cleanFileName(path),
    uploadedAt: initial.leadCreatedDate || new Date().toISOString(),
    size: "Unknown"
  })) : [];

  // Revision & Document Sync Logic (Same as Negotiation Edit)
  const negotiationApi = useNegotiation();
  const [revisions, setRevisions] = useState([]);
  const [replaceMode, setReplaceMode] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');

  useEffect(() => {
    if (initial?.leadId) {
      loadRevisions();
    }
  }, [initial?.leadId]);

  const loadRevisions = async () => {
    if (!initial?.leadId) return;
    try {
      const data = await negotiationApi.getRevisionsByLeadId(initial.leadId);
      setRevisions(data || []);
    } catch (err) {
      console.error("Failed to load lead revisions:", err);
    }
  };

  const selectedRevCode = (form.quotationRevision || "R0").toUpperCase();
  const matchingRevision = (revisions || []).find(r => (r.revisionNo || "R0").toUpperCase() === selectedRevCode);

  let currentRevDocs = [];
  if (matchingRevision && matchingRevision.documents && matchingRevision.documents.length > 0) {
    currentRevDocs = [matchingRevision.documents[matchingRevision.documents.length - 1]];
  } else if (selectedRevCode === "R0" && initial) {
    const leadDocs = [
      initial.uploadDocument,
      initial.uploadDocument1,
      initial.uploadDocument2,
      initial.uploadDocument3
    ].filter(Boolean);
    if (leadDocs.length > 0) {
      const url = leadDocs[leadDocs.length - 1];
      let name = url.substring(url.lastIndexOf('/') + 1);
      if (name.includes('_')) {
        name = name.substring(name.indexOf('_') + 1);
      }
      currentRevDocs = [{
        id: `doc-r0-lead`,
        fileName: name,
        fileUrl: url,
        quotationNo: form.quotationNumber
      }];
    }
  }

  const hasExistingDocs = currentRevDocs.length > 0 && !replaceMode;

  const handleRevisionChange = (e) => {
    const selectedVal = e.target.value;
    const revCode = (selectedVal || "R0").toUpperCase();
    setReplaceMode(false);

    setForm((prev) => {
      const updated = { ...prev, quotationRevision: selectedVal };
      const baseQuotNo = (prev.quotationNumber || "").replace(/\/R\d+$/i, "");

      const matchingRev = (revisions || []).find(r =>
        (r.revisionNo || r.quotationRevision || "R0").toUpperCase() === revCode
      );

      if (revCode === "R0") {
        updated.quotationNumber = baseQuotNo;
      } else {
        updated.quotationNumber = `${baseQuotNo}/${revCode}`;
      }

      if (matchingRev) {
        if (matchingRev.quotationAmount != null && Number(matchingRev.quotationAmount) > 0) {
          updated.quotationAmount = matchingRev.quotationAmount;
        }
        if (matchingRev.remarks) {
          updated.followUpRemark = matchingRev.remarks;
        }
        if (matchingRev.enquiryDescription) {
          updated.enquiryDescription = matchingRev.enquiryDescription;
        }
        if (matchingRev.quotationDate || matchingRev.quotationWorkingDate) {
          const qd = matchingRev.quotationDate || matchingRev.quotationWorkingDate;
          updated.quotationDate = String(qd).split("T")[0];
          updated.quotationWorkingDate = String(qd).split("T")[0];
        }
        const revSentDate = matchingRev.quotationSentDate || matchingRev.sentQuotationDate;
        if (revSentDate) {
          const formattedSent = String(revSentDate).split("T")[0];
          updated.quotationSentDate = formattedSent;
          updated.sentQuotationDate = formattedSent;
        } else if (revCode === "R0" && (initial?.quotationSentDate || initial?.sentQuotationDate)) {
          const r0Sent = initial?.quotationSentDate || initial?.sentQuotationDate;
          updated.quotationSentDate = String(r0Sent).split("T")[0];
          updated.sentQuotationDate = String(r0Sent).split("T")[0];
        } else {
          updated.quotationSentDate = "";
          updated.sentQuotationDate = "";
        }
      } else {
        if (revCode === "R0") {
          updated.quotationNumber = baseQuotNo;
          const r0Sent = initial?.quotationSentDate || initial?.sentQuotationDate;
          if (r0Sent) {
            updated.quotationSentDate = String(r0Sent).split("T")[0];
            updated.sentQuotationDate = String(r0Sent).split("T")[0];
          } else {
            updated.quotationSentDate = "";
            updated.sentQuotationDate = "";
          }
          const r0Working = initial?.quotationDate || initial?.quotationWorkingDate;
          if (r0Working) {
            updated.quotationDate = String(r0Working).split("T")[0];
            updated.quotationWorkingDate = String(r0Working).split("T")[0];
          }
        } else {
          updated.quotationNumber = `${baseQuotNo}/${revCode}`;
          updated.quotationSentDate = "";
          updated.sentQuotationDate = "";
        }
      }
      return updated;
    });
  };

  const handleDeleteRevisionDocument = async (docIdOrQuotNo) => {
    if (!window.confirm(`Delete or replace document for ${selectedRevCode}?`)) return;
    try {
      const docId = typeof docIdOrQuotNo === 'object' ? docIdOrQuotNo?.id : docIdOrQuotNo;
      if (docId && (typeof docId === 'number' || /^\d+$/.test(String(docId)))) {
        try {
          await negotiationApi.deleteDocumentById(Number(docId));
        } catch (e) {
          console.warn("deleteDocumentById warning:", e);
        }
      }

      const baseQuot = (form.quotationNumber || initial?.quotationNumber || "").replace(/\/R\d+$/i, "");
      const targetQuotNo = selectedRevCode === "R0" ? baseQuot : `${baseQuot}/${selectedRevCode}`;
      if (targetQuotNo) {
        try {
          await negotiationApi.deleteDocumentsByQuotationNo(targetQuotNo, initial?.leadId);
        } catch (e) {
          console.warn("deleteDocumentsByQuotationNo warning:", e);
        }
      }

      if (selectedRevCode === "R0" && initial?.leadId) {
        try {
          await leadApi.update(initial.leadId, {
            ...initial,
            uploadDocument: null,
            uploadDocument1: null,
            uploadDocument2: null,
            uploadDocument3: null
          });
        } catch (e) {
          console.warn("Could not clear lead doc fields:", e);
        }
      }

      setReplaceMode(true);
      setRevisions(prev => (prev || []).map(r => {
        if ((r.revisionNo || r.quotationRevision || "R0").toUpperCase() === selectedRevCode) {
          return { ...r, documents: [] };
        }
        return r;
      }));
      await loadRevisions();
      window.dispatchEvent(new CustomEvent("crm-data-updated"));
    } catch (err) {
      console.error("Failed to delete revision document:", err);
      setReplaceMode(true);
    }
  };

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
  // Filter companies based on leadOrganisationName search term
  const filteredCompanies = useMemo(() => {
    const term = (form.leadOrganisationName || '').trim().toLowerCase();
    if (!term) return existingCompanies;
    return existingCompanies.filter(c =>
      c.name.toLowerCase().includes(term)
    );
  }, [existingCompanies, form.leadOrganisationName]);

  // Load existing companies from leads and organizations
  const loadExistingCompanies = async () => {
    try {
      const [leadsRes, orgsRes] = await Promise.all([
        leadApi.getAll().catch(() => []),
        orgApi.getAll().catch(() => []),
      ]);

      const leadsList = Array.isArray(leadsRes) ? leadsRes : (leadsRes?.data || []);
      const orgsList = Array.isArray(orgsRes) ? orgsRes : (orgsRes?.data || []);

      const companyMap = new Map();

      // Extract unique company names from existing leads
      leadsList.forEach(lead => {
        const name = (lead.leadOrganisationName || lead.organisationName || lead.companyName || '').trim();
        if (name && !companyMap.has(name.toLowerCase())) {
          const contactPerson = lead.companyContactPersonName ||
            ([lead.leadFirstName, lead.leadLastName].filter(Boolean).join(' ')) || '';
          companyMap.set(name.toLowerCase(), {
            name: name,
            source: 'Lead',
            details: {
              companyContactPersonName: contactPerson,
              leadMobileNo: lead.leadMobileNo || lead.leadPhoneNo || '',
              leadEmail: lead.leadEmail || '',
              leadCountry: lead.leadCountry || '',
              leadState: lead.leadState || '',
              leadCity: lead.leadCity || '',
              leadAddress: lead.leadAddress || '',
              leadSource: lead.leadSource || '',
              leadGroup: lead.leadGroup || '',
            }
          });
        }
      });

      // Extract unique company names from organizations master
      orgsList.forEach(org => {
        const name = (org.organizationName || org.orgName || '').trim();
        if (name && !companyMap.has(name.toLowerCase())) {
          companyMap.set(name.toLowerCase(), {
            name: name,
            source: 'Organization',
            details: {
              companyContactPersonName: '',
              leadMobileNo: org.organizationMoblieNo || '',
              leadEmail: org.organizationEmail || '',
              leadCountry: org.organizationCountry || '',
              leadState: org.organizationState || '',
              leadCity: org.organizationCity || '',
              leadAddress: org.organizationAddress || '',
            }
          });
        }
      });

      setExistingCompanies(Array.from(companyMap.values()));
    } catch (error) {
      console.error("Failed to load existing companies:", error);
    }
  };

  const handleCompanySelect = (company) => {
    const selectedName = typeof company === 'string' ? company : company.name;

    if (typeof company === 'object' && company?.details) {
      const d = company.details;
      setForm(prev => ({
        ...prev,
        leadOrganisationName: selectedName,
        companyContactPersonName: prev.companyContactPersonName || d.companyContactPersonName || '',
        leadMobileNo: prev.leadMobileNo || d.leadMobileNo || '',
        leadEmail: prev.leadEmail || d.leadEmail || '',
        leadCountry: prev.leadCountry || d.leadCountry || '',
        leadState: prev.leadState || d.leadState || '',
        leadCity: prev.leadCity || d.leadCity || '',
        leadAddress: prev.leadAddress || d.leadAddress || '',
        leadSource: d.leadSource || prev.leadSource,
        leadGroup: d.leadGroup || prev.leadGroup,
      }));

      if (d.leadSource) {
        setSourceSearchTerm(d.leadSource);
      }
      if (d.leadGroup) {
        setGroupSearchTerm(d.leadGroup);
      }
      if (d.leadCountry) {
        const country = Country.getAllCountries().find(c => c.name === d.leadCountry);
        if (country) {
          setCountryCode(country.isoCode);
          setCountrySearchTerm(d.leadCountry);
        }
      }
      if (d.leadState) {
        setStateSearchTerm(d.leadState);
      }
      if (d.leadCity) {
        setCitySearchTerm(d.leadCity);
      }
    } else {
      set('leadOrganisationName', selectedName);
    }
    setShowCompanyDropdown(false);
  };

  // Load masters (Lead Sources, Groups, Statuses, Quotation Statuses)
  const loadMasters = async () => {
    try {
      const sourceData = await sourceHook.getAll();
      const groupData = await groupHook.getAll();
      const statusData = await statusHook.getAll();
      const quotationData = await quotationHook.getAll();
      setLeadSources(sourceData);
      setLeadGroups(groupData);
      setLeadStatuses(statusData);
      setQuotationStatuses(quotationData);
    } catch (error) {
      console.error("Failed to load masters:", error);
    }
  };


  useEffect(() => {
    fetchLastSerialNumber();
    loadMasters();
    loadExistingCompanies();
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
      const qParts = parseQuotationParts(initial.quotationNumber, initial.inquiryDate);
      if (qParts.prefix) setQPrefix(qParts.prefix);
      if (qParts.serial) setQSerial(qParts.serial);
      if (qParts.year) setQYear(qParts.year);
      setIsManualQuotation(true);
    } else if (!initial?.id) {
      setIsManualQuotation(false);
    }
  }, [initial?.quotationNumber, initial?.id]);

  // Auto-generate quotation number from helper fields only if lead already has a quotation number being edited or explicit manual override
  useEffect(() => {
    if (isManualQuotation) return;
    if (!initial?.id && !initial?.quotationNumber) return;
    const parts = [qPrefix || 'UWS', form.leadRefQuotation, qYear || getFinancialYear(form.inquiryDate), qSerial].filter(Boolean).join('/');
    const finalQ = form.quotationRevision ? `${parts}/${form.quotationRevision}` : parts;
    setForm(f => {
      if (f.quotationNumber !== finalQ) {
        return { ...f, quotationNumber: finalQ };
      }
      return f;
    });
  }, [qPrefix, form.leadRefQuotation, qYear, qSerial, form.quotationRevision, isManualQuotation, form.inquiryDate, initial?.id, initial?.quotationNumber]);

  // Default Prefix from company name
  useEffect(() => {
    if (form.leadOrganisationName && !initial?.quotationNumber && !isManualQuotation && !qPrefix) {
      const initials = form.leadOrganisationName.split(/\s+/).map(w => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      setQPrefix(initials || 'UWS');
    }
  }, [form.leadOrganisationName, initial?.quotationNumber, isManualQuotation, qPrefix]);

  // Year from inquiry date
  useEffect(() => {
    if (form.inquiryDate && !isManualQuotation) {
      setQYear(getFinancialYear(form.inquiryDate));
    }
  }, [form.inquiryDate, isManualQuotation]);

  // Load team members, teams, assignments, and roles for team-wise display
  useEffect(() => {
    async function load() {
      try {
        const [membersRes, teamsRes, assignRes, rolesRes] = await Promise.all([
          getAll().catch(() => []),
          teamHook.getAll().catch(() => []),
          createTeamHook.getAll().catch(() => []),
          roleHook.getAll().catch(() => []),
        ]);
        const membersList = Array.isArray(membersRes) ? membersRes : Array.isArray(membersRes?.data) ? membersRes.data : [];
        const teamsList = Array.isArray(teamsRes) ? teamsRes : Array.isArray(teamsRes?.data) ? teamsRes.data : [];
        const assignList = Array.isArray(assignRes) ? assignRes : Array.isArray(assignRes?.data) ? assignRes.data : [];
        const rolesList = Array.isArray(rolesRes) ? rolesRes : Array.isArray(rolesRes?.data) ? rolesRes.data : [];
        setTeamMembers(membersList);
        setTeams(teamsList);
        setAssignments(assignList);
        setRoles(rolesList);
      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, []);

  const rolesMap = useMemo(() => {
    const map = {};
    (roles || []).forEach((r) => {
      const id = String(r.roleId || r.id);
      map[id] = r.roleName || r.name;
    });
    return map;
  }, [roles]);

  const groupedData = useMemo(() => {
    return groupMembersByTeam(teams, teamMembers, assignments);
  }, [teams, teamMembers, assignments]);

  // Sync form when initial changes
  useEffect(() => {
    setForm(populate(initial));
    if (initial?.leadAssignedTeam) {
      setSelectedTeamFilter(String(initial.leadAssignedTeam));
    }
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

    const finalAssignedMemberIds = Array.from(new Set([
      ...(form.assignedMemberIds || []),
      ...(form.leadAssignedMember ? [Number(form.leadAssignedMember)] : [])
    ])).filter(Boolean);

    onSubmit?.({
      ...form,
      assignedMemberIds: finalAssignedMemberIds,
      noOfEmployee: form.noOfEmployee ? Number(form.noOfEmployee) : undefined,
      quotationAmount: baseQuotationAmount,
      quotationWorkingDate: form.quotationDate || form.quotationWorkingDate || undefined,
      quotationDate: form.quotationDate || form.quotationWorkingDate || undefined,
      quotationSentDate: form.quotationSentDate || form.sentQuotationDate || undefined,
      sentQuotationDate: form.quotationSentDate || form.sentQuotationDate || undefined,
    });
  }


  // Handle file upload (Single document per revision)
  async function uploadFiles(files) {
    if (!files?.length) return;
    const file = files[0];
    const isImg = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);

    const preview = [{
      file,
      name: cleanFileName(file.name),
      size: file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(2) + " MB" : (file.size / 1024).toFixed(1) + " KB",
      type: file.type,
      isImage: isImg,
      previewUrl: isImg ? URL.createObjectURL(file) : null,
    }];
    setPendingFiles(preview);

    const baseQuot = (form.quotationNumber || initial?.quotationNumber || "").replace(/\/R\d+$/i, "");
    const targetQuotNo = selectedRevCode === "R0" ? baseQuot : `${baseQuot}/${selectedRevCode}`;

    try {
      setUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 15, 90));
      }, 150);

      if (targetQuotNo) {
        await negotiationApi.uploadQuotationDocuments(targetQuotNo, [file], initial?.leadId);
      } else if (initial?.leadId) {
        await update(initial.leadId, { ...initial }, { uploadDocument: file });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setReplaceMode(false);
      setPendingFiles([]);
      await loadRevisions();
      window.dispatchEvent(new CustomEvent('crm-data-updated'));

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
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
  const formatRoleLabel = (role) => {
    if (!role) return 'Member';
    const rStr = String(role).trim();
    if (rolesMap[rStr]) return rolesMap[rStr];
    if (isNaN(Number(rStr))) return role;
    return 'Member';
  };

  return (
    <form
      id="lead-form"
      onSubmit={handleSubmit}
      autoComplete="off"
      data-lpignore="true"
      data-form-type="other"
      className="space-y-6"
    >
      {/* SECTION 1: Basic Information */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
            <Icon name="mdi:account-outline" className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-sm font-bold text-slate-800">Section 1: Basic Information</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="sm:col-span-2 relative">
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
                onChange={(e) => {
                  set('leadOrganisationName', e.target.value);
                  setShowCompanyDropdown(true);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowCompanyDropdown(false), 200);
                }}
                placeholder="Enter or search Company Name..."
                required
                autoComplete="off"
                data-lpignore="true"
                className={`${inputCls} pl-9`}
              />
              {showCompanyDropdown && filteredCompanies.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCompanies.map((company, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0 flex items-center justify-between"
                      onMouseDown={() => handleCompanySelect(company)}
                    >
                      <div>
                        <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <Icon name="mdi:office-building" className="w-4 h-4 text-blue-500" />
                          {company.name}
                        </div>
                        {(company.details?.companyContactPersonName || company.details?.leadMobileNo || company.details?.leadCity) && (
                          <div className="text-xs text-gray-400 mt-0.5 pl-5">
                            {[
                              company.details?.companyContactPersonName,
                              company.details?.leadMobileNo,
                              company.details?.leadCity
                            ].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                        Existing Company
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {form.leadOrganisationName?.trim() && (
              <div className="text-[11px] mt-1 flex items-center justify-between">
                <span>
                  {existingCompanies.some(c => (c.name || '').trim().toLowerCase() === form.leadOrganisationName.trim().toLowerCase()) ? (
                    <span className="text-blue-600 font-medium flex items-center gap-1">
                      <Icon name="mdi:check-circle-outline" className="w-3.5 h-3.5 inline" /> Existing company selected
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <Icon name="mdi:plus-circle-outline" className="w-3.5 h-3.5 inline" /> New company will be created on "Create Lead"
                    </span>
                  )}
                </span>
              </div>
            )}
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
                autoComplete="off"
                data-lpignore="true"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Contact Email</label>
            <div className="relative">
              <Icon name="mdi:email-outline" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="email"
                value={form.leadEmail}
                onChange={(e) => set('leadEmail', e.target.value)}
                placeholder="email@example.com"
                autoComplete="off"
                data-lpignore="true"
                className={`${inputCls} pl-9`}
              />
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
              autoComplete="off"
              data-lpignore="true"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Enquiry Date</label>
            <input type="date" value={form.inquiryDate} onChange={(e) => set('inquiryDate', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Assigned Team</label>
            <select
              value={form.leadAssignedTeam || selectedTeamFilter || ""}
              onChange={(e) => {
                const val = e.target.value;
                const teamId = val ? Number(val) : '';
                setSelectedTeamFilter(val);

                // Auto-revalidate assigned members when team changes
                setForm(prev => {
                  if (!teamId) {
                    return { ...prev, leadAssignedTeam: '' };
                  }
                  const teamGroup = (groupedData?.groupedTeams || []).find(
                    g => String(getTeamId(g.team)) === String(teamId)
                  );
                  const validTeamMemberIds = (teamGroup?.members || []).map(m => Number(getMemberId(m)));
                  
                  const filteredAssignedIds = (prev.assignedMemberIds || []).filter(id => validTeamMemberIds.includes(Number(id)));
                  const isCurrentPrimaryValid = validTeamMemberIds.includes(Number(prev.leadAssignedMember));
                  const newPrimaryId = isCurrentPrimaryValid ? prev.leadAssignedMember : (filteredAssignedIds[0] || '');
                  const newPrimaryObj = (teamMembers || []).find(m => Number(getMemberId(m)) === Number(newPrimaryId));

                  return {
                    ...prev,
                    leadAssignedTeam: teamId,
                    leadAssignedMember: newPrimaryId,
                    leadRef: newPrimaryObj?.teamMemberName || '',
                    assignedMemberIds: filteredAssignedIds.length > 0 ? filteredAssignedIds : (newPrimaryId ? [newPrimaryId] : []),
                  };
                });
              }}
              className={inputCls}
            >
              <option value="">Select Team</option>
              {(teams || []).map((t) => (
                <option key={getTeamId(t)} value={getTeamId(t)}>
                  📁 {getTeamLabel(t)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Primary Assigned Member</label>
            <select
              value={form.leadAssignedMember || ""}
              onChange={(e) => {
                const selectedMemberId = e.target.value;
                if (!selectedMemberId) {
                  setForm(prev => ({
                    ...prev,
                    leadRef: '',
                    leadAssignedMember: '',
                    assignedMemberIds: (prev.assignedMemberIds || []).filter(id => id !== prev.leadAssignedMember),
                  }));
                  return;
                }
                const matchedMember = (teamMembers || []).find(m => String(getMemberId(m)) === String(selectedMemberId));
                const memberName = matchedMember?.teamMemberName || '';
                const memberTeamId = matchedMember?.teamIdFk || selectedTeamFilter || form.leadAssignedTeam || '';
                const numId = Number(selectedMemberId);

                setForm(prev => {
                  const currentIds = prev.assignedMemberIds || [];
                  const newIds = currentIds.includes(numId) ? currentIds : [numId, ...currentIds.filter(id => id !== prev.leadAssignedMember)];
                  return {
                    ...prev,
                    leadRef: memberName,
                    leadAssignedMember: numId,
                    leadAssignedTeam: memberTeamId ? Number(memberTeamId) : prev.leadAssignedTeam,
                    assignedMemberIds: newIds,
                  };
                });
                if (memberTeamId && !selectedTeamFilter) {
                  setSelectedTeamFilter(String(memberTeamId));
                }
              }}
              className={inputCls}
            >
              <option value="">Select Primary Member</option>
              {selectedTeamFilter ? (
                <>
                  <optgroup label={`🎯 ${getTeamLabel((teams || []).find(t => String(getTeamId(t)) === String(selectedTeamFilter)))} Members`}>
                    {((groupedData?.groupedTeams || []).find(
                      (g) => String(getTeamId(g.team)) === String(selectedTeamFilter)
                    )?.members || [])
                      .filter(m => !m.isDeleted && m.isDeleted !== 1)
                      .map((m) => (
                        <option key={getMemberId(m)} value={getMemberId(m)}>
                          {m.teamMemberName} ({formatRoleLabel(m.teamMemberRole)})
                        </option>
                      ))}
                  </optgroup>
                </>
              ) : (
                <>
                  {(groupedData?.groupedTeams || []).map(({ team, members }) => (
                    <optgroup key={getTeamId(team)} label={`📁 ${getTeamLabel(team)}`}>
                      {(members || [])
                        .filter(m => !m.isDeleted && m.isDeleted !== 1)
                        .map((member) => (
                          <option key={getMemberId(member)} value={getMemberId(member)}>
                            {member.teamMemberName} ({formatRoleLabel(member.teamMemberRole)})
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </>
              )}
            </select>

            {/* Joint / Secondary Assigned Members Multi-Select */}
            <div className="mt-2.5">
              <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                <Icon name="mdi:account-multiple-outline" className="w-3.5 h-3.5 text-blue-600" />
                Joint / Secondary Members (Multi-Member Assignment)
              </label>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(form.assignedMemberIds || []).map(mid => {
                  const tm = (teamMembers || []).find(m => Number(getMemberId(m)) === Number(mid));
                  const isPrimary = Number(mid) === Number(form.leadAssignedMember);
                  if (!tm && !mid) return null;
                  const name = tm?.teamMemberName || `Member #${mid}`;
                  return (
                    <span 
                      key={mid} 
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        isPrimary 
                          ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300' 
                          : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      }`}
                    >
                      {isPrimary ? '⭐ ' : '🤝 '}
                      {name}
                      {isPrimary ? (
                        <span className="text-[10px] uppercase font-bold text-blue-600 ml-0.5">(Primary)</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => {
                              const remaining = (prev.assignedMemberIds || []).filter(id => Number(id) !== Number(mid));
                              const isPrimaryBeingRemoved = Number(mid) === Number(prev.leadAssignedMember);
                              const newPrimary = isPrimaryBeingRemoved ? (remaining[0] || '') : prev.leadAssignedMember;
                              const newPrimaryObj = (teamMembers || []).find(m => Number(getMemberId(m)) === Number(newPrimary));
                              return {
                                ...prev,
                                assignedMemberIds: remaining,
                                leadAssignedMember: newPrimary,
                                leadRef: newPrimaryObj?.teamMemberName || prev.leadRef,
                              };
                            });
                          }}
                          className="hover:text-red-600 font-bold ml-1"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>

              <select
                value=""
                onChange={(e) => {
                  const addId = Number(e.target.value);
                  if (addId && !(form.assignedMemberIds || []).includes(addId)) {
                    setForm(prev => ({
                      ...prev,
                      assignedMemberIds: [...(prev.assignedMemberIds || []), addId],
                    }));
                  }
                }}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:bg-white focus:ring-1 focus:ring-blue-500"
              >
                <option value="">+ Add Joint Team Member...</option>
                {((selectedTeamFilter 
                  ? ((groupedData?.groupedTeams || []).find(g => String(getTeamId(g.team)) === String(selectedTeamFilter))?.members || [])
                  : (teamMembers || [])
                ))
                  .filter(m => !m.isDeleted && m.isDeleted !== 1)
                  .filter(m => !(form.assignedMemberIds || []).includes(Number(getMemberId(m))))
                  .map(m => (
                    <option key={getMemberId(m)} value={getMemberId(m)}>
                      + {m.teamMemberName} ({formatRoleLabel(m.teamMemberRole)})
                    </option>
                  ))}
              </select>
            </div>
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
                  autoComplete="off"
                  data-lpignore="true"
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
                  autoComplete="off"
                  data-lpignore="true"
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
                <option value="" disabled>
                  Lead statuses could not be loaded
                </option>
              )}
            </select>
          </div>

          {/* Country - Searchable */}
          <div className="relative">
            <label className={labelCls}>Country</label>
            <div className="relative">
              <input
                type="text"
                name="crm_country_search_field"
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
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                aria-autocomplete="none"
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
                name="crm_state_search_field"
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
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                aria-autocomplete="none"
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
                name="crm_city_search_field"
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
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                aria-autocomplete="none"
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
              name="crm_full_address_field"
              value={form.leadAddress}
              onChange={(e) => set('leadAddress', e.target.value)}
              rows={3}
              autoComplete="new-password"
              data-lpignore="true"
              data-form-type="other"
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
              value={form.enquiryType || "Qualified"}
              onChange={(e) => handleEnquiryTypeChange(e.target.value)}
              className={selectCls}
            >
              <option value="Qualified">Qualified</option>
              <option value="Disqualified">Disqualified</option>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Quotation Status</label>
              <select
                value={form.enquiryStatus || ''}
                onChange={(e) => set('enquiryStatus', e.target.value)}
                className={selectCls}
              >
                <option value="">Select Quotation Status</option>
                {(quotationStatuses || []).map((qs) => (
                  <option key={qs.id || qs.statusName} value={qs.statusName}>
                    {qs.statusName}
                  </option>
                ))}
              </select>

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
              <label className={labelCls}>Quotation Revision</label>
              <select
                value={form.quotationRevision || ''}
                onChange={handleRevisionChange}
                className={selectCls}
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i} value={i === 0 ? '' : `R${i}`}>
                    Revision R{i}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-full bg-slate-50/80 p-3 rounded-lg border border-slate-200 space-y-3">
              {isManualQuotation && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualQuotation(false);
                      const parsed = parseQuotationParts(form.quotationNumber, form.inquiryDate);
                      const p = qPrefix || parsed.prefix || 'UWS';
                      const y = qYear || parsed.year || getFinancialYear(form.inquiryDate);
                      const s = qSerial || parsed.serial || '001';
                      const parts = [p, form.leadRefQuotation, y, s].filter(Boolean).join('/');
                      const finalQ = form.quotationRevision ? `${parts}/${form.quotationRevision}` : parts;
                      set('quotationNumber', finalQ);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline flex items-center gap-1"
                  >
                    <Icon name="mdi:refresh" className="w-3.5 h-3.5" />
                    Reset to Auto-Generated Format
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 font-medium">
                    Prefix
                  </label>
                  <select
                    value={qPrefix || 'UWS'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQPrefix(val);
                      setIsManualQuotation(false);
                      const parts = [val, form.leadRefQuotation, qYear || getFinancialYear(form.inquiryDate), qSerial].filter(Boolean).join('/');
                      const finalQ = form.quotationRevision ? `${parts}/${form.quotationRevision}` : parts;
                      set('quotationNumber', finalQ);
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white font-medium text-slate-800"
                  >
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
                  <select
                    value={qYear || getFinancialYear(form.inquiryDate)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQYear(val);
                      setIsManualQuotation(false);
                      const parts = [qPrefix || 'UWS', form.leadRefQuotation, val, qSerial].filter(Boolean).join('/');
                      const finalQ = form.quotationRevision ? `${parts}/${form.quotationRevision}` : parts;
                      set('quotationNumber', finalQ);
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white font-medium text-slate-800 cursor-pointer"
                  >
                    {getFYYearOptions(form.inquiryDate).map((fy) => (
                      <option key={fy} value={fy}>
                        {fy}{fy === getFinancialYear(form.inquiryDate) ? ' ✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-medium">Serial No.</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={qSerial || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setQSerial(value);
                        setIsManualQuotation(false);
                        const parts = [qPrefix || 'UWS', form.leadRefQuotation, qYear || getFinancialYear(form.inquiryDate), value].filter(Boolean).join('/');
                        const finalQ = form.quotationRevision ? `${parts}/${form.quotationRevision}` : parts;
                        set('quotationNumber', finalQ);
                      }}
                      placeholder="e.g. 225"
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white font-mono font-medium text-slate-800"
                    />
                  </div>
                  {/* ── Next Serial No. hint ── */}
                  {previousSerialNo && previousSerialNo !== '000' ? (
                    !initial?.quotationNumber ? (
                      // NEW lead — show the auto-assigned next serial prominently
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                          Next Serial No.: <strong className="font-mono tracking-wide">{String(Number(previousSerialNo) + 1).padStart(3, '0')}</strong>
                        </span>
                        <span className="text-[9px] text-gray-400">(last used: {previousSerialNo})</span>
                      </div>
                    ) : (
                      // EDIT lead — show the current lead's serial as context
                      qSerial && qSerial !== previousSerialNo ? (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                            This lead: <strong className="font-mono tracking-wide">{qSerial}</strong>
                          </span>
                          <span className="text-[9px] text-gray-400">(last issued: {previousSerialNo})</span>
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          <span className="text-[9px] text-gray-400">Last issued serial: <strong className="font-mono">{previousSerialNo}</strong></span>
                        </div>
                      )
                    )
                  ) : (
                    !initial?.quotationNumber && (
                      <div className="mt-1 text-[9px] text-gray-400">
                        {firstQuotation?.quotationNumber
                          ? <span>Last: <strong className="font-mono">{firstQuotation.quotationNumber}</strong></span>
                          : <span>Loading serial…</span>}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 md:col-span-1">
              <label className={labelCls}>Quotation Number</label>
              <input
                type="text"
                value={form.quotationNumber}
                onChange={(e) => {
                  const newVal = e.target.value;
                  set('quotationNumber', newVal);
                  setIsManualQuotation(true);

                  // 2-Way Dynamic Sync: parse input quotation number and update helper inputs above
                  const parsed = parseQuotationParts(newVal, form.leadOrganisationName, form.inquiryDate);
                  if (parsed.prefix) setQPrefix(parsed.prefix);
                  if (parsed.ref !== undefined) set("leadRefQuotation", parsed.ref);
                  if (parsed.year) setQYear(parsed.year);
                  if (parsed.serial) setQSerial(parsed.serial);
                  if (parsed.revision !== undefined) set('quotationRevision', parsed.revision);
                }}
                placeholder="e.g. UWS/26-27/225"
                className={`${inputCls} font-mono font-medium`}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                {isManualQuotation ? "⚠️ Edited manually." : "ℹ️ Live formatted from helper."}
              </p>
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
                name="quotationSentDate"
                value={(form.quotationSentDate || form.sentQuotationDate) ? String(form.quotationSentDate || form.sentQuotationDate).split("T")[0] : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  set('quotationSentDate', val);
                  set('sentQuotationDate', val);
                }}
                className={inputCls}
              />
            </div>

            {/* Dynamic Quotation File Card for Selected Revision Level (Exact match with Negotiation Edit) */}
            <div className="col-span-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-2 mb-2">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Icon name="mdi:file-document-outline" className="text-blue-500 text-lg" />
                  Quotation File for {selectedRevCode}
                </h3>
                {hasExistingDocs && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                    <Icon name="mdi:check-circle" className="text-green-600" /> Document Attached
                  </span>
                )}
              </div>
              <div className="p-6">
                {hasExistingDocs ? (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 font-medium">Existing attached documents for {selectedRevCode}:</p>
                    {currentRevDocs.map((doc) => (
                      <div key={doc.id || doc.fileName} className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Icon name="mdi:file-pdf-box" className="text-red-500 text-2xl flex-shrink-0" />
                          <span className="text-xs font-bold text-gray-800 truncate max-w-[280px] sm:max-w-[360px]" title={cleanFileName(doc.fileName)}>
                            {cleanFileName(doc.fileName)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => negotiationApi.handleViewDocument(doc.fileUrl || doc.fileName, doc.fileName)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1 transition"
                          >
                            <Icon name="mdi:eye" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => negotiationApi.handleDownloadRevisionDocument(doc.fileUrl || doc.fileName, doc.fileName)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1 transition"
                          >
                            <Icon name="mdi:download" /> Download
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRevisionDocument(doc.id || doc.quotationNo || selectedRevCode)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium flex items-center gap-1 transition"
                          >
                            <Icon name="mdi:delete" /> Delete / Replace
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {replaceMode && (
                      <div className="mb-3 flex items-center justify-between bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-800">
                        <span>Replacing file for <strong>{selectedRevCode}</strong>. Upload a new PDF below:</span>
                        <button type="button" onClick={() => setReplaceMode(false)} className="text-blue-600 underline font-semibold">Cancel Replace</button>
                      </div>
                    )}
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-gray-50/50 cursor-pointer"
                      onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer?.files); }}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => uploadInput.current?.click()}
                    >
                      <Icon name={uploading ? "mdi:loading" : "mdi:cloud-upload-outline"} className={`text-4xl text-gray-400 mx-auto mb-2 ${uploading ? "animate-spin" : ""}`} />
                      <p className="text-sm font-semibold text-gray-700 mb-1">Attach Revised Quotation PDF for {selectedRevCode}</p>
                      <p className="text-xs text-gray-500 mb-3">Drop revised PDF here or click to browse</p>
                      <button type="button" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm">
                        Choose PDF / File
                      </button>
                      <input ref={uploadInput} type="file" className="hidden" multiple onChange={(e) => uploadFiles(e.target.files)} />
                      {pendingFiles.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {pendingFiles.map((pf, idx) => (
                            <div key={idx} className="text-xs text-blue-700 font-bold bg-blue-50 p-2 rounded border border-blue-100 flex items-center justify-center gap-2">
                              <Icon name="mdi:file-document-check" className="text-base" /> Selected: {cleanFileName(pf.name)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-full">
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

      {/* Document Lightbox Preview Modal */}
      {previewModalDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in" onClick={() => setPreviewModalDoc(null)}>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name={previewModalDoc.isImage ? "mdi:image" : "mdi:file-document"} className="w-5 h-5 text-blue-400 shrink-0" />
                <h3 className="font-bold text-sm truncate">{previewModalDoc.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewModalDoc.url}
                  download={previewModalDoc.title}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <Icon name="mdi:download" className="w-4 h-4" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalDoc(null)}
                  className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <Icon name="mdi:close" className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-slate-950/90 flex items-center justify-center min-h-[400px]">
              {previewModalDoc.isImage ? (
                <img
                  src={previewModalDoc.url}
                  alt={previewModalDoc.title}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <iframe
                  src={previewModalDoc.url}
                  title={previewModalDoc.title}
                  className="w-full h-[75vh] rounded-lg border-0 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}