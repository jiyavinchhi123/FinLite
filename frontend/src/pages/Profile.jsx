import React, { useState } from "react";
import { updateCompany } from "../services/api";
import { formatDateDisplay } from "../utils/date";

const Profile = () => {
  let user = {};
  let company = {};
  try {
    user = JSON.parse(localStorage.getItem("sbfm_user") || "{}");
    company = JSON.parse(localStorage.getItem("sbfm_company") || "{}");
  } catch {}

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: company.name || "",
    fiscalStart: company.fiscalStart
      ? new Date(company.fiscalStart).toISOString().slice(0, 10)
      : "",
    businessType: company.businessType || "",
  });

  const openEdit = () => {
    setEditForm({
      name: company.name || "",
      fiscalStart: company.fiscalStart
        ? new Date(company.fiscalStart).toISOString().slice(0, 10)
        : "",
      businessType: company.businessType || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const payload = {
        ...company,
        name: editForm.name,
        fiscalStart: editForm.fiscalStart || null,
        businessType: editForm.businessType,
      };
      const updated = await updateCompany(company.id, payload);
      localStorage.setItem("sbfm_company", JSON.stringify(updated));
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page profile-page">
      <div className="profile-card profile-card-wide">
        <div className="profile-hero">
          <div className="profile-avatar">
            {(user.name || "B")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="profile-hero-text">
            <h2>{user.name || "Business Owner"}</h2>
            <div className="profile-sub">{user.email || "-"}</div>
          </div>
          <div className="profile-hero-actions">
            {!editOpen && (
              <button className="btn" type="button" onClick={openEdit}>
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="profile-section">
          <h3>Company Details</h3>
          {!editOpen && (
            <div className="profile-details">
              <div className="profile-detail-row">
                <span className="label">Company Name</span>
                <span className="value">{company.name || "-"}</span>
              </div>
              <div className="profile-detail-row">
                <span className="label">Financial Year Start</span>
                  <span className="value">{formatDateDisplay(company.fiscalStart)}</span>
              </div>
              <div className="profile-detail-row">
                <span className="label">Business Type</span>
                <span className="value">{company.businessType || "-"}</span>
              </div>
            </div>
          )}

          {editOpen && (
            <div className="form-group profile-form">
              <label htmlFor="editCompanyName">Company Name</label>
              <input
                id="editCompanyName"
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              />
              <label htmlFor="editFiscalStart">Financial Year Start</label>
              <input
                id="editFiscalStart"
                type="date"
                value={editForm.fiscalStart}
                onChange={(e) => setEditForm((p) => ({ ...p, fiscalStart: e.target.value }))}
              />
              <label htmlFor="editBusinessType">Business Type</label>
              <select
                id="editBusinessType"
                value={editForm.businessType}
                onChange={(e) => setEditForm((p) => ({ ...p, businessType: e.target.value }))}
              >
                <option value="">Select type</option>
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Service">Service</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Other">Other</option>
              </select>
              <div className="action-row">
                <button className="btn" type="button" onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button className="btn ghost" type="button" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
