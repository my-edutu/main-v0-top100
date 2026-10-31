# Festival attendance interest

The dashboard’s top promo stack is replaced by the supplied 2026 auditorium image and an attendance-interest card. `/dashboard/festival` collects name, international phone number, and physical award pickup intent. It follows the shared dashboard heading and form controls. Saved responses open as a compact summary; Edit details opens the form, and Cancel restores the saved response. Payment guidance stays inline with the pickup choice.

Apply `supabase/migrations/20261031031216_festival_attendance_interests.sql` to the intended database before enabling this feature in production. It creates one private record per festival/member, enables RLS, denies direct anon/authenticated access, and grants server service-role access. No new payment configuration is introduced.

The API derives current award payment through the existing award payment service. It saves interest before routing unpaid or pending pickup requests to `/dashboard/me/award/payment`. That page and the `/dashboard/me/award/complete` receipt link back to festival interest, including after provider return. A paid URL parameter, member assertion, or saved pickup request never marks payment paid. Failed verification permits saving interest and asks the member to check status before paying again. Refunds are reflected on the next read.

Attendance interest is not a ticket reservation. Pickup intent does not change an award order’s courier, dispatch, or collection state. Staff confirm arrangements and fulfillment separately. Current responses appear in `/admin/festival`, protected by the existing database-backed admin guard; review verified payments in the existing Awards console before arranging pickup.

The development sample account stores festival interest in its isolated demo store. It never creates a real registration or payment. The actual member route is tested with isolated database/payment adapters. `tests/festival/migration.sql` exercises the migration in a disposable local `festival_test_*` database, then rolls back its changes.

The exact user-attached image is saved as `/public/images/afl-festival-2026.webp`. Keep public assets outside protected dashboard URLs so the Next image optimizer can read them without a member session.
