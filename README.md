# AI Rental Tools

**Version 4.2.10 Beta** | Released December 6, 2025

AI-Powered Property Management Platform for modern landlords and property managers.

## Overview

AI Rental Tools (RentTrack) is a comprehensive property management SaaS platform featuring AI-powered analytics, tenant management, payment processing, and intelligent automation.

## Key Features

### v4.2.10 Highlights

- **Conversion-Optimized Landing Page** - Modern, professional design focused on user acquisition
- **Redesigned Dashboard** - Clean, intuitive layout with real-time data visualization
- **Analytics Components** - MetricCard, ProgressRing, and ChartCard components
- **Upsell System** - Context-aware upgrade prompts and feature comparisons
- **Tooltip/Help System** - Comprehensive in-app guidance and onboarding
- **Tenant Portal** - Complete tenant-facing portal with 6 pages
- **Payment Integrations** - PayPal and Square payment processing
- **Security Hardening** - 23 security fixes including CORS, encryption, rate limiting, session timeout, and CSP headers

### Core Features

- Multi-tenant property management
- AI-powered rent optimization
- Payment risk prediction
- Portfolio health scoring
- Smart maintenance workflow
- Automated lease renewals
- Tenant application system
- Document management
- Financial reporting

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Build:** Vite
- **Payments:** Stripe, PayPal, Square

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck
```

## Environment Variables

Required:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

Optional (for email):
- `VITE_SMTP_HOST`, `VITE_SMTP_PORT`, `VITE_SMTP_USER`, `VITE_SMTP_PASS`, `VITE_SMTP_FROM`

## Documentation

See the `/docs` directory for complete documentation:
- [Quick Start Guide](./docs/QUICK_START.md)
- [Features List](./docs/FEATURES.md)
- [Version History](./docs/VERSION_HISTORY.md)
- [Admin Setup](./docs/SUPER_ADMIN_SETUP.md)

## License

Proprietary - All rights reserved.

---

*Last Updated: December 6, 2025*
