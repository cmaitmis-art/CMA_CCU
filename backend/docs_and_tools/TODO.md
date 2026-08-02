# TODO

- [x] Inspect Profile/Topbar/Sidebar role rendering logic
- [x] Add shared role label helper: `frontend/src/utils/roleLabel.js`
- [x] Fix `frontend/src/pages/Profile.jsx` to use correct role labels for Admin / MA / AGM
- [x] Fix `frontend/src/components/Topbar.jsx` to show correct role label (AGM not MA)
- [x] Fix `frontend/src/components/Sidebar.jsx` to show correct role label (AGM not MA)
- [x] Run frontend (Vite) build (verifies compilation)
- [ ] Verify in browser:
  - [ ] Login as AGM → Topbar dropdown + profile subtitle/badge shows “AGM”
  - [ ] Login as MA → shows “Management Assistant”
  - [ ] Login as Admin → shows “System Administrator”


