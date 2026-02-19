# Wedding Microsite UI Spec (Liquid Glass / iOS26 vibe)

Mục tiêu: 1 trang “thiệp mời cưới” **premium** theo style **Liquid Glass** (blur + highlight + grain + vignette), **không có menu bar**, tối ưu mobile-first, scroll mượt, có RSVP (UI-only trước).

---

## 1) Thông số tổng quan

- **Kiểu site**: single-page landing
- **Thiết bị ưu tiên**: mobile (390–430px), vẫn đẹp trên desktop (>= 1120px max container)
- **Tông**: dark luxe + gold/blush accents
- **Layout**:
  - Hero: 2 cột trên desktop (content + glass card), 1 cột trên mobile
  - Các section: spacing đều, nhịp rõ
- **Không dùng**: menu bar / sticky nav
- **Thay menu bằng**: “chip bar” dạng glass trong hero (jump links + share)

---

## 2) Information Architecture (IA)

### Sections (order)
1. **Hero** (`#top`)
2. **Story / Timeline** (`#story`)
3. **Events** (`#events`)
4. **Gallery** (`#gallery`)
5. **Map** (`#map`)
6. **RSVP** (`#rsvp`)
7. Footer

### Jump targets
- Mỗi section có `id` để anchor scroll.
- Chip bar có các link: Story, Events, Gallery, Map + Share button.

---

## 3) Design Tokens

> Mục tiêu: token hoá để đổi theme nhanh.

### Colors
- Background base: `#07070b`
- Text: `rgba(255,255,255,.92)`
- Muted: `rgba(255,255,255,.68)`
- Border line: `rgba(255,255,255,.12)`
- Accents:
  - Gold: `rgb(255,216,138)` (CSS var `--accent`)
  - Blush: `rgb(246,198,208)` (CSS var `--accent2`)

### Radius & shadow
- Radius global: `22px`
- Shadow: `0 18px 50px rgba(0,0,0,.45)`

### Typography
- Heading font: `Instrument Serif`
- Body font: `Inter`
- Hero title: clamp(3.1rem → 5.1rem), line-height ~0.95
- Section heading: ~2.2rem serif

### Spacing scale (recommend)
- section padding: 62px (desktop), ~54px (mobile OK)
- card padding: 18px
- gaps: 10/12/14/18/22px

---

## 4) Liquid Glass System (core)

### “Glass” component rules
- `backdrop-filter: blur(16px)` (hoặc 14–18px)
- Semi-transparent gradient background (top brighter)
- Subtle border + soft shadow
- **Specular highlight overlay** bằng pseudo-element `::before`:
  - radial highlight top-left
  - optional accent tint
  - blend mode screen
- Grain layer trên background để tăng “tactile”

Gợi ý nguyên tắc: glassmorphism = blur + nền trong + border + shadow; cần fallback vì `backdrop-filter` không phải lúc nào cũng có. citeturn0search4turn0search11  
Nếu muốn “liquid” hơn (refraction/specular), có thể dùng SVG filters + displacement (tuỳ Codex implement). citeturn0search1turn0search10

### Background layering
- Hero BG: image + 2 radial gradient accents
- Vignette: radial dark overlay (center sáng, rìa tối)
- Grain: SVG noise overlay, low opacity

---

## 5) Component Specs

### 5.1 Hero (2-column)
**Left column**
- Brand line: monogram glass mark `M&L` + subtitle “Wedding Invite / Save the date”
- Hero title: “Minh & Lan” (ampersand gold, italic)
- Subtitle: 1–2 dòng
- Primary CTA: “Xác nhận tham dự” → `#rsvp`
- Secondary CTA: “Xem thông tin” → `#events`
- **Chip bar glass**:
  - 4 anchor chips + 1 share button
  - dạng pill, hover lift -1px
- Meta cards (2 items):
  - Time
  - Location

**Right column**
- Hero glass card:
  - “Countdown” label + badge emoji
  - 4-number timer grid (days/hours/mins/secs)
  - Divider line
  - 2 quick links: Map & Gallery (small glass items)
  - Fine print

**Responsive**
- <= 940px: stack 1 column; hero card dưới
- <= 760px: meta cards stack 1 column; chips wrap

### 5.2 Timeline
- Vertical line gradient (blush → gold)
- Dot marker (gold + blush ring)
- Each entry: glass card
- Content: year + title + short text

### 5.3 Events (3 cards)
- 3 cards: Ceremony / Reception / Note
- Header row: icon + title + muted time
- Body: key/value rows, note block
- Footer actions: 2 buttons each

**Responsive**
- Desktop: 3 columns
- Mobile: 1 column

### 5.4 Gallery (Masonry)
- Grid 12 columns desktop
- Fixed spans:
  - 7/5 at top row
  - 4/4/4 middle
  - 12 bottom
- Hover lift -2px, border brighten
- Click opens lightbox

**Mobile**
- Collapse to 1 column, fixed height 220px

### 5.5 Map
- Glass wrapper card
- Header: venue name + address + “Directions” button (UI placeholder)
- iFrame map below

### 5.6 RSVP
- Two-column: form + side info
- Form elements:
  - name (required)
  - phone
  - attend (required select yes/no)
  - guests (0–10)
  - note
- Submit button with loading state:
  - add `loading` class on form
  - show spinner (CSS) + reduce text opacity

Side panel:
- “Thông tin nhanh” list items (icon + title + sub)
- Quote block

---

## 6) Interactions & Micro-motion

### Smooth scroll
- Anchor clicks → `scrollIntoView({behavior:'smooth'})`

### Share
- If `navigator.share` available: share title/text/url
- Else fallback: copy link to clipboard + toast “Đã copy…”

### Lightbox
- Click gallery image → overlay modal
- Close via:
  - close button
  - click backdrop
  - ESC key

### Toast
- Glass pill toast centered bottom
- Auto-hide 2.2s
- Animation: opacity + translateY(-4px)

### Performance
- Prefer CSS-only effects; keep heavy filters limited to hero/primary glass blocks
- Consider fallback if `backdrop-filter` unsupported:
  - increase opacity background
  - keep text readable

---

## 7) Content placeholders (replace later)

- Names: “Minh & Lan”
- Date/time: “20:00 • CN 10/10/2026”
- Venue: “Trung tâm Tiệc cưới ABC”
- Address: “123 Nguyễn Trãi, Q.1, TP.HCM”
- Phone: “09xx …”
- Gallery images: replace with real prewedding images (optimize to ~1600–2000px wide)

---

## 8) Definition of Done (UI)

- No menu bar anywhere.
- Hero looks “premium” on iPhone viewport (390x844).
- All glass components readable with background image.
- Gallery lightbox works + ESC.
- RSVP shows loading state + toast success (UI-only).
- Works in modern Chrome/Safari/Edge; reasonable fallback if blur unsupported.

---

## 9) Nice-to-have (optional for Codex)

- Subtle scroll-reveal (IntersectionObserver) for cards (fade + 8px slide)
- “Specular sweep” hover on glass cards (gradient moves on hover)
- Theme switcher (Dark Luxe / Ivory / Pastel) — controlled by CSS vars
