# Design Guidelines: Hệ thống Quản lý Nhiệm vụ - Trung tâm PVHCC Bắc Ninh

## Design Approach
**Material Design-Based Productivity System**: Combining Material Design's data-density patterns with Linear's clean efficiency, optimized for Vietnamese government administrative workflows. Professional, trustworthy interface for complex task management with clear hierarchies and efficient data visualization.

## Design Principles
1. **Information Clarity**: Task status, deadlines, and assignments immediately visible
2. **Professional Authority**: Clean, formal aesthetic appropriate for government operations
3. **Efficient Workflows**: Every interaction optimized for speed and accuracy
4. **Hierarchical Transparency**: Visual distinction between Director/Department Head/Staff roles

## Color System

### Primary Palette
- **Primary Blue**: #1976D2 (Professional government blue - buttons, links, active states)
- **Primary Hover**: #1565C0 (Darker blue for hover states)
- **Primary Light**: #E3F2FD (Subtle backgrounds, hover cards)
- **Primary Border**: #90CAF9 (Dividers, borders)

### Neutral Foundation
- **Background**: #FAFAFA (Main page background)
- **Surface**: #FFFFFF (Cards, modals, panels)
- **Border**: #E0E0E0 (Subtle dividers)
- **Text Primary**: #212121 (Headers, important text)
- **Text Secondary**: #616161 (Body text, descriptions)
- **Text Disabled**: #9E9E9E (Disabled states)

### Semantic Colors
- **Success**: #2E7D32 (Completed tasks, positive metrics)
- **Warning**: #F57C00 (Approaching deadline, medium priority)
- **Error**: #C62828 (Overdue tasks, critical alerts)
- **Info**: #0288D1 (AI insights, notifications)

### Status-Specific
- **Khẩn cấp**: #D32F2F background, white text
- **Quan trọng**: #F57C00 background, white text
- **Bình thường**: #757575 background, white text
- **Hoàn thành**: #2E7D32 background, white text
- **Đang thực hiện**: #1976D2 background, white text
- **Quá hạn**: #C62828 background, white text

## Typography

### Font Stack
- **Primary**: Inter (Google Fonts) - Vietnamese diacritics support
- **Monospace**: JetBrains Mono - task IDs, dates, numbers

### Hierarchy
- **Page Titles**: 28px/bold (Danh sách nhiệm vụ)
- **Section Headers**: 20px/semibold (Nhiệm vụ đang thực hiện)
- **Card Titles**: 16px/medium (Task names)
- **Body**: 14px/normal (Descriptions, content)
- **Labels**: 12px/medium uppercase tracking-wide (STATUS, DUE DATE)
- **Data**: 14px/mono (KPI scores, dates: dd/MM/yyyy format)

## Layout Structure

### Spacing Scale
Tailwind units: **2, 3, 4, 6, 8, 12, 16, 20, 24**
- Cards: p-6
- Sections: mb-12, gap-6
- Form fields: space-y-4
- List items: gap-3

### Grid System
- **Container**: max-w-7xl mx-auto px-6
- **Dashboard**: 12-column grid, gap-6
  - Stats: grid-cols-4 (desktop) → grid-cols-2 (tablet) → grid-cols-1 (mobile)
  - Content: grid-cols-3 (desktop) → grid-cols-1 (mobile)
- **Sidebar**: Fixed 260px width (desktop), slide-over (mobile)

## Core Components

### Navigation Structure

**Top Bar** (h-16, sticky top-0, bg-white, shadow)
- Logo (left) + Breadcrumbs + Search + Telegram status dot + Notifications bell + User menu (right)
- Dropdowns use primary blue for active/hover states

**Sidebar** (w-64, bg-surface, border-r)
- User info block at top: Avatar + Name + Role badge
- Navigation groups: Dashboard, Nhiệm vụ của tôi, Nhiệm vụ phòng ban, Báo cáo, Thống kê KPI, Cài đặt
- Active state: Primary light background + primary blue left border (4px)
- Icons: 20px, aligned left with 12px margin

### Dashboard Cards

**Stat Cards** (grid-cols-4)
- White background, border, rounded-lg, p-6
- Layout: Icon (32px, primary blue) top-left + Label (text-xs uppercase, secondary text) + Number (text-3xl bold, primary text) + Trend arrow with %
- Hover: shadow-md transition

**Task Overview Widget**
- Grouped by status headers (text-sm font-semibold uppercase, mb-3)
- Task rows: Checkbox + Title (truncate) + Avatar (32px) + Deadline badge + Priority pill
- Max-height: 400px with scroll
- Border-left color-coded by priority

### Task Management

**Task List Table** (Desktop)
- White background, rounded-lg, border
- Header: Bold, primary text, border-bottom
- Columns: Tên nhiệm vụ (40%) | Người thực hiện (15%) | Hạn hoàn thành (15%) | Độ ưu tiên (10%) | Tiến độ (10%) | Trạng thái (10%)
- Rows: h-16, hover bg-primary-light, cursor-pointer
- Filters bar above: Dropdowns for Phòng ban, Trạng thái, Độ ưu tiên (white bg, border, rounded-md)

**Task Cards** (Mobile)
- Stacked vertical layout, p-4, mb-3, white bg, rounded-lg, border
- Priority color bar on left (4px)
- Elements stacked: Title (bold) → Assignee row → Deadline → Progress bar → Status pill

**Task Detail Panel** (Slide-over, w-600px desktop, full mobile)
- Header: bg-primary, white text, p-6 - Task name (editable) + Priority badge + Close button
- Body sections (p-6, space-y-6):
  1. Metadata grid (2 columns): Labels in secondary text, values in primary text
  2. Progress: % bar (h-2, rounded-full, primary blue fill) + Checklist tabs + Text updates tabs
  3. File attachments: Upload zone (dashed border, hover bg-primary-light) + File list
  4. Discussion timeline: Avatar + Name + Timestamp + Message (newest first)
  5. AI panel (collapsible, info background): Warning cards + Suggestions list

### Forms

**Input Fields**
- Height: 40px, px-3, border, rounded-md
- Focus: border-2 primary blue, outline-none
- Labels: text-sm font-medium mb-2, primary text
- Placeholder: Vietnamese, secondary text

**Multi-Select Dropdowns**
- Shows count badge when >2 selected (primary bg, white text)
- Checkboxes for options, search input at top

**Date Pickers**
- Vietnamese format: dd/MM/yyyy
- Quick selects: Hôm nay, Tuần này, Tháng này (primary blue when active)

**Progress Inputs**
- Slider: Track (gray), fill (primary blue), thumb (white with primary border)
- Checklist items: Checkbox + text, strikethrough when complete

### Data Visualization

**KPI Dashboard**
- Large scorecard: Primary blue circle (200px), text-5xl white number centered, label below
- Breakdown grid (2 columns): Điểm hoàn thành (70%) | Điểm chất lượng (30%) - white cards
- Trend chart: Line graph, primary blue line, grid background
- Comparison table: Alternating row backgrounds (white/gray-50)

**Reports Section**
- Filter bar: bg-gray-50, p-4, rounded-lg, mb-6 - Period selector + Date range
- Summary stats: 2x3 grid, white cards, rounded-lg, p-6
- Export buttons: Primary blue, top-right (Excel, PDF icons)
- Department accordion: Chevron icons, border-b between sections

### Badges & Pills

**Priority Badges** (rounded-full, px-3, py-1, text-xs font-medium)
- Khẩn cấp: Red bg, white text, 16px height
- Quan trọng: Orange bg, white text, 14px height
- Bình thường: Gray bg, white text, 14px height

**Status Pills** (rounded-full, px-3, py-1, text-xs font-medium)
- Icon + text combination
- Color-coded per status (see Color System)

**Role Tags** (inline, px-2, text-xs, rounded, border)
- Chủ trì: Primary blue border/text
- Phối hợp: Gray border/text

### Notifications

**Bell Dropdown** (max-h-96, overflow-y-auto, w-96)
- Unread count: Red badge on bell icon
- Item structure: Icon (left, color-coded) + Text + Timestamp (right, text-xs secondary)
- Grouped headers: Hôm nay, Hôm qua, Tuần này (text-xs uppercase, bg-gray-50, px-4, py-2)
- Unread items: bg-primary-light

**Telegram Integration**
- Settings panel: Connection status (green dot "Đã kết nối" or gray "Chưa kết nối")
- Input field for Telegram ID + Test button (primary blue)

### AI Features

**Warning Cards** (border-l-4 error red, bg-red-50, p-4, rounded-r-lg)
- Icon (warning triangle) + Title (bold) + Reason text + "Xem chi tiết" button

**Suggestions Panel** (collapsible, bg-info-light, border-l-4 info blue)
- List items: Checkbox + Suggestion text + Accept/Dismiss buttons (text buttons, primary blue)

## Responsive Breakpoints

**Desktop (≥1024px)**: Sidebar visible, multi-column grids, hover states active, task detail slide-over
**Tablet (768-1023px)**: Collapsible sidebar, 2-column grids, task detail full modal
**Mobile (<768px)**: Bottom tab bar (Dashboard | Nhiệm vụ | Báo cáo | Hồ sơ), hamburger menu, single column, sticky filters

## Accessibility
- Tap targets: min 40px height/width
- Focus states: 2px primary blue outline
- Keyboard shortcuts: N (new task), / (search), ESC (close)
- ARIA labels in Vietnamese
- Skip navigation link

## Images
No hero images required - this is an internal administrative tool focused on data and functionality. Icons from Heroicons (outline style) used throughout for clarity. User avatars are circular, 32-40px depending on context.