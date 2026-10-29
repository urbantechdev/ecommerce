NAISIAE TEXTILES PRODUCT LANDING-PAGE PATCH

Included files:
- src/App.tsx: routes /product/:productId and keeps these routes indexable.
- src/views/pages/ProductDetailView.tsx: public product detail page, selectable variant, price/stock, Product structured data.
- public/robots.txt: allows /product/ URLs.
- public/sitemap.xml: adds public product URLs.

Deployment notes:
1. Apply these files to the matching paths in your existing project (keep a backup first).
2. Build and deploy the site to https://naisiaetextiles.com.
3. Test a product URL such as https://naisiaetextiles.com/product/prod-schopolot-1 and a variant URL ending in ?variant=var-prod-schopolot-1-1.
4. Confirm the page loads without login, displays the correct product/price/size, and its image URL works.
5. After deployment, test URLs in Google Search Console / Merchant Center before submitting the feed.

Important: the attached feed is a draft generated from the database snapshot in the uploaded ZIP. Verify stock, prices and image usage rights against the live store before uploading. The feed contains 728 size-level offers for 141 products.
