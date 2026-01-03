# Responsive Design Guide - AI Rental Tools

This guide documents the responsive design patterns used throughout the application. **All new pages and modifications MUST follow these patterns** to ensure consistent mobile, tablet, and desktop experiences.

## Breakpoints (Tailwind CSS)

| Prefix | Min Width | Target Devices |
|--------|-----------|----------------|
| (none) | 0px | Mobile phones (320px-639px) |
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets portrait |
| `lg:` | 1024px | Tablets landscape, small laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large desktops |

**Mobile-first approach**: Always write base styles for mobile, then add breakpoint prefixes for larger screens.

---

## Page Layout Patterns

### Standard Page Header

```tsx
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Title Section */}
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
          Page Title
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Optional subtitle or description
        </p>
      </div>

      {/* Actions Section */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Action buttons go here */}
      </div>
    </div>
  </div>
</div>
```

### Page Content Container

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
  {/* Page content */}
</div>
```

---

## Component Patterns

### Buttons with Conditional Text

For buttons that need shorter text on mobile:

```tsx
<button className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full sm:w-auto justify-center">
  <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
  <span className="hidden sm:inline">Add New Property</span>
  <span className="sm:hidden">Add</span>
</button>
```

### Icon Buttons (Mobile-Friendly)

```tsx
<button className="p-2 sm:p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
  <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
</button>
```

### Full-Width Mobile Buttons

```tsx
<button className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg">
  Submit
</button>
```

---

## Grid Layouts

### 2-Column Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
  {/* Grid items */}
</div>
```

### 3-Column Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
  {/* Grid items */}
</div>
```

### 4-Column Stats Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
  {/* Stat cards */}
</div>
```

### Card Grid (Pricing/Features)

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
  {/* Cards */}
</div>
```

---

## Cards & Containers

### Standard Card

```tsx
<div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
  {/* Card content */}
</div>
```

### Stat Card

```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
  <div className="flex items-center gap-3 sm:gap-4">
    <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
    </div>
    <div className="min-w-0">
      <p className="text-xs sm:text-sm text-gray-500">Label</p>
      <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Value</p>
    </div>
  </div>
</div>
```

---

## Typography

### Headings

```tsx
// Page title
<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Title</h1>

// Section heading
<h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Section</h2>

// Card heading
<h3 className="text-lg sm:text-xl font-medium text-gray-900">Card Title</h3>

// Subsection
<h4 className="text-base sm:text-lg font-medium text-gray-900">Subsection</h4>
```

### Body Text

```tsx
// Standard paragraph
<p className="text-sm sm:text-base text-gray-600">Content</p>

// Small/helper text
<p className="text-xs sm:text-sm text-gray-500">Helper text</p>

// Large intro text
<p className="text-base sm:text-lg text-gray-600">Intro paragraph</p>
```

---

## Tables (Responsive)

### Option 1: Horizontal Scroll

```tsx
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <div className="inline-block min-w-full align-middle">
    <table className="min-w-full">
      {/* Table content */}
    </table>
  </div>
</div>
```

### Option 2: Card View on Mobile

```tsx
{/* Desktop table */}
<div className="hidden sm:block">
  <table>{/* ... */}</table>
</div>

{/* Mobile card view */}
<div className="sm:hidden space-y-4">
  {items.map(item => (
    <div className="bg-white rounded-lg border p-4">
      {/* Card layout of table row data */}
    </div>
  ))}
</div>
```

---

## Forms

### Form Container

```tsx
<form className="space-y-4 sm:space-y-6">
  {/* Form fields */}
</form>
```

### Form Field

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
    Field Label
  </label>
  <input
    type="text"
    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
  />
</div>
```

### Two-Column Form Layout

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
  <div>{/* Field 1 */}</div>
  <div>{/* Field 2 */}</div>
</div>
```

### Form Actions

```tsx
<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 sm:pt-6 border-t">
  <button className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg">
    Cancel
  </button>
  <button className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg">
    Save
  </button>
</div>
```

---

## Navigation & Tabs

### Tab Navigation (Scrollable on Mobile)

```tsx
<div className="border-b border-gray-200 overflow-x-auto">
  <nav className="flex gap-4 sm:gap-6 min-w-max px-4 sm:px-0">
    <button className="px-1 py-3 sm:py-4 text-sm font-medium border-b-2 whitespace-nowrap">
      Tab 1
    </button>
    <button className="px-1 py-3 sm:py-4 text-sm font-medium border-b-2 whitespace-nowrap">
      Tab 2
    </button>
  </nav>
</div>
```

### Filter Buttons (Scrollable)

```tsx
<div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
  <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm whitespace-nowrap flex-shrink-0">
    Filter 1
  </button>
  <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm whitespace-nowrap flex-shrink-0">
    Filter 2
  </button>
</div>
```

---

## Modals & Slide Panels

### SlidePanel Usage

The SlidePanel component is already mobile-optimized. Use it for all forms and detail views:

```tsx
<SlidePanel
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Panel Title"
  size="lg" // 'sm' | 'md' | 'lg' | 'xl'
>
  {/* Content - will scroll on mobile */}
</SlidePanel>
```

---

## Spacing Reference

| Mobile | Desktop | Usage |
|--------|---------|-------|
| `p-4` | `sm:p-6` | Card padding |
| `px-4` | `sm:px-6` | Container horizontal padding |
| `py-4` | `sm:py-6` | Section vertical padding |
| `gap-2` | `sm:gap-3` | Button group gaps |
| `gap-4` | `sm:gap-6` | Grid gaps |
| `space-y-4` | `sm:space-y-6` | Vertical stacking |
| `mb-4` | `sm:mb-6` | Section margins |

---

## Touch Targets

Ensure all interactive elements meet minimum touch target size:

- **Minimum**: 44x44 pixels on mobile
- Use `p-2` or larger on icon buttons
- Use `py-2` minimum on text buttons
- Add `gap-2` minimum between adjacent buttons

---

## Checklist for New Pages

Before submitting any new page or modification:

- [ ] Page header stacks properly on mobile (`flex-col sm:flex-row`)
- [ ] All padding uses responsive values (`px-4 sm:px-6`)
- [ ] Text sizes are responsive (`text-2xl sm:text-3xl`)
- [ ] Grids collapse to single column on mobile
- [ ] Buttons are full-width on mobile where appropriate
- [ ] No horizontal scroll on mobile (test at 320px)
- [ ] Touch targets are at least 44x44px
- [ ] Tables have horizontal scroll or card alternative
- [ ] Icons scale appropriately (`w-5 h-5 sm:w-6 sm:h-6`)
- [ ] Long text truncates with `truncate` class where needed

---

## Testing Requirements

Test all pages at these breakpoints before deployment:

1. **320px** - Small mobile (iPhone SE)
2. **375px** - Standard mobile (iPhone)
3. **768px** - Tablet portrait
4. **1024px** - Tablet landscape / small desktop
5. **1440px** - Desktop

Use browser DevTools responsive mode to verify.

---

*Last updated: January 2026*
*This guide is mandatory for all UI development on AI Rental Tools.*
