import React, { useEffect, useState } from "react";
import { getCompanyByOwner, updateCompany } from "../services/api";

const simpleFields = [
  { key: "openingCash", label: "Cash in hand" },
  { key: "openingBank", label: "Bank balance" },
  { key: "closingStocks", label: "Current stock value" },
  { key: "loanCredit", label: "Loan balance (if any)" },
];

const advancedFields = [
  { key: "freeholdLand", label: "Land value (if owned)" },
  { key: "landAndBuilding", label: "Building value (if owned)" },
  { key: "bankOverdraft", label: "Bank overdraft (if any)" },
  { key: "interestOnCapitalRate", label: "Interest on capital (%)" },
  { key: "incomeTaxRate", label: "Income tax rate (%)" },
];

const AssetsLiabilities = () => {
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ownerId = null;
    try {
      ownerId = JSON.parse(localStorage.getItem("sbfm_user") || "{}").id || null;
    } catch {}
    if (!ownerId) return;
    getCompanyByOwner(ownerId)
      .then((data) => {
        setCompany(data || null);
        const base = data || {};
        const overdraftValue =
          base.bankOverdraft === undefined ||
          base.bankOverdraft === null ||
          base.bankOverdraft === "" ||
          Number(base.bankOverdraft) === 0
            ? 100000
            : base.bankOverdraft;
        setForm({ ...base, bankOverdraft: overdraftValue });
      })
      .catch(() => {
        setCompany(null);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!company?.id) {
      setStatus("Create company first.");
      return;
    }
    setStatus("");
    setLoading(true);
    try {
      const payload = { ...company, ...form };
      const zeroFields = [
        "goodwill",
        "patents",
        "businessPremises",
        "plantAndMachinery",
        "furnitureAndFixtures",
        "looseTools",
        "loanDebit",
        "billsReceivable",
        "interestOnCapital",
        "drawings",
        "interestOnDrawings",
        "incomeTax",
        "reservesAndSurplus",
        "mortgage",
        "providentFund",
        "billsPayable",
      ];
      zeroFields.forEach((key) => {
        payload[key] = 0;
      });
      [...simpleFields, ...advancedFields].forEach((field) => {
        if (field.key === "interestOnDrawingsDate") return;
        payload[field.key] = Number(payload[field.key] || 0);
      });
      const updated = await updateCompany(company.id, payload);
      localStorage.setItem("sbfm_company", JSON.stringify(updated));
      setCompany(updated);
      setStatus("Saved successfully.");
    } catch (err) {
      setStatus(err.message || "Could not save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page business-details-page">
      <div className="business-details-hero">
        <div>
          <h2>Business Details</h2>
          <p className="muted">
            Enter your core values below. Optional advanced fields can be filled if needed.
          </p>
        </div>
        <span className="business-details-badge">SME Setup</span>
      </div>

      <form className="form card business-details-card" onSubmit={handleSubmit}>
        <section className="business-details-section">
          <h3>Core Inputs</h3>
          <div className="grid-two business-details-grid">
            {simpleFields.map((field) => (
              <div key={field.key} className="form-group">
                <label htmlFor={field.key}>{field.label}</label>
                <input
                  id={field.key}
                  name={field.key}
                  type={field.key === "interestOnDrawingsDate" ? "date" : "number"}
                  placeholder={field.key === "interestOnDrawingsDate" ? "" : "0"}
                  value={form[field.key] ?? ""}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="business-details-section business-details-advanced">
          <h3>Advanced Inputs (Optional)</h3>
          <div className="grid-two business-details-grid">
            {advancedFields.map((field) => (
              <div key={field.key} className="form-group">
                <label htmlFor={field.key}>{field.label}</label>
                <input
                  id={field.key}
                  name={field.key}
                  type={field.key === "interestOnDrawingsDate" ? "date" : "number"}
                  placeholder={field.key === "interestOnDrawingsDate" ? "" : "0"}
                  value={form[field.key] ?? ""}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="business-details-actions">
          {status && <div className="form-status">{status}</div>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Business Details"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetsLiabilities;
