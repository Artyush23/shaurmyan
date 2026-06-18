# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design Standards & UI/UX Patterns

**Always follow these UI/UX patterns from the authoritative design systems:**

### Sources
- **[UI/UX Pro Max Skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)** - 161 industry-specific reasoning rules, 67 UI styles, 161 color palettes, 57 font pairings
- **[Anthropic Frontend Design Skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design)** - Distinctive visual design guidance

---

## Core Design Principles

### From Anthropic Frontend Design Skill

**1. Ground it in the subject**
- Name one concrete subject, its audience, and the page's single job before designing
- Build with the brief's real content and subject matter throughout

**2. The hero is a thesis**
- Open with the most characteristic thing in the subject's world
- Be deliberate: use defaults only when truly the best option

**3. Typography carries personality**
- Pair display and body faces deliberately, not templated defaults
- Set a clear type scale with intentional weights, widths, and spacing

**4. Structure is information**
- Structural devices (numbering, eyebrows, dividers) should encode truth about content
- Question if choices like numbered markers actually make sense for the content

**5. Leverage motion deliberately**
- Think about where and if animation can serve the subject
- An orchestrated moment usually lands harder than scattered effects

**6. Spend boldness in one place**
- Let the signature element be the one memorable thing
- Cut any decoration that does not serve the brief

---

## Pre-Delivery Checklist (MUST PASS)

From UI/UX Pro Max Skill - apply these checks to every UI:

```
[ ] No emojis as icons (use SVG: Heroicons/Lucide)
[ ] cursor-pointer on all clickable elements
[ ] Hover states with smooth transitions (150-300ms)
[ ] Light mode: text contrast 4.5:1 minimum
[ ] Focus states visible for keyboard nav
[ ] prefers-reduced-motion respected
[ ] Responsive: 375px, 768px, 1024px, 1440px
```

---

## Anti-Patterns to Avoid

| Industry | Avoid |
|----------|-------|
| Wellness/Spa | Bright neon colors, harsh animations |
| Banking/Finance | AI purple/pink gradients |
| All industries | Dark mode unless specifically requested |

---

## Design System Generation

When building UI, the AI automatically generates design systems using:

1. **Industry-Specific Rules** (161 product types)
   - Tech & SaaS, Finance, Healthcare, E-commerce, Services, Creative, Lifestyle, Emerging Tech

2. **Style Recommendations** (67 styles)
   - Examples: Glassmorphism, Claymorphism, Minimalism, Neumorphism, Soft UI Evolution, Organic Biophilic

3. **Color Palettes** (161 palettes)
   - Industry-specific colors with hex values

4. **Typography Pairings** (57 font combinations)
   - Google Fonts pairings with mood descriptions

---

## Decision Framework

Before implementing, ask:

1. **What is the subject?** (concrete product/service)
2. **Who is the audience?** (specific user group)
3. **What is the page's single job?** (primary action/outcome)
4. **Does this choice serve the subject or is it a default?**

---

## Two-Pass Design Process

**Pass 1: Brainstorm**
- Create compact token system: color (4-6 named hex), type (2+ roles), layout (ASCII wireframe), signature (unique element)

**Pass 2: Critique**
- Review against the brief
- If any part reads like a generic default, revise and justify changes
- Only after confirming uniqueness, write code following the plan exactly

---

## Common Development Commands

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run single test
npm test -- -t "test name"

# Lint
npm run lint

# Start dev server
npm run dev
```

---

## Architecture Overview

```
src/
├── components/     # Reusable UI components
├── styles/         # Global styles, tokens, utilities
├── pages/          # Page components/routes
├── assets/         # Images, icons, static resources
└── utils/          # Helper functions
```

**Key files:**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Build configuration

---

## Stack-Specific Guidelines

Mention your preferred stack when requesting UI:

| Stack | Use for |
|-------|---------|
| HTML + Tailwind | Static sites, quick prototypes |
| React / Next.js | Dynamic applications |
| shadcn/ui | Component-based React apps |
| Vue / Nuxt.js | Vue applications |
| SwiftUI | iOS apps |
| Jetpack Compose | Android apps |
| Flutter | Cross-platform mobile |

---

## Contact & Support

If you find these patterns useful, consider supporting the project:
- PayPal: https://paypal.me/uiuxpromax
- GitHub: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill