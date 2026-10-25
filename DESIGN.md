# Viberyte design system — Editorial V1

A sophisticated editorial guide to dining, nightlife and local culture: confident, minimal, authentic.
References: DICE's restraint, Posh's authenticity, Apple's usability. We borrow principles, never their identity.

## Principles
1. **Content is the image.** Real venue photos, reels and original event artwork carry the screen.
2. **Type carries the design.** Strong hierarchy, few weights. No decoration to signal "premium".
3. **Facts and one verified feeling.** Show what's true (area, type, what's on) plus at most ONE verified atmosphere word. No filler adjectives.
4. **Quiet chrome.** Solid surfaces, hairlines only where needed. No glows, gradients, gold borders or floating badges.
5. **One accent, one meaning.** Ivory is the primary action. Gold is rare: one purposeful meaning per screen.

## Color (theme/editorial.ts → ink)
black #000 page · ground #0A0A0B surfaces · raise #161618 controls · ivory #F3F0E9 text and primary button ·
gray 62% secondary · faint 40% tertiary · line 10% hairlines · gold #C5A36B (rare).

## Type (iOS system font, SF Pro). Font changes are tested separately.
| Role | Size | Weight |
|---|---|---|
| Editorial headline | 36–42 | 700, tight |
| Section heading | 25–28 | 700 |
| Venue / event title | 21–24 (18 on compact cards) | 600 |
| Body | 16–17 | 400 |
| Supporting details | 13–14 | 400 |
| Editorial label | 12, UPPERCASE, tracked | 600 |

**Uppercase** is for occasional editorial sections only (TONIGHT, THIS WEEKEND, NEAR YOU). Never for venue metadata.

## Spacing and shape
4 / 8 / 12 / 16 / 24 / 32 · controls radius 12 · cards 16 · pills fully round · 16 pt side margins.

## Components
- **Venue card:** image · **Name** · `Type · Neighborhood` · one verified detail (vibe OR cuisine OR "Event Fri · title"). No eyebrow, no badges.
- **Event card:** artwork · **Title** · `Fri, Oct 31 · 10 PM` · `Venue · price`.
- **Event page:** artwork first, then date, venue, organizer, and one clear Tickets / RSVP action.
- **Explore header:** search field and location selector stay separate. Places / Events stays prominent. Categories are quiet chips. Map / List stays one tap.

## Voice
Short, specific, warm. Sentence case. "Search places", not "Jazz in Harlem, rooftops…". No AI-concierge phrasing.

## Rollout
1. This spec plus tokens (no global changes).
2. Explore header, chips and cards.
3. Event detail.
4. Home, venue detail, the rest.
5. Font change, tested on its own.

Every step must preserve: search, location handling, map markers, carousel sync, reels, event links, navigation.
