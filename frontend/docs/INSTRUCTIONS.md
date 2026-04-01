# Setup and Usage Instructions

## 1. Firebase Configuration

The application requires a Firebase project. The configuration is stored in `firebase-applet-config.json`.

### Required Environment Variables:
- `GEMINI_API_KEY`: Handled by the platform for AI features.
- `STRIPE_SECRET_KEY`: (Optional) If payment integration is enabled.

## 2. Running the Application

### Installation:
To install all required modules at a single go, you can use the standard npm command:
```bash
npm install
```
Alternatively, you can refer to `requirements.txt` for a list of all dependencies.

### Development Mode:
The application runs on port 3000.
```bash
npm run dev
```

### Building for Production:
```bash
npm run build
```

## 3. User Onboarding

1. **Login:** Use Google Authentication to sign in.
2. **Profile Setup:** Navigate to the **Workspace** tab to enter your USN and verify your academic status.
3. **Marketplace:** Browse items or list your own. Merit scores automatically apply discounts to buyers.
4. **Meetups:** Once a deal is made, use the **Meetups** tab to schedule a safe handover at a campus hotspot.

## 4. Security Rules Deployment

To deploy the latest security rules:
1. Ensure `firestore.rules` is updated.
2. Use the `deploy_firebase` tool or the Firebase CLI.
