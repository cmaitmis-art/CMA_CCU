import React from 'react';
import { CMA_LOGO_BASE64 } from '../../utils/logoBase64.js';
import { parseCouncilMembers, buildChecklistRecordFromMc, formatDisplayDate } from './MCManagementShared.jsx';

export function OfficialRegistrationForm({ mc }) {
  if (!mc) return null;
  const council = parseCouncilMembers(mc.council_members);
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const Box = ({ checked }) => <span className="of-box">{checked ? '✓' : ''}</span>;
  return (
    <div className={`official-form-print of-registration-page ${(() => {
      const council = parseCouncilMembers(mc.council_members);
      const filledCouncil = council.filter(row => row && (row.name || row.unit_no || row.contact_no));
      const count = filledCouncil.length > 0 ? filledCouncil.length : 1;
      return count <= 2 ? 'council-normal' : (count <= 4 ? 'council-compact' : 'council-dense');
    })()}`} style={{ pageBreakInside: 'avoid' }}>
      <div className="of-logo" style={{ marginTop: 8 }}><img src={CMA_LOGO_BASE64} alt="CMA Logo" /></div>
      <div className="of-title">CONDOMINIUM MANAGEMENT AUTHORITY</div>
      <div className="of-subtitle">APPLICATION FOR REGISTRATION AS A MANAGEMENT CORPORATION</div>

      <div className="of-row"><span className="of-num">1. Title name of the Management Corporation :-</span><span className="of-fill">{mc.management_corporation_name || mc.name || ''}</span></div>
      <div className="of-row"><span className="of-num">2. Registered Condominium Plan No :-</span><span className="of-fill">{mc.plan_no || ''}</span></div>
      <div className="of-row"><span className="of-num">3. Official Address of the M/C :-</span><span className="of-fill">{mc.address || ''}</span></div>

      <div className="of-section-title">4. Number of the parcels in the Condominium Complex,</div>
      <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">Residential :-</span><span className="of-fill" style={{ maxWidth: 120 }}>{mc.residential_units ?? mc.residential ?? ''}</span></div>
      <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">Non Residential :-</span></div>
      <div className="of-row" style={{ marginLeft: 40 }}><span className="of-num">Shops :-</span><span className="of-fill" style={{ maxWidth: 100 }}>{mc.non_res_shops ?? ''}</span></div>
      <div className="of-row" style={{ marginLeft: 40 }}><span className="of-num">Office :-</span><span className="of-fill" style={{ maxWidth: 100 }}>{mc.non_res_office || (!mc.non_res_shops && !mc.non_res_hotel ? (mc.non_residential_units || mc.non_residential || '') : '')}</span></div>
      <div className="of-row" style={{ marginLeft: 40 }}><span className="of-num">Hotel :-</span><span className="of-fill" style={{ maxWidth: 100 }}>{mc.non_res_hotel ?? ''}</span></div>

      <div className="of-section-title">5. Services available</div>
      <div className="of-grid2">
        <div className="of-checkitem"><Box checked={mc.services_lift} /> Lift</div>
        <div className="of-checkitem"><Box checked={mc.services_fire_agreement} /> Fire Service agreement</div>
        <div className="of-checkitem"><Box checked={mc.services_generator_agreement} /> Generator Service agreement</div>
        <div className="of-checkitem"><Box checked={mc.services_insurance} /> Insurance Details</div>
      </div>

      <div className="of-section-title">6. Facilities available</div>
      <div className="of-grid2">
        <div className="of-checkitem"><Box checked={mc.fac_common_parking} /> Common Parking</div>
        <div className="of-checkitem"><Box checked={mc.fac_super_market} /> Super Market</div>
        <div className="of-checkitem"><Box checked={mc.fac_accessory_car_parcel} /> Accessory Car Parcel</div>
        <div className="of-checkitem"><Box checked={mc.fac_garden} /> Garden</div>
        <div className="of-checkitem"><Box checked={mc.fac_roof_top} /> Roof Top</div>
        <div className="of-checkitem"><Box checked={mc.fac_sauna} /> Sauna</div>
        <div className="of-checkitem"><Box checked={mc.fac_gym} /> Gym</div>
        <div className="of-checkitem"><Box checked={mc.fac_salon} /> Salon</div>
        <div className="of-checkitem"><Box checked={mc.fac_swimming_pool} /> Swimming Pool</div>
        <div className="of-checkitem"><Box checked={mc.fac_golf_tennis} /> Golf &amp; Tennis Ground</div>
        <div className="of-checkitem"><Box checked={mc.fac_penth_house} /> Penth House</div>
        <div className="of-checkitem"><Box checked={mc.fac_day_care} /> Day Care Centers</div>
        <div className="of-checkitem"><Box checked={mc.fac_restaurant} /> Restaurant</div>
      </div>

      <div className="of-row" style={{ marginTop: 6 }}>
        <span className="of-num">Management Services Company :-</span>
        <span className="of-checkitem" style={{ marginLeft: 6 }}>Yes <Box checked={mc.mgmt_company_controlled} /></span>
        <span className="of-checkitem">No <Box checked={!mc.mgmt_company_controlled} /></span>
      </div>
      {mc.mgmt_company_controlled ? (
        <>
          <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">Name of the Company :-</span><span className="of-fill">{mc.mgmt_company_name || ''}</span></div>
          <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">Contact No :-</span><span className="of-fill">{mc.mgmt_company_contact || ''}</span></div>
        </>
      ) : null}

      <div className="of-section-title" style={{ textTransform: 'uppercase' }}>Names of the Office Bearers and their Contact Nos.</div>
      <div className="of-row"><span className="of-num" style={{ minWidth: 90 }}>Secretary -</span><span className="of-fill">{mc.secretary || ''}</span></div>
      <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">Unit No -</span><span className="of-fill" style={{ maxWidth: 140 }}>{mc.secretary_unit_no || ''}</span></div>
      <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">Contact No -</span><span className="of-fill">{mc.secretary_contact || ''}</span></div>
      <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">E-mail Address -</span><span className="of-fill">{mc.secretary_email || ''}</span></div>

      <div className="of-row" style={{ marginTop: 5 }}><span className="of-num" style={{ minWidth: 90 }}>Treasurer -</span><span className="of-fill">{mc.treasurer || ''}</span></div>
      <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">Unit No -</span><span className="of-fill" style={{ maxWidth: 140 }}>{mc.treasurer_unit_no || ''}</span></div>
      <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">Contact No -</span><span className="of-fill">{mc.treasurer_contact || ''}</span></div>
      <div className="of-row" style={{ marginLeft: 14 }}><span className="of-num">E-mail Address -</span><span className="of-fill">{mc.treasurer_email || ''}</span></div>

      <div className="of-row" style={{ marginTop: 5 }}><span className="of-num" style={{ minWidth: 90 }}>Council Members -</span></div>
      <table className="of-table">
        <thead><tr><th style={{ width: 34 }}>&nbsp;</th><th>Name</th><th style={{ width: 110 }}>Unit No</th><th style={{ width: 130 }}>Contact No</th></tr></thead>
        <tbody>
          {(() => {
            const filledRows = council.filter(row => row.name || row.unit_no || row.contact_no);
            const printRows = filledRows.length > 0 ? filledRows : [{ name: '', unit_no: '', contact_no: '' }];
            return printRows.map((row, i) => {
              const romanIndex = council.indexOf(row);
              return (
                <tr key={i}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{romanNumerals[romanIndex >= 0 ? romanIndex : i] || (i + 1)}.</td>
                  <td>{row.name || ''}</td>
                  <td>{row.unit_no || ''}</td>
                  <td>{row.contact_no || ''}</td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>

      <div className="of-row" style={{ marginTop: 8 }}>
        <span>7. Written assurance from secretary that Condominium Management Authority requirement will be fulfilled (attached) <Box checked={mc.written_assurance_fulfilled} /></span>
      </div>

      <div className="of-sign">
        <div>Authorized Signature</div>
        <div>Secretary<br />Management Corporation</div>
      </div>
    </div>
  );
}

// - Official Document Checklist Form (exact replica of "CUSTOMER CARE UNIT

export function OfficialChecklistForm({ mc }) {
  if (!mc) return null;
  const computedMc = { ...mc, ...buildChecklistRecordFromMc(mc) };
  const c = (key) => (computedMc[key] === true || computedMc[key] === 'true' || computedMc[key] === 1 || computedMc[key] === '1');
  const f = (key) => computedMc[key] ?? '';
  const orValue = (primary, fallback) => {
    const value = f(primary);
    return value !== '' ? value : f(fallback);
  };
  const Box = ({ checked }) => <span className="of-box">{checked ? '✓' : ''}</span>;
  return (
    <div className="official-form-print of-checklist-page">
      <div className="of-logo"><img src={CMA_LOGO_BASE64} alt="CMA Logo" /></div>
      <div className="of-title" style={{ marginTop: 4 }}>CUSTOMER CARE UNIT</div>
      <div className="of-subtitle">DOCUMENT CHECK LIST FOR MANAGEMENT CORPORATION</div>

      <div className="of-row"><span className="of-num">01. Registered Condominium Plan No :</span><span className="of-fill">{f('plan_no')}</span></div>

      <div className="of-row" style={{ marginTop: 5 }}>
        <span className="of-num">02. Number of Parcels in the Condominium,</span>
        <span style={{ marginLeft: 'auto' }}>Total <span className="of-box">{orValue('cl_parcels_total', 'units')}</span></span>
      </div>
      <div className="of-grid2" style={{ marginLeft: 14 }}>
        <div className="of-checkitem">Residential &nbsp;<span className="of-box">{orValue('cl_parcels_residential', 'residential_units')}</span></div>
        <div />
        <div className="of-checkitem">Non Residential - Office &nbsp;<span className="of-box">{orValue('cl_parcels_office', 'non_res_office')}</span></div>
        <div className="of-checkitem">Shops &nbsp;<span className="of-box">{orValue('cl_parcels_shops', 'non_res_shops')}</span></div>
        <div className="of-checkitem">Hotels &nbsp;<span className="of-box">{orValue('cl_parcels_hotels', 'non_res_hotel')}</span></div>
        <div className="of-checkitem">Service Units &nbsp;<span className="of-box">{orValue('cl_parcels_service', 'service_units')}</span></div>
      </div>

      <table className="of-table" style={{ marginTop: 6 }}>
        <tbody>
          <tr>
            <td>03. Services / Facilites (Attached details)</td>
            <td style={{ width: 30, textAlign: 'center' }}><Box checked={c('cl_services_facilities')} /></td>
            <td style={{ width: 70 }}>pg. {f('cl_services_facilities_pg')}</td>
          </tr>
          <tr>
            <td>04. Written assurance from Secretary that C.M.A. requirements will be fulfilled (Attached)</td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_written_assurance')} /></td>
            <td>pg. {f('cl_written_assurance_pg')}</td>
          </tr>
        </tbody>
      </table>

      <div className="of-section-title">PHOTOCOPY OF,</div>
      <table className="of-table">
        <tbody>
          <tr>
            <td>01. Registered Condominium Plan issued by the Registered General &nbsp; Date {formatDisplayDate(f('cl_photocopy_condo_plan_date'))}</td>
            <td style={{ width: 30, textAlign: 'center' }}><Box checked={c('cl_photocopy_condo_plan')} /></td>
            <td style={{ width: 70 }}>pg. {f('cl_photocopy_condo_plan_pg')}</td>
          </tr>
          <tr>
            <td>02. CMA Certificate No. {f('cl_cma_certificate_no')} &nbsp; Date {formatDisplayDate(f('cl_cma_certificate_date'))}</td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_cma_certificate')} /></td>
            <td>pg. {f('cl_cma_certificate_pg')}</td>
          </tr>
          <tr>
            <td>03. Declaration No. {f('cl_declaration_no')} &nbsp; Date {formatDisplayDate(f('cl_declaration_date'))}</td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_declaration')} /></td>
            <td>pg. {f('cl_declaration_pg')}</td>
          </tr>
          <tr>
            <td>04. Minutes of the 1st Annual General Meeting &nbsp; Date: {formatDisplayDate(f('cl_agm_minutes_date'))}</td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_agm_minutes')} /></td>
            <td>pg. {f('cl_agm_minutes_pg')}</td>
          </tr>
          <tr>
            <td>
              05. Attendance &nbsp;
              Total <span className="of-box">{f('cl_attendance_total')}</span> &nbsp;
              Physically <span className="of-box">{f('cl_attendance_physically')}</span> &nbsp;
              Proxy <span className="of-box">{f('cl_attendance_proxy')}</span>
            </td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_attendance')} /></td>
            <td>pg. {f('cl_attendance_pg')}</td>
          </tr>
          <tr>
            <td>06. Insurance Policy &nbsp; Valid Year From {f('cl_insurance_from')} to {f('cl_insurance_to')}</td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_insurance')} /></td>
            <td>pg. {f('cl_insurance_pg')}</td>
          </tr>
          <tr>
            <td>07. Update List of names of Registered Owners &amp; Address with their sign.</td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_owners_list')} /></td>
            <td>pg. {f('cl_owners_list_pg')}</td>
          </tr>
          <tr>
            <td>08. Constitution</td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_constitution')} /></td>
            <td>pg. {f('cl_constitution_pg')}</td>
          </tr>
          <tr>
            <td>09. By Laws</td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_bylaws')} /></td>
            <td>pg. {f('cl_bylaws_pg')}</td>
          </tr>
          <tr>
            <td>10. Additional by Laws (Housing Rules / Code of Conduct / Rules &amp; Regulations)</td>
            <td style={{ textAlign: 'center' }}><Box checked={c('cl_additional_bylaws')} /></td>
            <td>pg. {f('cl_additional_bylaws_pg')}</td>
          </tr>
        </tbody>
      </table>

      <div className="of-sign" style={{ marginTop: '45pt' }}>
        <div>{f('cl_checked_by') || 'Checked by'}</div>
        <div>{formatDisplayDate(f('cl_checked_date')) !== '-' ? formatDisplayDate(f('cl_checked_date')) : 'Date'}</div>
      </div>
    </div>
  );
}
