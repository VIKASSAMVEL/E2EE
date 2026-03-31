## Design System: E2EE Secure Chat

### Pattern
- **Name:** Trust & Authority + Real-Time
- **CTA Placement:** Above fold
- **Sections:** Hero > Features > CTA

### Style
- **Name:** Cyberpunk UI
- **Keywords:** Neon, dark mode, terminal, HUD, sci-fi, glitch, dystopian, futuristic, matrix, tech noir
- **Best For:** Gaming platforms, tech products, crypto apps, sci-fi applications, developer tools, entertainment
- **Performance:** ΓÜá Moderate | **Accessibility:** ΓÜá Limited (dark+neon)

### Colors
| Role | Hex |
|------|-----|
| Primary | #00FF41 |
| Secondary | #0D0D0D |
| CTA | #00FF41 |
| Background | #000000 |
| Text | #E0E0E0 |

*Notes: Matrix Green + Deep Black + Terminal feel*

### Typography
- **Heading:** Share Tech Mono
- **Body:** Fira Code
- **Mood:** tech, futuristic, hud, sci-fi, data, monospaced, precise
- **Best For:** Sci-fi interfaces, developer tools, cybersecurity, dashboards
- **Google Fonts:** https://fonts.google.com/share?selection.family=Fira+Code:wght@300;400;500;600;700|Share+Tech+Mono
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap');
```

### Key Effects
Neon glow (text-shadow), glitch animations (skew/offset), scanlines (::before overlay), terminal fonts

### Avoid (Anti-patterns)
- Light mode
- Poor data viz

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px

