# Rent Ease: Product Requirements Document

> The one document a developer reads to understand the whole app. It reflects the code in this repo on 15 Sep 2026 (last commit `610fc3d`, plus uncommitted redesign work). When a feature changes, update this file.

---

## 1. The product in one minute

**Rent Ease is the simplest rent manager for small landlords.** It is a phone-first web app (installable as a PWA) that answers two questions every month: _who paid_ and _what's left_. It also keeps a full record of every tenant (photo, ID scans, family, condition of the home at move-in) as proof, and turns requests like "fix the kitchen tap" into notes with reminders. An owner can share the workspace with a team by email, with role and property limits.

**Product principles (set by the owner, keep them):**

1. **Simple enough to understand in a minute.** One navigation bar, plain labels, a setup guide for empty workspaces.
2. **Phone first.** The same UI runs on tablets and desktops, centred, with a side rail instead of a bottom bar. No fake device frame.
3. **Minimal.** Each page shows only what its task needs. Warm monochrome; colour only means status.
4. **Records are never silently lost.** Moving out keeps everything; deleting moves the record to an Archive; only the owner can erase.
5. **Money stays consistent.** No double entry, no overpaying a month, no rent before tracking started, no rent outside a tenancy.
6. **The server enforces every rule.** UI gates are a convenience; every Convex function re-checks identity, role and property scope.

---

## 2. Use cases

### 2.1 Who uses it

| Persona                        | How they get access                                                                | What they need                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Owner (landlord)**           | Signs up; every account owns one workspace                                         | Collect rent, keep records, delegate                              |
| **Manager / caretaker**        | Added by email with _Full_ or _Edit_ access, optionally limited to some properties | Record payments, add tenants, handle requests for their buildings |
| **Family member / accountant** | Added with _Read only_                                                             | See numbers and records without changing anything                 |
| **Admin (developer)**          | Convex dashboard                                                                   | Broadcast a system message to all users                           |

### 2.2 Use cases

| #     | Use case                                                                                                                                           | Where                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| UC-1  | See this month's rent: collected, expected, left, who paid in full                                                                                 | Home                                                                    |
| UC-2  | Record a full or partial payment for any valid month, with a date and note                                                                         | Payment sheet (from Home, Still due, Past dues, All units, tenant page) |
| UC-3  | Chase this month's dues                                                                                                                            | Home "Still due", `/collect`                                            |
| UC-4  | Chase unpaid rent from earlier months, month by month, without it inflating the current month                                                      | `/arrears` (Past dues)                                                  |
| UC-5  | Onboard a tenant: photo from the camera, phone, rent, unit, move-in date and condition, up to 10 labelled documents, family members with NID scans | Tenant form                                                             |
| UC-6  | Model buildings as properties with named units and see vacancy                                                                                     | Properties                                                              |
| UC-7  | End a tenancy without losing proof: move out, make current again, delete to Archive, restore, erase forever                                        | Tenant page, Archive                                                    |
| UC-8  | Log requests and jobs, tick them off, get a push reminder at a set time                                                                            | Notes, bell                                                             |
| UC-9  | Audit every unit: who rents it, paid status, vacant units; place, move or remove tenants                                                           | `/audit` (All units)                                                    |
| UC-10 | Delegate to a team with a role and a property scope; share an invite link                                                                          | Settings > Team, `/join`                                                |
| UC-11 | View every photo and document of a tenant and their family, one at a time                                                                          | Tenant gallery, Lightbox                                                |
| UC-12 | Broadcast system news to every user                                                                                                                | `admin_message` table                                                   |
| UC-13 | Personalise: light/dark per device, text size per account, currency per workspace                                                                  | Settings                                                                |

---

## 3. User workflows

### 3.1 Sign up and first run

1. Visitor lands on `/` (marketing page) and taps **Get started**.
2. Clerk sign-up on `/sign-up` (email code). All auth steps, including forgot/reset password, stay inside the app.
3. Redirect to `/app`. The app stores/refreshes the user record in Convex, then opens a workspace (see 3.7 for which one).
4. If the email is not verified, a **Verify your email** screen (6-digit code) blocks everything.
5. An empty workspace shows **Get started**: 1. Add a property → 2. Add a tenant → 3. Collect rent.
6. **Rent tracking starts in the month the owner joined.** Nothing before that month can be viewed or recorded; the month switcher explains why when tapped.

### 3.2 The monthly rent cycle

1. Open **Home**. It shows the running month: _Collected_ of _expected_, a progress meter, _Left to collect_, _Paid in full x of y_.
2. **Still due** lists up to 5 tenants who owe, largest first; **See all** opens `/collect` (searchable when more than 5).
3. Tap **Collect** to open the payment sheet, which is pre-filled with the remaining amount:
   - A banner shows what is already recorded for that month.
   - The amount can't exceed what's left; a chip fills in the full remaining amount.
   - Pick the month (not before the start month), the date paid and an optional note.
   - **Press and hold for 1 second** to record (the button fills; releasing early cancels; the phone vibrates when done).
4. The month switcher moves back (not before the start month) and forward (future months allowed); **Back to this month** resets.
5. The payment is saved with **who recorded it**, and every total updates live.

### 3.3 Past dues

1. Home shows a callout when anything is owed from earlier months: amount, number of tenants and the oldest month.
2. **More > Past dues** lists every tenant who is behind (including former tenants), with the total and number of months.
3. Expand a tenant to see each unpaid month (paid x of rent) and tap **Collect** on a month. The payment sheet opens on that exact month.
4. The running month is never counted here. It lives on Home, so the two never double-count.

### 3.4 Tenant lifecycle

1. **Add** (`Tenants > Add`, or from a vacant unit, which pre-fills the property and unit):
   - **Photo**: Take photo or Choose, auto centre-cropped to a square.
   - **Details**: name, phone and people living there (stepper) are required.
   - **Rent and home**: monthly rent (required), move-in date (defaults to today), property (optional unless the member is property-limited), unit (required once a property is chosen; rented units are disabled), and condition of the home at move-in (required).
   - **Family members**: add and edit on an overlay page; they are saved with the tenant, and the resident count rises automatically.
   - **Documents**: up to 10, each with a required label. Scan with the camera or upload images or PDFs; images are compressed.
2. **View** (tenant page):
   - **Top**: profile, then Call, Message and WhatsApp buttons.
   - **Rent card**: this month's status ("Paid", "x due" or "No rent this month") with **Record payment**.
   - **Records**: payments (6 shown, then Show all, each "by Name"), notes, family, and documents that open in the Lightbox.
   - **All files** opens the gallery; **About** shows move-in and move-out dates, residents and condition.
3. **Edit**: the same form, with family and documents editable. Files removed from the tenant are deleted from storage.
4. **Move out** (Full access): the tenant becomes _former_ with a move-out date. Everything is kept, and the unit becomes vacant.
5. **Make current again** (Edit access): the tenant becomes active again. If their old unit has been rented out since, they come back unplaced (a property-limited member is blocked instead).
6. **Delete** (Full access): the whole record is snapshotted into the **Archive** (profile, family, payments, notes, file IDs), then removed from the live workspace. Files stay in storage.
7. **Archive > Restore** (Full access): the tenant comes back as a _former_ tenant with all data; unplaced if the unit is gone or taken. Reminders are not re-armed.
8. **Archive > Erase forever** (Owner only): the record and all its files are destroyed. This is the only destructive action in the app.

### 3.5 Properties and units

1. **Add property** (not available to property-limited members):
   - **Type**: Villa, House, Apartment or Other.
   - **Name**: required.
   - **Units**: at least 1 and at most 200, each named and unique (case-insensitive). A stepper and "Add unit" add rows; "Name blanks" fills in "Unit 1, 2…".
   - **Address and notes**: optional.
2. **Property page**:
   - **Summary**: type and address, then "x of y units rented, amount a month", plus the memo.
   - **Units**: occupied units show the tenant, rent and an unassign X; vacant units have **Assign**.
   - **Other sections**: Needs a unit (tenants placed here without a unit), Open notes (with Add note) and Past tenants.
3. **Assign tenant**: pick a unit, then a current tenant, or **New tenant for this unit**.
4. **Edit**: rename or add units. A rented unit can't be removed; removing an unrented unit unlinks any past tenants from it.
5. **Delete property** (Full access):
   - **Units** are deleted.
   - **Tenants** become unplaced but remain in the records.
   - **Notes** lose the property link.
   - **Members** limited to this property lose it from their list; nobody's access is widened.
6. **All units** (`More > All units`, the Audit page):
   - **Top**: month switcher, "x of y units rented, z% collected", and a filter (All, Due, Vacant).
   - **Property cards**: each collapses and expands, with a collected meter and a due count.
   - **Tenant action sheet**: Record payment, View profile, Edit details, Move to or Place in a unit, Remove from unit (hidden for property-limited members), Move out.
   - **Vacant unit sheet**: place any current tenant, or add a new one.
   - **Not placed**: a section for tenants who aren't in any property.

### 3.6 Notes and reminders

1. **Notes > Add** (or Add note from a tenant or property page):
   - **Note text**, plus an optional link to a tenant and/or a property.
   - **Remind me** toggle, with presets (Tomorrow, In 3 days, Next week, Next month, all at 09:00) or a custom date and time. Past times are rejected.
2. The **To do / Done** tabs each have a check to toggle status. Fired reminders show a _Due_ badge.
3. Editing a note's reminder time cancels the old scheduled job and schedules a new one.
4. At the reminder time, Convex marks the note _fired_: it appears in the bell and a web push goes to the owner and every verified member who can see the note.
5. Home shows the next 3 upcoming reminders.
6. Deleting a note needs Full access.

### 3.7 Team: invite, join, work, leave

1. **Owner adds a person** in Settings > Team with their email, a role (Full, Edit or Read only) and which properties they see (all, including future ones, or a hand-picked list).
2. No email is sent. The owner taps **Share link** to share `/join?w=<workspaceId>` via WhatsApp or SMS, or copies it.
3. **Invitee opens the link**:
   - **Signed out**: told to sign in or sign up with _the exact invited email_, then returned to the link.
   - **Signed in**, one of five outcomes:
     - _member_: opens the workspace and marks the welcome as seen
     - _not invited_: "Wrong email address", with a button to switch account
     - _unverified_: "Verify your email first"
     - _owner_: "This is your workspace"
     - _invalid_: "This link doesn't work"
4. **Which workspace opens after sign-in**:
   - the one last opened on this device, if any
   - otherwise, if their own workspace is empty and they belong to another, that shared one
   - otherwise, their own
5. On first entry, a **"You've been added"** sheet explains the role and scope once.
6. Members see a banner (for example "Redwan's workspace · Edit access") and switch workspaces from **More**.
7. **The team list** shows status: "Waiting for them to sign up as …" or "Email not verified yet, no access". The owner can change the role, change property access, resend the link or remove the person.
8. **A member can leave** from Settings > Team.

### 3.8 Notifications (the bell)

- **Contents**: admin messages plus fired, not-done reminders from the current workspace that _this user_ hasn't read.
- **Opening the panel** marks everything in it as read _for this user only_. Items stay visible until the panel closes, then never return.
- **Per item**: X removes it; reminders also have **Done**, which marks the note done.
- **Rescheduling** a reminder gives it a new key, so it notifies again at the new time.
- **Toast**: a new item arriving while the app is open shows a toast.
- **Links** in admin messages open only if they are `https://`, `http://` or in-app `/paths`.

### 3.9 Settings and More

- **More**:
  - account card (with Clerk "Manage")
  - workspace switcher, when the user has more than one
  - links, each with a one-line description: Past dues (with an amount badge), Payments, All units, Archive, Settings
  - Sign out
- **Settings**:
  - **Profile**: read-only view with avatar and name.
  - **Appearance**: Automatic, Light or Dark. Saved per device.
  - **Text size**: Small, Default, Large or Extra large. Saved to the account, so it applies on every device.
  - **Notifications**: enable push on this device, or turn it off. iOS shows "Add to Home Screen" guidance.
  - **Currency** (owner only): `$ € £ ৳ ₹ AED SAR ¥`. The default is `$`.
  - **Team**: owner management (3.7), or, for members, their role explanation and **Leave this workspace**.

---

## 4. Screens and routes

All app pages live under `/[userId]`, where `userId` is the **workspace owner's** Convex user ID (not necessarily the viewer's).

| Route                                                                                                                     | Screen                                            | Notes                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/`                                                                                                                       | Landing (public, server component)                | Hero, how it works, features, FAQ, JSON-LD; CTA switches to "Open app" when signed in            |
| `/sign-in`, `/sign-up`                                                                                                    | Clerk `<SignIn/>` / `<SignUp/>` with path routing | Forgot/reset password and email codes stay on these paths                                        |
| `/join?w=`                                                                                                                | Invite link                                       | Public page; asks visitors to sign in; `noindex`                                                 |
| `/app`                                                                                                                    | Bootstrap redirect                                | Opens the chosen workspace (3.7)                                                                 |
| `/[userId]`                                                                                                               | **Home** (tab)                                    | Get started, month summary, past-dues callout, Still due, Reminders                              |
| `/[userId]/tenants`                                                                                                       | **Tenants** (tab)                                 | Search, Current / Moved out, paid badge only if they rent this month                             |
| `/[userId]/tenants/new`                                                                                                   | Tenant form                                       | `?property=&unit=` pre-fill                                                                      |
| `/[userId]/tenants/[id]`                                                                                                  | Tenant page                                       |                                                                                                  |
| `/[userId]/tenants/[id]/edit`                                                                                             | Tenant form (edit)                                |                                                                                                  |
| `/[userId]/tenants/[id]/gallery`                                                                                          | "Name's files"                                    | Grouped: tenant photo, documents, each family member's photo and NID; Lightbox swipes across all |
| `/[userId]/tenants/[id]/family/new`, `/family/[memberId]`                                                                 | Family member form                                | Saves directly; delete needs Full access                                                         |
| `/[userId]/properties`                                                                                                    | **Properties** (tab)                              | `?new=1` opens the add sheet                                                                     |
| `/[userId]/properties/[id]`                                                                                               | Property page                                     |                                                                                                  |
| `/[userId]/notes`                                                                                                         | **Notes** (tab)                                   | `?new=1` opens the composer                                                                      |
| `/[userId]/more`                                                                                                          | **More** (tab)                                    |                                                                                                  |
| `/[userId]/collect`                                                                                                       | Still due (all)                                   | Lights the Home tab                                                                              |
| `/[userId]/arrears`                                                                                                       | Past dues                                         | Under More                                                                                       |
| `/[userId]/payments`                                                                                                      | Payments                                          | Under More; search, filter and sort every payment recorded                                       |
| `/[userId]/audit`                                                                                                         | All units                                         | Under More                                                                                       |
| `/[userId]/archive`                                                                                                       | Archive                                           | Under More; record opens as an overlay page                                                      |
| `/[userId]/settings`                                                                                                      | Settings                                          | Under More                                                                                       |
| `robots.txt`, `sitemap.xml`, `opengraph-image`, `manifest.webmanifest`, `sw.js`, `icon.png`, `apple-icon.png`, `logo.png` | Public assets                                     |                                                                                                  |

**Shell rules:**

- **Navigation**: the bottom bar has Home, Tenants, Properties, Notes and More, and becomes a side rail on wide screens (≥1024px container width) with the user's profile card and sign out button at the bottom.
- **Navigation hidden** on `/new`, `/edit` and `/family/*` routes.
- **Header**: tab pages show a large title and the bell; sub pages show a back arrow and a small title, with no bell.
- **Sheets**: bottom sheets on phones, centred dialogs on wide screens. They portal into `#sheet-root`.
- **Other overlays**: `OverlayPage` for full-screen sub pages, Lightbox for files, toasts for feedback.
- **Unknown workspace**: a `/[userId]` the user can't access redirects to their landing workspace.

---

## 5. Business rules

### 5.1 Rent and payments

- **Start month**: the month the workspace owner's account was created (`startMonthOf`). No rent is owed, viewable or recordable before it.
- **Rent window per tenant** (`rentWindow` in `convex/lib.ts`):
  - **from** is the later of the start month and the move-in month; with no move-in date, the month the tenant record was created.
  - **to** is open for active tenants. For former tenants it is the move-out month (or `from` if that is missing or earlier), so the app under-counts rather than invents debt.
- **Monthly figures** (`payments.summary`):
  - **Expected**: the rent of every tenant (active or former) in their window that month.
  - **Collected**: the sum of that month's payments.
  - **Left**: the sum of each tenant's `max(0, rent − paid)`.
  - **Paid in full**: tenants whose remaining amount is 0.
- **Paid status is always about the running month**, and shown only if the tenant rents in it ("No rent this month" otherwise).
- **Past dues** (`payments.arrears`): every month from `from` to the last _past_ month. The "current month" is the earlier of the client's month and the server's UTC month, so a month-boundary timezone gap never double-counts.
- **Recording a payment** (`payments.add`) rejects:
  - an amount ≤ 0
  - a badly formatted month
  - a month before the start month, before the tenant's window or after their move-out
  - a tenant with no rent set
  - a month already paid in full ("delete the existing payment first")
  - an amount above what's left ("Only X is left…")

  Errors quote the workspace currency. The same check drives the payment sheet live (`payments.monthStatus`).

- **Partial payments** are allowed; several payments can add up to a month's rent.
- **Stored on each payment**: `recordedBy`, shown as "Paid date by Name".
- **Deleting a payment** needs Full access.
- **Rent is a single current value** on the tenant. Changing it changes expected and past-due amounts for every month (see 11).

### 5.2 Units and placement

- A tenant is either unplaced, or in exactly one property **and** one of its units.
- **One active tenant per unit.** Placing someone in a rented unit fails with "X is already rented to Y".
- A rented unit can't be removed from a property; unassign the tenant first.
- Tenants placed before units existed appear under **Needs a unit**.

### 5.3 Tenant records and files

- **Required fields**: name, phone, residents ≥ 1, rent ≥ 0 and condition; for property-limited members, a property too.
- **Limits**: up to 10 documents (labels default to "Document n"). Family members need name, age (0 to 130), phone and 1 to 2 NID photos; photo and job are optional.
- **Image processing** (client side):
  - **Portraits**: centre-cropped square, max 640px, JPEG at 0.86 quality.
  - **Document images**: max 2000px, JPEG at 0.82 quality, kept only when smaller than the original.
  - **PDFs and GIFs**: passed through unchanged.
- **Uploads**: `files.generateUploadUrl` (Edit access), then a POST to Convex storage.
- **Deleted files**: on tenant or family _update/remove_, storage files no longer referenced are deleted. Archive deletion keeps files.

### 5.4 Archive

- **Moving out ≠ deleting.** Moving out keeps the tenant live as a former tenant; deleting moves them to the Archive.
- **An archive row stores**:
  - denormalised list fields (name, phone, place, dates, total paid, payment count, who deleted and when, reason)
  - verbatim copies of the tenant, family, payments and notes
  - every storage ID
- **What deleting does**: scheduled reminder jobs are cancelled, then the live notes, payments, family and tenant rows are deleted.
- **Past-month collected totals drop** by the deleted tenant's payments until they are restored.

### 5.5 Notes, reminders and notifications

- **Scheduling**: `notes.create`/`update` schedule `notes.fire` at `remindAt`, cancelling a pending job when the time changes.
- **Firing**: `fire` sets `fired`, then `push.sendForNote` (a Node action using `web-push` with VAPID) sends to the recipients' subscriptions. Dead subscriptions (404 or 410) are removed.
- **Push recipients**:
  - the owner
  - every member whose email is verified and whose property scope can see the note
- **Read state** is per user (`notificationReads`) with keys `note:<id>:<remindAt>` and `admin:<id>`.
- **Admin messages**: add or delete rows in `admin_message` (`title`, `body`, optional `link`) in the Convex dashboard. They show live in every user's bell. **No push is sent** for them.

---

## 6. Roles and permissions

Enforced by `access()` / `tryAccess()` in `convex/lib.ts` on every function. Rank: `read < edit < full < owner`.

| Capability                                                                    | Read | Edit | Full | Owner |
| ----------------------------------------------------------------------------- | :--: | :--: | :--: | :---: |
| View tenants, payments, files, notes, audit, past dues, archive               |  ✓   |  ✓   |  ✓   |   ✓   |
| Add/edit tenants, family, properties and units; record payments; upload files |      |  ✓   |  ✓   |   ✓   |
| Assign/unassign units; add/edit/complete notes; make a former tenant current  |      |  ✓   |  ✓   |   ✓   |
| Move out tenant; delete payment, property, note or family member              |      |      |  ✓   |   ✓   |
| Delete tenant to Archive; restore from Archive                                |      |      |  ✓   |   ✓   |
| Erase an archive record forever                                               |      |      |      |   ✓   |
| Manage team (list with emails, add, role, scope, remove); set currency        |      |      |      |   ✓   |

**Everyone** can mark their own notifications read, set their own text size, manage their push subscription, and leave or acknowledge a workspace they were added to.

**Property scope** (`members.propertyIds`: absent means all, a list means only those, an empty list means none):

- A limited member sees only those properties, their units and the tenants placed in them, plus those tenants' payments and files. The same limit applies to archive records, past dues, All units and push.
- Notes they see: notes about a visible tenant or property, plus general notes they wrote themselves.
- They can't create properties, leave a tenant unplaced, or restore or reactivate someone into a unit they can't place.
- Deleting a property removes it from members' lists; access is never widened.

**Email verification:**

- **Team access**: needs Clerk's `email_verified === true` on the user record.
- **Own workspace**: shut only when the flag is explicitly `false`.
- **Client**: `VerifyEmail` blocks any account whose primary email isn't verified.

---

## 7. Data model (Convex, `convex/schema.ts`)

| Table               | Key fields                                                                                                                                                                                                                | Indexes                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `users`             | `tokenIdentifier`, `email` (lowercase), `emailVerified?`, `name`, `imageUrl?`, `currency?`, `fontScale?` (sm/md/lg/xl). **A user's `_id` is also their workspace ID.**                                                    | by_token, by_email                                       |
| `members`           | `workspaceId`, `email`, `role` (full/edit/read), `propertyIds?`, `seenAt?`                                                                                                                                                | by_workspace, by_email, by_workspace_email               |
| `properties`        | `workspaceId`, `name`, `kind` (villa/house/apartment/other), `address?`, `notes?`                                                                                                                                         | by_workspace                                             |
| `units`             | `workspaceId`, `propertyId`, `name`                                                                                                                                                                                       | by_property, by_workspace                                |
| `tenants`           | `workspaceId`, `propertyId?`, `unitId?`, `name`, `phone`, `residents`, `rent`, `condition`, `photoId?`, `documents[{storageId,label,contentType?}]`, `status` (active/former), `moveInDate?`, `moveOutDate?` (YYYY-MM-DD) | by_workspace_status, by_property, by_unit                |
| `familyMembers`     | `workspaceId`, `tenantId`, `name`, `age`, `phone`, `job?`, `photoId?`, `nidPhotoIds[]` (1 to 2)                                                                                                                           | by_tenant                                                |
| `payments`          | `workspaceId`, `tenantId`, `month` (YYYY-MM), `amount`, `paidOn` (YYYY-MM-DD), `note?`, `recordedBy?`                                                                                                                     | by_workspace_month, by_tenant                            |
| `notes`             | `workspaceId`, `body`, `tenantId?`, `propertyId?`, `remindAt?` (ms), `reminderJobId?`, `fired`, `seen` (legacy), `done`, `createdBy`                                                                                      | by_workspace, by_workspace_fired, by_tenant, by_property |
| `archivedTenants`   | list fields plus `tenant`, `family`, `payments`, `notes` (verbatim, `v.any()`), `storageIds[]`, `archivedAt`, `archivedBy`, `archivedByName`, `reason?`                                                                   | by_workspace                                             |
| `admin_message`     | `title`, `body`, `link?`                                                                                                                                                                                                  | (none)                                                   |
| `notificationReads` | `userId`, `key`                                                                                                                                                                                                           | by_user_key                                              |
| `pushSubscriptions` | `userId`, `endpoint`, `p256dh`, `auth`                                                                                                                                                                                    | by_user, by_endpoint                                     |

---

## 8. Backend function map (`convex/`)

| Module                    | Functions                                                                                                                                                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib.ts`                  | Access (`getMe`, `tryAccess`, `access`, `roleIn`), scope (`seesProperty`, `seesTenant`, `assert*`, `noteFilter`), placement (`unitOccupant`, `checkPlacement`), months (`monthOf`, `shiftMonth`, `monthRange`, `rentWindow`, `inRentWindow`, `startMonthOf`), `allTenants` |
| `users.ts`                | `store` (upsert from the Clerk JWT on every sign-in), `me`, `setFontScale`, `setCurrency`                                                                                                                                                                                  |
| `workspaces.ts`           | `list` (own plus memberships, with role, currency, start month, restricted, isNew, empty), `invite` (join-link status)                                                                                                                                                     |
| `members.ts`              | `list` (owner only), `add`, `setRole`, `setScope`, `remove`, `leave`, `acknowledge`                                                                                                                                                                                        |
| `properties.ts`           | `list`, `get`, `unitsFor`, `create`, `update` (unit diff), `remove`, `assign`                                                                                                                                                                                              |
| `tenants.ts`              | `list` (status and month, with paid/owes), `get` (with thisMonth, payments with recordedByName, notes, family, file URLs), `create`, `update`, `moveOut`, `reactivate`                                                                                                     |
| `family.ts`               | `listByTenant` (gallery), `get`, `create`, `update`, `remove`                                                                                                                                                                                                              |
| `payments.ts`             | `summary`, `arrears`, `monthStatus`, `add`, `remove`                                                                                                                                                                                                                       |
| `audit.ts`                | `overview` (properties, then units, then tenant plus pay status; unassigned; totals)                                                                                                                                                                                       |
| `archive.ts`              | `list`, `get`, `archiveTenant`, `restore`, `purge`                                                                                                                                                                                                                         |
| `notes.ts`                | `list`, `upcoming`, `create`, `update`, `setDone`, `remove`, `fire` (internal)                                                                                                                                                                                             |
| `notifications.ts`        | `list`, `markRead`                                                                                                                                                                                                                                                         |
| `pushData.ts` / `push.ts` | `subscribe`, `unsubscribe`, `forNote` (internal), `removeSub` (internal) / `sendForNote` (internal Node action)                                                                                                                                                            |
| `files.ts`                | `generateUploadUrl`                                                                                                                                                                                                                                                        |
| `auth.config.ts`          | Clerk provider: `CLERK_JWT_ISSUER_DOMAIN`, `applicationID: "convex"`                                                                                                                                                                                                       |

---

## 9. Architecture

| Layer          | Choice                                                                     | Notes                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | **Next.js 16.3** (App Router, Turbopack), React 19, TypeScript             | `src/proxy.ts` replaces `middleware.ts`. Read `node_modules/next/dist/docs/` before changing conventions (see `AGENTS.md`). `error.tsx` receives `retry`. |
| Backend and DB | **Convex** (queries, mutations, scheduler, file storage, Node action)      | Reactive `useQuery`; import alias `@convex/*` → `convex/*`                                                                                                |
| Auth           | **Clerk v7 (Core 3)** + `ConvexProviderWithClerk`                          | `<SignedIn>` was removed (use `<Show>`); `createRouteMatcher` is deprecated, so the proxy matches paths by hand                                           |
| Push           | `web-push` + VAPID, `public/sw.js`                                         |                                                                                                                                                           |
| UI             | Hand-written CSS (`src/app/globals.css`), Geist font, `lucide-react` icons | No Tailwind or component library                                                                                                                          |
| Hosting        | GitHub `redwan-edu/Rent-Ease`; Vercel intended                             | Not deployed yet                                                                                                                                          |

**Auth, in three layers:**

1. **`proxy.ts`** (edge) runs `clerkMiddleware` with `auth.protect()` on everything except public paths (`/`, `/sign-in*`, `/sign-up*`, `/join`, manifest, `sw.js`, icons, `logo.png`, robots, sitemap, OG images). Its sign-in and sign-up URLs point to the app's own pages.
2. **Client bootstrap** (`src/lib/bootstrap.tsx`):
   - redirects signed-out visitors to `/sign-in`
   - blocks unverified emails
   - calls `users.store`, then loads `workspaces.list`
   - refreshes the push subscription when notifications are already allowed
3. **Every Convex function** re-checks the identity, role and property scope. This is the real gate.

**`ClerkProvider`** (in `layout.tsx`): `signInUrl=/sign-in`, `signUpUrl=/sign-up`, both fallback redirects go to `/app`, and `afterSignOutUrl=/`. The Clerk card is themed from CSS variables (`src/lib/clerkAppearance.ts`).

**Client state:**

- **`WorkspaceProvider`** (`src/lib/workspace.tsx`) exposes `workspace`, `can(role)`, `money()`, `to(path)` (prefixes `/<workspaceId>`), `startMonth` and `clampMonth`.
- **Local storage keys**:
  - `rent-ease:last-workspace` (last opened workspace)
  - `rentease:theme` (light/dark, device)
  - `rentease:fs` (text-size cache)

**Theme and text size:**

- **Boot**: inline `<head>` scripts apply the theme (`data-theme`) and text size (`--fs`) before first paint.
- **Theme sync**: `ThemeSync` follows OS theme changes.
- **Text size sync**: `FontScaleSync` applies the account value. All font sizes are `calc(px * var(--fs))`; inputs never go below 16px (avoids iOS zoom).

**Layout:**

- **Shell**: a full-height `.device > .screen` container using CSS container queries.
- **Content**: a column of about 760px maximum width.
- **Nav**: bottom bar on phones, side rail at 1024px and wider.
- **Layers**: header 10, nav 20, overlay page 30, sheets 40 to 41, toast 60, lightbox 70.

**Design tokens:**

- **Colour**: warm monochrome (`--bg #fbfbfa`, `--ink #191918`, 1px lines) with a full dark set under `[data-theme="dark"]`. Status colours only: `--ok` green for paid, `--warn` amber for partly paid or owed, `--danger` red for due or destructive.
- **Radius**: 8 (controls), 12 (cards), 16 (sheets).
- **Motion**: hover fades on pointer devices only; reduced motion is respected.
- **Copy rules**: no em dashes in visible text, plain labels ("Add", "Still due", "To do"), and empty sections get one muted line instead of a big empty card.

**PWA**: `manifest.ts` (`start_url /app`, standalone, icons 192/512 including maskable), `apple-icon.png` and a service worker for push. Notification clicks open `/<workspace>/notes`.

**SEO:**

- **Site facts**: `src/lib/site.ts` (`NEXT_PUBLIC_SITE_URL`, falling back to `VERCEL_PROJECT_PRODUCTION_URL`, then localhost).
- **Crawlers**: `robots.ts` allows `/`, `/sign-in` and `/sign-up`, and disallows `/app`, `/join` and `/api`; `sitemap.ts` lists the public pages.
- **Previews and structured data**: `opengraph-image.tsx`; JSON-LD for WebSite, WebApplication and FAQPage on the landing page.

**System screens**: `loading.tsx` (breathing logo and progress line), `not-found.tsx`, `error.tsx` and `global-error.tsx`, all sharing `StatusScreen`.

---

## 10. Environment and setup

| Where                             | Variable                                                                                                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.local` (Next)               | `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and `NEXT_PUBLIC_SITE_URL` (production) |
| Convex env (`npx convex env set`) | `CLERK_JWT_ISSUER_DOMAIN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`                                                                                                                            |

**Clerk dashboard (required):**

- **JWT template `convex`**: claims `aud: "convex"`, `name`, `given_name`, `email`, `picture` **and `email_verified: "{{user.email_verified}}"`**. Without `email_verified`, invited members never get access.
- **Email settings**: verify at sign-up and password reset by email code both turned on.

**Accounts** (created fresh for this app; never reuse other projects):

- **Convex**: team `redwan-hussain-ac349`, project `rent-ease`, dev deployment `incredible-butterfly-330`.
- **Clerk**: app "Rent Ease" (dev instance `engaging-haddock-4489`).

**Commands** (from `rent-ease/`):

```bash
npm install
npx convex dev
npm run dev
npm run build
npm run lint
```

`npx convex dev` pushes the schema and functions and watches for changes.

---

## 11. Known limitations and open items

- **Rent history isn't versioned.** Editing a tenant's rent rewrites expected and past-due amounts for all past months.
- **Tracking can't start before the owner joined.** Older history can't be entered.
- **Deleting a tenant** lowers past months' collected totals until they are restored.
- **Orphaned uploads**: files uploaded in a form that is then abandoned stay in storage.
- **Push** needs HTTPS (production) and, on iPhone, the app added to the Home Screen. Admin messages never push.
- **Invites send no email.** The owner shares the link by hand.
- **Former tenants without a move-out date** owe only their first month (deliberate under-count).
- **Not production-ready yet**:
  - Clerk dev keys
  - Convex dev deployment only
  - `NEXT_PUBLIC_SITE_URL` unset
  - Vercel env vars still to add
- **Dev data** may still contain an old duplicate September payment (৳2,500) recorded before duplicate blocking. Delete it by hand if it's there.
- **"Failed to load Clerk JS"** (`failed_to_load_clerk_js`) was reported once in dev after the proxy change. Its cause is unconfirmed; check network access to `*.clerk.accounts.dev` if it returns.
- **Codebase hygiene**:
  - no automated tests
  - `README.md` is still the create-next-app boilerplate
  - `format.ts` has unused helpers (`greeting`, `hue`)
  - `notes.seen` is legacy (reads moved to `notificationReads`)

---

## 12. Working agreements and history

**Agreements with the owner:**

- Never commit or push unless asked; the owner reviews and pushes.
- Create new Convex and Clerk projects for new apps; don't touch existing ones.
- Follow the minimal design direction (section 9 tokens, one navigation, task-only information).

**How the app got here (10 to 15 Sep 2026):**

1. **v1**:
   - auth, dashboard, tenants with documents and camera photo, audit notes with push reminders, villas and houses, team roles
   - phone and tablet UI, landing page at `/`, app under `/[userId]`
2. **Iterations**:
   - properties gained named units
   - family members with NID
   - press-and-hold payments (2s, then 1s)
   - reminder picker fix
   - sidebar with Audit and Collect due
   - "Audit" notes renamed **Notes**; Audit became the units overview
   - collapsible property cards, text size per account, gallery and Lightbox, edge auth in `proxy.ts`
3. **Money integrity**:
   - tracking starts at the join month
   - Past dues kept separate from the running month
   - double entry and overpaying blocked
   - move out and delete-to-Archive split
4. **Team hardening**:
   - invite links and welcome sheet
   - property scopes, `recordedBy`, verified-email gate, members can leave
   - per-user notifications and `admin_message`
   - in-app password reset, new logo everywhere
5. **Redesign**:
   - one navigation (bottom bar or rail) plus the More page; minimal warm monochrome
   - dark mode per device
   - SEO landing
   - branded loading, 404 and error pages
