// server.js

require('@shopify/shopify-api/adapters/node');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const { shopifyApi, ApiVersion } = require('@shopify/shopify-api');
const app = express();
app.use(cors());

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

let publicUrl = null;
let shopifyAppInstance;
let db;

// 🧪 HMAC validation function
function verifyHmac(queryParams, secret) {
  const { hmac, ...rest } = queryParams;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('&');

  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return generatedHmac === hmac;
}

// 🔄 NGROK SUPPORT
async function startNgrokIfNeeded() {
  if (process.env.USE_NGROK === 'true') {
    try {
      const ngrok = await import('ngrok');
      publicUrl = await ngrok.default.connect({
        addr: 3001,
        authtoken: process.env.NGROK_AUTHTOKEN || undefined,
      });
      console.log('ngrok tunnel established at:', publicUrl);
    } catch (err) {
      console.error('Failed to start ngrok:', err);
    }
  }
}

// 📦 LowDB
async function getDb() {
  if (!db) {
    const path = require('path');
    const dbFile = path.join(__dirname, 'db.json');
    const lowdbNode = await import('lowdb');
    const { Low } = lowdbNode;
    const { JSONFile } = await import('lowdb/node');
    const adapter = new JSONFile(dbFile);
    db = new Low(adapter, { tokens: {} }); // Provide default data here
    await db.read();
    if (!db.data) db.data = { tokens: {} };
    await db.write();
  }
  return db;
}

// 🧠 Shopify SDK
async function getShopifyAppInstance() {
  if (!shopifyAppInstance) {
    let hostName = 'localhost:3001';
    let hostScheme = 'http';
    if (process.env.USE_NGROK === 'true' && publicUrl) {
      hostName = publicUrl.replace(/^https?:\/\//, '');
      hostScheme = 'https';
    }

    shopifyAppInstance = shopifyApi({
      apiKey: SHOPIFY_API_KEY,
      apiSecretKey: SHOPIFY_API_SECRET,
      scopes: ['read_products', 'read_customers'],
      hostName,
      hostScheme,
      apiVersion: ApiVersion.July23,
      isEmbeddedApp: false,
      logger: {
        log: (severity, message) => {
          console.log(`[Shopify ${severity}]`, message);
        },
      },
      future: {},
    });
  }
  return shopifyAppInstance;
}

// 🔐 OAuth Callback with HMAC Validation
app.get('/auth/callback', async (req, res) => {
  const { shop, code, hmac } = req.query;

  // 1. Check required params
  if (!shop || !code || !hmac) {
    return res.status(400).send('Missing required query params');
  }

  // 2. Validate HMAC
  const isHmacValid = verifyHmac(req.query, SHOPIFY_API_SECRET);
  if (!isHmacValid) {
    console.error('❌ Invalid HMAC');
    return res.status(403).send('Invalid HMAC: Request may be forged');
  }

  // 3. Exchange code for access token
  try {
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    });

    const accessToken = response.data.access_token;
    if (!accessToken) {
      console.error('OAuth error: No access token in response');
      return res.status(500).send('OAuth failed: No access token');
    }

    const db = await getDb();
    db.data.tokens[shop] = accessToken;
    await db.write();

    console.log(`✅ Access token for ${shop}:`, accessToken);

    const redirectBase = (process.env.USE_NGROK === 'true' && publicUrl)
      ? publicUrl
      : 'http://localhost:3000';

    return res.redirect(`${redirectBase}/?shop=${shop}`);
  } catch (err) {
    console.error('❌ OAuth exchange failed:', err.response?.data || err.message);
    return res.status(500).json({ error: 'OAuth failed', details: err.response?.data || err.message });
  }
});

// 📦 Fetch Access Token
app.get('/api/access-token', async (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).json({ error: 'Missing shop parameter' });

  const db = await getDb();
  const token = db.data.tokens[shop];

  if (!token) return res.status(404).json({ error: 'No access token found for this shop' });

  res.json({ accessToken: token });
});

// 🛒 Fetch Products
app.get('/api/products', async (req, res) => {
  const shop = req.query.shop;
  const cursor = req.query.cursor || null;
  if (!shop) return res.status(400).json({ error: 'Missing shop parameter' });

  const db = await getDb();
  const token = db.data.tokens[shop];
  if (!token) return res.status(404).json({ error: 'No access token found for this shop' });

  try {
    const response = await axios.post(
      `https://${shop}/admin/api/2025-04/graphql.json`,
      {
        query: `
          query getProducts($cursor: String) {
            products(first: 20, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  title
                  handle
                  publishedAt
                  images(first: 1) {
                    nodes {
                      src
                      altText
                      id
                    }
                  }
                  variants(first: 50) {
                    edges {
                      node {
                        id
                        title
                        price
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { cursor }
      },
      {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    // Check for errors in the response
    if (response.data.errors) {
      console.error('Shopify GraphQL API errors:', response.data.errors);
      return res.status(500).json({ error: 'Shopify API error', details: response.data.errors });
    }
    if (!response.data.data || !response.data.data.products) {
      console.error('Unexpected Shopify API response:', response.data);
      return res.status(500).json({ error: 'Unexpected Shopify API response', details: response.data });
    }

    const data = response.data.data.products;
    // Only include products that are published (publishedAt is not null)
    const products = data.edges
      .map(edge => edge.node)
      .filter(node => !!node.publishedAt)
      .map(node => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        images: node.images.nodes,
        variants: node.variants.edges.map(v => ({
          id: v.node.id,
          title: v.node.title,
          price: v.node.price,
        })),
      }));

    res.json({
      products,
      hasNextPage: data.pageInfo.hasNextPage,
      endCursor: data.pageInfo.endCursor,
    });
  } catch (err) {
    console.error('Shopify GraphQL API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch products', details: err.response?.data || err.message });
  }
});

// 🛒 update Product Title
app.post('/api/update-product-title', express.json(), async (req, res) => {
  const { shop, productId, newTitle, variantUpdates } = req.body;
  if (!shop || !productId || !newTitle) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const db = await getDb();
  const token = db.data.tokens[shop];
  if (!token) return res.status(404).json({ error: 'No access token found for this shop' });

  try {
    // 1. Update product title
    const productUpdateRes = await axios.post(
      `https://${shop}/admin/api/2025-04/graphql.json`,
      {
        query: `
          mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
              product {
                id
                title
                handle
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          input: {
            id: productId,
            title: newTitle
          }
        }
      },
      {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    const productUpdateErrors = productUpdateRes.data.data.productUpdate.userErrors;
    if (productUpdateErrors && productUpdateErrors.length > 0) {
      return res.status(400).json({ error: productUpdateErrors[0].message });
    }

    // 2. Update all variant prices if provided (using productVariantsBulkUpdate)
    let priceUpdateResults = [];
    if (Array.isArray(variantUpdates) && variantUpdates.length > 0) {
      // Prepare variants input for bulk update
      const variantsInput = variantUpdates
        .filter(variant => variant.id && typeof variant.price !== 'undefined' && variant.price !== null && variant.price !== '')
        .map(variant => ({
          id: variant.id,
          price: typeof variant.price === 'string' ? variant.price : String(variant.price)
        }));
      if (variantsInput.length > 0) {
        try {
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
              variables: {
                productId,
                variants: variantsInput
              }
            },
            {
              headers: {
                'X-Shopify-Access-Token': token,
                'Content-Type': 'application/json',
              },
            }
          );
          console.log('Bulk variant update response:', JSON.stringify(bulkRes.data));
          if (bulkRes.data.errors) {
            priceUpdateResults.push({ error: bulkRes.data.errors[0]?.message || 'Unknown Shopify error' });
          } else if (!bulkRes.data.data || !bulkRes.data.data.productVariantsBulkUpdate) {
            priceUpdateResults.push({ error: 'Shopify did not return productVariantsBulkUpdate', details: bulkRes.data });
          } else {
            const userErrors = bulkRes.data.data.productVariantsBulkUpdate.userErrors;
            if (userErrors && userErrors.length > 0) {
              userErrors.forEach(e => priceUpdateResults.push({ error: e.message, field: e.field }));
            }
            const updated = bulkRes.data.data.productVariantsBulkUpdate.productVariants;
            if (updated && updated.length > 0) {
              updated.forEach(v => priceUpdateResults.push({ id: v.id, updated: true, price: v.price }));
            }
          }
        } catch (err) {
          console.error('Error in productVariantsBulkUpdate:', err.response?.data || err.message);
          priceUpdateResults.push({ error: err.response?.data?.errors?.[0]?.message || err.message });
        }
      }
    }

    res.json({
      success: true,
      product: productUpdateRes.data.data.productUpdate.product,
      updatedPrices: priceUpdateResults
    });
  } catch (err) {
    // Try to extract Shopify GraphQL errors for better feedback
    let errorMsg = 'Failed to update product';
    let details = err.response?.data || err.message;
    if (err.response?.data?.errors) {
      errorMsg = err.response.data.errors[0]?.message || errorMsg;
    } else if (err.response?.data?.error) {
      errorMsg = err.response.data.error;
    } else if (typeof details === 'string') {
      errorMsg = details;
    }
    console.error('Shopify GraphQL API error:', details);
    res.status(500).json({ error: errorMsg, details });
  }
});

// 🔍 Public ngrok URL
app.get('/api/public-url', (req, res) => {
  res.json({ publicUrl: (process.env.USE_NGROK === 'true' && publicUrl) ? publicUrl : null });
});

// 🔼 Start server
app.listen(3001, async () => {
  await startNgrokIfNeeded();
  await getShopifyAppInstance();
  console.log(`✅ Server running at ${publicUrl || 'http://localhost:3001'}`);
});
