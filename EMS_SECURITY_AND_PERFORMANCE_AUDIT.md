# EMS Security & Performance Audit

**Scope:** Static inspection of the current worktree. No application, database, tests, builds, linting, or browser automation were run. No environment values or credentials were read. Findings describe code behavior; production environment values, live MongoDB indexes, Render logs, and browser cookie policy were not independently verified.

## A. Executive Summary

The project has useful security controls: passwords are bcrypt-hashed, authentication uses an HttpOnly cookie, protected APIs derive the user ID from a verified JWT, admin routes use a database-backed role check, and payment proof and notification APIs are scoped to the authenticated user. Production cookie attributes in code match the requested cross-origin setup when `NODE_ENV=production` and the configured frontend origin is correct.

The current code still has security and reliability gaps that should be addressed before treating authentication as production-ready:

1. `/auth/alluser` is unauthenticated and returns every user's name and email.
2. The JWT has no expiration even though its browser cookie expires after 24 hours.
3. Signup OTPs are generated with `Math.random`, stored as plaintext, and have no verification-attempt limit or signup/verification rate limit. Their two-minute lifetime starts before email delivery.
4. Production uses `SameSite=None`; the API has no explicit CSRF defense. Credentialed CORS restricts JavaScript reads but is not, by itself, a guarantee that a browser will not send a cross-origin form request.
5. The legacy authenticated `/auth/reset` handler does not change a password and sends a response before checking the account.

Performance is adequate for a small demonstration dataset but several routes load complete collections and perform filtering or aggregation in application memory. No performance measurements were taken.

## B. Security Findings

### High — Public endpoint exposes the user directory

- **Affected code:** `server/routes/auth.js`, `GET /auth/alluser`; `server/controller/auth.js`, `testAPI`.
- **Confirmed behavior:** The route has no authentication or admin middleware. `testAPI` loads all `Users` documents and returns each user's ID, name, and email. It also loads complete user documents into the server process before projecting the response.
- **Impact:** Any caller can enumerate registered users and harvest email addresses. Cost grows with the user collection.
- **Recommendation:** Remove the test route from production or protect it with admin authorization and return only the minimum aggregate information needed.

### High — JWT lifetime is not bounded server-side

- **Affected code:** `server/services/auth.js`, `setUser`; `server/middleware/authMiddleware.js`, `authMiddleware`; `server/controller/auth.js`, `userLogin` and `logout`.
- **Confirmed behavior:** `jwt.sign(payload, JWT_KEY)` has no `expiresIn`. Login sets the `ems` cookie with a 24-hour `maxAge`, and `jwt.verify` does not require an `exp` claim. Logout clears the browser cookie but does not revoke a copied token.
- **Impact:** A token copied before cookie deletion/expiry remains valid until the signing key changes or the account is otherwise rejected by downstream checks. The browser cookie's 24-hour lifetime does not enforce a server-side token lifetime.
- **Recommendation:** Add an explicit JWT expiration compatible with the intended 24-hour session. If immediate revocation is required, use a revocation/version mechanism; cookie clearing alone cannot revoke copied bearer credentials.

### High — Signup OTP can be brute-forced and is stored in plaintext

- **Affected code:** `server/controller/auth.js`, `userSignUp` and `verifyOTP`; `server/model/pendingUser.js`; `server/routes/auth.js`.
- **Confirmed behavior:** OTP generation uses `Math.random()` for a four-digit code. `PendingUser.otp` is stored as a normal string. Verification compares the submitted value directly and has no attempt counter or route-level limiter. Signup and OTP verification have no rate-limiting middleware. `otpExpires` is calculated before `await sendOTP(...)`, so time spent on email delivery consumes the code's two-minute lifetime. The current routes include no resend endpoint.
- **Impact:** Repeated verification attempts can try the small code space while the record is valid. Anyone with database read access can see active OTPs. Slow delivery may leave little usable time; users cannot request a new code through the current API.
- **Recommendation:** Generate codes with a cryptographic RNG, store a keyed hash or other non-reversible representation, enforce atomic per-record attempt limits and rate limits, and start expiry after the provider accepts delivery. Add a controlled resend flow if required by the product.

### High — Cross-site cookie requests have no explicit CSRF defense

- **Affected code:** `server/app.js`, CORS and URL-encoded body parsing; `server/controller/auth.js`, `getAuthCookieOptions`; mutation routes including `server/routes/events.js` and `server/routes/blog.js`.
- **Confirmed behavior:** Production cookies use `SameSite=None; Secure; HttpOnly; Path=/`. The backend accepts URL-encoded request bodies and configures credentialed CORS for the configured frontend origin. There is no Origin/Referer validation or CSRF token middleware in the inspected application.
- **Impact:** CORS controls whether browser JavaScript can read a response; it does not universally prevent a cross-origin HTML form from sending a simple request. If the browser attaches the cross-site cookie, a forged request to a cookie-authenticated mutation may reach the server. Admin mutations are the most consequential.
- **Recommendation:** Add a deliberate CSRF defense for cookie-authenticated mutations, such as strict Origin validation against the deployed frontend origin plus an appropriate token strategy. Keep the necessary production cookie attributes and verify behavior in the actual browser/deployment.

### Medium — Login permits unthrottled guessing and reveals account existence

- **Affected code:** `server/controller/auth.js`, `userLogin`; `server/routes/auth.js`.
- **Confirmed behavior:** There is no login rate-limiting middleware. A missing account returns 404 with “User not exist” while an incorrect password returns 401 with “Invalid credentials.”
- **Impact:** Repeated attempts can guess passwords, and response differences allow email/account enumeration. `bcrypt` is used with 10 salt rounds, which is a positive password-storage control but does not limit guessing.
- **Recommendation:** Apply a shared or persistent rate limit by IP and account identifier, and use a uniform invalid-credentials response.

### Medium — Legacy password reset endpoint is nonfunctional

- **Affected code:** `server/controller/auth.js`, `resetPassword`; `server/routes/auth.js`, `PATCH /auth/reset`.
- **Confirmed behavior:** The handler reads `oldPassword` and `newPassword` but does not compare or save either. It sends `res.json({ message: "Thank" })` before checking whether the user exists, then attempts another response later.
- **Impact:** The route cannot change a password and may attempt to write a second response. The separate token-based `/auth/reset-password` flow is implemented independently and should not be confused with this legacy route.
- **Recommendation:** Remove the obsolete route if unused or implement it with current-password verification, password policy validation, hashing, and one response path.

### Medium — OTP failure and expiration behavior reduces signup reliability

- **Affected code:** `server/controller/auth.js`, `userSignUp`; `server/utils/otpSender.js`; `client/src/features/auth/pages/Signup.jsx` and `VerifyOTP.jsx`.
- **Confirmed behavior:** Signup waits for the Brevo HTTPS call and returns success only after `sendOTP` resolves. The sender uses a 15-second timeout and throws for non-success HTTP responses. The frontend only navigates on a successful response. On the other hand, OTP expiry starts before that request completes, and the current verification page has no resend control or resend API.
- **Impact:** Slow or rejected delivery can lead to an expired or unusable code. There is no automatic retry, and a user who loses/does not receive the code must restart signup.
- **Recommendation:** Preserve the current API failure behavior, but begin expiry after accepted delivery and provide a rate-limited resend route/UI.

### Medium — Payment proof Cloudinary assets use public upload delivery URLs

- **Affected code:** `server/utils/cloudinary.js`, `uploadToCloudinary`; `server/controller/payment.js`, `submitManualPayment`, `serializePayment`, proof handlers; `server/utils/paymentStorage.js`.
- **Confirmed behavior:** The Cloudinary upload call selects folder and resource type but does not request an authenticated/restricted delivery type. App-facing payment list responses use authenticated proof endpoints, and `getMyPaymentProof` scopes by both payment ID and `req.userId`; the admin proof route is protected by admin middleware. The original Cloudinary secure URL is stored in MongoDB and used by the server to retrieve the file.
- **Impact:** Application endpoints enforce owner/admin authorization, but an ordinary Cloudinary `upload` URL is not intrinsically protected by those checks. Anyone who obtains the direct URL can request the asset directly.
- **Recommendation:** If proofs must be private even when a URL leaks, configure private/authenticated asset delivery or signed access and continue returning only the authenticated application endpoint. Confirm Cloudinary account support before changing existing assets.

### Low — Email HTML interpolates event text without HTML escaping

- **Affected code:** `server/utils/notification.js`, `sendEventNotification`.
- **Confirmed behavior:** Event title, type, venue, and description are interpolated into HTML email markup without escaping. These values are entered by admins and email clients generally restrict active content, so this is lower risk than browser-rendered stored XSS; no `dangerouslySetInnerHTML` use was found in the inspected React source.
- **Recommendation:** HTML-escape inserted text before building the email body.

### Reviewed and no route-level privilege bypass found

- **Affected code reviewed:** `server/routes/events.js`, `participant.js`, `polls.js`, `feedback.js`, `blog.js`, `payments.js`, and `notification.js`.
- **Finding:** Admin mutation/list routes inspected use both `authMiddleware` and `adminMiddleware`. User participation, payment, notification, and push-subscription handlers use `req.userId` from the authenticated cookie rather than accepting a client-supplied user ID for ownership. Payment proof retrieval scopes user access to the authenticated owner and places admin retrieval behind admin middleware. Poll voting has a unique `{ poll, user }` index, and participation/feedback have their respective duplicate-prevention indexes declared in schemas.
- **Limitation:** This is route/controller inspection, not adversarial API testing. The public `/auth/alluser` endpoint remains the exception described above.

## C. Authentication Analysis

### Login, cookies, JWT, and authorization

1. The frontend posts login details through the shared Axios instance in `client/src/api/apiRequest.js`, which uses `VITE_BASE_URL` and `withCredentials: true`.
2. `userLogin` finds the user, compares the submitted password with the bcrypt hash, signs a JWT containing `userId` and `role`, and sets the `ems` cookie.
3. `getAuthCookieOptions` uses `HttpOnly`, `Path=/`, `Secure=true` and `SameSite=None` when `NODE_ENV` is `production`; local mode uses `Secure=false` and `SameSite=Lax`. Login adds a 24-hour cookie `maxAge`. No `Domain` is set, so the cookie is host-only for the backend host.
4. `server/app.js` configures CORS with `origin: VITE_BASE_URL` and `credentials: true`. This is compatible with a separate HTTPS frontend/backend when the value is exactly the frontend origin and the frontend build points to the intended API origin. Actual Render variable values and browser acceptance were not inspected.
5. `authMiddleware` reads `req.cookies.ems` and verifies it with `JWT_KEY`. `adminMiddleware` then reloads the user from MongoDB and checks `role === "admin"`; this avoids relying solely on the role claim for admin authorization.
6. Logout calls `clearCookie` using the same HttpOnly/Secure/SameSite/Path attributes as login. The cookie attributes match; no Domain was set at creation or deletion. Successful logout should clear the browser cookie. Logout does not invalidate an already copied JWT.

### Signup and OTP

Signup validates key required fields, department/semester, and password format; hashes passwords with bcrypt; saves the pending record; and awaits `sendOTP`. OTP delivery uses the Brevo API in `server/utils/otpSender.js`. The current OTP is generated with `Math.random`, stored in plaintext, expires two minutes from before email delivery, and can be tried without an attempt limit. No resend endpoint is currently registered.

### Password reset

`requestPasswordReset` responds neutrally for existing and absent accounts, stores only a SHA-256 token hash with a 20-minute expiry, and sends email asynchronously. On mail failure it removes the reset hash. The email utility uses Nodemailer/Gmail separately from OTP delivery, so reset-email delivery still depends on the deployed SMTP configuration and provider/network access. The endpoint has an in-memory rate limiter; limits reset on process restart and are not shared across multiple backend instances. The legacy `/auth/reset` route is broken as described above.

### Refresh, direct URL, tabs, and browser restart

- `AuthProvider` calls `/auth/me` once at mount and keeps routes in a loading state until that request settles. `ProtectedRoute`, `AdminRoute`, and `PublicRoute` check `loading` before redirecting, so they do not intentionally redirect before the initial check completes.
- Refreshing or opening a new tab triggers a new `/auth/me` check. A valid cookie restores the user; missing/invalid cookie returns 401 and the provider sets `user` to null. A protected route then redirects to `/login`.
- The cookie is persistent for 24 hours, so it can survive browser close/reopen if the browser accepts and retains it. `SameSite=None; Secure` is required for cross-site credentialed requests; browsers or privacy settings that block third-party cookies can still prevent it from being sent. This cannot be verified from source alone.
- Any transient `/auth/me` failure is treated the same as a missing/invalid session: the provider logs the error, clears user state, and finishes loading. A temporary backend outage can therefore redirect a user to login even when the cookie is valid.
- After a successful logout response, `LogoutButton` clears client auth state and replaces navigation with `/login`. If the logout HTTP request fails, it leaves `user` state unchanged; a retry or explicit recovery is needed.

## D. Performance Analysis

These are code-based observations, not measured timings.

### API and database

- **Events:** `getAllEvent` loads every event document, sorts in MongoDB, then filters targeted visibility in Node. There is no pagination or projection. `getEventRecipients` loads user records (or all users for untargeted events) and filters recipients in application memory.
- **Blogs:** `getBlogs` returns all blog documents, including full description fields and image references, with no pagination/projection.
- **Admin participants:** `getAllParticipantsAdmin` fetches and populates all records matching only role/event/approval filters, then applies event-status and free-text search in JavaScript. It has no pagination. This cost grows with total registrations.
- **Admin payments:** `getAdminPayments` returns all matching payment records with populated users/events, without pagination.
- **Poll results:** `buildPollResults` loads all polls and aggregates votes across the entire vote collection. It then searches the aggregate result array separately for every poll option (`results.find` inside nested loops). This can become costly as polls/votes grow. The unique `{ poll, user }` index protects one-vote semantics; it does not make the all-vote aggregation selective.
- **Feedback:** `getFeedback` loads all eligible forms for a user. `getAdminFeedbackForms` calls `Feedback.countDocuments` once per form using `Promise.all`, an N+1 query pattern. Admin response retrieval returns all matching responses without pagination.
- **Indexes:** Poll votes and participations declare unique compound indexes for their duplicate-prevention rules. Notifications declare recipient/date and unread-recipient/date indexes. The event and blog schemas shown do not declare query indexes. Schema declarations do not prove the live MongoDB indexes; that requires a read-only production index inspection.
- **Feedback retention:** `server/model/feedbackAdmin.js` declares a TTL index that deletes form documents 48 hours after `createdAt`. If that index exists in the live database, forms are physically deleted regardless of archive state; feedback response documents are not deleted by that index and may be left without their form. Live index state was not checked.

### React and request behavior

- `AuthProvider`, `EventProvider`, `BlogProvider`, `FeedbackProvider`, and `PollProvider` mount around the application in `client/src/main.jsx`, so their data requests can run even when a user is viewing an unrelated page.
- Event and blog providers fetch initial REST state and reconcile again when the authenticated Socket.IO connection reports rooms ready. This is a deliberate recovery mechanism but produces an additional initial request. Feedback also refreshes on socket connect. Poll data refreshes on user changes and socket readiness, so startup can cause duplicate fetches.
- Refs/revision checks in event/blog contexts guard against older REST responses overwriting newer socket updates. Listener cleanup is present in these providers. Poll and feedback contexts also remove their socket listeners on cleanup.
- Application contexts expose loading/error state for core events, blogs, and polls; feedback's shared context only exposes a count and logs fetch errors rather than exposing a user-facing loading/error state.
- No React profiler, production traces, or network waterfall was run; actual render cost and request duration are unknown.

### Email fan-out

Event creation schedules email work after the API response, but `sendEventNotifications` uses `Promise.allSettled` across every recipient and attempts all emails concurrently through a shared Nodemailer transporter. Large target groups may hit provider quotas or connection limits; there is no bounded concurrency/queue in this path. The API is not blocked on completion, but background resource usage can grow with recipient count.

### Images and uploads

- Blog/profile images are stored with Cloudinary URLs and `resolveImageUrl` supports direct URLs and legacy upload paths. The inspected `<img>` elements do not set `loading="lazy"` or HTML width/height attributes; large lists can fetch images eagerly. No `srcSet`/size-specific Cloudinary transformation is applied in the frontend resolver.
- Blog and profile upload size limits are 5 MB. Profile uploads validate extension/MIME and file signatures. Blog uploads validate extension and client-supplied MIME but do not validate file signatures before upload; stronger content validation is recommended.
- Payment proofs are capped at 5 MB and validate extension, MIME, and basic file signatures. Proofs are not mounted through Express static upload routes and their app endpoints enforce owner/admin authorization. Cloudinary direct-URL exposure caveat is documented under Security Findings.
- eSewa QR retrieval uses an authenticated route and checks event eligibility before serving the QR. Payment proof responses set private/no-store and nosniff headers. No eSewa QR or payment proof was downloaded during this audit.
- No event-image feature exists in the inspected event model/UI, so event image optimization is not applicable.

## E. Improvement Plan

### Must Fix

1. Remove or admin-protect `/auth/alluser` to stop public user/email enumeration.
2. Add a bounded JWT lifetime and keep it aligned with the cookie lifetime.
3. Harden OTP generation, storage, attempt limits, and rate limiting; calculate expiry after successful email acceptance.
4. Add CSRF defenses suitable for production `SameSite=None` cookies, especially for admin mutation routes.
5. Decide whether payment proofs must be private at Cloudinary itself; if yes, use restricted/signed delivery rather than relying only on application URLs.

### Should Improve

1. Add login throttling and uniform credential failure responses.
2. Remove or repair the nonfunctional `/auth/reset` route.
3. Provide an OTP resend flow and handle a transient `/auth/me` failure separately from a confirmed 401.
4. Add pagination and projections to unbounded event, blog, participant, payment, poll-result, and feedback queries; move filters into MongoDB where practical.
5. Replace feedback response-count N+1 queries and poll-results nested array searches with grouped/batched operations.
6. Limit concurrency for event email fan-out and monitor provider quota failures.
7. Validate blog image file signatures and use responsive Cloudinary transforms plus lazy loading/dimensions for list images.
8. Review the feedback form 48-hour TTL retention policy and confirm live index state before relying on it.

### Optional

1. Add cache headers for public, versionable Cloudinary images and image fallbacks in the UI.
2. Add an operational health/readiness endpoint that distinguishes HTTP process readiness from MongoDB readiness.
3. Run a dependency advisory review against the committed lockfiles in a separate approved verification task. This audit did not install packages or run an audit command.

## F. Priority Table

| Priority | Issue | Expected Benefit | Complexity |
| --- | --- | --- | --- |
| Must Fix | Public `/auth/alluser` directory | Prevents unauthenticated email harvesting | Low |
| Must Fix | JWT without `exp` | Bounds stolen-token lifetime | Low |
| Must Fix | OTP plaintext, predictable generation, no attempts/rate limit | Prevents practical OTP guessing and limits exposure | Medium |
| Must Fix | No CSRF defense with production cross-site cookie | Protects cookie-authenticated mutations | Medium |
| Must Fix if proof confidentiality is required | Public Cloudinary delivery type for proofs | Prevents direct-URL bypass of app authorization | Medium |
| Should Improve | Login rate limit and uniform errors | Reduces guessing and account enumeration | Low/Medium |
| Should Improve | Unbounded list endpoints and N+1 counts | Keeps response time/memory stable as data grows | Medium |
| Should Improve | Feedback form TTL review | Preserves forms/responses according to retention needs | Low/Medium |
| Should Improve | Signup resend and post-delivery expiry | Improves OTP completion reliability | Medium |
| Optional | Lazy/responsive images | Reduces initial network and rendering work | Low |

## G. Final Verdict

1. **Is authentication secure enough for production?** Not as currently inspected: the public user-directory endpoint, non-expiring JWT, weak OTP controls, and CSRF gap should be addressed first.
2. **Is the production cookie configuration correct?** In source, yes when `NODE_ENV=production`: HttpOnly, Secure, SameSite=None, Path `/`, host-only, with a 24-hour browser expiry. Runtime correctness still depends on exact Render origins and browser cookie policy.
3. **Is authentication reliable after page refresh?** The restoration/route-loading sequence is structurally sound. It can misclassify transient `/auth/me` failures as logout, and cross-site cookie acceptance depends on browser/deployment conditions.
4. **Are login, signup, and logout safe?** Password hashing and cookie handling are present, but login lacks throttling; signup OTP protections are insufficient; logout clears the browser cookie but cannot revoke a copied non-expiring token.
5. **Is data loading efficient?** Acceptable for a small demo dataset, but list endpoints are unpaginated, some filtering is in memory, poll result processing scans aggregated results repeatedly, and admin feedback counts create N+1 queries.
6. **Are images optimized?** Upload size and some file validation are bounded; profile/payment uploads check signatures. Blog signatures, lazy loading, responsive transformations, and image dimensions are missing or not evident. Payment proof assets also use publicly delivered Cloudinary URLs internally.
7. **What should be fixed first?** Remove/protect `/auth/alluser`, add JWT expiration, harden OTP generation/storage/attempt limits and add CSRF protection. Then decide Cloudinary proof privacy and repair unbounded data access/feedback retention.

### Verification limitations

- No Render environment values, response headers, browser cookie behavior, production logs, MongoDB documents, or live indexes were inspected.
- No performance metrics were collected; all performance statements are based on query and component structure.
- `package.json` manifests were inspected, but no dependency advisory scan was run. Declared dependency ranges alone do not establish whether the deployed lockfile has a known vulnerable version.
- Browser rendering and real email/provider behavior were not exercised.
