import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDateDisplay } from "../utils/date";

const Header = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  let user = {};
  let company = {};
  try {
    user = JSON.parse(localStorage.getItem("sbfm_user") || "{}");
    company = JSON.parse(localStorage.getItem("sbfm_company") || "{}");
  } catch {}
  const handleLogout = () => {
    localStorage.removeItem("sbfm_user");
    localStorage.removeItem("sbfm_company");
    navigate("/login");
  };

  return (
    <header className="header">
      <div className="header-company-wrap">
        <span className="header-company-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" focusable="false">
            <path
              d="M3 21V7l9-4 9 4v14h-6v-5H9v5H3Zm6-7h6V9H9v5Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <div className="header-company-content">
          <div className="header-company">{company.name || "Company Name"}</div>
          <div className="header-company-meta">
            <span>{company.businessType || "Business"}</span>
            <span className="header-company-dot" aria-hidden="true">|</span>
            <span>FY Start: {formatDateDisplay(company.fiscalStart)}</span>
          </div>
        </div>
      </div>
      <div
        className="profile"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          className="btn ghost profile-trigger-icon"
          type="button"
          onClick={() => navigate("/app/profile")}
        >
          <span className="profile-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="profile-trigger-text">Profile</span>
        </button>
        {open && (
          <div className="profile-menu">
            <div className="profile-name">{user.name || "Business Owner"}</div>
            <div className="profile-line">
              <span className="profile-line-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path
                    d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.2l8 4.9 8-4.9V7H4Zm16 10V9.3l-7.4 4.6a1.4 1.4 0 0 1-1.2 0L4 9.3V17h16Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Email: {user.email || "-"}</span>
            </div>
            <div className="profile-line">
              <span className="profile-line-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path
                    d="M3 21V7l9-4 9 4v14h-6v-5H9v5H3Zm6-7h6V9H9v5Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Business: {company.name || "-"}</span>
            </div>
            <div className="profile-line">
              <span className="profile-line-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path
                    d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 6h10V6H7v2Zm0 4h10v-2H7v2Zm0 4h7v-2H7v2Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Financial Year: {formatDateDisplay(company.fiscalStart)}</span>
            </div>
            <div className="profile-line">
              <span className="profile-line-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path
                    d="M4 5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 4v2h4V9H6Zm6 0v2h6V9h-6Zm-6 4v2h4v-2H6Zm6 0v2h6v-2h-6Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Type: {company.businessType || "-"}</span>
            </div>
            <button className="btn ghost" type="button" onClick={handleLogout}>
              <span className="profile-line-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path
                    d="M14 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2h-2v2H5V5h7v2h2Zm4.6 4-3.2-3.2 1.4-1.4L22.4 12l-5.6 5.6-1.4-1.4 3.2-3.2H9v-2h9.6Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
