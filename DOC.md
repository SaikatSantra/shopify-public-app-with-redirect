# Shopify App Core Logic & Key Code Excerpts

This document explains the core logic of your Shopify React + Node/Express app, with key code excerpts from both the frontend (`App.js`) and backend (`server.js`).

---

## How the App Works (Brief Overview)

1. **User installs the app** and completes OAuth via Shopify.
2. **Backend receives the OAuth callback**, exchanges the code for an access token, and stores it securely.
3. **Frontend fetches the access token** and products for the connected shop.
4. **User can edit product titles and all variant prices** directly in the UI.
5. **All changes are sent to the backend**, which updates Shopify via the Admin API.
6. **Update messages** are shown in the UI for user feedback.

---

## Key Code Excerpts

### 1. Frontend: `src/App.js`

#### a. OAuth Parameter Handling & Shop Detection
```js
useEffect(() => {
  let shopParam;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('shop')) {
    shopParam = urlParams.get('shop');
    sessionStorage.setItem('shop', shopParam);
    // Remove OAuth params from URL after load (for security/UX)
    if (
      window.location.search.includes('code=') ||
      window.location.search.includes('hmac=') ||
      window.location.search.includes('shop=')
    ) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } else {
    shopParam = sessionStorage.getItem('shop');
  }
  setShop(shopParam);
  setError(null);

  if (shopParam) {
    fetch(`http://localhost:3001/api/access-token?shop=${shopParam}`)
      .then(async (res) => {
        let data;
        try {
          data = await res.json();
        } catch {}
        if (!res.ok) throw new Error(data?.error || 'Failed to fetch access token');
        setAccessToken(data.accessToken || '');
        fetchProducts(shopParam);
      })
      .catch((err) => setError(err.message));
  }
}, []);
```

#### b. Product Editing and Update Messages
```js
<button
  className="product-list__save-btn"
  onClick={async () => {
    const variantUpdates = product.variants?.map(v => ({ id: v.id, price: v.price })) || [];
    const res = await fetch('http://localhost:3001/api/update-product-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop,
        productId: product.id,
        newTitle: product.title,
        variantUpdates
      })
    });
    const data = await res.json();
    let msg = '';
    if (!res.ok) {
      msg = data.error ? `Failed: ${data.error}` : 'Failed: Unknown error';
    } else if (data.updatedPrices && Array.isArray(data.updatedPrices)) {
      const errors = data.updatedPrices.filter(v => v.error);
      const updated = data.updatedPrices.filter(v => v.updated);
      if (updated.length > 0) {
        msg += `Updated: ${updated.map(v => `${v.id} ($${v.price})`).join(', ')}`;
      }
      if (errors.length > 0) {
        msg += `${msg ? ' | ' : ''}Errors: ${errors.map(v => `${v.id}: ${v.error}`).join(', ')}`;
      }
      if (!msg) msg = 'Product updated!';
    } else {
      msg = 'Product updated!';
    }
    setUpdateMessages(prev => ({ ...prev, [product.id]: msg }));
    setTimeout(() => {
      setUpdateMessages(prev => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });
    }, 2500);
  }}
>
  Save
</button>
```

---

### 2. Backend: `server.js`

#### a. OAuth Callback & Access Token Exchange
```js
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
    // Store access token securely (e.g., in lowdb)
    db.data.tokens[shop] = accessToken;
    await db.write();
    // Redirect to frontend (clean URL)
    res.redirect('http://localhost:3000');
  } catch (err) {
    res.status(500).send('OAuth error: ' + err.message);
  }
});
```

#### b. Update Product Title and Variant Prices
```js
app.post('/api/update-product-title', express.json(), async (req, res) => {
  const { shop, productId, newTitle, variantUpdates } = req.body;
  // ...token lookup and validation...
  try {
    // 1. Update product title
    const productUpdateRes = await axios.post(
      `https://${shop}/admin/api/2025-04/graphql.json`,
      {
        query: `
          mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
              product { id title handle }
              userErrors { field message }
            }
          }
        `,
        variables: { input: { id: productId, title: newTitle } }
      },
      { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
    );
    // 2. Update all variant prices if provided
    let priceUpdateResults = [];
    if (Array.isArray(variantUpdates) && variantUpdates.length > 0) {
      const variantsInput = variantUpdates
        .filter(variant => variant.id && typeof variant.price !== 'undefined' && variant.price !== null && variant.price !== '')
        .map(variant => ({
          id: variant.id,
          price: typeof variant.price === 'string' ? variant.price : String(variant.price)
        }));
      if (variantsInput.length > 0) {
        const bulkRes = await axios.post(
          `https://${shop}/admin/api/2025-04/graphql.json`,
          {
            query: `
              mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                  product { id }
                  productVariants { id price }
                  userErrors { field message }
                }
              }
            `,
            variables: { productId, variants: variantsInput }
          },
          { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
        );
        // ...handle response and errors...
      }
    }
    res.json({ success: true, updatedPrices: priceUpdateResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## Summary

- The frontend manages OAuth parameters, fetches tokens and products, and allows inline editing of product titles and variant prices.
- The backend securely handles OAuth, token storage, and all product update requests to Shopify.
- All sensitive data and logic remain on the backend for security.

---
