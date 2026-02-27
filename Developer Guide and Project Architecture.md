# Walkthrough: Multi-Image Listing Support

I have successfully added the ability to upload multiple images to a listing, as well as the ability to overwrite and edit existing listing images.

## Architecture & Data Safety
To ensure **zero impact** on your existing database and 100% data safety, we implemented a backwards-compatible JSON schema within your existing `image_url` column:
- **New Products**: Store their multiple images as a serialized JSON array of URLs inside the `image_url` column.
- **Old Products**: Remain untouched.
- **Fail-Safe Reading**: When the app loads products, it attempts to parse the `image_url` as JSON. If it fails (which it will for all your old single-URL products), it safely wraps the old URL in an array and continues seamlessly. You don't have to touch or migrate any old data!

## Changes Made

### 1. [src/context/ProductContext.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx)
- Modified the [Product](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#6-28) type to handle both `image` (legacy fallback) and `images: string[]`.
- Added the fail-safe reading block in [fetchProducts](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#97-164).
- Created an [uploadImages](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#191-207) helper to process arrays of images (both base64 new uploads and existing URLs).
- Updated [addProductToSupabase](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#208-237) and [updateProduct](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#268-309) to stringify the array back into the database.

### 2. [src/components/features/QuickAdd/QuickAddModal.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/components/features/QuickAdd/QuickAddModal.tsx)
- Replaced the single image placeholder with a horizontally scrollable container.
- You can now select/snap multiple images, view their thumbnails side-by-side, and remove ones you don't like before saving.

### 3. [src/app/product_detail/page.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/app/product_detail/page.tsx)
- Replaced the static header image with a swipeable (horizontal scroll) gallery.
- Added a full-screen gallery viewer that lets you click through images.
- **Edit Mode**:
    - When you click "Edit", the image gallery grays out.
    - Added red "Trash" icons over each image to remove them.
    - Added floating "Camera" and "Gallery" buttons at the bottom of the image area to add new pictures to the existing listing.
    
### 4. [src/app/share/page.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/app/share/page.tsx) (Public Buyer Link)
- Safely parses the JSON array.
- Buyers now see a horizontal swipeable gallery of all the product's images instead of just one.

## Validation Results
- Verified that types match across the Supabase context and UI components.
- Application builds cleanly (`next build`) with 0 errors.
- Verified that old components (like [ProductCard](file:///Users/rajiv/Downloads/Antigravity/Curae/src/components/features/Product/ProductCard.tsx#11-51)) gracefully fallback to reading the first image in the array for their thumbnails.

---

# Developer Guide & Project Architecture
*This section serves as a comprehensive memory bank for future development.*

## Tech Stack
- **Framework**: Next.js 14 App Router (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & shadcn/ui (Radix UI primitives)
- **Database Backend**: Supabase (PostgreSQL & Storage)
- **Deployment**: GitHub Pages (Static HTML Export via `next build && next export`)
- **PWA**: Native Service Worker disabled due to persistent iOS caching bugs.

## Core Data Flow ([src/context/ProductContext.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx))
This file is the absolute source of truth for the entire application. It holds the React Context that all components subscribe to.
- **`products` State**: An array of [Product](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#6-28) objects.
- **[fetchProducts()](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#97-164)**: 
  - Pulls down data from the Supabase `products` table.
  - **CRITICAL FAILSAFE**: It attempts to `JSON.parse(item.image_url)`. If that fails (because older products were stored as plain string URLs), it wraps the string in an array: `parsedImages = item.image_url ? [item.image_url] : []`. **Never remove this failsafe**, or older products will crash the app.
  - Mixes in local `pending_uploads` from localStorage to show immediate feedback while images upload in the background.
- **[uploadImages(images: string[])](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#191-207)**: Converts base64 `data:image` strings into Blobs and uploads them to Supabase Storage (`product-images` bucket). Existing public URLs are passed through untouched.
- **[addProductToSupabase](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#208-237) / [updateProduct](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#268-309)**: Writes the entire Product object back. It intentionally saves the `images` array as a JSON string inside the `image_url` column to avoid complex DB migrations.

## Key UI Components
1. **Feed ([src/app/page.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/app/page.tsx) & [src/components/features/Product/ProductCard.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/components/features/Product/ProductCard.tsx))**
   - Renders the Masonry-style grid of products. 
   - Uses `images[0]` as the primary thumbnail.
2. **Product Detail ([src/app/product_detail/page.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/app/product_detail/page.tsx))**
   - The primary viewing and editing hub.
   - Requires `?id=xxx` in the URL to load the correct product.
   - Features a horizontal scrolling image gallery.
   - Handles the complex Web Share API logic for WhatsApp (shares the Image file + Text + URL).
3. **Quick Add ([src/components/features/QuickAdd/QuickAddModal.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/components/features/QuickAdd/QuickAddModal.tsx))**
   - Accessible from the floating action button (FAB).
   - Handles camera/gallery capture, price calculations (with Exchange Rate and Markup), and auto-geolocation.
   - **Duplication Hook**: Accepts an `initialData` prop. If passed, it pre-fills all fields (except images) to allow for 1-click product duplication.
4. **Buyer View ([src/app/share/page.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/app/share/page.tsx))**
   - A stripped-down, read-only variant of `product_detail`.
   - Used when clicking links shared to WhatsApp. Always ensure the `image_url` parsing failsafe is present here too.

## Known Gotchas & Critical Architectural Rules
1. **GitHub Pages Routing**: 
   - Because the repo is published to `curaebydisha.github.io/app`, the `basePath` in [next.config.ts](file:///Users/rajiv/Downloads/Antigravity/Curae/next.config.ts) must be set to `'/app'`.
   - **Do not use the `<Link>` component for root navigation from an external source without accounting for the `/app/` prefix.**
2. **iOS Safari Aggressive Caching**:
   - The previous PWA Next.js plugin (`@ducanh2912/next-pwa`) was **permanently removed**. It caused catastrophic caching loops on iPhones where it would serve an old [index.html](file:///Users/rajiv/Downloads/Antigravity/Curae/out/index.html) that pointed to deleted JS chunks, resulting in white screens.
   - [src/app/layout.tsx](file:///Users/rajiv/Downloads/Antigravity/Curae/src/app/layout.tsx) contains a manual "Kill Switch" script that runs on every page load to aggressively call `caches.delete()` and `serviceWorker.unregister()` to ensure iOS devices always pull the latest live code.
3. **Supabase & CORS (The Jio Incident)**:
   - At one point, the app failed silently on Safari because the user's ISP (Reliance Jio) blocked the DNS for `supabase.co`.
   - We attempted to inject custom `Fetch` headers into the Supabase client [src/lib/supabase.ts](file:///Users/rajiv/Downloads/Antigravity/Curae/src/lib/supabase.ts) to bypass caches. **THIS BROKE iOS COMPLETELY** (`TypeError: Load failed`). iOS Safari strictly enforces forbidden headers on [fetch](file:///Users/rajiv/Downloads/Antigravity/Curae/src/context/ProductContext.tsx#97-164) OPTIONS preflight requests.
   - **Rule**: Never override the `global.fetch` in the Supabase Client. Leave it as default.
- Supabase keys must be prefixed with `NEXT_PUBLIC_` to be bundled into the static HTML export. Both `.env` and [.env.local](file:///Users/rajiv/Downloads/Antigravity/Curae/.env.local) use the production `ftplcscdyxzaapepoyqz` project.

## Deployment Method (GitHub Pages)
The application is deployed as a fully static HTML export to GitHub Pages. Continuous Integration (CI) is intentionally bypasses GitHub Actions in favor of localized builds to ensure environment variables are correctly baked in.

**How to Deploy a New Version:**
1. **Ensure environment variables are set**: Your local [.env.local](file:///Users/rajiv/Downloads/Antigravity/Curae/.env.local) file MUST contain the correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before building.
2. **Run the deploy script**: 
   ```bash
   npm run deploy
   ```
3. **What this script does ([package.json](file:///Users/rajiv/Downloads/Antigravity/Curae/package.json))**:
   - `predeploy`: Runs `next build` (which creates the static [out](file:///Users/rajiv/Downloads/Antigravity/Curae/src/app/layout.tsx#35-75) directory) and runs `touch out/.nojekyll` to prevent GitHub from stripping Next.js `_next` folders.
   - `deploy`: Uses the `gh-pages` npm package to forcefully push the contents of the [out](file:///Users/rajiv/Downloads/Antigravity/Curae/src/app/layout.tsx#35-75) directory to the `gh-pages` branch of the `curaebydisha/app` repository.

**Critical Deployment Configurations**:
- **[next.config.ts](file:///Users/rajiv/Downloads/Antigravity/Curae/next.config.ts)**: The configuration must contain `output: 'export'` to generate the static HTML, and `basePath: '/app'` to ensure all generated asset paths point to the correct subdirectory on GitHub Pages (`curaebydisha.github.io/app/`).
- **[public/index.html](file:///Users/rajiv/Downloads/Antigravity/Curae/public/index.html)**: A fail-safe meta-refresh redirect exists here to push any errant traffic from the root domain immediately back to the `/app/` subpath.
