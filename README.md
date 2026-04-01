# Campus Nexus - Verified Student Marketplace

A verified, student-exclusive peer marketplace and lost-and-found registry built for high-stakes hackathon speed.

## Tech Stack
- **Frontend**: React (Vite, Tailwind, Lucide, Motion)
- **Backend**: Node.js (Express)
- **Database**: SQLite3
- **Auth**: Mock JWT Authentication

---

## 🚀 Getting Started

### 1. Backend Setup
From the root directory:
```bash
# Install dependencies
npm install

# Start the server
npm start
```
The backend will run on `http://localhost:5000`. It will automatically create `campus_nexus.db` and an `uploads/` folder on first run.

### 2. Frontend Setup
From the `frontend` directory:
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend will run on `http://localhost:3000`.

---

## 🛠 Features
- **Mock Auth**: Login with any college email to get a JWT.
- **Marketplace**: Create and view listings for gear.
- **Lost & Found**: AI-powered matching (Gemini ready) and reporting.
- **P2P Investment**: Academic merit-based bidding system.
- **Messaging**: Conversations and meetup scheduling.
- **Image Uploads**: Local file storage for item photos.

## 📁 Project Structure
- `server.js`: Main Express logic and API endpoints.
- `db.js`: SQLite schema initialization.
- `uploads/`: Local directory for stored images.
- `frontend/src/`: React source code.
