# RentTrack Quick Start Guide

## Version Management

**Current Version: v4.2.10-beta**

### Update Version (3 Steps)

1. Edit `src/lib/version.ts` - Change major/minor/patch numbers
2. Update `VERSION_HISTORY.md` - Add changelog entry
3. Run `npm run build` - Verify build succeeds

---

## Semantic Versioning

- **MAJOR** (x.0.0) - Breaking changes
- **MINOR** (1.x.0) - New features
- **PATCH** (1.0.x) - Bug fixes

---

## Common Tasks

### Make Yourself Super Admin
```sql
INSERT INTO super_admins (user_id, admin_type, is_active, notes)
SELECT id, 'both', true, 'Platform Owner'
FROM auth.users WHERE email = 'your-email@example.com';
```

### Footer Shows Version
All pages display: `v4.2.10-beta (2025-12-06)`

---

See VERSION_HISTORY.md for complete changelog.
