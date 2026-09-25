# ProductPulse

> **Turn feedback into product decisions.**

ProductPulse is a feedback intelligence platform designed for software applications and websites. It ingests user feedback from CSV uploads, support tickets, widgets, and app stores, executes an AI analysis pipeline to extract sentiment and topics, clusters recurring problems, generates product decisions, displays real-time trend analytics, and exports executive reports.

---

## Key Features

1. **AI Feedback Analysis Pipeline**
   - **Sentiment Analysis**: Detects `positive`, `neutral`, or `negative` sentiment with continuous scoring (-1.0 to 1.0) and confidence.
   - **Topic Clustering**: Automatically categorizes feedback into topics (Search, CSV Upload, Mobile, Performance, Authentication, UI, Billing, etc.).
   - **Problem Diagnostics**: Pinpoints detected problem, probable technical cause, user workflow impact, and suggested engineering action.
   - **AI Summaries**: Produces executive-level synthesis of what users like, dislike, emerging trends, and top recurring issues.
   - **Product Decisions**: Turns high-frequency problems directly into roadmap decisions with priority, trend, and supporting feedback count.

2. **Interactive Analytics Dashboard**
   - Live KPI cards with trend comparisons.
   - Recharts feedback volume timeline.
   - Sentiment distribution donut chart with contextual AI interpretation.
   - Top recurring issues ranked by volume and severity.

3. **Feedback Management & Search**
   - Debounced backend search across content, topics, and channels.
   - Composite multi-filter support (Sentiment + Topic + Priority + Source + Rating).
   - Real-time feedback submission with instant AI processing.
   - CSV export of filtered queries.

4. **CSV Import Pipeline**
   - Drag-and-drop CSV upload with size limit validation.
   - Column header auto-detection (Feedback, Rating, Date, Source).
   - Data cleaning, empty row rejection, and duplicate detection.
   - Pre-packaged 100+ sample feedback records downloadable directly from the UI.

5. **Roadmap Decisions & Reports**
   - Status transitions (`New` → `Reviewing` → `Planned` → `In Progress` → `Completed` → `Rejected`).
   - Intelligence report generation with print/PDF export and raw CSV download.

---

## Architecture & Technology Stack

### Full-Stack Architecture
* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Axios, Recharts, Lucide Icons.
* **Fullstack Server**: Node.js + Express with `vite.middlewares` mounted in development (`server.ts`).
* **Database**: Embedded SQLite SQL database engine (persisting to `productpulse.sqlite`).
* **AI Layer**: Google GenAI SDK (`@google/genai`) using `gemini-3.8-flash` with a zero-downtime deterministic heuristic fallback pipeline.
* **Python Backend Reference**: Complete Python FastAPI codebase located in `backend/app/` with SQLAlchemy models, Pydantic schemas, Pandas CSV processor, and Uvicorn server.

---

## Quick Start & Running the Application

### 1. Install Dependencies & Start Dev Server
```bash
npm install
npm run dev
```
The server will start on port `3000` (http://localhost:3000). The database is automatically seeded on first launch with 120+ realistic software reviews and decisions.

### 2. Building for Production
```bash
npm run build
npm start
```

### 3. Running the Python FastAPI Backend (Optional)
If running the Python service directly:
```bash
cd backend
pip install -r requirements.txt
python -m backend.app.main
```
FastAPI Swagger documentation will be available at:
`http://localhost:8000/docs`

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/overview` | KPI summaries and percentage shifts |
| `GET` | `/api/dashboard/sentiment` | Sentiment distribution and AI commentary |
| `GET` | `/api/dashboard/trends` | Time-series feedback volume |
| `GET` | `/api/dashboard/topics` | Ranked topics and recurring issue groups |
| `GET` | `/api/feedback` | Filtered, searched, and paginated feedback items |
| `GET` | `/api/feedback/:id` | Single feedback detail with AI diagnostics |
| `POST` | `/api/feedback` | Ingest single feedback item with real-time AI analysis |
| `DELETE` | `/api/feedback/:id` | Remove feedback record |
| `POST` | `/api/upload/csv` | Multipart CSV upload, validation, and AI ingestion |
| `POST` | `/api/analysis/summary` | Generate executive AI summary and recommendations |
| `POST` | `/api/analysis/decisions`| Synthesize product decision candidates |
| `GET` | `/api/decisions` | List decision items with status and priority filters |
| `POST` | `/api/decisions` | Create roadmap decision |
| `PATCH` | `/api/decisions/:id` | Update decision status or attributes |
| `DELETE` | `/api/decisions/:id` | Remove decision |
| `POST` | `/api/reports/generate` | Generate full executive intelligence report |
| `GET` | `/api/reports/:id` | Retrieve generated report |
| `GET` | `/api/sample-csv` | Download sample 100+ feedback CSV file |
| `POST` | `/api/seed/reset` | Reset and reload demo database |

---

## Environment Variables

### `.env`
```env
# Gemini API Key (automatically injected by AI Studio or configured in Secrets)
GEMINI_API_KEY=your_gemini_api_key_here

# App URL
APP_URL=http://localhost:3000

# Optional Database URL for Python FastAPI
DATABASE_URL=sqlite:///./productpulse.sqlite
```
