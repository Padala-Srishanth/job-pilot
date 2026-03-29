# JobPilot - AI-Powered Job Application Platform

An intelligent job application platform that automatically finds and applies to relevant jobs based on your profile using AI-powered matching.

## Features

### Smart Apply
- Automatically matches and applies to relevant jobs
- TF-IDF + skill-based similarity scoring
- Configurable daily application limits
- AI-generated cover letters

### Referral Network
- Browse professionals at target companies
- AI-generated cold outreach messages
- Track referral request status

### Recruiter Connect
- View recruiter posts with job opportunities
- Quick messaging and profile viewing
- Filter by skills and location

### Analytics Dashboard
- Application pipeline visualization
- Success and response rate tracking
- Top skills analysis
- Recent activity feed

### Profile & Resume
- Resume upload with NLP parsing (skills, experience, education, projects)
- AI-powered resume improvement suggestions
- Job preference configuration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, React Router, Recharts, Framer Motion |
| Backend | Node.js, Express.js |
| Database | **Firebase Firestore** |
| Auth | **Firebase Authentication** (Email/Password) |
| AI/ML | TF-IDF (natural.js), OpenAI API (optional) |
| Resume Parsing | pdf-parse, custom NLP extraction |

## Project Structure

```
├── backend/
│   ├── config/
│   │   └── firebase.js          # Firebase Admin SDK init
│   ├── middleware/
│   │   ├── auth.js              # Firebase token verification
│   │   └── upload.js            # Multer file upload
│   ├── routes/                  # API endpoints (Firestore queries)
│   ├── services/                # resumeParser, jobMatcher, smartApply, aiService
│   └── server.js                # Express server entry point
├── frontend/
│   └── src/
│       ├── components/          # Reusable UI components
│       ├── context/             # React Context (Firebase Auth)
│       ├── pages/               # Route pages
│       ├── services/
│       │   ├── firebase.js      # Firebase client SDK config
│       │   └── api.js           # Axios client with Firebase token
│       └── App.js               # Router & app shell
```

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase project (Firestore + Authentication enabled)
- (Optional) OpenAI API key for AI features

### 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** > **Email/Password** sign-in method
3. Enable **Cloud Firestore** database (start in test mode)
4. (Backend) Go to **Project Settings** > **Service Accounts** > **Generate new private key**
5. Save the JSON as `backend/config/serviceAccountKey.json`

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Seed Sample Data
After starting both servers, click "Load Sample Jobs/Data" buttons in the UI, or call:
```
POST http://localhost:5000/api/jobs/seed
POST http://localhost:5000/api/referrals/seed
POST http://localhost:5000/api/recruiter/seed
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/me | Get current user (Firebase token) |
| POST | /api/auth/sync | Sync user profile after register |
| GET | /api/profile | Get profile |
| PUT | /api/profile | Update profile |
| POST | /api/profile/resume | Upload & parse resume |
| PUT | /api/profile/smart-apply | Toggle smart apply |
| GET | /api/jobs | Browse jobs (with filters) |
| GET | /api/jobs/recommended/me | AI-ranked job recommendations |
| GET | /api/applications | User's applications |
| POST | /api/applications/:jobId | Apply to a job |
| POST | /api/applications/smart-apply/run | Trigger smart apply |
| GET | /api/referrals | Browse referral contacts |
| POST | /api/referrals/request | Request a referral |
| GET | /api/recruiter | Get recruiter posts |
| GET | /api/analytics | Dashboard analytics |

## Firestore Collections

| Collection | Description |
|-----------|-------------|
| `users` | User profiles (keyed by Firebase UID) |
| `jobs` | Job listings |
| `applications` | User job applications |
| `referrals` | Referral contacts |
| `referralRequests` | User referral requests |
| `recruiterPosts` | Recruiter posts |

## Deployment

### Backend (Render / Google Cloud Run)
1. Create a new Web Service
2. Set build command: `cd backend && npm install`
3. Set start command: `cd backend && npm start`
4. Add `serviceAccountKey.json` contents as env var or upload file

### Frontend (Vercel / Firebase Hosting)
1. Import project, set root to `frontend`
2. Set `REACT_APP_API_URL` to your backend URL
3. Deploy

### Firebase Hosting (Alternative for frontend)
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

## License
MIT
