// import React, { useEffect, useState } from 'react';
// import './App.css';
// function App() {
//   const [accessToken, setAccessToken] = useState('');
//   const [shop, setShop] = useState(null);
//   const [error, setError] = useState(null);
//   const [products, setProducts] = useState([]);

//   useEffect(() => {
//     const urlParams = new URLSearchParams(window.location.search);
//     const shopParam = urlParams.get('shop');
//     setShop(shopParam);
//     setError(null);

//     if (shopParam) {
      
//       // Step 1: Fetch Access Token
//       fetch(`http://localhost:3001/api/access-token?shop=${shopParam}`)
//         .then(async (res) => {
//           let data;
//           try {
//             data = await res.json();
//           } catch {
//             data = { error: 'Invalid JSON from /api/access-token' };
//           }
//           if (!res.ok) throw new Error(data.error || 'Failed to fetch access token');
//           return data;
//         })
//         .then((data) => {
//           setAccessToken(data.accessToken || '');

//           // Step 2: Fetch Products
//           return fetch(`http://localhost:3001/api/products?shop=${shopParam}`);
//         })
//         .then(async (res) => {
//           let data;
//           try {
//             data = await res.json();
//           } catch {
//             data = { error: 'Invalid JSON from /api/products' };
//           }
//           console.log('Products response:', data);
//           if (!res.ok) throw new Error(data.error || 'Failed to fetch products');
//           setProducts(data.products || []);
//         })
//         .catch((err) => setError(err.message));
//     }
    
//   }, []);

//   const startOAuth = () => {
//     const shopInput = prompt('Enter your Shopify store (e.g., mystore.myshopify.com)');
//     if (!shopInput) return;

//     // 🧠 Using SHOPIFY_API_KEY directly (if injected)
//     const clientId = '2cb98259c9176220f37c68931819ddca' || 'your_fallback_api_key_here';
//     if (!clientId) {
//       alert('Missing Shopify API Key. Set SHOPIFY_API_KEY in your environment.');
//       return;
//     }

//     const installUrl = `https://${shopInput}/admin/oauth/authorize?client_id=${clientId}&scope=read_products,read_customers&redirect_uri=http://localhost:3001/auth/callback`;
//     window.location.href = installUrl;
//   };

//   return (
//     <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
//       <h1>Shopify Access Token & Product Viewer</h1>

//       {!shop && <button onClick={startOAuth}>Install Shopify App</button>}

//       {shop && (
//         <>
//           <p>Connected shop: <strong>{shop}</strong></p>
//           {error && <p style={{ color: 'red' }}>Error: {error}</p>}

//           <h2>Access Token</h2>
//           {accessToken ? (
//             <pre style={{ background: '#f0f0f0', padding: '1rem', wordBreak: 'break-word' }}>
//               {accessToken}
//             </pre>
//           ) : (
//             <p>(No access token found)</p>
//           )}

//           <h2>Products - {products.length}</h2>
//           {products.length > 0 ? (
//           <div
//             style={{
//               display: 'grid',
//               gridTemplateColumns: 'repeat(auto-fit, minmax(14%, 1fr))',
//               gap: '1rem',
//               margin: '1rem 0'
//             }}
//           >
            
            
//             {products.map((product, idx) => (
//               <div
//                 key={product.id}
//                 style={{
//                   border: '1px solid #ddd',
//                   borderRadius: '8px',
//                   padding: '1rem',
//                   background: '#fafafa',
//                   boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
//                 }}
//               >
//                 {/* Show first image if available */}
//                 {product.images && product.images.length > 0 && product.images[0].src && (
//                   <div style={{ margin: '0.5em 0' }}>
//                     <img
//                       src={product.images[0].src}
//                       alt={product.title}
//                       style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 4 }}
//                     />
//                   </div>
//                 )}
//                 {/* Editable Product Title */}
//                 <textarea
//                   value={product.title}
//                   onChange={e => {
//                     const newProducts = [...products];
//                     newProducts[idx].title = e.target.value;
//                     setProducts(newProducts);
//                   }}
//                   style={{
//                     fontWeight: 'bold',
//                     fontSize: '1.1em',
//                     width: '100%',
//                     marginBottom: '0.5em',
//                     minHeight: '2em',
//                     padding: '0.5em',
//                     border: '1px solid #ccc',
//                     borderRadius: '4px',
//                     boxSizing: 'border-box',
//                     resize: 'vertical', // allows user to resize if needed
//                     whiteSpace: 'pre-wrap', // ensures wrapping
//                     overflowWrap: 'break-word'
//                   }}
//                 />
//                 <button
//                   style={{ marginBottom: '0.5em', cursor: 'pointer', padding: '0.5em 1em', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px' }}
//                   onClick={async () => {
//                     const res = await fetch('http://localhost:3001/api/update-product-title', {
//                       method: 'POST',
//                       headers: { 'Content-Type': 'application/json' },
//                       body: JSON.stringify({
//                         shop,
//                         productId: product.id,
//                         newTitle: product.title
//                       })
//                     });
//                     const data = await res.json();
//                     if (!res.ok) {
//                       alert('Failed to update: ' + (data.error || 'Unknown error'));
//                     } else {
//                       alert('Product title updated!');
//                     }
//                   }}
//                 >
//                   Save
//                 </button>
                
//                 <div style={{ marginBottom: '0.5em' }}>
//                 <a
//                    href={
//                       product.handle
//                         ? `https://${shop}/products/${product.handle}`
//                         : `https://${shop}/admin/products/${product.id.split('/').pop()}`
//                     }
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   style={{ textDecoration: 'none', color: '#0070f3', fontWeight: 'bold' }}
//                 >
//                   View in Store
//                 </a>
//                 </div>
//               </div>
//             ))}



//           </div>
//           ) : (
//             <p>(No products found or still loading...)</p>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

// export default App;



import React, { useEffect, useState } from 'react';
import './App.css';


function App() {
  const [accessToken, setAccessToken] = useState('');
  const [shop, setShop] = useState(null);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [updateMessages, setUpdateMessages] = useState({}); // Track update messages for each product

  const fetchProducts = async (shopParam, cursorParam = null, append = false) => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3001/api/products?shop=${shopParam}${cursorParam ? `&cursor=${encodeURIComponent(cursorParam)}` : ''}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch products');
      // Defensive: ensure variants[0].price is always a string for input value
      const normalizedProducts = data.products.map(p => ({
        ...p,
        variants: p.variants?.map((v, i) => ({
          ...v,
          price: v.price !== undefined && v.price !== null ? String(v.price) : ''
        })) || []
      }));
      setProducts(append ? [...products, ...normalizedProducts] : normalizedProducts);
      setHasNextPage(data.hasNextPage);
      setCursor(data.endCursor);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

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
          } catch {
            data = { error: 'Invalid JSON from /api/access-token' };
          }
          if (!res.ok) throw new Error(data.error || 'Failed to fetch access token');
          return data;
        })
        .then((data) => {
          setAccessToken(data.accessToken || '');
          fetchProducts(shopParam);
        })
        .catch((err) => setError(err.message));
    }
    // eslint-disable-next-line
  }, []);

  const startOAuth = () => {
    const shopInput = prompt('Enter your Shopify store (e.g., mystore.myshopify.com)');
    if (!shopInput) return;
    const clientId = '2cb98259c9176220f37c68931819ddca' || 'your_fallback_api_key_here';
    if (!clientId) {
      alert('Missing Shopify API Key. Set SHOPIFY_API_KEY in your environment.');
      return;
    }
    const installUrl = `https://${shopInput}/admin/oauth/authorize?client_id=${clientId}&scope=read_products,read_customers&redirect_uri=http://localhost:3001/auth/callback`;
    window.location.href = installUrl;
  };


  return (
    <div className="app">
      <h1 className="app__title">Shopify Access Token & Product Viewer</h1>

      {!shop && (
        <button className="app__install-btn" onClick={startOAuth}>
          Install Shopify App
        </button>
      )}

      {shop && (
        <>
          <p className="app__shop">
            Connected shop: <strong>{shop}</strong>
          </p>
          {error && <p className="app__error">Error: {error}</p>}

          <h2 className="app__section-title">Access Token</h2>
          {accessToken ? (
            <pre className="app__token">{accessToken}</pre>
          ) : (
            <p>(No access token found)</p>
          )}

          <div className="app__view-toggle">
            <button
              className={`app__toggle-btn${viewMode === 'list' ? ' app__toggle-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              disabled={viewMode === 'list'}
            >
              List View
            </button>
            <button
              className={`app__toggle-btn${viewMode === 'grid' ? ' app__toggle-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              disabled={viewMode === 'grid'}
            >
              Grid View
            </button>
          </div>

          <h2 className="app__section-title">Products - {products.length}</h2>
          {products.length > 0 ? (
            <>
              {viewMode === 'list' ? (
                <ul className="product-list">
                  {products.map((product, idx) => (
                    <li className="product-list__item" key={product.id}>
                      {updateMessages[product.id] && (
                        <span className="product-list__update-msg">{updateMessages[product.id]}</span>
                      )}
                      {product.images && product.images.length > 0 && product.images[0].src && (
                        <img
                          className="product-list__image"
                          src={product.images[0].src}
                          alt={product.title}
                        />
                      )}
                      <textarea
                        className="product-list__title-input"
                        value={product.title}
                        onChange={e => {
                          const newProducts = [...products];
                          newProducts[idx].title = e.target.value;
                          setProducts(newProducts);
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', marginBottom: '0.5em' }}>
                        {product.variants && product.variants.length > 0 && product.variants.map((variant, vIdx) => (
                          <div key={variant.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                            <span style={{ fontSize: '0.95em', color: '#555' }}>{variant.title}</span>
                            <input
                              className="product-list__price-input"
                              type="number"
                              value={variant.price || ''}
                              onChange={e => {
                                const newProducts = [...products];
                                if (newProducts[idx].variants && newProducts[idx].variants[vIdx]) {
                                  newProducts[idx].variants[vIdx].price = e.target.value;
                                }
                                setProducts(newProducts);
                              }}
                              placeholder="Price"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        ))}
                      </div>
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
                      
                      <a
                        className="product-list__view-link"
                        href={
                          product.handle
                            ? `https://${shop}/products/${product.handle}`
                            : `https://${shop}/admin/products/${product.id.split('/').pop()}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="product-grid">
                  {products.map((product, idx) => (
                    <div className="product-grid__item" key={product.id}>
                      {product.images && product.images.length > 0 && product.images[0].src && (
                        <img
                          className="product-grid__image"
                          src={product.images[0].src}
                          alt={product.title}
                        />
                      )}
                      <textarea
                        className="product-grid__title-input"
                        value={product.title}
                        onChange={e => {
                          const newProducts = [...products];
                          newProducts[idx].title = e.target.value;
                          setProducts(newProducts);
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', marginBottom: '0.5em' }}>
                        {product.variants && product.variants.length > 0 && product.variants.map((variant, vIdx) => (
                          <div key={variant.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                            <span style={{ fontSize: '0.95em', color: '#555' }}>{variant.title}</span>
                            <input
                              className="product-grid__price-input"
                              type="number"
                              value={variant.price || ''}
                              onChange={e => {
                                const newProducts = [...products];
                                if (newProducts[idx].variants && newProducts[idx].variants[vIdx]) {
                                  newProducts[idx].variants[vIdx].price = e.target.value;
                                }
                                setProducts(newProducts);
                              }}
                              placeholder="Price"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        className="product-grid__save-btn"
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
                      {updateMessages[product.id] && (
                        <span className="product-grid__update-msg">{updateMessages[product.id]}</span>
                      )}
                      <a
                        className="product-grid__view-link"
                        href={
                          product.handle
                            ? `https://${shop}/products/${product.handle}`
                            : `https://${shop}/admin/products/${product.id.split('/').pop()}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
              {hasNextPage && (
                <button
                  className="app__next-btn"
                  onClick={() => fetchProducts(shop, cursor, true)}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Next'}
                </button>
              )}
            </>
          ) : (
            <p>(No products found or still loading...)</p>
          )}
        </>
      )}
    </div>
  );
}

export default App;