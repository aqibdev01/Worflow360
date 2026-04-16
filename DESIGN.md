# Design System Strategy: The Intelligent Canvas

## 1. Overview & Creative North Star
This design system is built upon the North Star of **"The Digital Curator."** In an era of AI-driven information overload, this system acts as a high-end, editorial filter. It moves beyond the "standard SaaS dashboard" by treating project management as a precise, high-stakes craft.

We reject the "boxed-in" layout of traditional tools. Instead, we embrace **Intelligent Asymmetry** and **Tonal Depth**. By using generous whitespace and breaking the rigid grid with overlapping elements and shifting background tiers, we create an interface that feels less like a database and more like a focused, premium workspace. The atmosphere is quiet, fast, and authoritative.

---

## 2. Colors & Tonal Architecture
The palette is rooted in a sophisticated Indigo-to-Violet spectrum, representing the intersection of human logic and AI intelligence.

### The "No-Line" Rule
Standard 1px solid borders are strictly prohibited for sectioning. To define a container or a section, use **background color shifts**. Use `surface-container-low` for secondary navigation and `surface` for the main canvas. Let the contrast between tokens create the edge, not a stroke.

### Surface Hierarchy & Nesting
Think of the UI as physical layers of fine paper and frosted glass.
- **Base Layer:** `surface` (#f8f9ff).
- **Secondary Workspace:** `surface-container-low` (#eff4ff).
- **Interactive Cards/Modals:** `surface-container-lowest` (#ffffff) to provide "pop" against the background.
- **Deep Nesting:** If a card requires a nested element, use `surface-container-high` (#dce9ff) to create a "recessed" feel.

### Glass & Gradient Signature
Main Action buttons and AI-driven insights should utilize a subtle gradient transition from `primary` (#3525cd) to `secondary` (#712ae2). For floating elements like the Cmd+K bar, apply **Glassmorphism**: use `surface-container-lowest` at 80% opacity with a 12px backdrop-blur.

---

## 3. Typography: The Editorial Voice
We use **Inter** not as a default, but as a Swiss-inspired tool for precision. 

- **Display Scale (`display-lg` to `display-sm`):** Reserved for high-level project milestones and landing moments. Use `600` weight with `-0.02em` letter spacing to feel tight and architectural.
- **Headline & Title:** Use `headline-sm` (1.5rem) for view titles. The jump between a `headline-sm` and `body-md` (0.875rem) should be stark, creating an editorial "Big-Small" contrast that guides the eye.
- **Labels:** `label-sm` (0.6875rem) should be used in `700` weight (Bold) and All-Caps when paired with meta-data to ensure the hierarchy is unmistakable even at small scales.

---

## 4. Elevation & Depth
In this system, depth is a function of light and layering, not structural lines.

- **The Layering Principle:** Avoid shadows on standard cards. Create lift by placing a `surface-container-lowest` element on top of a `surface-container-low` background. 
- **Ambient Shadows:** For active state modals or floating popovers, use a wide-diffusion shadow: `0px 20px 50px rgba(11, 28, 48, 0.06)`. The tint is derived from `on-surface` (#0b1c30) to feel like natural occlusion.
- **The "Ghost Border" Fallback:** If a layout feels too amorphous (e.g., in high-density data tables), use a "Ghost Border" using `outline-variant` (#c7c4d8) at **15% opacity**. It should be felt, not seen.

---

## 5. Components & Interaction Patterns

### Buttons
- **Primary:** Gradient fill (`primary` to `secondary`), white text. 8px (`lg`) radius.
- **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
- **Tertiary/Ghost:** No background. `primary` text. Use `primary-fixed-dim` for the hover state.

### Input Fields
- **Base State:** `surface-container-lowest` background with a subtle "Ghost Border."
- **Focus State:** 2px solid `primary`. The background remains white to signify "active writing."
- **AI-Enhanced Inputs:** Use a 1px `secondary` (Violet) border to signify AI-powered text generation is active.

### Cards & Lists
- **The Divider Ban:** Vertical divider lines are prohibited. Separate list items using the **Spacing Scale**. Use `3` (1rem) or `4` (1.4rem) units of white space. To separate logical groups, use a subtle background shift to `surface-container-low`.
- **Project Cards:** Should use `surface-container-lowest`. On hover, they do not get a border; they "lift" via an Ambient Shadow.

### AI Activity Chips
- Use `secondary-container` (#8a4cfc) with `on-secondary-container` (#fffbff) text. These should always have a `full` (9999px) border radius to contrast against the more geometric 8px radius of standard buttons.

---

## 6. Do’s and Don’ts

### Do:
- **Use Generous Padding:** If you think there is enough space, add one more `spacing-3` unit. 
- **Embrace Tonal Shifts:** Use the `surface-container` tiers to guide the user's focus from the sidebar to the main content area.
- **Optical Alignment:** Align icons to the cap-height of text, not the bounding box, to maintain the "Editorial" precision.

### Don’t:
- **Don't use 100% Black:** Always use `on-surface` (#0b1c30) for text to maintain a premium, deep-slate feel.
- **Don't use Shadows on Everything:** Only floating or "interruption" elements (Modals, Cmd+K) deserve shadows.
- **Don't use Center Alignment:** This is an "Intelligent Canvas." Stick to strong left-aligned anchors with asymmetrical right-side white space for an intentional, modern feel.