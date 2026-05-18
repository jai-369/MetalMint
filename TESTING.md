# FactoryTrack Manual QA Checklist

Use this checklist before deployment. Start with a fresh local database when possible.

## Startup And Environment

- [ ] `copy .env.example .env` works.
- [ ] `.env` has a real `JWT_SECRET`.
- [ ] `npm install` completes.
- [ ] `docker compose up -d postgres` starts PostgreSQL.
- [ ] `npm run dev:backend` starts the API on port 4000.
- [ ] `npm run dev:frontend` starts Vite on port 5173.
- [ ] `GET http://localhost:4000/api/health` returns ok.
- [ ] `GET http://localhost:4000/api/db-check` returns ok.

## Auth

- [ ] First admin can be created with `npm run create-admin`.
- [ ] Admin can login.
- [ ] Logout clears the session.
- [ ] `/api/auth/me` returns the logged-in user without `password_hash`.
- [ ] Disabled users cannot login.
- [ ] Bad login attempts are rate limited.
- [ ] Protected frontend routes redirect unauthenticated users to login.
- [ ] After login, the user returns to the originally requested private route when applicable.

## Admin Users

- [ ] Admin can list users.
- [ ] Admin can create admin, staff, and viewer users.
- [ ] Admin can edit user name, email, role, and active state.
- [ ] Admin can reset a user password.
- [ ] Admin can disable and enable users.
- [ ] Admin-created users can login immediately with the assigned temporary password.
- [ ] Admin can delete a user without breaking product history, sales, repair, or creator references.
- [ ] The app prevents deleting, disabling, or demoting the last active admin.
- [ ] Staff and viewer cannot access admin user APIs or pages.

## Product Types

- [ ] Admin can create a product type.
- [ ] Product type code is converted to uppercase.
- [ ] Duplicate product type code is rejected.
- [ ] Admin can edit name, category, description, and active state.
- [ ] Admin can soft-disable a product type.
- [ ] Disabled product types do not appear in new product forms.
- [ ] Product types used by manufactured products are not hard-deleted.
- [ ] Staff and viewer can read active product types only.

## Product Creation

- [ ] Admin can create manufactured products.
- [ ] Staff can create manufactured products.
- [ ] Viewer cannot create manufactured products.
- [ ] Product type dropdown shows only active product types.
- [ ] Width, height, depth, size label, material gauge, manufacturing date, batch, manufactured by, factory location, and remarks save correctly.
- [ ] New product status is `PAINTING_PENDING`.
- [ ] Product code is generated as `PREFIX-TYPE-SIZE-YYMM-SERIAL`.
- [ ] Product code is unique.
- [ ] Product code does not include paint color.
- [ ] Product code remains unchanged after edits.
- [ ] Product history includes product creation.

## Painting

- [ ] Admin/staff can add a painting record.
- [ ] Viewer can view but cannot edit painting records.
- [ ] Painted by, color, brand, batch number, coating type, date, time, repaint flag, and remarks save correctly.
- [ ] `PAINTED` painting status updates product status to `PAINTED`.
- [ ] "Move to stock after painting" updates product status to `IN_STOCK`.
- [ ] Product code remains unchanged after painting.
- [ ] Product history records painting events.

## Stock, Search, And Status

- [ ] Product code search is fast and prominent.
- [ ] Search filters work for product code, product type, status, width, height, size label, paint color, manufacturing batch, manufactured by, painted by, and date ranges.
- [ ] Stock summary groups by product type, size, paint color, and status.
- [ ] Status updates create product history entries with old and new status.
- [ ] `DAMAGED`, `RETURNED`, and `UNDER_SERVICE` require remarks.
- [ ] Dashboard counts are correct for painting pending, painted, in stock, reserved, dispatched, sold, damaged, and returned.

## Dispatch And Sale

- [ ] Admin/staff can create dispatch records.
- [ ] Viewer can view but cannot edit dispatch records.
- [ ] Customer name, mobile, invoice number, sale price, dispatch date, delivery location, transport details, vehicle number, and remarks save correctly.
- [ ] Creating dispatch sets product status to `DISPATCHED` by default.
- [ ] Mark sold sets product status to `SOLD`.
- [ ] Product history records dispatch and sale events.
- [ ] Product search works by invoice number, customer name, customer mobile, and dispatch date.

## Sales Invoices

- [ ] Sales menu is visible in the main navigation.
- [ ] Sales page lists only products currently `IN_STOCK`.
- [ ] Product search/filter works by code, type/name, category, size, color, and batch.
- [ ] Multiple different products can be selected for one sale.
- [ ] Quantity, price, line discount, invoice discount, and customer details save correctly.
- [ ] Creating a sales invoice moves selected products to `SOLD`.
- [ ] Sales invoice page shows invoice number, customer details, item table, totals, and remarks.
- [ ] Sales invoice can be printed or saved as PDF from the browser print dialog.

## Repair / Service

- [ ] Repair menu is visible in the main navigation.
- [ ] Admin/staff can create a repair job and service invoice.
- [ ] Product details, service details, customer details, start date, expected delivery, charge, and remarks save correctly.
- [ ] Repair status can move through Received, In Progress, Ready for Delivery, Delivered, and Cancelled.
- [ ] Viewer can view repair records but cannot create or update them.
- [ ] Service invoice page is printable and includes all captured repair details.

## QR Labels

- [ ] Product detail page displays a QR code.
- [ ] QR code points to `/qr/:productCode` or the configured `APP_PUBLIC_URL`.
- [ ] QR label page includes product code, product type, size, manufacturing date, and QR code.
- [ ] QR label page prints cleanly as a small sticker.
- [ ] Product detail remains private.
- [ ] Opening a QR route while logged out redirects to login and then opens the product.

## Mobile UI

- [ ] Login page is usable on mobile.
- [ ] Dashboard cards are readable on mobile.
- [ ] Product list cards do not overflow.
- [ ] Product detail sections stack cleanly.
- [ ] New product, painting, dispatch, and admin forms are usable on mobile.
- [ ] Bottom navigation works on mobile.
- [ ] Desktop sidebar works on larger screens.
- [ ] Tables or dense lists do not break the viewport.
- [ ] Loading, empty, and error states appear where expected.
- [ ] Dark/light mode toggles and persists.

## Production Build

- [ ] `npm run build` completes.
- [ ] `npm run start` starts the backend in production mode.
- [ ] `npm run preview --workspace frontend` serves the built frontend.
- [ ] Browser console has no runtime errors on core pages.

## Docker

- [ ] `docker compose config` is valid.
- [ ] `docker compose up -d --build` builds frontend and backend images.
- [ ] PostgreSQL container starts and initializes schema.
- [ ] Backend connects to PostgreSQL using the `postgres` service name.
- [ ] Frontend can call the backend API.
- [ ] No real secrets are committed.
