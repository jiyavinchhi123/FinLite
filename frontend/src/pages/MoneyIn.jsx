import React, { useEffect, useState } from "react";
import { addMoneyIn, fetchCustomers, fetchIncome } from "../services/api";

const PAYMENT_MODES = ["Cash", "Bank", "UPI"];

const MoneyIn = () => {
  let companyId = null;
  try {
    companyId = JSON.parse(localStorage.getItem("sbfm_company") || "{}").id || null;
  } catch {}
  const [paidNow, setPaidNow] = useState("yes");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({
    customerId: "",
    mobile: "",
    address: "",
    amount: "",
    paymentMode: "Cash",
  });
  const [quick, setQuick] = useState({
    receivedFrom: "",
    amount: "",
    paymentMode: "Cash",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "customerId") {
      const selected = customers.find((c) => c.id === value);
      setForm((prev) => ({
        ...prev,
        customerId: value,
        mobile: selected?.mobile || "",
        address: selected?.address || "",
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickChange = (e) => {
    const { name, value } = e.target;
    setQuick((prev) => ({ ...prev, [name]: value }));
  };

  const submitFull = async (e) => {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      const selected = customers.find((c) => c.id === form.customerId);
      await addMoneyIn({
        companyId,
        customerId: form.customerId || null,
        customerName: selected?.name || "",
        mobile: form.mobile,
        address: form.address,
        amount: Number(form.amount || 0),
        paidNow: paidNow === "yes",
        paymentMode: paidNow === "yes" ? form.paymentMode : null,
        pending: paidNow === "no",
      });
      setStatus("Money In saved.");
      setForm({
        customerId: "",
        mobile: "",
        address: "",
        amount: "",
        paymentMode: "Cash",
      });
      refreshTransactions();
    } catch (err) {
      setStatus(err.message || "Could not save");
    } finally {
      setLoading(false);
    }
  };

  const submitQuick = async (e) => {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      await addMoneyIn({
        companyId,
        customerName: quick.receivedFrom,
        receivedFrom: quick.receivedFrom,
        amount: Number(quick.amount || 0),
        paymentMode: quick.paymentMode,
        quickEntry: true,
      });
      setStatus("Quick entry saved.");
      setQuick({ receivedFrom: "", amount: "", paymentMode: "Cash" });
      refreshTransactions();
    } catch (err) {
      setStatus(err.message || "Could not save");
    } finally {
      setLoading(false);
    }
  };

  const refreshTransactions = () => {
    fetchIncome(companyId)
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setTransactions([]));
  };

  useEffect(() => {
    fetchCustomers(companyId)
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]));
    refreshTransactions();
  }, [companyId]);

  return (
    <div className="page money-in-page">
      <div className="split-grid">
        <form className="form card" onSubmit={submitFull}>
          <h3>Customer Details</h3>
          <label htmlFor="customerId">Customer Name</label>
          <select
            id="customerId"
            name="customerId"
            value={form.customerId}
            onChange={handleChange}
          >
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label htmlFor="mobile">Mobile Number</label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            placeholder="Mobile number"
            value={form.mobile}
            onChange={handleChange}
            readOnly
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="customer@email.com"
            value={
              customers.find((c) => c.id === form.customerId)?.email || ""
            }
            readOnly
          />

          <label htmlFor="address">Address</label>
          <input
            id="address"
            name="address"
            type="text"
            placeholder="City, State"
            value={form.address}
            onChange={handleChange}
            readOnly
          />

          <h3>Payment</h3>
          <label>Paid Now?</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="paidNow"
                value="yes"
                checked={paidNow === "yes"}
                onChange={() => setPaidNow("yes")}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="paidNow"
                value="no"
                checked={paidNow === "no"}
                onChange={() => setPaidNow("no")}
              />
              No
            </label>
          </div>

          {paidNow === "yes" ? (
            <>
              <label htmlFor="paymentMode">Payment Mode</label>
              <select
                id="paymentMode"
                name="paymentMode"
                value={form.paymentMode}
                onChange={handleChange}
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="pending-note">Marked as pending payment.</div>
          )}

          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            name="amount"
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={handleChange}
          />

          {status && <div className="form-status">{status}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Money In"}
          </button>
        </form>

        <form className="form card money-in-quick-form" onSubmit={submitQuick}>
          <h3>Money In (without bill)</h3>
          <label htmlFor="receivedFrom">Received From</label>
          <input
            id="receivedFrom"
            name="receivedFrom"
            type="text"
            placeholder="Customer or source"
            value={quick.receivedFrom}
            onChange={handleQuickChange}
          />

          <label htmlFor="quickAmount">Amount</label>
          <input
            id="quickAmount"
            name="amount"
            type="number"
            placeholder="0.00"
            value={quick.amount}
            onChange={handleQuickChange}
          />

          <label htmlFor="quickPaymentMode">Payment Mode</label>
          <select
            id="quickPaymentMode"
            name="paymentMode"
            value={quick.paymentMode}
            onChange={handleQuickChange}
          >
            {PAYMENT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>

          {status && <div className="form-status">{status}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Quick Save"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Money In Transactions</h3>
        <div className="table money-in-table">
          <div className="table-row table-head">
            <div>Date</div>
            <div>Customer</div>
            <div>Amount</div>
            <div>Mode</div>
            <div>Status</div>
          </div>
          {transactions.length === 0 && (
            <div className="table-row">
              <div className="muted">No transactions yet.</div>
            </div>
          )}
          {transactions.map((t, idx) => (
            <div key={t.id || idx} className="table-row">
              <div>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-"}</div>
              <div>{t.receivedFrom || t.customerName || "Quick Entry"}</div>
              <div>₹{Number(t.amount || 0).toLocaleString()}</div>
              <div>{t.paymentMode || "-"}</div>
              <div>
                <span className={`money-status ${t.pending ? "pending" : "paid"}`}>
                  {t.pending ? "Pending" : "Paid"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MoneyIn;
