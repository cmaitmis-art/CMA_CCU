import { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================================
   MC / M.Com RENEWAL PORTAL
   Public citizen-facing page — styled to match condominium.lk
   (maroon/gold header, gold pill buttons, cream cards, mono figures).

   FLOW
   1. Applicant details form            (Save & Next)
   2. Search Plan No / MC Name          (popup) -> auto-fills MC record
   3. Renewal timeline for that MC      -> pick unpaid year(s)
   4. GovPay payment                    -> generates a reference no.
   5. Pending approval                  (waits on the officer's Approval page)
   6. Active / success                  -> download renewal receipt

   BACKEND INTEGRATION
   Everything that should eventually hit your real API is isolated inside the
   `renewalApi` object below. Right now it is backed by localStorage so the
   whole flow can be demoed end-to-end (this Portal + the Approval page in
   MCRenewalApproval.jsx read/write the same "cma_pending_renewals" key).
   Swap each method's body for a real fetch()/api.js call — the rest of the
   component does not need to change.
============================================================================ */

// ---------------------------------------------------------------------------
// Design tokens — lifted from the MC Registration Fees screenshot
// ---------------------------------------------------------------------------
const sriLankaData = {
  Western: {
    Colombo: [
      "Colombo 01",
      "Colombo 02",
      "Colombo 03",
      "Colombo 04",
      "Colombo 05",
      "Colombo 06",
      "Dehiwala",
      "Moratuwa",
      "Kotte",
      "Maharagama",
      "Nugegoda",
      "Homagama",
    ],
    Gampaha: [
      "Gampaha",
      "Negombo",
      "Kelaniya",
      "Kadawatha",
      "Ja-Ela",
      "Wattala",
    ],
    Kalutara: ["Kalutara", "Panadura", "Horana", "Matugama", "Bandaragama"],
  },
  Central: {
    Kandy: ["Kandy", "Gampola", "Peradeniya", "Katugastota"],
    Matale: ["Matale", "Dambulla", "Sigiriya"],
    "Nuwara Eliya": ["Nuwara Eliya", "Hatton", "Talawakelle"],
  },
  Southern: {
    Galle: ["Galle", "Ambalangoda", "Hikkaduwa", "Karapitiya"],
    Matara: ["Matara", "Weligama", "Dikwella"],
    Hambantota: ["Hambantota", "Tangalle", "Beliatta", "Ambalantota"],
  },
  "North Western": {
    Kurunegala: ["Kurunegala", "Kuliyapitiya", "Polgahawela"],
    Puttalam: ["Puttalam", "Chilaw", "Wennappuwa", "Marawila"],
  },
  Sabaragamuwa: {
    Ratnapura: ["Ratnapura", "Pelmadulla", "Balangoda"],
    Kegalle: ["Kegalle", "Mawanella", "Warakapola"],
  },
  "North Central": {
    Anuradhapura: ["Anuradhapura", "Kekirawa", "Medawachchiya"],
    Polonnaruwa: ["Polonnaruwa", "Kaduruwela", "Hingurakgoda"],
  },
  Uva: {
    Badulla: ["Badulla", "Bandarawela", "Hali-Ela", "Welimada"],
    Moneragala: ["Moneragala", "Bibile", "Kataragama"],
  },
  Eastern: {
    Trincomalee: ["Trincomalee", "Kinniya", "Muttur"],
    Batticaloa: ["Batticaloa", "Kattankudy", "Eravur"],
    Ampara: ["Ampara", "Kalmunai", "Samanthurai"],
  },
  Northern: {
    Jaffna: ["Jaffna", "Chavakachcheri", "Point Pedro"],
    Kilinochchi: ["Kilinochchi", "Pallai"],
    Mannar: ["Mannar", "Murunkan"],
    Mullaitivu: ["Mullaitivu", "Oddusuddan"],
    Vavuniya: ["Vavuniya", "Nedunkeni"],
  },
};

const theme = {
  maroon: "#6e1414",
  maroonDark: "#2c0a0a",
  maroonMid: "#8a1c1c",
  gold: "#c9a227",
  goldSoft: "#e7c766",
  cream: "#faf7f1",
  card: "#ffffff",
  text: "#241a17",
  text2: "#5b5250",
  text3: "#8a8280",
  border: "#e7dfd2",
  green: "#1a7d3a",
  greenBg: "#eef8f0",
  blue: "#2563eb",
  blueBg: "#eef4ff",
  red: "#b3261e",
  amberBg: "#fdf3d8",
};

const fontDisplay = "'Poppins', 'Segoe UI', Arial, sans-serif";
const fontBody = "'Inter', 'Segoe UI', Arial, sans-serif";
const fontMono = "'Roboto Mono', 'Courier New', monospace";

// ---------------------------------------------------------------------------
// Sri Lanka province / district reference data
// ---------------------------------------------------------------------------
const SL_PROVINCES = {
  Western: ["Colombo", "Gampaha", "Kalutara"],
  Central: ["Kandy", "Matale", "Nuwara Eliya"],
  Southern: ["Galle", "Matara", "Hambantota"],
  Northern: ["Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu"],
  Eastern: ["Batticaloa", "Ampara", "Trincomalee"],
  "North Western": ["Kurunegala", "Puttalam"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  Uva: ["Badulla", "Monaragala"],
  Sabaragamuwa: ["Ratnapura", "Kegalle"],
};

// ---------------------------------------------------------------------------
// Registration/renewal fee table (statutory) — same figures as the MC
// Registration Fees page: Fee + NBT(2%) + VAT(12%) = Total
// ---------------------------------------------------------------------------
const money = (n) =>
  "Rs. " +
  Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

import {
  fetchMCsAll,
  fetchMComsAll,
  submitRenewal,
  fetchRenewal,
  fetchRenewals,
} from "../api.js";
import { useSettings } from "../SettingsContext.jsx";
import {
  buildMultiYearRenewalRows,
  getCategoryDisplayValue,
} from "../components/mc-management/MCManagementShared.jsx";

// ---------------------------------------------------------------------------
// Mock directory of MC / M.Com records — replace with a real search endpoint.
// ---------------------------------------------------------------------------
// We no longer use a static directory. We will fetch from the backend API.

const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// renewalApi — swap these for real backend calls when ready.
// ---------------------------------------------------------------------------
const renewalApi = {
  async searchMC(query, searchFilter) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const [mcRes, mcomRes] = await Promise.all([
      fetchMCsAll(),
      fetchMComsAll(),
    ]);

    const mcs = mcRes.rows || mcRes || [];
    const mcoms = mcomRes.rows || mcomRes || [];

    const mcData = mcs.map((r) => ({ ...r, _recordType: "MC" }));
    const mcomData = mcoms.map((r) => ({ ...r, _recordType: "M.Com" }));

    const combinedData = [...mcData, ...mcomData];

    return combinedData
      .filter((r) => {
        const name = String(
          r.name || r.management_corporation_name || "",
        ).toLowerCase();
        const pNo = String(
          r.planNo || r.plan_no || r.new_file_no || r.file_no || "",
        ).toLowerCase();
        return name.includes(q) || pNo.includes(q);
      })
      .map((r) => ({
        id: r.id,
        type: r._recordType,
        name: r.name || r.management_corporation_name || "",
        planNo: r.planNo || r.plan_no || r.new_file_no || r.file_no || "",
        category: r.category,
        units: r.units || r.residential_units || 0,
        residential: r.residential || r.residential_units || 0,
        non_res_shops: r.non_res_shops || 0,
        non_res_office: r.non_res_office || 0,
        non_res_hotel: r.non_res_hotel || 0,
        ownership_type: r.ownership_type,
        government_income_level: r.government_income_level,
        renewal_period: r.renewal_period,
        reg_date: r.reg_date,
        renewal_paid_year: r.renewal_paid_year,
      }));
  },
  async initiateGovPay(data) {
    return await submitRenewal(data);
  },
  async checkStatus(refNo) {
    return await fetchRenewal(refNo);
  },
};

// ---------------------------------------------------------------------------
// Small shared UI atoms
// ---------------------------------------------------------------------------
function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: theme.text2,
          fontFamily: fontBody,
        }}
      >
        {label}
        {required && <span style={{ color: theme.red }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  padding: "10px 12px",
  border: `1.5px solid ${theme.border}`,
  borderRadius: 8,
  fontSize: 13.5,
  fontFamily: fontBody,
  color: theme.text,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const pillBtn = (active, color = theme.maroon) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 22px",
  borderRadius: 999,
  fontSize: 13.5,
  fontWeight: 700,
  fontFamily: fontBody,
  cursor: "pointer",
  border: `1.5px solid ${color}`,
  background: active ? color : "#fff",
  color: active ? "#fff" : color,
  transition: ".15s",
});

function SectionCard({ children, style }) {
  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: "26px 28px",
        boxShadow: "0 4px 18px rgba(44,10,10,.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StepHeader({ steps, current }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 28,
        flexWrap: "wrap",
      }}
    >
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div
            key={s}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderRadius: 999,
                background: active
                  ? theme.maroon
                  : done
                    ? theme.amberBg
                    : "#f1ede6",
                color: active ? "#fff" : done ? theme.maroonDark : theme.text3,
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: fontBody,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: active
                    ? "rgba(255,255,255,.25)"
                    : done
                      ? theme.gold
                      : "#e2ddd2",
                  color: active ? "#fff" : done ? "#fff" : theme.text3,
                  fontSize: 10.5,
                }}
              >
                {done ? "✓" : idx}
              </span>
              {s}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 18, height: 2, background: theme.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryPanel — sticky right-hand column shown while the applicant is
// filling in the wizard. Everything here is derived from state that's
// already being tracked, so it updates live as the person picks an MC,
// ticks years, and fills their details. Purely visual — no state of its own.
// ---------------------------------------------------------------------------
const NEXT_HINTS = {
  1: "Search and pick the MC / M.Com you want to renew to continue.",
  2: "Tick every year you want to pay for — you can select more than one.",
  3: "Fill in your details, they'll be printed on the receipt.",
  4: "Review the amount and pay securely via GovPay.",
};

function SummaryPanel({ selectedMC, selectedYears, totalDue, applicant, step }) {
  const applicantName = [applicant?.firstName, applicant?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div style={{ position: "sticky", top: 20 }}>
      <SectionCard>
        <div
          style={{
            fontFamily: fontDisplay,
            fontSize: 15,
            fontWeight: 700,
            color: theme.maroonDark,
            marginBottom: 16,
          }}
        >
          Application Summary
        </div>

        {/* MC / M.Com */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              color: theme.text3,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            MC / M.Com
          </div>
          {selectedMC ? (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: theme.text }}>
                {selectedMC.name}
              </div>
              <div style={{ fontSize: 12, color: theme.text2, fontFamily: fontMono }}>
                {selectedMC.planNo}
                {selectedMC.category ? ` · ${selectedMC.category}` : ""}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: theme.text3, fontStyle: "italic" }}>
              Not selected yet
            </div>
          )}
        </div>

        {/* Years */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              color: theme.text3,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Renewal Year(s)
          </div>
          {selectedYears.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {selectedYears.map((y) => (
                <span
                  key={y}
                  style={{
                    background: theme.amberBg,
                    color: "#8a6d00",
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: fontMono,
                  }}
                >
                  {y}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: theme.text3, fontStyle: "italic" }}>
              None selected
            </div>
          )}
        </div>

        {/* Applicant */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              color: theme.text3,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Applicant
          </div>
          <div style={{ fontSize: 13, color: applicantName ? theme.text : theme.text3, fontStyle: applicantName ? "normal" : "italic" }}>
            {applicantName || "Not entered yet"}
          </div>
        </div>

        <div style={{ borderTop: `1px dashed ${theme.border}`, paddingTop: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontSize: 12.5, color: theme.text2, fontWeight: 600 }}>
              Total Due
            </span>
            <span
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: theme.maroon,
                fontFamily: fontMono,
              }}
            >
              {money(totalDue)}
            </span>
          </div>
        </div>
      </SectionCard>

      {NEXT_HINTS[step] && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            background: theme.blueBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            fontSize: 12,
            color: theme.text2,
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: theme.blue }}>Next: </b>
          {NEXT_HINTS[step]}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function MCRenewalPortal({
  currentUser,
  onNavigate,
  standalone,
}) {
  const { settings } = useSettings();

  // NEW: Authentication & Dashboard State
  const [internalCurrentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem("cma_currentUser");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const activeUser = currentUser || internalCurrentUser;

  const [portalView, setPortalView] = useState(
    standalone ? "wizard" : "dashboard",
  ); // 'dashboard', 'wizard'
  const [dashboardRenewals, setDashboardRenewals] = useState([]);
  const [allRenewals, setAllRenewals] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [draft, setDraft] = useState(null);

  const [step, setStep] = useState(1);

  // ---- Step 2: applicant details (Moved from Step 1) ---------------------
  const blankApplicant = {
    firstName: "",
    lastName: "",
    nic: "",
    phone: "",
    email: "",
    addr1: "",
    addr2: "",
    addr3: "",
    province: "",
    district: "",
    city: "",
    postalCode: "",
  };
  const [applicant, setApplicant] = useState(() => {
    let fName = "";
    let lName = "";
    let email = "";
    if (activeUser) {
      const parts = (activeUser.name || "").split(" ");
      fName = parts[0] || "";
      lName = parts.slice(1).join(" ") || "";
      email = activeUser.email || "";
    }
    return { ...blankApplicant, firstName: fName, lastName: lName, email };
  });
  const [touched, setTouched] = useState(false);

  const requiredOk =
    applicant.firstName.trim() &&
    applicant.lastName.trim() &&
    applicant.phone.trim() &&
    applicant.addr1.trim() &&
    applicant.province &&
    applicant.district &&
    applicant.city.trim() &&
    applicant.postalCode.trim();

  const setA = (k, v) =>
    setApplicant((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "province") next.district = ""; // reset dependent field
      return next;
    });

  const [dashboardSearchQuery, setDashboardSearchQuery] = useState("");

  const userIdentifier = activeUser?.username || "guest";

  // Load dashboard
  async function loadDashboard() {
    setLoadingDashboard(true);
    try {
      const all = await fetchRenewals();
      setAllRenewals(all);
      const myRenewals = all.filter(
        (r) =>
          r.applicant_name === activeUser?.name ||
          r.applicant_email === activeUser?.email,
      );
      setDashboardRenewals(myRenewals);

      const savedDraft = localStorage.getItem("cma_draft_" + userIdentifier);
      if (savedDraft) {
        setDraft(JSON.parse(savedDraft));
      } else {
        setDraft(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDashboard(false);
    }
  }

  // Load dashboard on mount for both public and logged-in users
  useEffect(() => {
    loadDashboard();
  }, [activeUser]);

  function startNew() {
    let fName = "",
      lName = "",
      email = "";
    if (activeUser) {
      const parts = (activeUser.name || "").split(" ");
      fName = parts[0] || "";
      lName = parts.slice(1).join(" ") || "";
      email = activeUser.email || "";
    }
    setApplicant({
      ...blankApplicant,
      firstName: fName,
      lastName: lName,
      email,
    });
    setSelectedMC(null);
    setSelectedYears([]);
    setStep(1);
    setPortalView("wizard");
  }

  function resumeDraft() {
    if (draft) {
      setApplicant(draft.applicant || { ...blankApplicant });
      setSelectedMC(draft.selectedMC || null);
      setSelectedYears(draft.selectedYears || []);
      setStep(draft.step || 1);
      setPortalView("wizard");
    }
  }

  function quitToDashboard() {
    if (standalone) {
      window.location.href = "/";
    } else {
      setPortalView("dashboard");
      loadDashboard();
    }
  }

  // Auto-save draft logic moved to the bottom to avoid TDZ

  // ---- Step 1: search / select MC (Moved from Step 2) --------------------
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("planNo");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMC, setSelectedMC] = useState(null);

  const currentYear = new Date().getFullYear();
  const multiYearRows = selectedMC
    ? buildMultiYearRenewalRows(selectedMC, currentYear)
    : [];

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!searchOpen) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await renewalApi.searchMC(searchQuery, searchFilter);
      setSearchResults(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, searchFilter, searchOpen]);

  async function pickMC(record) {
    setSelectedMC(record);
    setSearchOpen(false);
    setSearchQuery("");
    setSelectedYears([]);
    // Refresh renewals from backend so timeline shows latest paid/active years
    try {
      const freshRenewals = await fetchRenewals();
      setAllRenewals(freshRenewals);
    } catch (e) {
      // silently ignore — stale data will still show from state
    }
    setStep(2); // Move to Applicant Details
  }

  // ---- Step 3: renewal timeline / year selection --------------------------
  const dueRows = useMemo(
    () => (selectedMC ? buildMultiYearRenewalRows(selectedMC, settings) : []),
    [selectedMC, settings],
  );
  const lastRenewedYear =
    dueRows.length > 0 ? dueRows[0].year - 1 : selectedMC ? CURRENT_YEAR : null;

  const timeline = useMemo(() => {
    if (!selectedMC) return [];

    // Find all database renewals for this specific MC
    const mcRenewals = allRenewals.filter(
      (r) => r.plan_no === selectedMC.planNo,
    );

    // Also collect years already marked paid in the MC's own renewal_paid_year field
    const mcPaidYears = [];
    if (selectedMC.renewal_paid_year) {
      const rawYear = parseInt(String(selectedMC.renewal_paid_year).trim());
      if (!isNaN(rawYear)) mcPaidYears.push(rawYear);
    }

    const items = [];
    for (let y = lastRenewedYear - 2; y <= lastRenewedYear; y++) {
      if (y > 0) items.push({ year: y, status: "paid" });
    }
    for (const r of dueRows) {
      // Check if already paid via MC record's renewal_paid_year
      if (mcPaidYears.includes(r.year)) {
        items.push({ year: r.year, status: "paid", row: r });
        continue;
      }
      // Check if there is an active or pending renewal for this year in the database
      const existingPayment = mcRenewals.find(
        (mr) =>
          mr.years &&
          mr.years.includes(r.year) &&
          (mr.status === "active" || mr.status === "pending_approval"),
      );

      if (existingPayment) {
        items.push({
          year: r.year,
          status: existingPayment.status === "active" ? "paid" : "processing",
          row: r,
        });
      } else {
        items.push({ year: r.year, status: "due", row: r });
      }
    }
    return items;
  }, [dueRows, selectedMC, lastRenewedYear, allRenewals]);

  const [selectedYears, setSelectedYears] = useState([]);

  const totalDue = useMemo(() => {
    let sum = 0;
    for (const y of selectedYears) {
      const r = dueRows.find((dr) => dr.year === y);
      if (r) sum += r.total;
    }
    return sum;
  }, [selectedYears, dueRows]);

  function toggleYear(year) {
    setSelectedYears((prev) =>
      prev.includes(year)
        ? prev.filter((y) => y !== year)
        : [...prev, year].sort(),
    );
  }

  // ---- Step 4/5: payment + pending approval --------------------------------
  const [paying, setPaying] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [renewalRecord, setRenewalRecord] = useState(null);
  const pollRef = useRef(null);

  async function submitPayment() {
    setPaying(true);
    setSubmitError("");

    try {
      const record = await renewalApi.initiateGovPay({
        applicant,
        mc: selectedMC,
        years: selectedYears,
        amount: totalDue,
      });

      // Refresh allRenewals so dashboard shows the new pending record
      const freshRenewals = await fetchRenewals();
      setAllRenewals(freshRenewals);
      setRenewalRecord(record);
      // Go to Step 5 (Pending Approval) — officer must approve from Renewal Approval page
      setStep(5);
    } catch (e) {
      setSubmitError(
        e.message || "Failed to submit payment. Please try again.",
      );
    } finally {
      setPaying(false);
    }
  }

  // Poll for the officer's approval decision while on the "pending" step.
  useEffect(() => {
    if (step !== 5 || !renewalRecord) return;
    pollRef.current = setInterval(async () => {
      const latest = await renewalApi.checkStatus(renewalRecord.ref_no);
      if (latest && latest.status !== "pending_approval") {
        setRenewalRecord(latest);
        clearInterval(pollRef.current);
        if (latest.status === "active") setStep(6);
      }
    }, 2500);
    return () => clearInterval(pollRef.current);
  }, [step, renewalRecord]);

  async function refreshStatusNow() {
    if (!renewalRecord) return;
    const latest = await renewalApi.checkStatus(renewalRecord.ref_no);
    if (latest) {
      setRenewalRecord(latest);
      if (latest.status === "active") setStep(6);
    }
  }

  // ---- Step 6: download receipt -------------------------------------------
  function downloadReceipt(record) {
    const r = record ||
      renewalRecord ||
      (dashboardRenewals && dashboardRenewals[0]) || { years: [] };
    const win = window.open("", "_blank");

    // Whether this receipt is for the renewal that's currently active in
    // the wizard (selectedMC/applicant are still in state and reliable), or
    // an older one picked from the "My Renewals" table (in which case we
    // fall back to whatever the saved record itself carries).
    const isCurrentFlow = r === renewalRecord;

    // Calculate taxes back from total
    const feeRs = r.amount / 1.2095;
    const sscl = feeRs * 0.025;
    const vat = (feeRs + sscl) * 0.18;

    const yearsStr =
      r.years && r.years.length > 0
        ? `${r.years[0]} to ${r.years[r.years.length - 1]}`
        : new Date().getFullYear().toString();
    const address = isCurrentFlow && applicant
      ? `${applicant.addr1 || ""} ${applicant.addr2 || ""}, ${applicant.city || ""}`
      : r.applicant_address || r.address || "";
    const units =
      (isCurrentFlow &&
        (selectedMC?.units || selectedMC?.residential_units)) ||
      r.units ||
      r.residential_units ||
      "N/A";
    const category =
      (isCurrentFlow && selectedMC?.category) || r.category || "-";

    win.document.write(`
      <html><head><title>Renewal Receipt - ${r.ref_no || ""}</title>
      <style>
        @page { margin: 20px; size: A4 portrait; }
        body { font-family: "Times New Roman", Times, serif; color: #000; margin: 0 auto; padding: 40px; max-width: 800px; background: #fff; line-height: 1.5; font-size: 14px; }
        .top-ref { text-align: right; font-weight: bold; margin-bottom: 20px; font-size: 14px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 80px; height: 80px; margin-bottom: 15px; border-radius: 50%; object-fit: contain; }
        .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0; }
        .subtitle { font-size: 14px; margin: 5px 0 20px; }
        
        .line-input { display: flex; align-items: baseline; margin-bottom: 15px; }
        .line-input span { min-width: max-content; margin-right: 10px; }
        .dashed-line { flex-grow: 1; border-bottom: 1px dashed #000; }
        
        .checkbox-group { display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 25px; align-items: center; }
        .checkbox-item { display: flex; align-items: center; gap: 5px; }
        .box { width: 14px; height: 14px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-top: 1px solid #000; }
        td { padding: 10px 0; border-bottom: 1px dashed #999; vertical-align: top; }
        td:first-child { font-weight: bold; width: 40%; }
        td:last-child { width: 60%; }
        tr.total-row td { border-bottom: 2px solid #000; border-top: 1px solid #000; font-weight: bold; font-size: 15px; }
        tr.total-row td:last-child { text-align: left; }
        
        .footer-text { margin-bottom: 60px; line-height: 2; }
        .signatures { display: flex; justify-content: space-between; }
        .sig-block { width: 250px; text-align: center; border-top: 1px solid #000; padding-top: 5px; }
      </style></head>
      <body onload="window.print()">
        <div class="top-ref">No. ${r.ref_no || ""}</div>
        
        <div class="header">
          <img src="/cma-logo.png" alt="CMA Logo" class="logo" onerror="this.style.display='none'" />
          <div class="title">CONDOMINIUM MANAGEMENT AUTHORITY</div>
          <div class="subtitle">Customer Care Division / Legal Division</div>
        </div>
        
        <div class="line-input">
          <span>DGM Finance / Shroff</span>
          <div class="dashed-line"></div>
        </div>
        
        <div class="checkbox-group">
          <div class="checkbox-item">Registration of Management Corporation <div class="box"></div></div>
          <div class="checkbox-item">/ Renewal <div class="box">✓</div></div>
          <div class="checkbox-item">/ Application Fee <div class="box"></div></div>
          <div class="checkbox-item">/ Photocopy Charges <div class="box"></div></div>
          <div class="checkbox-item">/ Others <div class="box"></div></div>
        </div>
        
        <table>
          <tbody>
            <tr>
              <td>File No</td>
              <td>${r.plan_no || ""}</td>
            </tr>
            <tr>
              <td>Name of the MC & Address</td>
              <td>${r.mc_name || ""} | ${address}</td>
            </tr>
            <tr>
              <td>Period</td>
              <td>${yearsStr}</td>
            </tr>
            <tr>
              <td>Category</td>
              <td>${category}</td>
            </tr>
            <tr>
              <td>Number of Parcels (Units)</td>
              <td>${units}</td>
            </tr>
            <tr>
              <td>Period (months charged)</td>
              <td>${(r.years?.length || 1) * 12}</td>
            </tr>
            <tr>
              <td>Fee Rs. (Rate ${money(feeRs / (units || 1))} / 12 x 12 months x ${units} units)</td>
              <td>${money(feeRs).replace("Rs. ", "")}</td>
            </tr>
            <tr>
              <td>Other Tax - SSCL (2.5%)</td>
              <td>${money(sscl).replace("Rs. ", "")}</td>
            </tr>
            <tr>
              <td>VAT (18%)</td>
              <td>${money(vat).replace("Rs. ", "")}</td>
            </tr>
            <tr class="total-row">
              <td>Total Amount Rs.</td>
              <td>${money(r.amount).replace("Rs. ", "")}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer-text">
          Please accept Rs. _________________________ (Cash / Cheque) Cheque No. _________________________<br/>
          Cheque Date _________________________ Branch _________________________ from the above MC.
        </div>
        
        <div class="signatures">
          <div class="sig-block">Authorized Signature</div>
          <div class="sig-block">Date</div>
        </div>
      </body></html>
    `);
    win.document.close();
  }

  // Auto-save draft
  useEffect(() => {
    if (portalView === "wizard" && currentUser) {
      if (step < 5) {
        localStorage.setItem(
          "cma_draft_" + currentUser.username,
          JSON.stringify({
            step,
            applicant,
            selectedMC,
            selectedYears,
          }),
        );
      } else {
        localStorage.removeItem("cma_draft_" + currentUser.username);
      }
    }
  }, [step, applicant, selectedMC, selectedYears, portalView, activeUser]);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  const steps = [
    "Select MC / M.Com",
    "Choose Year",
    "Applicant Details",
    "Payment",
    "Approval",
    "Complete",
  ];
  const stepForHeader = step;

  const searchInputStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "16px 20px",
    background: theme.amberBg,
    border: `2px solid ${theme.border}`,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    color: theme.text,
    cursor: "pointer",
    textAlign: "left",
    transition: "border 0.2s",
  };

  return (
    <div
      style={{
        background: theme.cream,
        // Fixed, full-viewport overlay — this sits above whatever
        // sidebar/top bar the host app renders, so this screen reads as a
        // clean, standalone page without needing a separate route.
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        overflowY: "auto",
        fontFamily: fontBody,
      }}
    >
      {/* ---------------- Body ---------------- */}
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "40px 4vw 60px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Removed Phone Login form */}

        {portalView === "dashboard" && (
          <SectionCard>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: fontDisplay,
                    fontSize: 22,
                    color: theme.maroonDark,
                    margin: "0 0 4px",
                  }}
                >
                  My Renewals
                </h2>
                <p style={{ color: theme.text2, fontSize: 13, margin: 0 }}>
                  Logged in as: <b>{activeUser?.name || "Guest"}</b>
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Search Plan No or Name..."
                  value={dashboardSearchQuery}
                  onChange={(e) => setDashboardSearchQuery(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    border: `1px solid ${theme.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    outline: "none",
                    minWidth: 200,
                  }}
                />
                <button type="button" style={pillBtn(true)} onClick={startNew}>
                  + New Renewal
                </button>
              </div>
            </div>

            {loadingDashboard ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: theme.text3,
                }}
              >
                Loading...
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  overflowX: "auto",
                  overflowY: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    minWidth: 900,
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: theme.cream,
                        borderBottom: `1px solid ${theme.border}`,
                      }}
                    >
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          color: theme.text2,
                          fontSize: 11.5,
                          textTransform: "uppercase",
                        }}
                      >
                        Ref No
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          color: theme.text2,
                          fontSize: 11.5,
                          textTransform: "uppercase",
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          color: theme.text2,
                          fontSize: 11.5,
                          textTransform: "uppercase",
                        }}
                      >
                        MC / M.Com
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "12px 16px",
                          color: theme.text2,
                          fontSize: 11.5,
                          textTransform: "uppercase",
                        }}
                      >
                        Amount
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "12px 16px",
                          color: theme.text2,
                          fontSize: 11.5,
                          textTransform: "uppercase",
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft && (
                      <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{ color: theme.text3, fontStyle: "italic" }}
                          >
                            Draft
                          </span>
                          <br />
                          <span
                            style={{
                              background: theme.amberBg,
                              color: "#8a6d00",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            Incomplete
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600, color: theme.text }}>
                            {draft.selectedMC
                              ? draft.selectedMC.name
                              : "Not selected"}
                          </div>
                          <div style={{ fontSize: 11.5, color: theme.text3 }}>
                            Step {draft.step}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontFamily: fontMono,
                          }}
                        >
                          -
                        </td>
                        <td
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          <button
                            onClick={resumeDraft}
                            style={{
                              background: "transparent",
                              border: `1px solid ${theme.blue}`,
                              color: theme.blue,
                              padding: "4px 12px",
                              borderRadius: 999,
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Resume
                          </button>
                        </td>
                      </tr>
                    )}

                    {(() => {
                      const rawQ = dashboardSearchQuery.trim().toLowerCase();
                      const terms = rawQ.split(/[\s,]+/).filter(Boolean);

                      let filtered = [];

                      if (!rawQ) {
                        if (!activeUser) {
                          return (
                            <tr>
                              <td colSpan="5" style={{ padding: "30px 16px", textAlign: "center", color: theme.text3 }}>
                                Please enter a Plan No or Name to search for renewals.
                              </td>
                            </tr>
                          );
                        } else {
                          filtered = dashboardRenewals;
                          if (filtered.length === 0 && !draft) {
                            return (
                              <tr>
                                <td colSpan="5" style={{ padding: "30px 16px", textAlign: "center", color: theme.text3 }}>
                                  No renewals found for your account. You can search above to find any plan.
                                </td>
                              </tr>
                            );
                          }
                        }
                      } else {
                        filtered = allRenewals.filter((r) => {
                          const combined = `${r.plan_no || ""} ${r.mc_name || ""} ${r.ref_no || ""} ${r.applicant_name || ""}`.toLowerCase();
                          return terms.every(t => combined.includes(t));
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan="5" style={{ padding: "30px 16px", textAlign: "center", color: theme.text3 }}>
                                No matching renewals found for "{dashboardSearchQuery}"
                              </td>
                            </tr>
                          );
                        }
                      }

                      return filtered.map((r) => (
                        <tr
                          key={r.ref_no}
                          style={{ borderBottom: `1px solid ${theme.border}` }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                fontFamily: fontMono,
                                fontWeight: 600,
                                color: theme.maroon,
                              }}
                            >
                              {r.ref_no}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                background:
                                  r.status === "active"
                                    ? theme.greenBg
                                    : theme.amberBg,
                                color:
                                  r.status === "active"
                                    ? theme.green
                                    : "#8a6d00",
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {r.status === "active"
                                ? "Active"
                                : r.status === "pending_approval"
                                  ? "Pending Approval"
                                  : r.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600, color: theme.text }}>
                              {r.mc_name || r.plan_no}
                            </div>
                            <div style={{ fontSize: 11.5, color: theme.text3 }}>
                              Years: {r.years?.join(", ")}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "right",
                              fontFamily: fontMono,
                              fontWeight: 600,
                            }}
                          >
                            {money(r.amount)}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                            }}
                          >
                            {r.status === "active" ? (
                              <button
                                type="button"
                                onClick={() => downloadReceipt(r)}
                                title="Download receipt for this renewal"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: theme.greenBg,
                                  border: `1px solid ${theme.green}`,
                                  color: theme.green,
                                  padding: "5px 12px",
                                  borderRadius: 999,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                ⬇ Download
                              </button>
                            ) : (
                              <span
                                style={{ color: theme.text3, fontSize: 12 }}
                              >
                                Processing
                              </span>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {/* Removed internal Log Out button as it should use the web app's global logout */}
          </SectionCard>
        )}

        {portalView === "wizard" && (
          <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
            {/* Top Navigation Bar / Stepper */}
            <SectionCard style={{ marginBottom: 30 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 14,
                }}
              >
                <StepHeader steps={steps} current={stepForHeader} />
                {!standalone ? (
                  <button
                    onClick={quitToDashboard}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.text3,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    Exit to Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => (window.location.href = "/")}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.text3,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    Exit to Dashboard
                  </button>
                )}
              </div>
            </SectionCard>

            {/* MAIN CONTENT AREA — steps on the left, live summary on the right */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: step >= 1 && step <= 4 ? "1fr 320px" : "1fr",
                gap: 24,
                alignItems: "start",
              }}
            >
              <div style={{ position: "relative" }}>
                {/* --- STEP 1: Search --- */}
                {step === 1 && (
                  <SectionCard style={{ marginBottom: 0 }}>
                    <div style={{ marginBottom: 16 }}>
                      <h2
                        style={{
                          fontFamily: fontDisplay,
                          fontSize: 19,
                          color: theme.maroonDark,
                          margin: 0,
                        }}
                      >
                        1. Find Management Corporation
                      </h2>
                    </div>
                    <p
                      style={{
                        margin: "0 0 20px",
                        fontSize: 13,
                        color: theme.text2,
                      }}
                    >
                      Search and select the Management Corporation (MC) or
                      Management Committee (M.Com) you wish to renew.
                    </p>
                    <button
                      onClick={() => {
                        setSearchOpen(true);
                        setTimeout(
                          () => document.getElementById("search-input")?.focus(),
                          50,
                        );
                      }}
                      style={searchInputStyle}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: theme.maroon }}
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      {selectedMC
                        ? `${selectedMC.name} (${selectedMC.planNo})`
                        : "Click to search by Plan No or Name..."}
                    </button>
                  </SectionCard>
                )}

                {/* --- STEP 2: Choose Year --- */}
                {selectedMC && step === 2 && (
                  <SectionCard style={{ marginBottom: 0 }}>
                    <h2
                      style={{
                        fontFamily: fontDisplay,
                        fontSize: 19,
                        color: theme.maroonDark,
                        margin: "0 0 4px",
                      }}
                    >
                      2. Renewal Status & Select Year
                    </h2>
                    <p
                      style={{
                        margin: "0 0 20px",
                        fontSize: 13,
                        color: theme.text2,
                      }}
                    >
                      Select the years you wish to renew.
                    </p>
                    {multiYearRows.length === 0 ? (
                      <div
                        style={{
                          padding: "24px",
                          textAlign: "center",
                          background: "#f9f9f9",
                          borderRadius: 8,
                          color: theme.text3,
                          fontSize: 13,
                        }}
                      >
                        No available renewal years for this MC.
                      </div>
                    ) : (
                      <div
                        style={{
                          border: `1px solid ${theme.border}`,
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "#fff",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 13,
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                background: "#f9f9f9",
                                borderBottom: `1px solid ${theme.border}`,
                              }}
                            >
                              <th
                                style={{
                                  textAlign: "left",
                                  padding: "12px",
                                  color: theme.text2,
                                  fontSize: 11,
                                  textTransform: "uppercase",
                                }}
                              >
                                Year
                              </th>
                              <th
                                style={{
                                  textAlign: "left",
                                  padding: "12px",
                                  color: theme.text2,
                                  fontSize: 11,
                                  textTransform: "uppercase",
                                }}
                              >
                                Status
                              </th>
                              <th
                                style={{
                                  textAlign: "left",
                                  padding: "12px",
                                  color: theme.text2,
                                  fontSize: 11,
                                  textTransform: "uppercase",
                                }}
                              >
                                Amount
                              </th>
                              <th
                                style={{
                                  textAlign: "center",
                                  padding: "12px",
                                  color: theme.text2,
                                  fontSize: 11,
                                  textTransform: "uppercase",
                                }}
                              >
                                Select
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {multiYearRows.map((yr, idx) => (
                              <tr
                                key={yr.year}
                                style={{
                                  borderBottom:
                                    idx < multiYearRows.length - 1
                                      ? `1px solid ${theme.border}`
                                      : "none",
                                  background: selectedYears.includes(yr.year)
                                    ? theme.cream
                                    : "transparent",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "12px",
                                    fontWeight: 600,
                                    color: theme.text,
                                  }}
                                >
                                  {yr.year}
                                </td>
                                <td
                                  style={{ padding: "12px", color: theme.text3 }}
                                >
                                  {yr.status || ""}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    fontFamily: fontMono,
                                    fontWeight: 600,
                                  }}
                                >
                                  {money(yr.total)}
                                </td>
                                <td
                                  style={{ padding: "12px", textAlign: "center" }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedYears.includes(yr.year)}
                                    onChange={() => toggleYear(yr.year)}
                                    style={{
                                      width: 16,
                                      height: 16,
                                      cursor: "pointer",
                                      accentColor: theme.maroon,
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: 20,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <button
                        onClick={() => setStep(1)}
                        style={pillBtn(false, theme.text3)}
                      >
                        Back
                      </button>
                      {selectedYears.length > 0 && (
                        <button onClick={() => setStep(3)} style={pillBtn(true)}>
                          Next Step
                        </button>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* --- STEP 3: Applicant Details --- */}
                {selectedMC &&
                  selectedYears.length > 0 &&
                  !renewalRecord &&
                  step === 3 && (
                    <SectionCard style={{ marginBottom: 0 }}>
                      <h2
                        style={{
                          fontFamily: fontDisplay,
                          fontSize: 19,
                          color: theme.maroonDark,
                          margin: "0 0 4px",
                        }}
                      >
                        3. Your Details
                      </h2>
                      <p
                        style={{
                          margin: "0 0 20px",
                          fontSize: 13,
                          color: theme.text2,
                        }}
                      >
                        We'll use this to prepare your renewal application and
                        receipt.
                      </p>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 20,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            First Name *
                          </div>
                          <input
                            type="text"
                            value={applicant.firstName}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                firstName: e.target.value,
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            Last Name *
                          </div>
                          <input
                            type="text"
                            value={applicant.lastName}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                lastName: e.target.value,
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            Telephone No *
                          </div>
                          <input
                            type="tel"
                            value={applicant.phone}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                phone: e.target.value,
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            Email (optional)
                          </div>
                          <input
                            type="email"
                            value={applicant.email}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                email: e.target.value,
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            NIC No *
                          </div>
                          <input
                            type="text"
                            value={applicant.nic}
                            onChange={(e) =>
                              setApplicant({ ...applicant, nic: e.target.value })
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            Address Line 1 *
                          </div>
                          <input
                            type="text"
                            value={applicant.addr1}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                addr1: e.target.value,
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            Address Line 2
                          </div>
                          <input
                            type="text"
                            value={applicant.addr2}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                addr2: e.target.value,
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            Address Line 3
                          </div>
                          <input
                            type="text"
                            value={applicant.addr3}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                addr3: e.target.value,
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            Province *
                          </div>
                          <select
                            value={applicant.province}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                province: e.target.value,
                                district: "",
                                city: "",
                              })
                            }
                            style={inputStyle}
                          >
                            <option value="">Select Province</option>
                            {Object.keys(sriLankaData).map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            District *
                          </div>
                          <select
                            value={applicant.district}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                district: e.target.value,
                                city: "",
                              })
                            }
                            style={inputStyle}
                            disabled={!applicant.province}
                          >
                            <option value="">Select District</option>
                            {applicant.province &&
                              Object.keys(
                                sriLankaData[applicant.province] || {},
                              ).map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 6,
                              color: theme.text2,
                            }}
                          >
                            City *
                          </div>
                          <input
                            type="text"
                            value={applicant.city}
                            onChange={(e) =>
                              setApplicant({
                                ...applicant,
                                city: e.target.value,
                              })
                            }
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 20,
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <button
                          onClick={() => setStep(2)}
                          style={pillBtn(false, theme.text3)}
                        >
                          Back
                        </button>
                        {applicant.firstName &&
                          applicant.lastName &&
                          applicant.phone &&
                          applicant.nic &&
                          applicant.addr1 &&
                          applicant.province &&
                          applicant.district &&
                          applicant.city && (
                            <button
                              onClick={() => setStep(4)}
                              style={pillBtn(true)}
                            >
                              Save and Payment
                            </button>
                          )}
                      </div>
                    </SectionCard>
                  )}

                {/* --- STEP 4: Payment --- */}
                {selectedMC &&
                  selectedYears.length > 0 &&
                  !renewalRecord &&
                  step === 4 && (
                    <SectionCard style={{ marginBottom: 0 }}>
                      <h2
                        style={{
                          fontFamily: fontDisplay,
                          fontSize: 19,
                          color: theme.maroonDark,
                          margin: "0 0 4px",
                        }}
                      >
                        4. Secure Payment
                      </h2>
                      <p
                        style={{
                          margin: "0 0 20px",
                          fontSize: 13,
                          color: theme.text2,
                        }}
                      >
                        You will be redirected to the secure GovPay gateway.
                      </p>

                      {/* Summary Block */}
                      <div
                        style={{
                          background: theme.cream,
                          borderRadius: 10,
                          padding: 20,
                          marginBottom: 20,
                        }}
                      >
                        <h3
                          style={{
                            margin: "0 0 14px",
                            fontSize: 14,
                            color: theme.maroon,
                          }}
                        >
                          Order Summary
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 8,
                            fontSize: 13,
                          }}
                        >
                          <span style={{ color: theme.text2 }}>MC/M.Com</span>
                          <span style={{ fontWeight: 600 }}>
                            {selectedMC.name}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 8,
                            fontSize: 13,
                          }}
                        >
                          <span style={{ color: theme.text2 }}>
                            Renewal Years
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            {selectedYears.join(", ")}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 1,
                            background: theme.border,
                            margin: "14px 0",
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            Total Amount
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 18,
                              color: theme.maroonDark,
                            }}
                          >
                            {money(totalDue)}
                          </span>
                        </div>
                      </div>

                      {submitError && (
                        <div
                          style={{
                            background: theme.amberBg,
                            color: "#8a6d00",
                            padding: 14,
                            borderRadius: 8,
                            fontSize: 13,
                            marginBottom: 20,
                            fontWeight: 500,
                          }}
                        >
                          {submitError}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 20,
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <button
                          onClick={() => setStep(3)}
                          disabled={paying}
                          style={pillBtn(false, theme.text3)}
                        >
                          Back
                        </button>
                        <button
                          onClick={submitPayment}
                          disabled={paying}
                          style={{
                            ...pillBtn(true, theme.green),
                            opacity: paying ? 0.7 : 1,
                          }}
                        >
                          {paying ? "Processing..." : "Save and Payment"}
                        </button>
                      </div>
                    </SectionCard>
                  )}

                {/* --- STEP 5 & 6: Success / Receipt --- */}
                {renewalRecord && (step === 5 || step === 6) && (
                  <SectionCard style={{ marginBottom: 0, textAlign: "center" }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: theme.greenBg,
                        color: theme.green,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px",
                      }}
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h2
                      style={{
                        fontFamily: fontDisplay,
                        fontSize: 22,
                        color: theme.maroonDark,
                        margin: "0 0 8px",
                      }}
                    >
                      {step === 5 ? "Payment Received" : "Renewal Completed"}
                    </h2>
                    <p
                      style={{
                        margin: "0 0 24px",
                        fontSize: 14,
                        color: theme.text2,
                      }}
                    >
                      {step === 5
                        ? `Your renewal request (${renewalRecord.ref_no}) has been submitted and is awaiting admin approval.`
                        : `Your renewal request (${renewalRecord.ref_no}) has been approved!`}
                    </p>

                    <div
                      style={{
                        background: "#f9f9f9",
                        borderRadius: 8,
                        padding: 20,
                        textAlign: "left",
                        display: "inline-block",
                        minWidth: 300,
                        marginBottom: 24,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 12,
                          borderBottom: "1px dashed #ccc",
                          paddingBottom: 12,
                        }}
                      >
                        <span style={{ color: theme.text2, fontSize: 13 }}>
                          Reference No
                        </span>
                        <span style={{ fontWeight: 700, fontFamily: fontMono }}>
                          {renewalRecord.ref_no}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 12,
                          borderBottom: "1px dashed #ccc",
                          paddingBottom: 12,
                        }}
                      >
                        <span style={{ color: theme.text2, fontSize: 13 }}>
                          Amount Paid
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: fontMono,
                            color: theme.maroonDark,
                          }}
                        >
                          {money(renewalRecord.amount)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: theme.text2, fontSize: 13 }}>
                          Status
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: step === 5 ? "#8a6d00" : theme.green,
                          }}
                        >
                          {step === 5 ? "Pending Approval" : "Active"}
                        </span>
                      </div>
                    </div>
                    <br />
                    <button
                      onClick={downloadReceipt}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 999,
                        fontSize: 13.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: theme.maroon,
                        color: "#fff",
                        border: "none",
                      }}
                    >
                      ⬇ Download Renewal Receipt
                    </button>
                    {step === 5 && (
                      <div
                        style={{
                          marginTop: 20,
                          fontSize: 12,
                          color: theme.text3,
                        }}
                      >
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            simulateApproval();
                          }}
                          style={{
                            color: theme.maroon,
                            textDecoration: "underline",
                          }}
                        >
                          Simulate Admin Approval (Dev)
                        </a>
                      </div>
                    )}
                  </SectionCard>
                )}
              </div>

              {/* Right column: live summary — only while still filling the
                application (steps 1-4); not shown on Approval/Complete since
                that content already has its own status card. */}
              {step >= 1 && step <= 4 && (
                <SummaryPanel
                  selectedMC={selectedMC}
                  selectedYears={selectedYears}
                  totalDue={totalDue}
                  applicant={applicant}
                  step={step}
                />
              )}
            </div>
          </div>
        )}

        {/* ---------------- Search popup ---------------- */}
        {searchOpen && (
          <div
            onClick={(e) =>
              e.target === e.currentTarget && setSearchOpen(false)
            }
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(30,10,10,.5)",
              zIndex: 400,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "8vh 20px",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                width: "100%",
                maxWidth: 560,
                boxShadow: "0 24px 70px rgba(0,0,0,.3)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: theme.maroon,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ color: "#fff", fontWeight: 700, fontSize: 14.5 }}
                >
                  Search Plan No / MC Name
                </span>
                <button
                  id="mcrp_close_search_btn"
                  onClick={() => setSearchOpen(false)}
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "none",
                    color: "#fff",
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: 18 }}>
                <div
                  style={{
                    display: "flex",
                    border: `1px solid ${theme.border}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 14,
                    background: "#fff",
                  }}
                >
                  <select
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    style={{
                      padding: "12px 14px",
                      border: "none",
                      borderRight: `1px solid ${theme.border}`,
                      background: "#f9f9f9",
                      color: theme.maroonDark,
                      fontWeight: 600,
                      fontSize: 13,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="planNo">Plan No</option>
                    <option value="name">Management Corporation Name</option>
                  </select>
                  <input
                    id="mcrp_search_input"
                    name="mcSearch"
                    autoFocus
                    style={{
                      border: "none",
                      flex: 1,
                      padding: "12px 14px",
                      outline: "none",
                      fontSize: 13.5,
                      background: "transparent",
                    }}
                    placeholder={
                      searchFilter === "planNo"
                        ? "Type Plan No (e.g. CP.No-447)..."
                        : "Type Corporation Name..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {searching && (
                    <div
                      style={{
                        color: theme.text3,
                        fontSize: 13,
                        padding: "10px 0",
                      }}
                    >
                      Searching…
                    </div>
                  )}
                  {!searching && searchQuery && searchResults.length === 0 && (
                    <div
                      style={{
                        color: theme.text3,
                        fontSize: 13,
                        padding: "10px 0",
                      }}
                    >
                      No records found for "{searchQuery}".
                    </div>
                  )}
                  {searchResults.map((r, i) => (
                    <button
                      key={r.planNo + "-" + i}
                      type="button"
                      onClick={() => pickMC(r)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 14px",
                        marginBottom: 8,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 8,
                        background: "#fafafa",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13.5,
                          color: theme.maroonDark,
                        }}
                      >
                        {r.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: theme.text2,
                          fontFamily: fontMono,
                        }}
                      >
                        {r.planNo} · {r.type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}