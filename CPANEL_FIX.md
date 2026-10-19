# Fix the ccu.cma.lk Passenger startup error

The reported failure is in `routes/transcribe.js`, which loaded ESM-only uuid 14
using CommonJS `require()`. The route now uses Node's built-in `crypto.randomUUID()`.
The direct uuid dependency has been removed and the lockfile synchronized.
The application requires Node.js 22 or newer; use Node.js 24 LTS or 22 LTS in cPanel.

## Update the existing deployment

1. In cPanel File Manager, open `/home/cmauser/public_html/ccu.cma.lk`.
   Download backup copies of `routes/transcribe.js`, `package.json`,
   `package-lock.json`, and `.htaccess` to your computer.
2. Upload `ccu_cpanel_uuid_fix.zip` from this project and extract it directly into
   `/public_html/ccu.cma.lk`, allowing replacement of the three included files.
   The ZIP contains `routes/transcribe.js`, `package.json`, and `package-lock.json`.
   Verify there is no extra enclosing folder. Preserve the existing `.env`,
   `uploads/`, `public/`, and cPanel-generated `.htaccess`.
3. Open **cPanel > Software > Setup Node.js App**, then edit the existing
   `ccu.cma.lk` application. Set:

   | Setting | Value |
   | --- | --- |
   | Node.js version | 24.x LTS, or 22.x LTS |
   | Application mode | Production |
   | Application root | public_html/ccu.cma.lk |
   | Application URL | ccu.cma.lk, path / |
   | Application startup file | index.js |

   Click **Save**. If neither version is available, ask your hosting provider to
   enable Node.js 24 or 22 for this application. Node.js 14 is no longer supported.
4. In File Manager, enable **Show Hidden Files** and inspect the root `.htaccess`.
   After saving the runtime selection, its generated `PassengerNodejs` directive
   should point to the selected version, such as
   `/home/cmauser/nodevenv/public_html/ccu.cma.lk/24/bin/node`, rather than `/14/bin/node`.
   Let cPanel generate this path. If it still points to 14, re-save the application
   version or ask your host to repair the selector configuration.
5. Back in **Setup Node.js App**, click **Run NPM Install** and wait for success.
   Dependencies must be installed in the newly selected Node environment.
   Keep the cPanel-managed `node_modules` link; do not upload your local node_modules.
6. Click **Restart** (or **Start App** if stopped).
7. Visit `https://ccu.cma.lk/api/health`. It should return JSON containing
   `"status":"ok"`. Then open `https://ccu.cma.lk` and test login and a page that
   loads database records. The health endpoint checks the web server only, not MySQL.
8. Delete the uploaded hotfix ZIP from the server after extraction.

## Optional terminal verification

Copy and run the environment activation command shown by **Setup Node.js App**
after selecting the new Node version. Then run:

```sh
cd /home/cmauser/public_html/ccu.cma.lk
node -v
npm install --omit=dev
node --check routes/transcribe.js
node -e "require('./routes/transcribe'); console.log('Transcription route loads OK')"
```

`node -v` must report v24.x or v22.x. Restart using cPanel afterward.
Passenger manages the server process; the terminal check does not need `npm start`.

## If another error appears

- A stack trace still showing `require('uuid')` from this route means the old file
  is still deployed or Passenger has not restarted. Check the extraction location
  and confirm line 5 uses `require('crypto')`.
- A stack trace still containing `/nodevenv/.../14/` means Passenger still uses the
  old runtime. Recheck the cPanel selection and generated `.htaccess` path.
- If health works but login/data fail, inspect the Passenger/application log and
  confirm the existing `.env` values `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
  and `DB_PASS`, plus the database user's permissions. Do not share passwords.
- If health works but the home page fails, confirm `public/index.html` exists.
  This deployment serves the built frontend from `public/`.
- Audio transcription also needs its existing API configuration and FFmpeg setup;
  this change fixes the startup import, not external service configuration.

## Future packages

The local `backend/.htaccess` template no longer hardcodes Node.js 14. cPanel must
generate the Passenger block when setting up an application. When updating an
existing deployment from a full ZIP, preserve the live cPanel-generated `.htaccess`.
Use the small hotfix ZIP for this repair; it does not include database dumps or
replace other application files.

## References

- UUID CommonJS support: https://github.com/uuidjs/uuid#readme
- Node UUID generator: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- Supported Node releases: https://nodejs.org/en/about/previous-releases
- cPanel Node.js selector controls: https://docs.cloudlinux.com/cloudlinuxos/lve_manager/#node-js-selector-client-plugin
