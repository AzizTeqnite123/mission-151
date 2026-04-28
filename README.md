# Mission 151 — Developer Handoff

A static three-page site (plus two legal pages) for the Mission 151 live broadcast event on **May 6, 2026, 7:00 PM Mountain Time**. Built with hand-written HTML, CSS, and vanilla JS. No build step required. Hostable on Netlify, Vercel, or Cloudflare Pages by uploading the directory as-is.

---

## File map

```
index.html         Homepage
live.html          /live  — Pre / Live / Post states
checkin.html       /checkin — mobile-first, three states + success
privacy.html       /privacy
terms.html         /terms
assets/
  site.css         Shared design system (tokens, components)
  site.js          Shared runtime (event clock, countdown, county map, phase swap)
  tweaks.jsx       Preview-only state-toggle UI (see "Removing the preview panel")
tweaks-panel.jsx   Preview-only — host-protocol shell for the Tweaks panel
```

You only need to deploy: the five HTML files, `assets/site.css`, and `assets/site.js`.
The two `.jsx` files and the React/Babel `<script>` tags at the bottom of each page are the in-design preview tooling and **must be removed before production** (see below).

---

## URL routing

The site uses `.html` paths in links (`live.html`, `checkin.html`, etc.) so it works on any static host without rewrite rules. If you want clean URLs (`/live`, `/checkin`):

- **Netlify:** rename files to `live/index.html`, `checkin/index.html`, etc., or add `_redirects`.
- **Vercel:** add `vercel.json` with `cleanUrls: true`.
- **Cloudflare Pages:** rename files into folders.

If you do this, also update the internal `<a href="...">` references in all five HTML files (search for `.html`).

---

## Forms — wire up to Tally / Airtable

There are five forms in the codebase. All are mocked with `event.preventDefault()` + an alert. Each one needs to be replaced with a Tally embed (or your form provider of choice) that posts to Airtable.

| Page | Form id / location | Captures |
|---|---|---|
| `index.html` | `#register` section, `<form>` | first name, last name, email, county, optional mobile + SMS consent, captain checkbox |
| `live.html` | "Check in. Light your county." card (`live` phase) | email, county |
| `live.html` | "Stay with the mission." card (`post` phase) | email |
| `checkin.html` | `#live-form` (`live` phase) | email, county |

**Important:**
- The TCPA SMS consent checkbox in the registration form is **legal copy**. Do not edit. The disclosure must be visible at the moment of consent and tied to a separate, unchecked-by-default checkbox. Keep `oninput` logic on the phone field that reveals the SMS box only when a number is entered, or always show it — but never auto-check it.
- The "I want to lead the mission in my county" captain checkbox should pipe to a separate Airtable view that Victor reviews personally.

---

## The live county map (Airtable polling)

The map is currently driven entirely by `assets/site.js` from a deterministic preview model. In production it should poll Airtable.

**What to replace, in `assets/site.js`:**

1. The `getMapState(opts)` function. Instead of computing `litCount` / `standingBy` from the event clock, fetch the totals from Airtable (or a small backend endpoint that proxies Airtable to avoid leaking the API key).
2. Add a `setInterval` that re-calls `paintMaps()` every **3–5 seconds** during the `live` phase.

**Suggested Airtable schema:**

| Table | Columns |
|---|---|
| `Registrations` | first_name, last_name, email, phone, county (link), sms_consent, captain_interest, created_at |
| `CheckIns` | email, county (link), checked_in_at |
| `Counties` | name (one of the 64), lit (formula: any CheckIn linked?), standing_by (formula: any Registration linked AND not lit) |

Then the `paintMaps()` calls fetch `Counties` and pass `litSet`/`dimSet` to `applyMapState()`. The `LIT_ORDER` array currently used for the demo can be removed in production — real check-ins drive the order.

Counties are listed alphabetically in `assets/site.js` as the `COUNTIES` array. The visual layout (`COUNTY_CELLS`) is a 16×10 abstract grid weighted toward the Front Range column, not a real Colorado polygon. **If you want a real Colorado map**, replace `renderMap()` with an SVG path-per-county layout — the rest of the system (the dark/dim/lit class names and the data attributes) is stable regardless of geometry.

---

## Event clock & phase swapping

`assets/site.js` exposes a single source of truth for "what phase is the event in right now":

```js
window.M151.getPhase()      // 'pre' | 'live' | 'post'
window.M151.EVENT_START     // unix ms
window.M151.EVENT_END       // unix ms (90 minutes after start)
```

Any element with `data-show-phase="live"` or `data-show-phase="pre post"` is shown only during those phases. This is how `live.html` swaps between the countdown layout, the broadcast layout, and the replay layout — no separate routes needed.

If the broadcast date or duration changes, edit the two constants at the top of `assets/site.js`:

```js
const EVENT_START = new Date('2026-05-06T19:00:00-06:00').getTime();
const EVENT_END   = EVENT_START + 90 * 60 * 1000;
```

---

## Watch links

Replace the placeholder `https://youtube.com/` and `https://facebook.com/` links on `live.html` (four occurrences) with the real stream URLs once they're issued. Look for `class="watch-btn"`.

---

## Removing the preview panel before production

The Tweaks panel (a small floating UI that lets you toggle `pre / live / post` and slide a "counties lit" override) is **for preview/QA only**. Strip it before deploying:

In each of `index.html`, `live.html`, `checkin.html`, remove:
1. The trailing `<div class="preview-state-pill"></div>`
2. The four `<script>` tags at the bottom that load React, ReactDOM, Babel, `tweaks-panel.jsx`, and `assets/tweaks.jsx`.
3. Delete `tweaks-panel.jsx` and `assets/tweaks.jsx` from the deploy bundle.

Optionally, also remove from `assets/site.css` the `.preview-state-pill` block and the `[Tweaks panel]` localStorage key (`m151.previewState`) handling in `assets/site.js` (the `getPreview` / `setPreview` / `currentPhase` preview branch). The site works correctly with all of that left in — it just adds a few KB of unused code.

---

## Compliance & content rules — do not edit

These came from the brief and are non-negotiable:

- **TCPA SMS disclosure** in `index.html` is final language. Do not paraphrase.
- **Footer disclaimer** (`Paid for by Victor Marx for Governor` + registered agent line + non-authorization line) appears on every page. Do not remove. Replace `[Registered agent name and physical mailing address]` with the actual filed address.
- **All italicized copy** — headlines, taglines, button labels — is final. Do not rewrite.
- **Stats** (150 missions, 45,000 lives, 23 years, 2M+ followers) are exact. Do not round or change.
- **No photographs.** No headshots. No event photography. No stock imagery. No flag graphics. The site is text + typography + the map.
- **County dropdown:** all 64 Colorado counties, alphabetical.

---

## Store + Anedot checkout

`store.html` is a two-product store (Field cap, Mission tee) with variants, a localStorage cart drawer, and a handoff to **Anedot** for payment.

**To wire up Anedot:**

1. Create an Anedot form for the store (Anedot supports purchase/event payment forms in addition to donations). Configure the form to accept a custom amount and a description field.
2. Open `assets/store.js` and replace the `ANEDOT_FORM_URL` constant at the top with the hosted form URL (e.g. `https://anedot.com/form/your-form-id`).
3. The checkout button posts the cart total, an itemized description, and a SKU string to the form via query params:
   - `amount` — total in dollars (number, two decimals)
   - `description` — `Mission 151 Store · 1× Field cap (Black) + 2× Mission tee (Cream/L)`
   - `sku` — comma-separated `M151-CAP-Black-x1,M151-TEE-Cream-L-x2`
4. **Shipping & inventory live in Anedot** for now — fulfill from the dashboard or pipe Anedot's webhook into your fulfillment provider. There is no separate cart/orders database.
5. Until step 2 is done, clicking checkout shows a mockup alert with the URL it would redirect to (handy for QA).

**Compliance:**
- Purchases are **not** tax-deductible contributions. The "PURCHASES ARE NOT TAX-DEDUCTIBLE CONTRIBUTIONS" line under the products is required and matches FEC/state guidance for campaign merch. Do not remove.
- The "Paid for by" footer disclaimer carries through.

**Catalog:**
- Edit the `CATALOG` object at the top of `assets/store.js` to change products, prices, colors, sizes, or copy. The detail-page art is generated from inline SVGs in `store.html` — replace those with real product photos when shoots are in.

---



- Latest Chrome, Safari, Firefox, Edge.
- Mobile Safari and Chrome on Android — primary target on broadcast night.
- IE11: no.
- The countdown uses `setInterval` and the local clock — no timezone issues if the user's clock is correct; the `-06:00` offset is hardcoded for Mountain Daylight Time.

---

## Performance notes

- Three Google Fonts (Staatliches, Instrument Sans, Instrument Serif, JetBrains Mono) are pulled at runtime. Consider self-hosting before launch night to avoid third-party dependency on Google during a high-traffic moment.
- The map polls every 3–5 seconds during the live phase. Use Airtable's caching or a small CDN-edge function to avoid hitting Airtable's API limits when traffic spikes.
- All HTML files are under 25 KB; CSS + JS together under 35 KB. Total page weight (excluding fonts) is small.

---

## Quick QA checklist

- [ ] Tweaks panel removed
- [ ] All four watch links point to real streams
- [ ] All five forms POST to Tally / Airtable
- [ ] Map polls live data instead of the demo curve
- [ ] Footer registered-agent address filled in
- [ ] Privacy and Terms reviewed by counsel
- [ ] `EVENT_START` / `EVENT_END` confirmed with the producer
- [ ] Site loaded on iOS Safari and Android Chrome at viewport widths 375, 414, 768, 1024, 1440
