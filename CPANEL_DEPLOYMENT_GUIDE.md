# 🚀 Deployment Guide: GoDaddy cPanel for `vegchennaisrilalitha.events`

Your Next.js project is fully configured and built for **`https://vegchennaisrilalitha.events`** with standalone Node.js and Stripe API payment support.

---

## 📦 What Files to Upload to cPanel

All the production files are located in the **`.next/standalone`** folder:
- `server.js` (cPanel application startup file)
- `.next/` (contains optimized pages & static assets)
- `public/` (images, icons, fonts)
- `node_modules/` (bundled minimal production server dependencies)
- `.env` & `.htaccess` (production config, HTTPS redirects, security headers)

> 💡 **Tip:** Zip the contents inside `.next/standalone/` into a file (e.g. `srilalitha-cpanel.zip`) and upload it to your cPanel directory, then click **Extract**.

---

## 🛠️ Step-by-Step GoDaddy cPanel Setup

### Step 1: Open cPanel File Manager
1. Log in to your **GoDaddy cPanel Account**.
2. Open **File Manager**.
3. Navigate to your website root directory:
   - For primary domain: `/home/yourusername/public_html` or create a folder like `/home/yourusername/vegchennaisrilalitha`.
4. Upload `srilalitha-cpanel.zip` and click **Extract**.

---

### Step 2: Create / Configure Node.js App in cPanel
1. In cPanel, search for **"Setup Node.js App"** (or **"Node.js Selector"**).
2. Click **Create Application**.
3. Fill in the following settings:
   - **Node.js version:** `18.x`, `20.x`, or `22.x` (Recommended: `20.x` or latest LTS)
   - **Application mode:** `Production`
   - **Application root:** The folder where you extracted the files (e.g. `public_html` or `vegchennaisrilalitha`)
   - **Application URL:** `vegchennaisrilalitha.events`
   - **Application startup file:** `server.js`
4. Click **Create** (or **Save**).

---

### Step 3: Environment Variables in cPanel (Optional)
Your `.env` file is already included with all Firebase & Stripe settings. You can also add environment variables in the Node.js app settings:
- `NODE_ENV` = `production`
- `PORT` = (assigned by cPanel or `3000`)
- `NEXT_PUBLIC_SITE_URL` = `https://vegchennaisrilalitha.events`

---

### Step 4: Restart & Test
1. In the cPanel Node.js manager, click **"Restart Application"**.
2. Visit **`https://vegchennaisrilalitha.events`** in your browser.
3. Test the online order flow and Stripe Checkout.

---

## 🔄 How to Rebuild for cPanel in the Future
Whenever you make updates to the code, simply run:
```bash
npm run build:cpanel
```
This automatically compiles Next.js and synchronizes all assets into `.next/standalone/`.
