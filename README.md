# I Computer Anything - Premium Landing Page

A modern, dark, scroll-driven landing page for "I Computer Anything" built with React, Vite, Framer Motion, and Tailwind CSS.

## 🎨 Features

- **Dark Premium Design** - Modern SaaS-style aesthetic with gradient accents
- **Smooth Scroll Storytelling** - Engaging full-page sections with cinematic presentation
- **Framer Motion Animations** - Subtle fade-ups, slide-ins, and parallax effects
- **Mobile Responsive** - Fully optimized for all device sizes
- **Navigation** - Smooth anchor navigation with active section tracking
- **Clean Sections**:
  - Hero (fullscreen with CTAs)
  - What We Do (3 service cards)
  - How It Works (3-step process)
  - Why Choose Us (4 feature cards)
  - Who It's For (4 persona cards)
  - Final CTA (strong closing)
  - Footer

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app will run at `http://localhost:5173`

## 📂 Project Structure

```
src/
├── App.jsx                      # Main app component
├── index.css                    # Global styles & Tailwind setup
├── main.jsx                     # Entry point
├── components/
│   ├── Navigation.jsx           # Top nav with smooth anchor links
│   ├── Footer.jsx              # Footer section
│   └── sections/
│       ├── Hero.jsx            # Hero banner
│       ├── WhatWeDo.jsx        # Services section
│       ├── HowItWorks.jsx      # Process section
│       ├── WhyChooseUs.jsx     # Features section
│       ├── WhoItFor.jsx        # Personas section
│       └── FinalCTA.jsx        # Final call-to-action
```

## 🎯 Customization

### Content
All content (headlines, descriptions, icons) can be easily edited in the respective section components. Each component exports a data array at the top.

### Colors & Styling
- Tailwind CSS configuration in `tailwind.config.js`
- Custom colors defined in the theme extend section
- Glow effects and shadows customizable per component
- Dark theme uses `dark-950` as base background

### Animations
- Framer Motion controls in each section
- Modify `variants`, `transition`, and `whileHover` props for different effects
- Intersection observer hooks for scroll-triggered animations

## 🔧 Technology Stack

- **React 18** - UI framework
- **Vite** - Lightning-fast build tool
- **Framer Motion** - Animation library
- **Tailwind CSS** - Utility-first CSS
- **PostCSS** - CSS processing

## 📱 Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

## ✨ Key Components

### Navigation
- Fixed header with glass-morphism effect
- Smooth scroll to sections
- Active section indicator
- Mobile-friendly

### Hero Section
- Fullscreen with animated gradient orbs
- Large typography (8xl on desktop)
- Dual CTAs
- Scroll indicator

### Service Cards
- Hover animations with parallax
- Icon and description
- Color-coded borders
- "Learn more" hover effect

### How It Works
- Connected step indicators
- Desktop connection lines
- Badge numbering (01, 02, 03)
- Estimated flow visualization

### Feature Cards
- 2-column grid layout
- Icon scaling on hover
- Benefits checklist
- Grouped presentation

### Persona Cards
- 2-column responsive grid
- Custom colors per persona
- Examples/offerings list
- Personalized messaging

## 🎬 Animation Details

- **Fade-ups** - Content enters with opacity and Y translation
- **Scale effects** - Hover states grow cards 5-10px
- **Parallax orbs** - Background gradients move continuously
- **Stagger animations** - Children fade in sequentially
- **Intersection observers** - Animations trigger on scroll

## 🚀 Deployment

Build and deploy to any static hosting:

```bash
npm run build
```

Output in `dist/` folder. Deploy to:
- Vercel
- Netlify
- GitHub Pages
- AWS S3
- Any static host

## 📄 License

MIT

---

**Built with ❤️ for I Computer Anything**
