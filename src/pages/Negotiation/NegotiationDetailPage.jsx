import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useNegotiation } from "../../hooks/useNegotiation";
import { useLead } from "../../hooks/useLead";

export default function NegotiationDetailPage() {
  const leadApi = useLead();

  const { id } = useParams();
  const navigate = useNavigate();
  const negotiationApi = useNegotiation();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState({});
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLead();
  }, [id]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const response = await negotiationApi.getDetails(id);
      console.log("Response:", response);
      console.log("Lead Data:", response.lead || response);

      setLead(response.lead || response);
      setEditedLead(response.lead || response);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load lead details");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedLead({ ...lead });
    setError("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedLead({ ...lead });
    setError("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedLead(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      setError("");
      await leadApi.update(lead.leadId, editedLead);
      await loadLead();
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating lead:", err);
      setError(err.message || "Failed to update lead. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="text-center">
          <Icon icon="mdi:alert-circle" className="text-6xl text-gray-400 mx-auto" />
          <h2 className="text-2xl font-bold mt-4 text-gray-700">Negotiation Not Found</h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="mdi:arrow-left" className="text-xl text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                {isEditing ? "Edit Lead" : "Lead Details"}
              </h1>
              {isEditing && (
                <p className="text-sm text-gray-500">
                  Updating: {lead.leadOrganisationName}
                </p>
              )}
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition shadow-sm"
            >
              <Icon icon="mdi:pencil" className="text-lg" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <ViewMode lead={lead} />
      </div>

      {/* Edit Form - Slide-in Panel */}
      {isEditing && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={handleCancelEdit}
          />

          {/* Slide Panel */}
          <div className="fixed top-0 right-0 h-screen w-full lg:w-[42%] bg-white shadow-2xl overflow-y-auto z-50 animate-slide-in">
            <EditForm
              lead={editedLead}
              onCancel={handleCancelEdit}
              onSave={handleSaveEdit}
              onChange={handleInputChange}
              updating={updating}
              error={error}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ============= VIEW MODE =============

const ViewMode = ({ lead }) => (
  <div className="grid lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-6">
      <InfoSection title="General Information" fields={getGeneralFields(lead)} />
      <InfoSection title="Quotation & Commercials" fields={getCommercialFields(lead)} />
      <InfoSection title="Inquiry Details & Source" fields={getSourceFields(lead)} />
    </div>

    <div className="space-y-5">
      <StatCard title="Quotation Value" value={formatCurrency(lead.quotationAmount)} icon="mdi:currency-inr" />
      <StatCard title="Revision" value={lead.quotationRevision || "R0"} icon="mdi:file-document-edit" />
      <StatCard title="Lead Status" value={lead.leadOutcomeStatus || "—"} icon="mdi:chart-timeline-variant" />
      <StatCard title="Lead Source" value={lead.leadSource || "—"} icon="mdi:source-branch" />
    </div>
  </div>
);

// ============= EDIT FORM =============

const EditForm = ({ lead, onCancel, onSave, onChange, updating, error }) => {
  return (
    <div className="h-full flex flex-col">
      {/* Form Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Edit Lead</h2>
            <p className="text-sm text-gray-500">Update the details to modify the lead</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Icon icon="mdi:close" className="text-xl text-gray-600" />
          </button>
        </div>
      </div>

      <form onSubmit={onSave} className="flex-1 overflow-y-auto p-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm flex items-center">
            <Icon icon="mdi:alert-circle" className="mr-2 text-red-500" />
            {error}
          </div>
        )}

        {/* Basic Information */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Icon icon="mdi:information-outline" className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Company Name"
                name="leadOrganisationName"
                value={lead.leadOrganisationName || ""}
                onChange={onChange}
                required
              />
              <FormField
                label="Company Contact Person Name"
                name="companyContactPersonName"
                value={lead.companyContactPersonName || ""}
                onChange={onChange}
              />
              <FormField
                label="Contact Phone"
                name="leadMobileNo"
                value={lead.leadMobileNo || ""}
                onChange={onChange}
                type="tel"
                placeholder="Phone/Mobile Number"
              />
              <FormField
                label="Contact Email"
                name="leadEmail"
                value={lead.leadEmail || ""}
                onChange={onChange}
                type="email"
                placeholder="email@example.com"
              />
              <FormField
                label="Enquiry Date"
                name="inquiryDate"
                value={
                  lead.inquiryDate
                    ? String(lead.inquiryDate).split("T")[0]
                    : ""
                }
                onChange={onChange}
                type="date"
              />
              <FormField
                label="Team Members"
                name="teamMembers"
                value={lead.teamMembers || ""}
                onChange={onChange}
                placeholder="Select Team Member"
              />
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Icon icon="mdi:tag-outline" className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Lead Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Lead Source"
                name="leadSource"
                value={lead.leadSource || ""}
                onChange={onChange}
                placeholder="Select Source"
              />
              <FormField
                label="Lead Group"
                name="leadGroup"
                value={lead.leadGroup || ""}
                onChange={onChange}
                placeholder="Select Group"
              />
              <FormField
                label="Lead Status"
                name="leadStatus"
                value={lead.leadStatus || ""}
                onChange={onChange}
                placeholder="Open"
              />
              <FormField
                label="Outcome Status"
                name="leadOutcomeStatus"
                value={lead.leadOutcomeStatus || ""}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        {/* Quotation Details */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Icon icon="mdi:file-document-outline" className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Quotation Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Quotation Amount"
                name="quotationAmount"
                value={lead.quotationAmount || ""}
                onChange={onChange}
                type="number"
                placeholder="0.00"
              />
              <FormField
                label="Quotation Number"
                name="quotationNumber"
                value={lead.quotationNumber || ""}
                onChange={onChange}
                placeholder="QTN-001"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quotation Revision
                </label>
                <select
                  name="quotationRevision"
                  value={lead.quotationRevision || "R0"}
                  onChange={onChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm bg-white"
                >
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={`R${i}`}>
                      {`R${i}`}
                    </option>
                  ))}
                </select>
              </div>
              <FormField
                label="Quotation Date"
                name="quotationDate"
                value={lead.quotationDate ? String(lead.quotationDate).split("T")[0] : ""}
                onChange={onChange}
                type="date"
              />
              <FormField
                label="Final Quotation Sent "
                name="quotationSentDate"
                value={
                  lead.quotationSentDate
                    ? String(lead.quotationSentDate).split("T")[0]
                    : ""
                }
                onChange={onChange}
                type="date"
              />
            </div>
          </div>
        </div>

        {/* Description & Remarks */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Icon icon="mdi:note-text-outline" className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Description & Remarks</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enquiry Description
                </label>
                <textarea
                  name="enquiryDescription"
                  value={lead.enquiryDescription || ""}
                  onChange={onChange}
                  rows="3"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  placeholder="Enter enquiry description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow Up Remarks
                </label>
                <textarea
                  name="followUpRemark"
                  value={lead.followUpRemark || ""}
                  onChange={onChange}
                  rows="2"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  placeholder="Enter follow up remarks..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={updating}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updating}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {updating ? (
              <>
                <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Icon icon="mdi:content-save-outline" className="w-4 h-4" />
                Update Lead
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const FormField = ({ label, name, value, onChange, type = "text", required = false, placeholder = "" }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value || ""}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm bg-white"
    />
  </div>
);

// ============= INFO SECTIONS =============

const InfoSection = ({ title, fields }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">
        {title}
      </h3>
    </div>
    <div className="grid md:grid-cols-2 gap-4 p-6">
      {fields.map((field, index) => (
        <InfoRow key={index} label={field.label} value={field.value} />
      ))}
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
  </div>
);

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all duration-200">
    <div className="flex justify-between items-start">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </p>
        <p className="text-lg font-bold mt-1 text-gray-800 truncate">
          {value}
        </p>
      </div>
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 ml-3">
        <Icon icon={icon} className="text-blue-600 text-xl" />
      </div>
    </div>
  </div>
);

// ============= HELPERS =============

const formatCurrency = (amount) => {
  if (!amount) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB");
};

const getGeneralFields = (lead) => [
  { label: "Company Name", value: lead.leadOrganisationName },
  { label: "Contact Person", value: lead.companyContactPersonName },
  { label: "Phone", value: lead.leadMobileNo },
  { label: "Email", value: lead.leadEmail },
  { label: "Country", value: lead.leadCountry },
  { label: "City", value: lead.leadCity },
  { label: "State", value: lead.leadState },
  { label: "Address", value: lead.leadAddress },
];

const getCommercialFields = (lead) => [
  { label: "Quotation Number", value: lead.quotationNumber },
  { label: "Quotation Amount", value: formatCurrency(lead.quotationAmount) },
  { label: "Quotation Revision", value: lead.quotationRevision || "R0" },
  { label: "Quotation Date", value: formatDate(lead.quotationDate) },
  { label: "Sent Date", value: formatDate(lead.quotationSentDate) },
];

const getSourceFields = (lead) => [
  { label: "Lead Source", value: lead.leadSource },
  { label: "Lead Status", value: lead.leadStatus },
  { label: "Lead Group", value: lead.leadGroup },
  { label: "Enquiry Status", value: lead.enquiryStatus },
  { label: "Outcome Status", value: lead.leadOutcomeStatus },
  { label: "Lead Rating", value: getStarRating(lead.leadRating) },
  { label: "Enquiry Description", value: lead.enquiryDescription },
  { label: "Follow Up Remarks", value: lead.followUpRemark },
];

const getStarRating = (rating) => {
  if (!rating) return "—";
  return "⭐".repeat(Math.min(rating, 5));
};