# Detailed Changelog and Exported Changes

This file tracks the evolution of the EcoCampus application.

## Version 1.0.0 - Initial Prototype
- **Core UI:** Implemented the "Bento Grid" layout with a sidebar navigation.
- **Authentication:** Integrated Firebase Google Login.
- **Marketplace:** Created the item listing and browsing system with "Merit Discount" logic.
- **Lost & Found:** Added reporting and matching interface.

## Version 1.1.0 - AI Integration
- **Gemini Merit Score:** Implemented `calculateMeritScore` to analyze academic data.
- **Image Analysis:** Added `analyzeImage` for automatic marketplace tagging.
- **Chat Support:** Integrated `chatWithGemini` for the Support tab.

## Version 1.2.0 - Security & Reliability
- **Firestore Rules:** Developed a comprehensive `firestore.rules` file with owner-based access and data validation.
- **Error Handling:** Added `handleFirestoreError` to catch and log detailed Firestore permission issues.
- **Meetup Scheduler:** Introduced the `MeetupView` for secure campus handovers.
- **USN Persistence:** Added real-time USN editing in the Workspace tab.

## Version 1.3.0 - Documentation
- **Docs Folder:** Created `/docs` directory with `README.md`, `INSTRUCTIONS.md`, `DEFINITION.md`, and `CHANGELOG.md`.
- **Requirements:** Added `requirements.txt` for a single-go dependency reference.
- **Blueprint Update:** Synchronized `firebase-blueprint.json` with the new `meetups` collection.
