# Career Command Center — Project Overview

The **Career Command Center** is a powerful full-stack application designed to streamline the job search process by tracking applications, submissions, RTRs (Ready To Represent), study sessions, and daily reminders.

## 🚀 Key Features

### 1. Dashboard (The Nerve Center)
- **Rich Analytics**: Visualizes your progress with a "KPI Strip" (Total Jobs, Submissions, RTRs, Offers, Rejected, Study Minutes, Overdue Reminders).
- **Trend Charts**:
    - **Jobs by Status**: A pie chart showing the distribution of your current applications.
    - **Study Trend**: A bar chart tracking your learning activity over the last 7 days.
- **Quick Navigation**: Direct links to all modules for rapid data entry.

### 2. RTR Tracker (Ready To Represent)
This module tracks the earliest stage of vendor contact.
- **Push to Submission**: Specialized feature that "promotes" an RTR entry into the Submissions module with a single click. It automatically carries over:
    - Vendor Company
    - Role & Client (embedded in notes)
    - Date & Rate
- **View Modes**: Toggle between a flat **Table View** and a **Grouped View** (vendor cards with status badges).
- **Status List**: Rich statuses including *RTR, Submitted, Interview, Offer, Rejected, etc.*

### 3. Submissions Module
Tracks active submissions to clients through vendors.
- **Smart Grouping**: Automatically groups submissions by Vendor, making it easy to see which companies are being most active on your behalf.
- **Origin Tracking**: Records pushed from RTR are marked with an **"RTR" badge** and show the specific **Role/Client** context immediately without needing to open notes.
- **Advanced Filtering**: Combine **Vendor** and **Status** filters to drill down into specific opportunities.
- **Follow-up Reminders**: Color-coded badges (Overdue/Today) for submissions requiring action.

### 4. Jobs, Study, & Reminders
- **Study Tracker**: Log daily study topics, difficulty levels, and time spent. Feeds directly into Dashboard trends.
- **Reminders**: Task management with due dates and completion tracking, linked to specific jobs/vendors.
- **Job Tracker**: High-level view of all companies and positions you are targeting.

---

## 🛠️ Technical Stack

### Backend (Java Spring Boot)
- **Framework**: Spring Boot 3.4
- **Database**: H2 (In-memory for development) with PostgreSQL configuration ready for production.
- **Persistence**: Spring Data JPA with Hibernate.
- **API**: RESTful controllers with DTO mapping for clean data transfer.

### Frontend (Angular 18)
- **UI Framework**: Angular Material for premium accessible components.
- **Styling**: Vanilla SCSS with a custom glassmorphism-inspired design system.
- **Charts**: `ng2-charts` (Chart.js wrapper) for dynamic visualizations.
- **State Management**: Reactive services with RxJS for real-time UI updates.

---

## 💡 Developer Notes
- **Data Volatility**: The application currently uses an H2 in-memory database. If the backend server is stopped/hibernated, data is reset. (Configurable in `application-h2.properties`).
- **RTR → Submissions Flow**: This is the core workflow optimization. Always start a new lead in RTR; once the vendor confirms the submission, click the **Send icon** on the RTR row to move it to Submissions.
- **Cross-Module Sync**: The Analytics module aggregates data from all 5 repo layers to provide the holistic view on the Dashboard.
