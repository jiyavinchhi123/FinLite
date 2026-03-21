import React, { useEffect, useState } from "react";
import { getCompanyByOwner, fetchIncome, fetchExpense } from "../services/api";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

const DownloadBalanceSheet = () => {
  const [company, setCompany] = useState({});
  const [income, setIncome] = useState([]);
  const [expense, setExpense] = useState([]);

  useEffect(() => {
    let ownerId = null;
    let companyId = null;
    try {
      const user = JSON.parse(localStorage.getItem("sbfm_user") || "{}");
      ownerId = user.id || null;
      companyId = JSON.parse(localStorage.getItem("sbfm_company") || "{}").id || null;
    } catch {}

    if (ownerId) {
      getCompanyByOwner(ownerId)
        .then((data) => setCompany(data || {}))
        .catch(() => setCompany({}));
    }

    fetchIncome(companyId)
      .then((data) => setIncome(Array.isArray(data) ? data : []))
      .catch(() => setIncome([]));
    fetchExpense(companyId)
      .then((data) => setExpense(Array.isArray(data) ? data : []))
      .catch(() => setExpense([]));
  }, []);

  const sumByMode = (entries, mode) =>
    entries
      .filter((e) => String(e.paymentMode || "").toLowerCase() === mode)
      .filter((e) => !e.pending)
      .reduce((s, e) => s + Number(e.amount || 0), 0);

  const openingCash = Number(company.openingCash || 0);
  const openingBank = Number(company.openingBank || 0);
  const cash = openingCash + sumByMode(income, "cash") - sumByMode(expense, "cash");
  const bank = openingBank + sumByMode(income, "bank") - sumByMode(expense, "bank");
  const upi = sumByMode(income, "upi") - sumByMode(expense, "upi");
  const wallet = sumByMode(income, "wallet") - sumByMode(expense, "wallet");
  const accountsReceivable = income.filter((t) => t.pending).reduce((s, t) => s + Number(t.amount || 0), 0);
  const accountsPayable = expense.filter((t) => t.pending).reduce((s, t) => s + Number(t.amount || 0), 0);

  const allIncome = income.reduce((s, t) => s + Number(t.amount || 0), 0);
  const allExpense = expense.reduce((s, t) => s + Number(t.amount || 0), 0);
  const retainedEarnings = allIncome - allExpense;

  const balanceSheet = {
    assets: {
      cash,
      bank,
      upi,
      wallet,
      inventory: 0,
      machinery: 0,
      building: 0,
      accountsReceivable,
    },
    liabilities: {
      loans: 0,
      creditors: accountsPayable,
      taxesPayable: 0,
    },
    equity: {
      ownerCapital: Number(company.ownerCapital || 0),
      retainedEarnings,
      profitLoss: retainedEarnings,
    },
  };

  const downloadBalanceSheetPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Balance Sheet", 14, 16);
    doc.setFontSize(10);
    doc.text(`Company: ${company.name || "Business"}`, 14, 24);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);

    const rows = [
      ["Assets", "Cash", `INR ${balanceSheet.assets.cash.toLocaleString()}`],
      ["Assets", "Bank", `INR ${balanceSheet.assets.bank.toLocaleString()}`],
      ["Assets", "UPI", `INR ${balanceSheet.assets.upi.toLocaleString()}`],
      ["Assets", "Wallet", `INR ${balanceSheet.assets.wallet.toLocaleString()}`],
      ["Assets", "Inventory", `INR ${balanceSheet.assets.inventory.toLocaleString()}`],
      ["Assets", "Machinery", `INR ${balanceSheet.assets.machinery.toLocaleString()}`],
      ["Assets", "Building", `INR ${balanceSheet.assets.building.toLocaleString()}`],
      ["Assets", "Accounts Receivable", `INR ${balanceSheet.assets.accountsReceivable.toLocaleString()}`],
      ["Liabilities", "Loans", `INR ${balanceSheet.liabilities.loans.toLocaleString()}`],
      ["Liabilities", "Creditors / Accounts Payable", `INR ${balanceSheet.liabilities.creditors.toLocaleString()}`],
      ["Liabilities", "Taxes Payable", `INR ${balanceSheet.liabilities.taxesPayable.toLocaleString()}`],
      ["Equity", "Owner's Capital", `INR ${balanceSheet.equity.ownerCapital.toLocaleString()}`],
      ["Equity", "Retained Earnings", `INR ${balanceSheet.equity.retainedEarnings.toLocaleString()}`],
      ["Equity", "Profit / Loss", `INR ${balanceSheet.equity.profitLoss.toLocaleString()}`],
    ];

    const startX = 14;
    let startY = 38;
    const colWidths = [45, 80, 55];
    const rowHeight = 7;

    const drawRow = (y, cells, header = false) => {
      let x = startX;
      cells.forEach((cell, i) => {
        doc.rect(x, y, colWidths[i], rowHeight);
        if (header) doc.setFont("helvetica", "bold");
        else doc.setFont("helvetica", "normal");
        doc.text(String(cell), x + 2, y + 5);
        x += colWidths[i];
      });
    };

    drawRow(startY, ["Section", "Item", "Amount (INR)"], true);
    startY += rowHeight;
    rows.forEach((row) => {
      drawRow(startY, row, false);
      startY += rowHeight;
      if (startY > 270) {
        doc.addPage();
        startY = 20;
        drawRow(startY, ["Section", "Item", "Amount (INR)"], true);
        startY += rowHeight;
      }
    });

    doc.save("balance-sheet.pdf");
  };

  const downloadCompleteReportPdf = () => {
    const doc = new jsPDF();
    const nowStr = new Date().toLocaleDateString();

    const drawTable = (startY, header, rows) => {
      const startX = 14;
      const colWidths = header.map(() => 180 / header.length);
      const rowHeight = 7;
      const drawRow = (y, cells, head = false) => {
        let x = startX;
        cells.forEach((cell, i) => {
          doc.rect(x, y, colWidths[i], rowHeight);
          doc.setFont("helvetica", head ? "bold" : "normal");
          doc.text(String(cell), x + 2, y + 5);
          x += colWidths[i];
        });
      };
      drawRow(startY, header, true);
      let y = startY + rowHeight;
      rows.forEach((r) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          drawRow(y, header, true);
          y += rowHeight;
        }
        drawRow(y, r, false);
        y += rowHeight;
      });
      return y + 6;
    };

    doc.setFontSize(14);
    doc.text("Complete Business Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Company: ${company.name || "Business"}`, 14, 24);
    doc.text(`Date: ${nowStr}`, 14, 30);

    let y = 40;
    doc.setFontSize(12);
    doc.text("Balance Sheet", 14, y);
    y += 6;
    doc.setFontSize(9);
    y = drawTable(
      y,
      ["Section", "Item", "Amount (INR)"],
      [
        ["Assets", "Cash", balanceSheet.assets.cash.toLocaleString()],
        ["Assets", "Bank", balanceSheet.assets.bank.toLocaleString()],
        ["Assets", "UPI", balanceSheet.assets.upi.toLocaleString()],
        ["Assets", "Wallet", balanceSheet.assets.wallet.toLocaleString()],
        ["Assets", "Inventory", balanceSheet.assets.inventory.toLocaleString()],
        ["Assets", "Machinery", balanceSheet.assets.machinery.toLocaleString()],
        ["Assets", "Building", balanceSheet.assets.building.toLocaleString()],
        ["Assets", "Accounts Receivable", balanceSheet.assets.accountsReceivable.toLocaleString()],
        ["Liabilities", "Loans", balanceSheet.liabilities.loans.toLocaleString()],
        ["Liabilities", "Creditors / Accounts Payable", balanceSheet.liabilities.creditors.toLocaleString()],
        ["Liabilities", "Taxes Payable", balanceSheet.liabilities.taxesPayable.toLocaleString()],
        ["Equity", "Owner's Capital", balanceSheet.equity.ownerCapital.toLocaleString()],
        ["Equity", "Retained Earnings", balanceSheet.equity.retainedEarnings.toLocaleString()],
        ["Equity", "Profit / Loss", balanceSheet.equity.profitLoss.toLocaleString()],
      ]
    );

    doc.setFontSize(12);
    doc.text("Profit and Loss Statement", 14, y);
    y += 6;
    doc.setFontSize(9);
    y = drawTable(
      y,
      ["Item", "Amount (INR)"],
      [
        ["Total Income", allIncome.toLocaleString()],
        ["Total Expenses", allExpense.toLocaleString()],
        ["Net Profit/Loss", (allIncome - allExpense).toLocaleString()],
      ]
    );

    doc.setFontSize(12);
    doc.text("Income Statement / Revenue Details", 14, y);
    y += 6;
    doc.setFontSize(9);
    const incomeRows = income.map((t) => [
      new Date(t.createdAt || t.date || new Date()).toLocaleDateString(),
      t.customerName || t.receivedFrom || "Customer",
      t.paymentMode || "-",
      Number(t.amount || 0).toLocaleString(),
    ]);
    y = drawTable(y, ["Date", "Customer", "Mode", "Amount (INR)"], incomeRows);

    doc.setFontSize(12);
    doc.text("Expense Report", 14, y);
    y += 6;
    doc.setFontSize(9);
    const expenseRows = expense.map((t) => [
      new Date(t.createdAt || t.date || new Date()).toLocaleDateString(),
      t.paidTo || "Supplier",
      t.category || "-",
      Number(t.amount || 0).toLocaleString(),
    ]);
    y = drawTable(y, ["Date", "Supplier", "Category", "Amount (INR)"], expenseRows);

    doc.setFontSize(12);
    doc.text("Tax Computation Report", 14, y);
    y += 6;
    doc.setFontSize(9);
    y = drawTable(
      y,
      ["Item", "Amount (INR)"],
      [
        ["Total Income", allIncome.toLocaleString()],
        ["Allowable Expenses", allExpense.toLocaleString()],
        ["Taxable Income (Approx.)", (allIncome - allExpense).toLocaleString()],
        ["Tax Payable (Estimate)", "0"],
      ]
    );

    doc.setFontSize(12);
    doc.text("Depreciation Report", 14, y);
    y += 6;
    doc.setFontSize(9);
    y = drawTable(
      y,
      ["Asset", "Depreciation (INR)"],
      [
        ["Machinery", "0"],
        ["Vehicles", "0"],
        ["Equipment", "0"],
      ]
    );

    doc.setFontSize(12);
    doc.text("Cash Flow Statement", 14, y);
    y += 6;
    doc.setFontSize(9);
    y = drawTable(
      y,
      ["Item", "Amount (INR)"],
      [
        ["Cash Inflows", allIncome.toLocaleString()],
        ["Cash Outflows", allExpense.toLocaleString()],
        ["Net Cash Flow", (allIncome - allExpense).toLocaleString()],
      ]
    );

    doc.setFontSize(12);
    doc.text("Ledger Summary / Transaction Summary", 14, y);
    y += 6;
    doc.setFontSize(9);
    const ledgerRows = [...income, ...expense]
      .map((t) => ({
        date: new Date(t.createdAt || t.date || new Date()).toLocaleDateString(),
        name: t.customerName || t.paidTo || "Entry",
        type: t.paidTo ? "Expense" : "Income",
        amount: Number(t.amount || 0).toLocaleString(),
        mode: t.paymentMode || "-",
      }))
      .slice(0, 60)
      .map((t) => [t.date, t.name, t.type, t.amount, t.mode]);
    drawTable(y, ["Date", "Name", "Type", "Amount (INR)", "Mode"], ledgerRows);

    doc.save("complete-report.pdf");
  };

  const downloadBalanceSheetXlsx = () => {
    const data = [
      ["Section", "Item", "Amount (INR)"],
      ["Assets", "Cash", balanceSheet.assets.cash],
      ["Assets", "Bank", balanceSheet.assets.bank],
      ["Assets", "UPI", balanceSheet.assets.upi],
      ["Assets", "Wallet", balanceSheet.assets.wallet],
      ["Assets", "Inventory", balanceSheet.assets.inventory],
      ["Assets", "Machinery", balanceSheet.assets.machinery],
      ["Assets", "Building", balanceSheet.assets.building],
      ["Assets", "Accounts Receivable", balanceSheet.assets.accountsReceivable],
      ["Liabilities", "Loans", balanceSheet.liabilities.loans],
      ["Liabilities", "Creditors / Accounts Payable", balanceSheet.liabilities.creditors],
      ["Liabilities", "Taxes Payable", balanceSheet.liabilities.taxesPayable],
      ["Equity", "Owner's Capital", balanceSheet.equity.ownerCapital],
      ["Equity", "Retained Earnings", balanceSheet.equity.retainedEarnings],
      ["Equity", "Profit / Loss", balanceSheet.equity.profitLoss],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BalanceSheet");
    XLSX.writeFile(wb, "balance-sheet.xlsx");
  };

  return (
    <div className="page balance-sheet-page">
      <h2>Download Balance Sheet</h2>
      <div className="card">
        <p>Download your business balance sheet in PDF or XLSX format.</p>
        <div className="table balance-table">
          <div className="table-row table-head">
            <div>Section</div>
            <div>Item</div>
            <div>Amount (INR)</div>
          </div>
          {[
            ["Assets", "Cash", balanceSheet.assets.cash],
            ["Assets", "Bank", balanceSheet.assets.bank],
            ["Assets", "UPI", balanceSheet.assets.upi],
            ["Assets", "Wallet", balanceSheet.assets.wallet],
            ["Assets", "Inventory", balanceSheet.assets.inventory],
            ["Assets", "Machinery", balanceSheet.assets.machinery],
            ["Assets", "Building", balanceSheet.assets.building],
            ["Assets", "Accounts Receivable", balanceSheet.assets.accountsReceivable],
            ["Liabilities", "Loans", balanceSheet.liabilities.loans],
            ["Liabilities", "Creditors / Accounts Payable", balanceSheet.liabilities.creditors],
            ["Liabilities", "Taxes Payable", balanceSheet.liabilities.taxesPayable],
            ["Equity", "Owner's Capital", balanceSheet.equity.ownerCapital],
            ["Equity", "Retained Earnings", balanceSheet.equity.retainedEarnings],
            ["Equity", "Profit / Loss", balanceSheet.equity.profitLoss],
          ].map(([section, item, amount]) => (
            <div key={`${section}-${item}`} className="table-row">
              <div>{section}</div>
              <div>{item}</div>
              <div>₹{Number(amount || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="action-row">
          <button className="btn" type="button" onClick={downloadBalanceSheetPdf}>
            Download Balance Sheet (PDF)
          </button>
          <button className="btn" type="button" onClick={downloadBalanceSheetXlsx}>
            Download Balance Sheet (XLSX)
          </button>
          <button className="btn" type="button" onClick={downloadCompleteReportPdf}>
            Download Complete Report (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadBalanceSheet;
