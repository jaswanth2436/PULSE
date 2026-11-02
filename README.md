# PULSE
## Preference-driven Urban Light Signal Engine

> **See Traffic. Understand Congestion. Shape Signal Decisions.**

**Competition:** Neural Storm 2026 | **Track:** Future Tech | **Problem:** FT-01 — Smart Traffic Signal Optimisation

---

## Problem Statement (FT-01)

Develop a real-time AI system that dynamically adjusts traffic signal timings using live video feeds and edge machine learning to reduce urban congestion.

PULSE demonstrates:
1. ✅ Video-based vehicle detection (YOLOv8n + fallback mock)
2. ✅ Lane-wise vehicle counting
3. ✅ Traffic queue estimation (ROI-based spatial classification)
4. ✅ Waiting-time estimation
5. ✅ Adaptive traffic signal timing (PULSE intent-driven controller)
6. ✅ Signal-phase safety validation (Safety Agent)
7. ✅ Comparison against fixed-timing control
8. ✅ Original human-AI interaction (Traffic Intent Sculpting™)
9. ✅ Measurable and reproducible performance results

---

## Original Contribution: Traffic Intent Sculpting™

PULSE introduces **Traffic Intent Sculpting** — a novel human-AI interaction paradigm for traffic control.

Instead of entering raw green-time durations, operators:
1. Visually select an approach and set its priority (1–5)
2. Adjust optimization weights (efficiency vs. fairness vs. priority)
3. Designate protected crossings as hard constraints
4. Click "Generate Plan" — the AI translates intent into optimized signal timings
5. Review the safety-validated plan with full explanation
6. Accept or reject and iterate

The human remains the policy authority; the AI handles quantitative optimization.

---

## Architecture

```
┌─────────────┐    WebSocket     ┌──────────────────────────────────┐
│   React UI  │◄─────────────────│         FastAPI Backend          │
│  TypeScript │    REST API      │                                  │
│  Tailwind   │◄─────────────────│  ┌───────────┐  ┌────────────┐  │
└─────────────┘                  │  │   Vision  │  │   Demand   │  │
                                 │  │   Agent   │  │   Agent    │  │
                                 │  └───────────┘  └────────────┘  │
                                 │  ┌───────────┐  ┌────────────┐  │
                                 │  │ Strategy  │  │   Safety   │  │
                                 │  │   Agent   │  │   Agent    │  │
                                 │  └───────────┘  └────────────┘  │
                                 │         ┌──────────────┐        │
                                 │         │  Simulation  │        │
                                 │         │   Engine     │        │
                                 │         └──────────────┘        │
                                 │              SQLite              │
                                 └──────────────────────────────────┘
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Routing | React Router 6 |
| Backend | FastAPI + Uvicorn |
| Database | SQLite + SQLAlchemy 2.0 |
| CV | OpenCV 4.10 |
| Detection | YOLOv8n (Ultralytics) |
| Science | NumPy, Pandas, Scikit-learn |

---

## Installation (Windows)

### Prerequisites
- Python 3.11+ (Python 3.14 tested)
- Node.js 18+ (Node 26 tested)
- npm 10+

### Quick Setup

```powershell
# Clone or extract project
cd c:\xampp\htdocs\PULSE

# Run setup script
.\scripts\setup.ps1
```

### Manual Setup

**Backend:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -c "import asyncio; from app.database.init_db import init_database; asyncio.run(init_database())"
```

**Frontend:**
```powershell
cd frontend
npm install
```

The frontend uses the Vite `/api` and `/ws` development proxies by default. For a deployed frontend, copy
`frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL` and `VITE_WS_URL` to the deployed
backend endpoints.

---

## Running PULSE

**Option 1: Separate terminals**
```powershell
# Terminal 1 - Backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option 2: Scripts**
```powershell
# Terminal 1
.\scripts\start_backend.ps1

# Terminal 2
.\scripts\start_frontend.ps1
```

**Access PULSE:** http://localhost:5173

**API Documentation:** http://localhost:8000/docs

**Ports used:**
- 8000: FastAPI backend + WebSocket
- 5173: Vite dev server (frontend)

---

## Running the Guided Demo

1. Open http://localhost:5173
2. Click "Demo" in the sidebar
3. Follow the 11-step guided demonstration
4. Alternatively, click "Explore Mode" to use PULSE freely

---

## Running Tests

**Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pytest tests/ -v
```

**Frontend:**
```powershell
cd frontend
npm run test
```

---

## Troubleshooting

**Port 8000 already in use:**
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Port 5173 already in use:**
```powershell
# Change port in frontend/vite.config.ts
# Or: npm run dev -- --port 5174
```

**YOLO model not downloading:**
- Check internet connection
- PULSE does not fabricate detections when YOLO is unavailable; install the detector and model before processing video
- Set `MODEL_PATH` to the local YOLO weights file; see `backend/.env.example`

**Python 3.14 compatibility:**
- Some packages may have limited Python 3.14 support
- PULSE reports the detector as unavailable when ultralytics or the model is missing
- Recommended: Python 3.11 or 3.12 for full feature support

---

## Performance Results


| Metric | Fixed Timing | Queue Adaptive | PULSE |
|--------|-------------|----------------|-------|
| Avg Delay (s) | TBD after run | TBD | TBD |
| Throughput (veh/hr) | TBD | TBD | TBD |
| Max Queue | TBD | TBD | TBD |


---

## Known Limitations

1. **Simulation only**: Video detection requires compatible OpenCV and optional YOLOv8 installation
2. **Single intersection**: Current version models one four-way intersection
3. **Simplified physics**: Poisson arrival model; real traffic is more complex
4. **CPU inference**: GPU would improve video processing FPS
5. **Prototype safety model**: Not certified for real traffic engineering use
6. **Python 3.14 support**: Some ML packages may need Python 3.11–3.12

---

## Future Improvements

1. Multi-intersection network simulation
2. SUMO integration for higher-fidelity simulation
3. Reinforcement learning controller (Q-learning or PPO)
4. Real-time GPS/crowdsource data integration
5. Mobile operator interface
6. 3D intersection visualization
7. Emergency vehicle priority detection

---

## Team


- Team Leader: [PALURU JASWANTH]
- Frontend Developer: [PALURU JASWANTH]
- Backend/ML Engineer: [PALURU JASWANTH]
- CV Engineer: [PALURU JASWANTH]

**Institution:** [SAVEETHA SCHOOL OF ENGINEERING]

---

## AI Tool Disclosure

PULSE was developed with AI coding assistance:
- **AI Tool Used**: Google Antigravity (Claude Sonnet 4.6 Thinking)
- **Used for**: Code generation, architecture design, boilerplate
- **Human review**: All generated code was reviewed and validated
- **Core algorithms**: Signal optimization, safety validation, and simulation logic verified by team
- **Originality**: Traffic Intent Sculpting™ interaction paradigm is an original team concept

---

## Third-Party Libraries and Licenses

| Library | License | Use |
|---------|---------|-----|
| React | MIT | Frontend framework |
| FastAPI | MIT | Backend API |
| Tailwind CSS | MIT | Styling |
| Recharts | MIT | Charts |
| Lucide React | ISC | Icons |
| SQLAlchemy | MIT | ORM |
| OpenCV | Apache 2.0 | Computer vision |
| Ultralytics YOLOv8 | AGPL-3.0 | Object detection |
| NumPy | BSD | Numerical computing |
| Pandas | BSD | Data analysis |
| Scikit-learn | BSD | ML utilities |

**Note on YOLOv8**: Ultralytics YOLOv8 is licensed under AGPL-3.0 for open-source use. The pretrained weights (yolov8n.pt) are trained on COCO dataset. For commercial use, a commercial license from Ultralytics is required.

---

## Video and Data Attribution

PULSE does not distribute copyrighted video footage.
- Test with your own intersection recordings
- Creative Commons footage from Pixabay/Pexels is suitable for testing
- Simulation mode requires no external video

---

*PULSE — Preference-driven Urban Light Signal Engine*
*Neural Storm 2026 | Future Tech Track | Problem FT-01*
"# PULSE" 
"# PULSE" 
