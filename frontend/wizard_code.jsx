                            style={{
                              fontFamily: fontMono,
                              fontWeight: 600,
                              color: theme.maroon,
                            }}
                          >
                            {r.ref_no}
                          </span>
                          <br />
                          <span
                            style={{
                              background:
                                r.status === "active"
                                  ? theme.greenBg
                                  : theme.amberBg,
                              color:
                                r.status === "active" ? theme.green : "#8a6d00",
                              padding: "2px 8px",
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
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          {r.status === "active" ? (
                            <span
                              style={{
                                color: theme.green,
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            >
                              ✓ Completed
                            </span>
                          ) : (
                            <span style={{ color: theme.text3, fontSize: 12 }}>
                              Processing
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Removed internal Log Out button as it should use the web app's global logout */}
          </SectionCard>
        )}

        {portalView === "wizard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            <SectionCard style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <StepHeader steps={steps} current={stepForHeader} />
                {!standalone ? (
                  <button onClick={quitToDashboard} style={{ background: 'none', border: 'none', color: theme.text3, cursor: 'pointer', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
                    Exit to Dashboard
                  </button>
                ) : (
                  <button onClick={() => window.location.href='/'} style={{ background: 'none', border: 'none', color: theme.text3, cursor: 'pointer', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
                    Exit to Dashboard
                  </button>
                )}
              </div>
            </SectionCard>
            
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 1fr)",
                gap: 30,
                alignItems: "flex-start",
              }}
            >
            {/* LEFT COLUMN - FLOW */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* --- STEP 1: Search --- */}
              {step === 1 && (
<SectionCard style={{ marginBottom: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
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
                    color: theme.text2,
                    fontSize: 13,
                    margin: "0 0 20px",
                  }}
                >
                  Search by Plan No or MC / M.Com name — selecting a result
                  loads its full record automatically.
                </p>

                <button
                  id="mcrp_open_search_btn"
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: `1px solid ${theme.border}`,
                    background: "#f8fafc",
                    color: theme.text2,
                    fontSize: 13.5,
                    fontWeight: 400,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    style={{ opacity: 0.5 }}
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
                      color: theme.text2,
                      fontSize: 13,
                      margin: "0 0 18px",
                    }}
                  >
                    Select the years you wish to renew.
                  </p>

                  {dueRows.length === 0 ? (
                    <div
                      style={{
                        padding: "30px 20px",
                        textAlign: "center",
                        color: theme.text3,
                        fontSize: 14,
                        fontWeight: 500,
                        background: "#f8fafc",
                        borderRadius: 10,
                        border: `1px dashed ${theme.border}`,
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                      This MC is fully renewed up to the current year.
                    </div>
                  ) : (
                    <div
                      style={{
                        border: `1px solid ${theme.border}`,
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 13.5,
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
                                fontSize: 12,
                              }}
                            >
                              Year
                            </th>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "12px 16px",
                                color: theme.text2,
                                fontSize: 12,
                              }}
                            >
                              Status
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: "12px 16px",
                                color: theme.text2,
                                fontSize: 12,
                              }}
                            >
                              Amount
                            </th>
                            <th
                              style={{
                                width: 60,
                                textAlign: "center",
                                padding: "12px 16px",
                                color: theme.text2,
                                fontSize: 12,
                              }}
                            >
                              Select
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dueRows.map((row) => (
                            <tr
                              key={row.year}
                              style={{
                                borderBottom: `1px solid ${theme.border}`,
                              }}
                            >
                              <td
                                style={{
                                  padding: "14px 16px",
                                  fontWeight: 600,
                                  color: theme.text,
                                }}
                              >
                                {row.year}
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                {row.status === "Paid" && (
                                  <span
                                    style={{
                                      color: theme.green,
                                      fontWeight: 600,
                                    }}
                                  >
                                    ✓ Paid
                                  </span>
                                )}
                                {row.status === "Processing" && (
                                  <span
                                    style={{
                                      color: "#d9a000",
                                      fontWeight: 600,
                                    }}
                                  >
                                    ⧗ Processing
                                  </span>
                                )}
                                {row.status === "Due" && (
                                  <span
                                    style={{
                                      color: theme.red,
                                      fontWeight: 600,
                                    }}
                                  >
                                    ! Due
                                  </span>
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "14px 16px",
                                  textAlign: "right",
                                  fontFamily: fontMono,
                                }}
                              >
                                {money(row.fee)}
                              </td>
                              <td
                                style={{
                                  padding: "14px 16px",
                                  textAlign: "center",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  disabled={
                                    row.status === "Paid" ||
                                    row.status === "Processing"
                                  }
                                  checked={
                                    row.status === "Paid" ||
                                    row.status === "Processing" ||
                                    selectedYears.includes(row.year)
                                  }
                                  onChange={() => toggleYear(row.year)}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    cursor:
                                      row.status === "Paid" ||
                                      row.status === "Processing"
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
)}
              )}

              {/* --- STEP 3: Applicant Details --- */}
              {selectedMC && selectedYears.length > 0 && !renewalRecord && step === 3 && (
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
                      color: theme.text2,
                      fontSize: 13,
                      margin: "0 0 20px",
                    }}
                  >
                    We'll use this to prepare your renewal application and
                    receipt.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
                    <Field label="First Name" required>
                      <input
                        name="firstName"
                        style={inputStyle}
                        value={applicant.firstName}
                        onChange={(e) => setA("firstName", e.target.value)}
                        placeholder="e.g. Nimal"
                      />
                    </Field>
                    <Field label="Last Name" required>
                      <input
                        name="lastName"
                        style={inputStyle}
                        value={applicant.lastName}
                        onChange={(e) => setA("lastName", e.target.value)}
                        placeholder="e.g. Perera"
                      />
                    </Field>
                    <Field label="Telephone No" required>
                      <input
                        name="phone"
                        type="text"
                        style={inputStyle}
                        value={applicant.phone}
                        onChange={(e) =>
                          setA("phone", e.target.value.replace(/[^\d+\s]/g, ""))
                        }
                        placeholder="07X XXX XXXX"
                      />
                    </Field>
                    <Field label="Email (optional)">
                      <input
                        name="email"
                        type="email"
                        style={inputStyle}
                        value={applicant.email}
                        onChange={(e) => setA("email", e.target.value)}
                        placeholder="name@example.com"
                      />
                    </Field>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Address Line 1" required>
                        <input
                          name="addr1"
                          style={inputStyle}
                          value={applicant.addr1}
                          onChange={(e) => setA("addr1", e.target.value)}
                          placeholder="House No / Street"
                        />
                      </Field>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Address Line 2">
                        <input
                          name="addr2"
                          style={inputStyle}
                          value={applicant.addr2}
                          onChange={(e) => setA("addr2", e.target.value)}
                          placeholder="Road / Area"
                        />
                      </Field>
                    </div>
                    <Field label="Province" required>
                      <select
                        name="province"
                        style={inputStyle}
                        value={applicant.province}
                        onChange={(e) => setA("province", e.target.value)}
                      >
                        <option value="">Select province</option>
                        {Object.keys(SL_PROVINCES).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="District" required>
                      <select
                        name="district"
                        style={inputStyle}
                        value={applicant.district}
                        onChange={(e) => setA("district", e.target.value)}
                        disabled={!applicant.province}
                      >
                        <option value="">
                          {applicant.province
                            ? "Select district"
                            : "Select province first"}
                        </option>
                        {(SL_PROVINCES[applicant.province] || []).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="City" required>
                      <input
                        name="city"
                        style={inputStyle}
                        value={applicant.city}
                        onChange={(e) => setA("city", e.target.value)}
                        placeholder="e.g. Nugegoda"
                      />
                    </Field>
                    <Field label="Postal Code" required>
                      <input
                        name="postalCode"
                        style={inputStyle}
                        value={applicant.postalCode}
                        onChange={(e) =>
                          setA(
                            "postalCode",
                            e.target.value.replace(/[^\d]/g, ""),
                          )
                        }
                        placeholder="e.g. 10250"
                        maxLength={5}
                      />
                    </Field>
                  </div>
                  {touched && !requiredOk && (
                    <div
                      style={{
                        marginTop: 14,
                        color: theme.red,
                        fontSize: 12.5,
                        fontWeight: 600,
                      }}
                    >
                      Please fill in all required fields marked with *.
                    </div>
                  )}
                </SectionCard>
)}
              )}

              {/* --- STEP 4: Payment --- */}
              {selectedMC && selectedYears.length > 0 && !renewalRecord && step === 4 && (
<SectionCard style={{ marginBottom: 0 }}>
                  <h2
                    style={{
                      fontFamily: fontDisplay,
                      fontSize: 19,
                      color: theme.maroonDark,
                      margin: "0 0 4px",
                    }}
                  >
                    4. Payment
                  </h2>
                  <p
                    style={{
                      color: theme.text2,
                      fontSize: 13,
                      margin: "0 0 24px",
                    }}
                  >
                    Submit your application. The GovPay gateway will be
                    integrated later.
                  </p>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTouched(true);
                        if (requiredOk) submitPayment();
                      }}
                      disabled={paying}
                      style={{
                        background: theme.maroonDark,
                        color: "#fff",
                        padding: "14px 28px",
                        borderRadius: 99,
                        fontSize: 14.5,
                        fontWeight: 600,
                        border: "none",
                        cursor: paying ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {paying ? "Processing..." : "Pay " + money(totalDue)}
                    </button>
                  </div>
                  {submitError && (
                    <div
                      style={{
                        marginTop: 16,
                        color: theme.red,
                        fontSize: 13,
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {submitError}
                    </div>
                  )}
                </SectionCard>
)}
              )}

              {/* --- STEP 5: Success --- */}
              {renewalRecord && (
                step >= 5 && (
<SectionCard
                  style={{
                    marginBottom: 0,
                    textAlign: "center",
                    padding: "40px 20px",
                  }}
                >
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
                      margin: "0 auto 16px",
                      fontSize: 28,
                    }}
                  >
                    ✓
                  </div>
                  <h2
                    style={{
                      fontFamily: fontDisplay,
                      fontSize: 22,
                      color: theme.maroonDark,
                      margin: "0 0 6px",
                    }}
                  >
                    Renewal Active
                  </h2>
                  <p
                    style={{
                      color: theme.text2,
                      fontSize: 13,
                      maxWidth: 460,
                      margin: "0 auto 20px",
                    }}
                  >
                    Your MC / M.Com renewal has been approved and is now active
                    for {renewalRecord.years.join(", ")}.
                  </p>
                  <div
                    style={{
                      background: theme.cream,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 10,
                      padding: "16px 18px",
                      textAlign: "left",
                      fontSize: 13,
                      maxWidth: 420,
                      margin: "0 auto 22px",
                    }}
                  >
                    <div style={{ marginBottom: 6 }}>
                      <b style={{ color: theme.text2 }}>Reference No:</b>{" "}
                      <span style={{ fontFamily: fontMono }}>
                        {renewalRecord.refNo}
                      </span>
                    </div>
                    <div>
                      <b style={{ color: theme.text2 }}>Amount Paid:</b>{" "}
                      {money(renewalRecord.amount)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadReceipt}
                    style={{
                      background: theme.green,
                      color: "#fff",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: 999,
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ⬇ Download Renewal Receipt
                  </button>
                </SectionCard>
)}
              )}
            </div>

            
                  <div
                    style={{
                      fontSize: 12.5,
                      color: theme.text2,
                      lineHeight: 1.5,
                    }}
                  >
                    <b style={{ color: theme.text }}>Find & Select</b>
                    <br />
                    Locate the correct MC via Plan No or Name.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: theme.maroon,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: theme.text2,
                      lineHeight: 1.5,
                    }}
                  >
                    <b style={{ color: theme.text }}>Choose Years</b>
                    <br />
                    Check the boxes for the years you wish to renew.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: theme.maroon,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: theme.text2,
                      lineHeight: 1.5,
                    }}
                  >
                    <b style={{ color: theme.text }}>Provide Details</b>
                    <br />
                    Enter official names and active contact information.
                  </div>
                </div>
              </SectionCard>
            </div>
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
                  {searchResults.map((r) => (
                    <button
                      key={r.planNo}