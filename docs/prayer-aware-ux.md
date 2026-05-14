# Prayer-aware UX

"Prayer-aware routing" is the Riyadh-specific feature the README leads with, but it's actually three subsystems wired together: a daily fetch + cache, next-prayer arithmetic with wrap-around, and a closure-category hint surfaced on the place card. This doc separates them.

## The fetch

[`usePrayerTimes`](../client/app/features/prayer/hooks/usePrayerTimes.ts) hits Aladhan v1 `/timings/{DD-MM-YYYY}` with Riyadh fixed at `(24.7136, 46.6753)` and `method=4`. Method 4 is Umm Al-Qura University — the Saudi government's official calculation. Other Aladhan methods (ISNA, MWL, Egyptian, etc.) disagree on twilight angles, which moves Fajr and Isha by a few minutes; getting this wrong on a Riyadh-focused app would be a credibility error visible to every local user.

We don't accept user coordinates here — prayer times across the entire Riyadh metro vary by < 1 minute, so a single fixed reference is faster, simpler, and indistinguishable from a per-user fetch.

## Caching

localStorage key `riyadhFlowPrayerTimes` stores `{ dateKey, times, hijri }`. On mount, the hook reads the cache, compares `dateKey` to today's `DD-MM-YYYY`, and skips the fetch if they match. Prayer times for a given day are constant — there's no reason to re-fetch them.

The cache is invalidated naturally: on the next day's first mount, `todayKey()` ≠ `entry.dateKey`, the cache is treated as stale, and a fresh request goes out. No TTL math, no background invalidation timer. The `dateKey` *is* the cache key.

One subtle bit worth flagging: we cache `hijri` alongside `times` because the Aladhan response returns both in the same payload ([usePrayerTimes.ts](../client/app/features/prayer/hooks/usePrayerTimes.ts) `extractHijri()`). The Hijri date doesn't drive any behavior — it's just a label in the expanded prayer panel — but folding it into the same cache costs nothing and avoids a second API call.

## Next-prayer computation

[`nextPrayerAfter(now, times)`](../client/app/features/prayer/utils/prayerTimes.ts) iterates `PRAYER_ORDER = [Fajr, Dhuhr, Asr, Maghrib, Isha]` and returns the first prayer whose minutes-of-day exceeds `now`. The interesting case is after Isha:

```
minutesUntil = (24 * 60 - nowMins) + tomorrowFajrMins
```

We assume tomorrow's Fajr is close enough to today's. This is a real approximation — Fajr drifts by ~2 minutes between consecutive days in Riyadh at the steepest part of the year, and by 0 minutes around the equinox. The error is bounded at ~2 min and only affects the late-night countdown ("Fajr · 5h 38m"), where 2 minutes of imprecision is invisible to the user.

We accept it instead of fetching tomorrow's times because: (a) the cost is two API calls per visit instead of one, (b) the next-day fetch would have to happen *during* the wrap window, when the user is least likely to be using the app anyway.

`isWithinWindow(now, timeStr, windowMinutes)` and `isNowPrayer(now, times, postWindowMinutes = 20)` are two helpers in the same file that the place-card hint depends on.

## The "may close soon for prayer" hint

[`page.tsx:72-73`](../client/app/page.tsx#L72-L73) declares:

```ts
const PRAYER_CLOSURE_CATEGORIES = new Set(['Restaurants', 'Hotels', 'Museums', 'Pharmacies', 'Malls'])
const PRAYER_WARNING_WINDOW_MINS = 20
```

When a user opens a place card, [page.tsx:927–934](../client/app/page.tsx#L927-L934) checks: is the next prayer within 20 minutes, AND is the selected place in the closure-category set? If both, the card renders a "may close soon for {prayer} in {N} min" hint.

The category set is the part that took thought. Not every category closes for prayer:

- **Closes** — Restaurants, Hotels (front desks), Museums, Pharmacies, Malls. These are physical businesses with staff who step away for ~15–25 minutes per prayer cycle.
- **Doesn't close** — Mosques (the opposite of closing — they open *for* prayer), Gas Stations (mostly self-service, often 24/7), Transit (the metro doesn't pause), Parking, Gyms (variable but rarely closes outright), Things-to-do (parks, etc.).

The 20-minute window matches the typical Saudi "closing 15 min before prayer, reopening ~30 min after" cycle. Wider would surface false positives ("may close soon" when the place is still wide open); tighter would miss real closures.

## What I'd improve next

- **Actual `opening_hours` per place.** Today the hint infers closure from category. OSM has `opening_hours` data for ~40% of Riyadh POIs that includes prayer-specific closures (the `PH` and `prayer` keys). Joining that in would let the hint distinguish "this specific cafe stays open through Maghrib" from "this one closes."
- **Prayer-room signal.** Many large places — malls, hospitals — have on-premises prayer rooms tagged `amenity=place_of_worship` inside the building. A place card showing "prayer room on site" would change the closure hint from a warning to a non-event.
- **Route-time integration.** If the user's ETA to a restaurant is 14 min and Maghrib is in 12 min, suggest leaving 2 min earlier or warn that they'll arrive just as it closes. The hooks for this exist (`useRoutePlanner`'s `routeInfo.duration` plus `usePrayerTimes`'s `next.minutesUntil`) — it's the UX surface that's missing.
