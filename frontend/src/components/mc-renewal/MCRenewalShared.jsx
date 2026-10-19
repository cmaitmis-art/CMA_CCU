import React from "react";

export const sriLankaData = {
  Western: {
    Colombo: [
      "Colombo 01", "Colombo 02", "Colombo 03", "Colombo 04", "Colombo 05",
      "Colombo 06", "Dehiwala", "Moratuwa", "Kotte", "Maharagama", "Nugegoda", "Homagama",
    ],
    Gampaha: ["Gampaha", "Negombo", "Kelaniya", "Kadawatha", "Ja-Ela", "Wattala"],
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

export const SL_PROVINCES = {
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

export const theme = {
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

export const fontDisplay = "'Poppins', 'Segoe UI', Arial, sans-serif";
export const fontBody = "'Inter', 'Segoe UI', Arial, sans-serif";
export const fontMono = "'Roboto Mono', 'Courier New', monospace";

export const money = (n) =>
  "Rs. " +
  Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function Field({ label, required, children }) {
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

export const inputStyle = {
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

export const pillBtn = (active, color = theme.maroon) => ({
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

export function SectionCard({ children, style }) {
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

export function StepHeader({ steps, current }) {
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

const NEXT_HINTS = {
  1: "Search and pick the MC / M.Com you want to renew to continue.",
  2: "Tick every year you want to pay for — you can select more than one.",
  3: "Fill in your details, they'll be printed on the receipt.",
  4: "Review the amount and pay securely via GovPay.",
};

export function SummaryPanel({ selectedMC, selectedYears, totalDue, applicant, step }) {
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
              <div style={{ fontSize: 12, color: theme.text2, fontFamily: fontBody }}>
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
                    fontFamily: fontBody,
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
                fontFamily: fontBody,
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
