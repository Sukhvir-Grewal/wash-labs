# Improvement Opportunities

## Analytics and Telemetry
- Replace the placeholder Google Analytics loader ID (`G-XXXXXXXXXX`) with the same tracking ID you configure in the inline `gtag('config', ...)` call so analytics actually fires and isn’t double-counted when you update it later.
- Consider extracting the analytics configuration into environment variables so different environments can reuse the component safely.

## SEO Data Consistency
- Align the JSON-LD business profile with the public contact info that the site already shows (phone, postal code, social URLs) and remove the placeholder comments before shipping. Keeping mismatched data hurts local SEO signals.
- Rely on the `DefaultSeo` config for the home page’s metadata instead of duplicating the same tags inline; this avoids drift between the two configurations and centralizes updates.

## Booking Flow
- The booking modal never advances to its Step 5 “confirmation” view because `handleSubmit` closes the dialog immediately after the fetch. Either show an inline success state or set the step to 5 so users see positive feedback before the modal disappears.
- The booking API email templates read `service.price`, but the UI only tracks `basePrice` and `totalPrice`. Surface the computed `totalPrice` so confirmation emails include accurate pricing.
- Replace the `alert()` calls with in-modal status messaging so mobile users don’t get bounced into native dialogs, and expose any API error string returned to help the support team debug failed submissions.

## Form Validation
- The customer email regex only permits Gmail, Yahoo, Outlook, or Hotmail addresses; broaden the validation so legitimate business domains can book.
- Surface validation messages for the date/time step (e.g., prevent past-day selections entirely instead of allowing today by exception) and provide helper text for the 30-minute interval assumption.

## Code Health
- Remove unused imports and helper functions in `DateTimePicker` (e.g., `isWeekend`, the 12/24-hour converters) and the unused `dynamic` import on the home page.
- Convert the clickable service cards to semantic buttons to improve accessibility and keyboard support, or ensure the current `<div>` handles `onKeyDown` for accessibility users.
- Prune unused dependencies such as `react-autosuggest`, `react-calendar`, and `swiper` from `package.json` to shrink the production bundle and `node_modules` footprint.

## Reliability & Security
- Guard the email route handlers with environment-variable checks (fail fast if credentials are missing) and consider rate limiting to protect against abuse.
- Add structured logging around the transport creation so you can detect Gmail auth failures without relying solely on console output.
