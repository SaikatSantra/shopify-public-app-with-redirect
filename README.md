# 🛒 Shopify React + Node/Express App

This project is a full-stack Shopify app with a React frontend and Node/Express backend. It authenticates via OAuth, fetches and displays all published products (with images, title, and all variant prices), supports pagination, and allows editing product titles and all variant prices directly from the frontend. The backend uses the Shopify GraphQL Admin API (2025-04) and persists access tokens securely.

## Features
- Shopify OAuth authentication (with HMAC validation)
- Secure access token storage (lowdb)
- Fetch and display all published products (with images, title, and all variant prices)
- Edit product title and all variant prices from the frontend
- Pagination (Next button, cursor-based)
- BEM CSS class naming, modern UI, grid/list view toggle
- Error handling and update feedback messages

## Prerequisites
- Node.js (v16+ recommended)
- Shopify Partner account and a development store
- Shopify API credentials (API key and secret)

## Setup

1. **Clone the repo and install dependencies:**
   ```sh
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root with:
   ```env
   SHOPIFY_API_KEY=your_shopify_api_key
   SHOPIFY_API_SECRET=your_shopify_api_secret
   ```

3. **Start the app (frontend + backend together):**
   We use the [`concurrently`](https://www.npmjs.com/package/concurrently) package to run both servers at once:
   ```sh
   npm run dev
   ```
   This will start both the backend (on [http://localhost:3001](http://localhost:3001)) and the React frontend (on [http://localhost:3000](http://localhost:3000)).

   Or, you can start them separately:
   ```sh
   node server.js
   npm start
   ```

## Usage
1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Click "Install Shopify App" and enter your store domain (e.g., `yourstore.myshopify.com`).
3. Complete the OAuth flow. You will be redirected back to the app.
4. View, edit, and save product titles and variant prices. Use the grid/list toggle and pagination as needed.

## Shopify App Setup & Access Token Flow

1. **Create a Shopify app in your Partner Dashboard:**
   - Go to your [Shopify Partners dashboard](https://partners.shopify.com/) and create a new app for your development store.
   - Set the app's **App URL** to `http://localhost:3000` and the **Redirect URL** to `http://localhost:3001/auth/callback`.
   - Copy your API key and API secret into your `.env` file as shown above.

2. **Install the app and generate an access token:**
   - Start both backend and frontend (see above).
   - Open [http://localhost:3000](http://localhost:3000) in your browser.
   - Click **Install Shopify App** and enter your store domain (e.g., `yourstore.myshopify.com`).
   - You will be redirected to Shopify to approve the app. After approval, Shopify will redirect you back to your app with a `code` parameter in the URL.
   - Example redirect URL after approval:

     ```text
     http://localhost:3001/auth/callback?code=...&hmac=...&shop=yourstore.myshopify.com&timestamp=...
     ```

     > ⚠️ You do not manually generate or visit this URL. Shopify generates and redirects to this link after the merchant approves the app. The `code` parameter is generated by Shopify and is only available to your backend during the OAuth callback. Your backend (see `server.js`) securely handles this exchange and token storage automatically.

     **How the OAuth callback works:**

     1. Shopify redirects to your backend `/auth/callback` with a temporary `code` after the merchant approves the app.
     2. Your backend validates the request (HMAC, shop, etc.).
     3. Your backend exchanges the `code` for an access token by POSTing to Shopify's `/admin/oauth/access_token` endpoint.
     4. The access token is stored securely (e.g., in `db.json` using lowdb).
     5. The backend then redirects the user to the frontend, removing all sensitive query parameters from the URL.

     **Example Express implementation:**

     ```js
     // server.js (excerpt)
     app.get('/auth/callback', async (req, res) => {
       const { shop, code, hmac } = req.query;
       // 1. Validate HMAC (security check, not shown here)
       try {
         // 2. Exchange code for access token
         const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             client_id: process.env.SHOPIFY_API_KEY,
             client_secret: process.env.SHOPIFY_API_SECRET,
             code,
           }),
         });
         const data = await tokenResponse.json();
         if (!tokenResponse.ok) throw new Error(data.error || 'Failed to get access token');
         // 3. Store access token securely (e.g., in lowdb)
         db.set('accessToken', data.access_token).write();
         // 4. Redirect to frontend (clean URL, no code/hmac/shop in query)
         res.redirect('http://localhost:3000');
       } catch (err) {
         res.status(500).send('OAuth error: ' + err.message);
       }
     });
     ```

     This flow ensures that sensitive OAuth parameters are never exposed to the frontend or user, and that all token handling is performed securely on the backend.
   - The backend will automatically exchange this code for an access token and store it securely (in `db.json`).
   - You do **not** need to manually handle the code or token—this is all handled by the app.

3. **How it works:**
   - The app uses Shopify's OAuth flow. When you install the app, Shopify sends a temporary `code` to your backend at:
     - `http://localhost:3001/auth/callback?code=...&hmac=...&shop=yourstore.myshopify.com&timestamp=...`
   - The backend exchanges this code for a permanent access token by calling Shopify's API:
     - `https://yourstore.myshopify.com/admin/oauth/access_token`
   - The access token is stored and used for all future API requests to your store.

---

### Sample OAuth Callback & Access Token Exchange (Node/Express)

```js
// server.js (excerpt)
const express = require('express');
const axios = require('axios');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const db = low(new FileSync('db.json'));

app.get('/auth/callback', async (req, res) => {
  const { shop, code, hmac } = req.query;
  // (HMAC validation omitted for brevity)
  try {
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }
    );
    const accessToken = tokenResponse.data.access_token;
    db.set('accessToken', accessToken).write();
    res.redirect('http://localhost:3000'); // or your app's main page
  } catch (err) {
    res.status(500).send('OAuth error: ' + err.message);
  }
});
```

---

## Scripts
- `npm run dev` — Starts both backend and frontend together (requires `concurrently`)
- `npm start` — Starts the React frontend (port 3000)
- `node server.js` — Starts the backend server (port 3001)
- `npm run build` — Builds the React app for production

## Project Structure
- `server.js` — Node/Express backend (Shopify API, OAuth, product endpoints)
- `src/App.js` — React frontend (product list/grid, editing, UI)
- `src/App.css` — BEM CSS for UI
- `db.json` — Access token storage (lowdb)

## Notes
- Make sure your Shopify app's redirect URL is set to `http://localhost:3001/auth/callback` in your Partner dashboard.
- Only published (active) products are shown and editable.

---

MIT License
