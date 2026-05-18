import React, { useMemo, useState } from "react";
import { analyzeSmartEntry, addMoneyOut, addMoneyIn } from "../services/api";
import {
  addCustomCategory,
  findCategoryInText,
  getCategoryOptions,
} from "../utils/categoryStore";

const BASE_INCOME_CATEGORIES = [
  "Sales",
  "Loan Received",
  "Loan Recovery",
  "Property Loan Received",
  "Other",
];

const BASE_EXPENSE_CATEGORIES = [
  "Rent",
  "Salary",
  "Electricity",
  "Purchase",
  "Machinery",
  "Furniture",
  "Equipment",
  "Investments",
  "Loan Given",
  "Loan Repayment",
  "Property Loan Repayment",
  "Owner Withdrawals",
  "Other",
];

const SmartEntry = () => {
  let companyId = null;
  try {
    companyId = JSON.parse(localStorage.getItem("sbfm_company") || "{}").id || null;
  } catch {}

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [saving, setSaving] = useState(false);

  const incomeCategories = useMemo(
    () => getCategoryOptions(BASE_INCOME_CATEGORIES, companyId, "income"),
    [companyId, status]
  );
  const expenseCategories = useMemo(
    () => getCategoryOptions(BASE_EXPENSE_CATEGORIES, companyId, "expense"),
    [companyId, status]
  );

  const formatAmount = (amount, currency) => {
    if (!amount || Number(amount) === 0) return "Not found";
    return currency ? `${currency} ${amount}` : `${amount}`;
  };

  const extractTypedCategory = (rawText) => {
    const textValue = String(rawText || "").trim().toLowerCase();
    if (!textValue) return "";

    // Examples handled:
    // "received 50000 cat3 from hdfc bank"
    // "paid 40000 machinery by bank"
    // "received 6500 consulting pending"
    const match = textValue.match(
      /\b(?:received|paid)\s+\d+(?:[.,]\d+)?\s+(.+?)(?:\s+\bfrom\b|\s+\bto\b|\s+\bby\b|\s+\bin\b|\s+\bpending\b|$)/i
    );
    if (!match || !match[1]) return "";

    const candidate = match[1]
      .replace(/\s+/g, " ")
      .trim();

    // Ignore obvious non-category fragments
    const blocked = new Set(["for", "from", "to", "by", "in", "pending", "cash", "bank", "upi"]);
    if (!candidate || blocked.has(candidate)) return "";
    return candidate;
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setStatus("Please type something to analyze.");
      return;
    }
    setStatus("");
    setLoading(true);
    try {
      const result = await analyzeSmartEntry({ text });
      const entryType = result.entryType || result.entry_type || "expense";
      const suggestedCategory = result.expenseType || result.category || "Other";
      const library = entryType === "income" ? incomeCategories : expenseCategories;
      const typedCategory = extractTypedCategory(text);
      const textMatchedCategory = findCategoryInText(text, library);
      const resolvedCategory =
        typedCategory ||
        textMatchedCategory ||
        (suggestedCategory && suggestedCategory !== "Other" ? suggestedCategory : "Other");

      setExtracted({
        expenseType: resolvedCategory,
        amount: result.amount || 0,
        paymentMode: result.paymentMode || result.payment_mode || "",
        entryType,
        currency: result.currency || "",
        counterparty: result.counterparty || "",
        pending: result.pending === true || result.pending === "true",
      });
    } catch (err) {
      setStatus(err.message || "Could not analyze");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!extracted) return;
    setSaving(true);
    setStatus("");
    try {
      const resolvedCategory = String(extracted.expenseType || "Other").trim() || "Other";
      const targetType = extracted.entryType === "income" ? "income" : "expense";
      addCustomCategory(companyId, targetType, resolvedCategory);

      if (extracted.entryType === "income") {
        await addMoneyIn({
          companyId,
          customerName: extracted.counterparty || "Smart Entry",
          amount: Number(extracted.amount || 0),
          paymentMode: extracted.pending ? null : extracted.paymentMode || "Cash",
          pending: extracted.pending,
          category: resolvedCategory,
          notes: text,
          source: "smart-entry",
        });
      } else {
        await addMoneyOut({
          companyId,
          paidTo: extracted.counterparty || "Smart Entry",
          amount: Number(extracted.amount || 0),
          paymentMode: extracted.pending ? null : extracted.paymentMode || "Cash",
          category: resolvedCategory,
          note: text,
          pending: extracted.pending,
          source: "smart-entry",
        });
      }
      setStatus("Saved successfully.");
      setText("");
      setExtracted(null);
    } catch (err) {
      setStatus(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page smart-entry-page">
      <h2>Smart Entry</h2>
      <div className="card">
        <p>
          Type a short sentence in this format:
          <br />
          "paid 5000 rent in cash to FreshPack"
          <br />
          "received 6500 from Urban Minimart pending"
          <br />
          "paid 40000 for equipment by bank"
          <br />
          "received 50000 loan from HDFC bank"
        </p>
        <textarea
          placeholder="Describe the payment in plain words"
          rows="4"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn" type="button" onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {extracted && (
        <div className="card">
          <h3>Review & Confirm</h3>
          <div className="review-grid">
            <div>
              <span className="muted">Entry Type</span>
              <div>{extracted.entryType === "income" ? "Income" : "Expenses"}</div>
            </div>
            <div>
              <span className="muted">
                {extracted.entryType === "income" ? "Received From" : "Paid To"}
              </span>
              <div>{extracted.counterparty || "-"}</div>
            </div>
            <div>
              <span className="muted">Category</span>
              <input
                type="text"
                value={extracted.expenseType || ""}
                onChange={(e) =>
                  setExtracted((prev) => ({ ...prev, expenseType: e.target.value }))
                }
                placeholder="Enter category"
              />
            </div>
            <div>
              <span className="muted">Amount</span>
              <div>{formatAmount(extracted.amount, extracted.currency)}</div>
            </div>
            <div>
              <span className="muted">Payment Mode</span>
              <div>{extracted.pending ? "-" : extracted.paymentMode || "Cash"}</div>
            </div>
            <div>
              <span className="muted">Payment Status</span>
              <div>{extracted.pending ? "Pending" : "Paid"}</div>
            </div>
          </div>
          <button className="btn" type="button" onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving..." : "Confirm & Save"}
          </button>
        </div>
      )}

      {status && <div className="form-status">{status}</div>}
    </div>
  );
};

export default SmartEntry;
