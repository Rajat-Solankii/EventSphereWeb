# EventSphereWeb 🌐

EventSphereWeb is a comprehensive, modern platform for event management and ticket generation. The application features a stunning 3D-enhanced frontend, an AI-driven ticket generation system with QR codes, and a robust backend to handle registrations and data.

## 🚀 Features

- **Dynamic 3D Landing Pages:** Beautiful, immersive landing experiences built with React Three Fiber and Three.js.
- **AI-Driven Ticket Generation:** Generate custom event tickets with dynamic styling and automated QR code positioning.
- **Template Designer:** Powerful in-browser template editing using Polotno for creating custom event visuals.
- **Admin Dashboard:** Centralized panel for managing events, tickets, and user registrations.
- **Responsive UI:** Fully responsive design built with TailwindCSS and Framer Motion.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** TailwindCSS
- **3D & Animations:** Three.js, React Three Fiber, React Three Drei, Framer Motion
- **Editor:** Polotno (Canvas-based design editor)
- **State Management:** MobX

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma (SQLite database)
- **Utilities:** Nodemailer, CORS, dotenv

## 📦 Project Structure

```text
EventSphereWeb/
├── backend/            # Express server, Prisma schema, API routes
├── public/             # Static assets (icons, favicons)
├── src/                # React application source code
│   ├── assets/         # Images and SVG assets
│   ├── components/     # Reusable React components (3D elements, Editor)
│   ├── data/           # Mock data and stock images
│   └── pages/          # Application routes (Admin, Landing, Registration)
└── README.md           # Project documentation
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Frontend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Rajat-Solankii/EventSphereWeb.git
   cd EventSphereWeb
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Set up the Prisma database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```

## 📝 License

This project is licensed under the ISC License.
