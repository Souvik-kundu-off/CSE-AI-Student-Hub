# 🌌 CSE-AI Student Hub

> **Build. Share. Innovate.** — The official project showcase, resource hub, and event portal for the Department of Computer Science & Engineering (AI).

[![Live Site](https://img.shields.io/badge/🌐_Live-techclub.dev-8B5CF6?style=for-the-badge)](https://www.techclub.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-DD2C00?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

---

## ✨ Features

### 🚀 For Students
- **Project Showcase** — Submit and display your builds (AI/ML, Web, Mobile, IoT, Systems) with GitHub links, live demos, and tech stack tags.
- **Hub Credits & Leaderboard** — Earn points for project approvals, profile completion, and community contributions. Compete on the real-time leaderboard.
- **Event Calendar** — Browse upcoming and past departmental workshops, hackathons, and study jams with external registration links.
- **Resource Library** — Access curated notes, PYQs, AI tools, and developer resources organized by category.
- **Blog & Broadcasts** — Read technical articles and stay updated with department announcements.
- **Profile & Onboarding** — Google OAuth sign-up with student verification, profile customization, and social links.

### 🛡️ For Staff & Admins
- **Admin Command Center** — Unified dashboard with 13 admin modules for complete platform management.
- **Project Moderation** — Review, approve, or reject student submissions with feedback notes.
- **Broadcast System** — Publish global announcements and alert banners to all members.
- **Credit Management** — Award or adjust student hub credits manually.
- **Content Management** — Manage events, blog posts, resources, gallery, and team directory.
- **Homepage Editor** — Customize hero section, CTAs, and featured content from the admin panel.
- **Audit Log & Reports** — Track all admin actions and view platform analytics.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Framer Motion (animations) |
| **UI Components** | Radix UI primitives (shadcn/ui patterns), Lucide Icons, Sonner (toasts), Recharts (charts) |
| **Backend & Auth** | Firebase Authentication (Google OAuth), Cloud Firestore (NoSQL database), Firebase Storage |
| **State Management** | TanStack Query (React Query v5) |
| **Media Storage** | Cloudinary (image uploads & optimization) |
| **Routing** | React Router DOM v6 |
| **Forms & Validation** | React Hook Form, Zod |
| **Deployment** | Vercel (Edge CDN, serverless) |
| **Security** | Firestore Security Rules (RBAC), CSP headers, reCAPTCHA |

---

## 👥 Role-Based Access Control (RBAC)

| Role | Dashboard | Moderation | Events | Content | Blog | Credits |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Superadmin** | Full | Write | Write | Write | Write | Write |
| **Admin** | Full | Write | Write | Write | Write | Write |
| **Faculty / Mentor** | Read | Read | Read | Write | Read | — |
| **Event Manager** | Limited | Read | Write | Write | Read | — |
| **Content Editor** | Limited | Read | Read | Read | Write | — |
| **Moderator** | Limited | Write | Read | Write | Read | — |
| **Student Member** | — | — | — | — | — | — |
| **Guest (Public)** | — | — | — | — | — | — |

---

## 🏗️ Getting Started

### Prerequisites
- **Node.js** v18 or higher
- A **Firebase** project ([Create one here](https://console.firebase.google.com/))
- *(Optional)* A **Cloudinary** account for image uploads

### 1. Clone & Install

```bash
git clone https://github.com/your-org/tech-hub-central.git
cd tech-hub-central
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Deploy Firestore Security Rules

```bash
npx firebase-tools deploy --only firestore:rules --project your_project_id
```

> [!IMPORTANT]
> The `firestore.rules` file contains production-hardened security rules with RBAC enforcement, contact form validation, admin-only audit log writes, and a catch-all deny rule. These **must** be deployed for database security to be active.

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`.

---

## 📂 Project Structure

```text
tech-hub-central/
├── public/
│   ├── uni-logo/                  # Department & university branding assets
│   │   ├── CSE_AI_WHITE_LOGO_FULL.png
│   │   ├── CSE_AI_BLACK_LOGO_FULL.png
│   │   ├── CSE_AI_FAVICON.png
│   │   └── bwulogo.png
│   └── all-logo-gsa/              # Google Student Ambassador assets
├── src/
│   ├── components/
│   │   ├── admin/                  # Command center modules (EventManager, BlogEditor, etc.)
│   │   ├── auth/                   # Protected route wrappers & auth guards
│   │   ├── home/                   # Landing page sections (Hero, Featured, GSC, CTA, etc.)
│   │   ├── navigation/            # GuestNavbar, MemberNavbar, StaffNavbar
│   │   └── ui/                    # Base Radix UI & Tailwind component primitives
│   ├── contexts/                  # AuthContext & global state providers
│   ├── hooks/                     # Custom hooks (useMobile, useToast)
│   ├── lib/                       # Firebase config, permissions matrix, Cloudinary, utilities
│   ├── pages/                     # 24 route-level page components
│   │   └── admin/                 # 13 admin sub-module pages
│   ├── test/                      # Unit & integration tests
│   ├── App.tsx                    # Root routing & provider setup
│   └── main.tsx                   # Application entry point
├── firestore.rules                # Firestore security rules (RBAC + validation)
├── firebase.json                  # Firebase deployment config
├── vercel.json                    # Vercel rewrites & security headers
├── vite.config.ts                 # Vite build config with code splitting
├── tailwind.config.ts             # Tailwind theme configuration
└── package.json                   # Dependencies & scripts
```

---

## 🗺️ Application Routes

### Public Routes
| Route | Page |
| :--- | :--- |
| `/` | Landing page with hero, featured projects & events |
| `/about` | Department overview and mission |
| `/projects` | Project showcase with category filters & search |
| `/projects/:id` | Individual project detail view |
| `/events` | Event calendar (upcoming & past) |
| `/resources` | Academic resources (Notes, PYQs, AI Tools) |
| `/team` | Team directory (faculty, leads, core members) |
| `/gallery` | Photo gallery from events |
| `/leaderboard` | Student rankings by hub credits |
| `/blog` | Technical articles & student posts |
| `/broadcasts` | Department announcements |
| `/contact` | Contact form |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Authenticated Routes
| Route | Page |
| :--- | :--- |
| `/login` | Google OAuth login |
| `/signup` | Account registration |
| `/onboarding` | Profile setup & verification |
| `/profile` | Profile settings |
| `/submit-project` | Project submission form |
| `/my-projects` | User's submitted projects |

### Admin Routes (`/admin/*`)
| Route | Module |
| :--- | :--- |
| `/admin` | Dashboard overview |
| `/admin/moderation` | Project review & approval |
| `/admin/events` | Event management |
| `/admin/resources` | Resource management |
| `/admin/blog` | Blog post editor |
| `/admin/broadcasts` | Announcement publisher |
| `/admin/gallery` | Gallery management |
| `/admin/team` | Team directory editor |
| `/admin/directory` | Member directory & roles |
| `/admin/homepage` | Homepage content editor |
| `/admin/reports` | Platform analytics |
| `/admin/audit-log` | Admin action history |
| `/admin/settings` | System settings |

---

## 🎮 Gamification — Hub Credits

Students earn **Hub Credits** for active participation:

| Action | Credits |
| :--- | :--- |
| 🎁 Welcome Bonus (first login) | +5 |
| 📝 Profile Verification | +10 |
| 🚀 Project Approved | +50 |
| 🏆 Admin Award (community contributions) | Variable |

Credits power the real-time **Leaderboard** ranking students across the department.

---

## 🔒 Security

- **Authentication** — Firebase Auth with Google OAuth (institutional accounts)
- **Database Security** — Firestore Security Rules with granular RBAC per collection
- **HTTP Security Headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (configured in `vercel.json`)
- **Contact Form Validation** — Server-side Firestore rules validate name, email regex, and message length
- **Admin Protection** — Audit log and reports restricted to superadmin/admin roles only
- **Catch-all Deny** — Undefined Firestore collections are blocked by default

---

## 📦 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server (port 8080) |
| `npm run build` | Production build with code splitting |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

---

## 🚀 Deployment

The platform is deployed on **Vercel** with:
- Automatic SPA client-side routing via rewrites
- HTTP security headers (CSP, X-Frame-Options, etc.)
- Edge CDN with Gzip/Brotli compression
- Code-split vendor chunks (React, Firebase, UI libraries)

To deploy Firestore rules separately:
```bash
npx firebase-tools deploy --only firestore:rules --project cse-ai-c89bc
```

---

## 📄 License

Built for the **Department of Computer Science & Engineering (AI)**, Brainware University.

Designed and developed by the CSE-AI Student **Souvik Kundu**.
