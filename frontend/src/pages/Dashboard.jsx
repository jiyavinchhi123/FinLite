import React, { useEffect, useMemo, useState } from "react";
import { fetchIncome, fetchExpense, getCompanyByOwner } from "../services/api";

const Dashboard = () => {
  const [company, setCompany] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sbfm_company") || "{}");
    } catch {
      return {};
    }
  });
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [expenseEntries, setExpenseEntries] = useState([]);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipChart, setTooltipChart] = useState(null);

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
        .then((data) => {
          if (data) {
            setCompany(data);
            localStorage.setItem("sbfm_company", JSON.stringify(data));
            companyId = data.id || companyId;
          }
        })
        .catch(() => {});
    }

    fetchIncome(companyId)
      .then((data) => setIncomeEntries(Array.isArray(data) ? data : []))
      .catch(() => setIncomeEntries([]));

    fetchExpense(companyId)
      .then((data) => setExpenseEntries(Array.isArray(data) ? data : []))
      .catch(() => setExpenseEntries([]));
  }, []);

  const incomeEntriesMemo = useMemo(() => incomeEntries, [incomeEntries]);
  const expenseEntriesMemo = useMemo(() => expenseEntries, [expenseEntries]);

  const openingCash = Number(company.openingCash || 0);
  const openingBank = Number(company.openingBank || 0);

  const sumByMode = (entries, mode) =>
    entries
      .filter((e) => {
        const m = String(e.paymentMode || "").toLowerCase();
        return m === mode;
      })
      .filter((e) => !e.pending)
      .reduce((s, e) => s + Number(e.amount || 0), 0);

  const incomeCash = sumByMode(incomeEntriesMemo, "cash");
  const incomeBank = sumByMode(incomeEntriesMemo, "bank");
  const incomeUpi = sumByMode(incomeEntriesMemo, "upi");
  const incomeWallet = sumByMode(incomeEntriesMemo, "wallet");

  const expenseCash = sumByMode(expenseEntriesMemo, "cash");
  const expenseBank = sumByMode(expenseEntriesMemo, "bank");
  const expenseUpi = sumByMode(expenseEntriesMemo, "upi");
  const expenseWallet = sumByMode(expenseEntriesMemo, "wallet");

  const cash = openingCash + incomeCash - expenseCash;
  const bank = openingBank + incomeBank + incomeUpi - expenseBank - expenseUpi;
  const upi = 0;
  const wallet = incomeWallet - expenseWallet;
  const moneyYouHave = cash + bank + upi;

  const pendingReceivables = incomeEntriesMemo
    .filter((entry) => entry.pending)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const pendingPayables = expenseEntriesMemo
    .filter((entry) => entry.pending)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const monthlyIncome = incomeEntriesMemo
    .filter((entry) => {
      const d = new Date(entry.createdAt || entry.date || now);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const monthlyExpense = expenseEntriesMemo
    .filter((entry) => {
      const d = new Date(entry.createdAt || entry.date || now);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const profit = monthlyIncome - monthlyExpense;
  const profitClass = profit >= 0 ? "profit" : "loss";

  const formatInr = (value) => `₹${Number(value || 0).toLocaleString()}`;

  const maxPair = Math.max(monthlyIncome, monthlyExpense, 1);
  const incomePct = Math.round((monthlyIncome / maxPair) * 100);
  const expensePct = Math.round((monthlyExpense / maxPair) * 100);

  const monthlySeries = useMemo(() => {
    const getEntryDate = (entry) =>
      new Date(entry.transactionDate || entry.date || entry.createdAt || now);
    const months = [];
    const nowMonth = new Date(year, month, 1);
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(nowMonth);
      d.setMonth(d.getMonth() - i);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("en-US", { month: "short" }),
        year: d.getFullYear(),
        month: d.getMonth(),
        income: 0,
        expense: 0,
      });
    }

    incomeEntriesMemo.forEach((e) => {
      const d = getEntryDate(e);
      const found = months.find(
        (m) => m.month === d.getMonth() && m.year === d.getFullYear()
      );
      if (found) found.income += Number(e.amount || 0);
    });

    expenseEntriesMemo.forEach((e) => {
      const d = getEntryDate(e);
      const found = months.find(
        (m) => m.month === d.getMonth() && m.year === d.getFullYear()
      );
      if (found) found.expense += Number(e.amount || 0);
    });

    return months.map((m) => ({
      ...m,
      profit: Math.max(m.income - m.expense, 0),
    }));
  }, [incomeEntriesMemo, expenseEntriesMemo, year, month, now]);

  const monthlyCategory = useMemo(() => {
    const getEntryDate = (entry) =>
      new Date(entry.transactionDate || entry.date || entry.createdAt || now);
    const map = new Map();
    const keyFor = (d) => `${d.getFullYear()}-${d.getMonth()}`;
    const ensure = (k) => {
      if (!map.has(k)) {
        map.set(k, { income: new Map(), expense: new Map() });
      }
      return map.get(k);
    };
    incomeEntriesMemo.forEach((e) => {
      const d = getEntryDate(e);
      const k = keyFor(d);
      const bucket = ensure(k);
      const cat = e.category || "Other";
      bucket.income.set(cat, (bucket.income.get(cat) || 0) + Number(e.amount || 0));
    });
    expenseEntriesMemo.forEach((e) => {
      const d = getEntryDate(e);
      const k = keyFor(d);
      const bucket = ensure(k);
      const cat = e.category || "Other";
      bucket.expense.set(cat, (bucket.expense.get(cat) || 0) + Number(e.amount || 0));
    });
    const topOf = (m) => {
      let topKey = "-";
      let topVal = -1;
      m.forEach((v, k) => {
        if (v > topVal) {
          topVal = v;
          topKey = k;
        }
      });
      return topKey;
    };
    const result = {};
    map.forEach((val, k) => {
      result[k] = {
        topIncome: topOf(val.income),
        topExpense: topOf(val.expense),
      };
    });
    return result;
  }, [incomeEntriesMemo, expenseEntriesMemo, now]);

  const handleChartHover = (e, chartType, index) => {
    const block = e.currentTarget.closest(".profit-chart-block");
    if (!block) return;
    const blockRect = block.getBoundingClientRect();
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverIndex(index);
    setTooltipChart(chartType);
    setTooltipPos({
      x: rect.left - blockRect.left + rect.width / 2,
      y: rect.top - blockRect.top - 10,
    });
  };

  const handleChartLeave = () => {
    setHoverIndex(null);
    setTooltipChart(null);
  };

  const buildLinePath = (values, width, height, padding, maxVal) => {
    if (!values.length) return "";
    const step =
      values.length > 1 ? (width - padding * 2) / (values.length - 1) : width;
    return values
      .map((v, i) => {
        const x = Math.round(padding + i * step);
        const y = Math.round(padding + (1 - v / maxVal) * height);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  };

  const cashFlowSeries = useMemo(() => {
    const merged = [
      ...incomeEntriesMemo.map((e) => ({
        amount: Number(e.amount || 0),
        type: "income",
        date: e.createdAt || e.date || null,
      })),
      ...expenseEntriesMemo.map((e) => ({
        amount: Number(e.amount || 0),
        type: "expense",
        date: e.createdAt || e.date || null,
      })),
    ]
      .sort((a, b) => new Date(a.date || now) - new Date(b.date || now))
      .slice(-8);
    return merged.map((t) => ({
      ...t,
      value: t.type === "income" ? t.amount : -t.amount,
    }));
  }, [incomeEntriesMemo, expenseEntriesMemo, now]);

  const topExpenses = useMemo(() => {
    const map = new Map();
    expenseEntriesMemo.forEach((e) => {
      const key = e.category || e.paidTo || "Other";
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [expenseEntriesMemo]);

  const topCustomers = useMemo(() => {
    const map = new Map();
    incomeEntriesMemo.forEach((e) => {
      const key = e.customerName || e.receivedFrom || "Customer";
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [incomeEntriesMemo]);

  const pendingAging = useMemo(() => {
    const buckets = [
      { label: "0-7 days", value: 0 },
      { label: "8-14 days", value: 0 },
      { label: "15-30 days", value: 0 },
      { label: "30+ days", value: 0 },
    ];
    const addToBucket = (entry) => {
      if (!entry.pending) return;
      const d = new Date(entry.createdAt || entry.date || now);
      const age = Math.floor((now - d) / (24 * 60 * 60 * 1000));
      const amount = Number(entry.amount || 0);
      if (age <= 7) buckets[0].value += amount;
      else if (age <= 14) buckets[1].value += amount;
      else if (age <= 30) buckets[2].value += amount;
      else buckets[3].value += amount;
    };
    incomeEntriesMemo.forEach(addToBucket);
    expenseEntriesMemo.forEach(addToBucket);
    return buckets;
  }, [incomeEntriesMemo, expenseEntriesMemo, now]);

  const predictions = useMemo(() => {
    const last30 = (entries) =>
      entries.filter((entry) => {
        const d = new Date(entry.createdAt || entry.date || now);
        return now - d <= 30 * 24 * 60 * 60 * 1000;
      });

    const income30 = last30(incomeEntriesMemo);
    const expense30 = last30(expenseEntriesMemo);

    const sum = (arr) => arr.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalIncome30 = sum(income30);
    const totalExpense30 = sum(expense30);
    const avgDailyIncome = totalIncome30 / 30;
    const avgDailyExpense = totalExpense30 / 30;

    const revenuePrediction = avgDailyIncome * 30;
    const expensePrediction = avgDailyExpense * 30;
    const profitPrediction = revenuePrediction - expensePrediction;
    const cashFlowPrediction = moneyYouHave + profitPrediction;

    const delays = incomeEntriesMemo
      .filter((e) => e.pending && e.customerName)
      .reduce((map, e) => {
        const key = e.customerName;
        const current = map.get(key) || 0;
        map.set(key, current + Number(e.amount || 0));
        return map;
      }, new Map());

    const delayList = [...delays.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const delayText =
      delayList.length > 0
        ? `Likely delays: ${delayList.join(", ")}`
        : "No delays detected.";

    return {
      revenuePrediction,
      expensePrediction,
      profitPrediction,
      cashFlowPrediction,
      delayText,
    };
  }, [incomeEntriesMemo, expenseEntriesMemo, moneyYouHave, now]);

  const healthMessage = (() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = now.getDate();

    const last30 = (entries) =>
      entries.filter((entry) => {
        const d = new Date(entry.createdAt || entry.date || now);
        return now - d <= 30 * 24 * 60 * 60 * 1000;
      });

    const prev30 = (entries) =>
      entries.filter((entry) => {
        const d = new Date(entry.createdAt || entry.date || now);
        const diff = now - d;
        return diff > 30 * 24 * 60 * 60 * 1000 && diff <= 60 * 24 * 60 * 60 * 1000;
      });

    const sum = (entries) => entries.reduce((s, e) => s + Number(e.amount || 0), 0);
    const income30 = sum(last30(incomeEntriesMemo));
    const expense30 = sum(last30(expenseEntriesMemo));
    const incomePrev = sum(prev30(incomeEntriesMemo));

    if (income30 === 0 && expense30 === 0) {
      return "Start recording payments to see your business health.";
    }

    if (incomePrev > 0) {
      const change = ((income30 - incomePrev) / incomePrev) * 100;
      if (change >= 15) return "Your business is growing faster this month.";
      if (change <= -15) return "Income is slower than last month.";
    }

    if (monthlyExpense > monthlyIncome) {
      return "Expenses are higher than income.";
    }

    const runRateIncome = (monthlyIncome / Math.max(day, 1)) * daysInMonth;
    const runRateExpense = (monthlyExpense / Math.max(day, 1)) * daysInMonth;
    if (runRateIncome >= runRateExpense) {
      return "Your business is on track to stay profitable this month.";
    }

    return "Keep tracking your business payments.";
  })();

  const shortageMessage = (() => {
    const day = now.getDate();
    const avgDailyExpense = day > 0 ? monthlyExpense / day : 0;
    const buffer = moneyYouHave - pendingPayables;
    if (avgDailyExpense <= 0) return "";
    const daysLeft = Math.floor(buffer / avgDailyExpense);
    if (daysLeft >= 0 && daysLeft <= 14) {
      return `You may face shortage in ${daysLeft} days.`;
    }
    return "";
  })();

  return (
    <div className="page dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">A clear view of your business money today.</p>
          {company.fiscalStart && (
            <p className="muted">Financial year starts on {company.fiscalStart}</p>
          )}
        </div>
      </div>

      <div className="card-grid">
        <div className="metric-card metric-card-accent balance">
          <div className="metric-card-top">
            <span className="metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="7" width="18" height="10" rx="2" />
                <path d="M7 12h10" />
                <path d="M7 9h3" />
              </svg>
            </span>
          </div>
          <div className="metric-copy">
            <h3>Money You Have</h3>
            <p className="metric-note">Available across all payment modes</p>
          </div>
          <div className="metric-value">{formatInr(moneyYouHave)}</div>
          <div className="metric-breakdown">
            <div>
              <span>Cash</span>
              <strong>{formatInr(cash)}</strong>
            </div>
            <div>
              <span>Bank</span>
              <strong>{formatInr(bank)}</strong>
            </div>
          </div>
        </div>

        <div className="metric-card metric-card-accent receive">
          <div className="metric-card-top">
            <span className="metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17h10" />
                <path d="M7 12h10" />
                <path d="M7 7h6" />
                <path d="M17 5l2 2-2 2" />
              </svg>
            </span>
          </div>
          <div className="metric-copy">
            <h3>Money You Will Receive</h3>
            <p className="metric-note">Customer pending payments</p>
          </div>
          <div className="metric-value">{formatInr(pendingReceivables)}</div>
        </div>

        <div className="metric-card metric-card-accent pay">
          <div className="metric-card-top">
            <span className="metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <rect x="4" y="17" width="16" height="4" rx="1" />
              </svg>
            </span>
          </div>
          <div className="metric-copy">
            <h3>Money You Need To Pay</h3>
            <p className="metric-note">Supplier pending payments</p>
          </div>
          <div className="metric-value">{formatInr(pendingPayables)}</div>
        </div>

        <div className={`metric-card metric-card-accent profit-card ${profitClass}`}>
          <div className="metric-card-top">
            <span className="metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 16l5-5 4 4 7-8" />
                <path d="M16 7h4v4" />
              </svg>
            </span>
          </div>
          <div className="metric-copy">
            <h3>Monthly Profit</h3>
            <p className="metric-note">Income versus expense this month</p>
          </div>
          <div className="metric-value">{formatInr(profit)}</div>
          <div className="profit-chart">
            <div className="bar" style={{ height: "72%" }} />
            <div className="bar" style={{ height: "56%" }} />
            <div className="bar" style={{ height: "82%" }} />
            <div className="bar" style={{ height: "64%" }} />
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card wide-chart profit-wide">
          <h3>Monthly Profit and Loss</h3>
          <div className="profit-dual profit-dual-stack">
            <div className="profit-chart-block" onMouseLeave={handleChartLeave}>
              <div className="chart-label">Monthly Profit and Loss Chart</div>
              <div className="profit-bar-chart">
                <svg viewBox="0 0 760 360" preserveAspectRatio="none">
                  {(() => {
                    const paddingX = 84;
                    const paddingTop = 26;
                    const chartH = 220;
                    const baseY = paddingTop + chartH / 2;
                    const maxAbs = Math.max(
                      ...monthlySeries.map((m) => Math.abs(m.income - m.expense)),
                      1
                    );
                    const ticks = 5;
                    const stepY = (chartH / 2) / ticks;
                    const tickVals = Array.from({ length: ticks + 1 }, (_, i) =>
                      Math.round((maxAbs / ticks) * i)
                    );
                    const step =
                      monthlySeries.length > 1
                        ? (760 - paddingX * 2) / (monthlySeries.length - 1)
                        : 760 - paddingX * 2;
                    const barW = Math.max(10, step * 0.48);

                    return (
                      <>
                        {tickVals.map((v, i) => (
                          <g key={`ypos-${i}`}>
                            <line
                              x1={paddingX}
                              x2={760 - paddingX}
                              y1={baseY - i * stepY}
                              y2={baseY - i * stepY}
                              className="profit-grid"
                            />
                            <text
                              x={paddingX - 18}
                              y={baseY - i * stepY + 4}
                              textAnchor="end"
                              className="axis-label"
                            >
                              {v}
                            </text>
                          </g>
                        ))}
                        {tickVals.slice(1).map((v, i) => (
                          <g key={`yneg-${i}`}>
                            <line
                              x1={paddingX}
                              x2={760 - paddingX}
                              y1={baseY + (i + 1) * stepY}
                              y2={baseY + (i + 1) * stepY}
                              className="profit-grid"
                            />
                            <text
                              x={paddingX - 18}
                              y={baseY + (i + 1) * stepY + 4}
                              textAnchor="end"
                              className="axis-label"
                            >
                              {-v}
                            </text>
                          </g>
                        ))}
                        <line
                          x1={paddingX}
                          x2={760 - paddingX}
                          y1={baseY}
                          y2={baseY}
                          className="profit-axis"
                        />
                        <line
                          x1={paddingX}
                          x2={paddingX}
                          y1={paddingTop}
                          y2={paddingTop + chartH}
                          className="profit-axis"
                        />
                        {monthlySeries.map((m, i) => {
                          const value = m.income - m.expense;
                          const h = (Math.abs(value) / maxAbs) * (chartH / 2);
                          const x = paddingX + i * step - barW / 2;
                          const y = value >= 0 ? baseY - h : baseY;
                          return (
                            <g key={`${m.key}-bar`}>
                              <rect
                                x={x}
                                y={y}
                                width={barW}
                                height={Math.max(h, 2)}
                                className={`profit-bar ${value >= 0 ? "positive" : "negative"}`}
                                onMouseEnter={(e) => handleChartHover(e, "bar", i)}
                              />
                              <text
                                x={paddingX + i * step}
                                y={paddingTop + chartH + 30}
                                textAnchor="middle"
                                className="chart-month"
                              >
                                <tspan x={paddingX + i * step} dy="0">
                                  {m.label}
                                </tspan>
                                <tspan x={paddingX + i * step} dy="12">
                                  {m.year}
                                </tspan>
                              </text>
                            </g>
                          );
                        })}
                        <text
                          x={paddingX}
                          y={paddingTop - 12}
                          textAnchor="start"
                          className="axis-title"
                        >
                          Profit (INR)
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>
              {tooltipChart === "bar" && hoverIndex !== null && monthlySeries[hoverIndex] && (
                <div className="chart-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                  {(() => {
                    const m = monthlySeries[hoverIndex];
                    const key = `${m.year}-${m.month}`;
                    const profitValue = m.income - m.expense;
                    const top = monthlyCategory[key] || { topIncome: "-", topExpense: "-" };
                    const topLabel = profitValue >= 0 ? top.topIncome : top.topExpense;
                    const topType = profitValue >= 0 ? "Income" : "Expense";
                    return (
                      <>
                        <div className="tooltip-title">
                          {m.label} {m.year}
                        </div>
                        <div className="tooltip-row">
                          <span>Income</span>
                          <strong>{formatInr(m.income)}</strong>
                        </div>
                        <div className="tooltip-row">
                          <span>Expense</span>
                          <strong>{formatInr(m.expense)}</strong>
                        </div>
                        <div className="tooltip-row">
                          <span>Profit/Loss</span>
                          <strong>{formatInr(profitValue)}</strong>
                        </div>
                        <div className="tooltip-row">
                          <span>Top {topType}</span>
                          <strong>{topLabel}</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              <div className="legend">
                <span className="dot positive" /> Positive Profit
                <span className="dot negative" /> Negative Profit
              </div>
            </div>

            <div className="profit-chart-block" onMouseLeave={handleChartLeave}>
              <div className="chart-label">Monthly Profit (Line)</div>
              <div className="profit-line-chart">
                <svg viewBox="0 0 760 360" preserveAspectRatio="none">
                  {(() => {
                    const paddingX = 84;
                    const paddingTop = 26;
                    const chartH = 220;
                    const baseY = paddingTop + chartH / 2;
                    const maxAbs = Math.max(
                      ...monthlySeries.map((m) => Math.abs(m.income - m.expense)),
                      1
                    );
                    const ticks = 5;
                    const stepY = (chartH / 2) / ticks;
                    const tickVals = Array.from({ length: ticks + 1 }, (_, i) =>
                      Math.round((maxAbs / ticks) * i)
                    );
                    const step =
                      monthlySeries.length > 1
                        ? (760 - paddingX * 2) / (monthlySeries.length - 1)
                        : 760 - paddingX * 2;
                    const points = monthlySeries.map((m, i) => {
                      const value = m.income - m.expense;
                      const y =
                        value >= 0
                          ? baseY - (value / maxAbs) * (chartH / 2)
                          : baseY + (Math.abs(value) / maxAbs) * (chartH / 2);
                      return {
                        x: paddingX + i * step,
                        y,
                        label: m.label,
                        year: m.year,
                      };
                    });
                    const path = points
                      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
                      .join(" ");

                    return (
                      <g>
                        {tickVals.map((v, i) => (
                          <g key={`yl-pos-${i}`}>
                            <line
                              x1={paddingX}
                              x2={760 - paddingX}
                              y1={baseY - i * stepY}
                              y2={baseY - i * stepY}
                              className="profit-grid"
                            />
                            <text
                              x={paddingX - 18}
                              y={baseY - i * stepY + 4}
                              textAnchor="end"
                              className="axis-label"
                            >
                              {v}
                            </text>
                          </g>
                        ))}
                        {tickVals.slice(1).map((v, i) => (
                          <g key={`yl-neg-${i}`}>
                            <line
                              x1={paddingX}
                              x2={760 - paddingX}
                              y1={baseY + (i + 1) * stepY}
                              y2={baseY + (i + 1) * stepY}
                              className="profit-grid"
                            />
                            <text
                              x={paddingX - 18}
                              y={baseY + (i + 1) * stepY + 4}
                              textAnchor="end"
                              className="axis-label"
                            >
                              {-v}
                            </text>
                          </g>
                        ))}
                        <line
                          x1={paddingX}
                          x2={760 - paddingX}
                          y1={baseY}
                          y2={baseY}
                          className="profit-axis"
                        />
                        <line
                          x1={paddingX}
                          x2={paddingX}
                          y1={paddingTop}
                          y2={paddingTop + chartH}
                          className="profit-axis"
                        />
                        <path d={path} className="profit-line" />
                        {points.map((p, idx) => (
                          <g key={`${p.label}-point`}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="4"
                              className="profit-point"
                              onMouseEnter={(e) => handleChartHover(e, "line", idx)}
                            />
                            <text
                              x={p.x}
                              y={paddingTop + chartH + 30}
                              textAnchor="middle"
                              className="chart-month"
                            >
                              <tspan x={p.x} dy="0">
                                {p.label}
                              </tspan>
                              <tspan x={p.x} dy="12">
                                {p.year}
                              </tspan>
                            </text>
                          </g>
                        ))}
                        <text
                          x={paddingX}
                          y={paddingTop - 12}
                          textAnchor="start"
                          className="axis-title"
                        >
                          Profit (INR)
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
              {tooltipChart === "line" && hoverIndex !== null && monthlySeries[hoverIndex] && (
                <div className="chart-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                  {(() => {
                    const m = monthlySeries[hoverIndex];
                    const key = `${m.year}-${m.month}`;
                    const profitValue = m.income - m.expense;
                    const top = monthlyCategory[key] || { topIncome: "-", topExpense: "-" };
                    const topLabel = profitValue >= 0 ? top.topIncome : top.topExpense;
                    const topType = profitValue >= 0 ? "Income" : "Expense";
                    return (
                      <>
                        <div className="tooltip-title">
                          {m.label} {m.year}
                        </div>
                        <div className="tooltip-row">
                          <span>Income</span>
                          <strong>{formatInr(m.income)}</strong>
                        </div>
                        <div className="tooltip-row">
                          <span>Expense</span>
                          <strong>{formatInr(m.expense)}</strong>
                        </div>
                        <div className="tooltip-row">
                          <span>Profit/Loss</span>
                          <strong>{formatInr(profitValue)}</strong>
                        </div>
                        <div className="tooltip-row">
                          <span>Top {topType}</span>
                          <strong>{topLabel}</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              <div className="legend">
                <span className="dot profit" /> Profit Trend
              </div>
            </div>
          </div>
        </div>
        <div className="chart-card chart-card-accent">
          <h3>Top 5 Expenses</h3>
          <div className="rank-list">
            {topExpenses.length === 0 && <div className="muted">No expenses yet.</div>}
            {topExpenses.map(([label, value]) => (
              <div key={label} className="rank-row">
                <span>{label}</span>
                <strong>{formatInr(value)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card chart-card-accent">
          <h3>Top 5 Customers</h3>
          <div className="rank-list">
            {topCustomers.length === 0 && <div className="muted">No income yet.</div>}
            {topCustomers.map(([label, value]) => (
              <div key={label} className="rank-row">
                <span>{label}</span>
                <strong>{formatInr(value)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card chart-card-accent">
          <h3>Pending Payments Aging</h3>
          <div className="rank-list">
            {pendingAging.map((b) => (
              <div key={b.label} className="rank-row">
                <span>{b.label}</span>
                <strong>{formatInr(b.value)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="prediction-grid">
        <div className="prediction-card prediction-card-accent">
          <h3>Revenue Prediction 📈</h3>
          <p>Expected income for the next 30 days.</p>
          <div className="prediction-value">{formatInr(predictions.revenuePrediction)}</div>
        </div>
        <div className="prediction-card prediction-card-accent">
          <h3>Expense Prediction 💸</h3>
          <p>Estimated spending based on recent trends.</p>
          <div className="prediction-value">{formatInr(predictions.expensePrediction)}</div>
        </div>
        <div className="prediction-card prediction-card-accent">
          <h3>Profit / Loss Prediction 📊</h3>
          <p>Projected profit for the next 30 days.</p>
          <div className={`prediction-value ${predictions.profitPrediction >= 0 ? "income" : "expense"}`}>
            {formatInr(predictions.profitPrediction)}
          </div>
        </div>
        <div className="prediction-card prediction-card-accent">
          <h3>Cash Flow Prediction 💰</h3>
          <p>Estimated cash position after 30 days.</p>
          <div className="prediction-value">{formatInr(predictions.cashFlowPrediction)}</div>
        </div>
        <div className="prediction-card prediction-card-accent prediction-card-wide">
          <h3>Customer Payment Delay Prediction ⏳</h3>
          <p>Customers with likely payment delays.</p>
          <div className="prediction-note">{predictions.delayText}</div>
        </div>
        <div className="prediction-card health-card prediction-card-health">
          <div className="health-title">Business Health</div>
          <p>{healthMessage}</p>
          {shortageMessage && <p className="health-warning">{shortageMessage}</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
