# Workflow360 Design System: "Digital Curator"

## 1. Overview & Creative North Star
The Workflow360 design system is built upon the North Star of **"The Digital Curator."** In an era of AI-driven information density, the interface acts as a precise, intelligent partner that filters noise and highlights actionable insights. The aesthetic is modern, minimal, and professional, drawing inspiration from high-performance tools like Linear, Vercel, and Notion.

## 2. Design Tokens

### 2.1 Color Palette
Our palette is designed for trust, intelligence, and clarity, with dedicated support for both Light and Dark themes.

| Category | Token | Value (Light) | Value (Dark) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `primary-500` | `#4F46E5` | `#6366F1` | Brand color, primary actions, highlights |
| **Secondary** | `violet-500` | `#7C3AED` | `#8B5CF6` | AI features, intelligence accents |
| **Success** | `emerald-500` | `#10B981` | `#10B981` | Positive status, completion |
| **Warning** | `amber-500` | `#F59E0B` | `#F59E0B` | Caution, pending items |
| **Destructive**| `rose-500` | `#F43F5E` | `#F43F5E` | Errors, critical risks, delete actions |
| **Neutral** | `slate` | `Scale 50-950` | `Scale 50-950` | Typography, borders, subtle UI elements |
| **Background**| `bg-primary` | `#FFFFFF` | `#0F172A` | Main content areas |
| **Background**| `bg-secondary`| `#F8FAFC` | `#1E293B` | Sidebars, secondary panels, cards |

### 2.2 Typography
We use **Inter** for its modern feel and exceptional readability in data-dense interfaces.

- **Font Family:** `Inter, sans-serif`
- **Heading 1:** `48px` (Hero) / `32px` (Page Title), Bold (700)
- **Heading 2:** `24px`, Semibold (600)
- **Heading 3:** `18px`, Semibold (600)
- **Emphasis:** `14px`, Medium (500)
- **Body:** `12px`, Regular (400)
- **Caption:** `10px`, Medium (500), Uppercase (Tracking: Wide)

### 2.3 Spacing & Layout
- **Base Grid:** 4px
- **Standard Spacing Unit:** 8px
- **Sidebar Width:** 260px (Standard) / 64px (Collapsed)
- **Content Max-Width:** 1280px (Centered)
- **Margins:** 24px (Desktop) / 16px (Mobile)

### 2.4 Shape & Elevation
- **Border Radius:**
  - `sm`: 6px (Buttons, Inputs)
  - `md`: 8px (Small Cards, Badges)
  - `lg`: 12px (Main Cards, Modals)
  - `xl`: 16px (Feature Sections)
- **Shadows:**
  - `sm`: Subtle 1px border + light shadow for cards.
  - `md`: Layered shadow for popovers and dropdowns.
  - `lg`: Deep shadow with backdrop blur (12px) for modals and Command Palette.

## 3. Component Styles

### 3.1 Buttons
- **Primary:** Filled Indigo (#4F46E5), white text. Scale down slightly on active.
- **Secondary:** Ghost/Outlined Slate, subtle hover background shift.
- **AI Action:** Gradient or Violet-bordered, often accompanied by a "Zap" or "Brain" icon.

### 3.2 Cards
- **Border:** 1px Slate-200 (Light) / Slate-800 (Dark).
- **Background:** Primary background color.
- **Interaction:** Subtle lift or border color shift to Primary Indigo on hover.

### 3.3 Inputs & Controls
- **Style:** Clean borders, 12px padding.
- **Focus:** 2px ring with Primary Indigo color.
- **Toggle:** Rounded pills, Indigo for 'On' state.

### 3.4 Feedback & Status
- **Badges:** Rounded-full, low-saturation background with high-saturation text.
- **Toasts:** Positioned bottom-right, slide-in animation, color-coded by type.
- **Skeleton Screens:** Used for all loading states to maintain layout stability.

## 4. Navigation Patterns
- **Left Sidebar:** Primary navigation for modules and projects.
- **Top Bar:** Breadcrumbs for orientation, global search, and user utilities.
- **Tabs:** Underlined Indigo or pill-shaped for sub-navigation (e.g., within Projects).
- **Command Palette:** `Cmd+K` global spotlight for navigation and rapid action.

## 5. AI Visual Identity
AI features are distinguished by:
- **Violet (#7C3AED) Accents:** Used for icons, borders, and button gradients.
- **Glassmorphism:** Subtle backdrop blur in AI-specific panels.
- **Terminology:** "Intelligence," "Predictor," "Decomposer," "Optimizer."
