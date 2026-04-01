# EcoCampus: The P2P Circular Economy Platform

EcoCampus is a full-stack, student-centric application designed to foster a circular economy within university campuses. It combines a marketplace for pre-owned goods, a lost-and-found system, a student investment workspace, and a secure meetup scheduler.

## Core Features

- **Marketplace:** Buy and sell items within the campus community with dynamic pricing based on student merit.
- **Lost & Found:** Report lost items and view found items with AI-assisted tagging.
- **Student Workspace:** Manage academic profiles, USN, and track merit scores.
- **P2P Investment:** A unique "Human Equity" model where students can bid on each other's success.
- **Meetup Scheduler:** Secure physical handovers at verified campus hotspots.
- **AI Support:** Integrated Gemini-powered support agent for campus queries.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide React, Framer Motion.
- **Backend:** Firebase (Firestore, Authentication).
- **AI:** Google Gemini (Image Analysis, Merit Calculation, Chat Support).
- **Styling:** Modern, high-density "Bento Grid" design.

## Security

The application uses Firebase Security Rules to ensure:
- Users can only edit their own profiles and items.
- Private data (like USN and Bids) is restricted to relevant participants.
- Admin roles are required for high-level management.
