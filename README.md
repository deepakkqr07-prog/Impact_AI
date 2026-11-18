# IP-WATCH: AI-Powered Predictive Analytics & Early Warning System for Infrastructure Projects
*(Unified Single-Project Architecture: React Frontend + FastAPI Backend + ML Models in One Server)*

**IP-WATCH** is an enterprise-grade infrastructure monitoring and predictive intelligence platform designed for central ministries, state departments, implementing agencies (such as NHAI, DFCCIL, BMRCL), and executive project directors.

Both the **React.js Frontend** and the **FastAPI Backend + ML Engine** are integrated into a **single unified project** served seamlessly on a single port (`http://127.0.0.1:8000/`).

---

## 🚀 One-Command Launch (Single Project)

You can launch the entire web application (both frontend and backend) with a single command:

```powershell
# From the project root:
python run.py
```
*(Or if you use npm: `npm start`)*

Once started, open your browser at:
- **Unified Web Application & Dashboard:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Interactive REST API & Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Health Check:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 🏛️ System Features & 15 Functional Modules

1. **Authentication & Role-Based Access Control (RBAC):**
   - JWT-based authentication with encrypted bcrypt password security.
   - 4 distinct government roles:
     - **Administrator**: Full system oversight, indicator weight calibration, user role governance, project deletion.
     - **Government Monitoring Officer**: Cross-departmental portfolio audits, early warning alert resolution, export.
     - **Project Manager**: Project registration, milestone logging, quarterly disbursement tracking, field progress entries.
     - **Department Officer**: Department-scoped project monitoring, field measurement updates, alert tracking.

2. **Executive Central Dashboard:**
   - Real-time KPI summaries: Total Projects, Ongoing, Completed, Delayed, High-Risk, Total Predicted Cost Overrun, Active Alerts.
   - Interactive Recharts:
     - Status distribution (Pie Chart)
     - Budget vs. Revised Outlay vs. Actual Expenditure (Grouped Bar Chart)
     - Planned Target vs. Ground Physical Progress (Bar Chart)
     - Multi-indicator Risk Breakdown (Pie Chart)
     - Sector-wise infrastructure capital commitments & disbursement ratio (Table & Bars)
     - Quarterly expenditure trends (Area Chart)

3. **Infrastructure Project Registry & CRUD:**
   - Full search by project code, name, agency, or state.
   - Multi-filtering by Sector, Department, Status, and Risk Level.
   - Safe deletion with modal verification and role enforcement.

4. **Add & Edit Project Management:**
   - Validation for all required project attributes (Approved cost, Revised cost, Start & Completion dates, Planned/Actual Progress, Sector, Ministry, Agency, State/District).

5. **Detailed Project Dossier (Tabbed Console):**
   - **Overview**: Administrative metadata, ground velocity, execution health assessment.
   - **Milestones**: Critical path tracking, milestone weights, status cures.
   - **Disbursements**: Quarterly fiscal ledger and category allocations.
   - **Field Updates**: Monthly verified physical progress and measurement book logs.
   - **AI Predictions**: Cost overrun and schedule delay forecasts with feature importances.
   - **Risk Decomposition**: Score decomposition across the 5 indicator components.
   - **Alerts**: Active early warnings with investigation and resolution workflow.

6. **AI Cost Overrun Prediction Model:**
   - Trained Scikit-learn **Random Forest Regressor** analyzing approved cost, burn rate ratio, progress lag, elapsed time, and sector volatility.
   - Displays estimated cost escalation (₹ Cr), overrun percentage, and top contributing feature importances.

7. **AI Schedule Delay Prediction Model:**
   - Trained Scikit-learn **Gradient Boosting Regressor** analyzing remaining duration, milestone missed ratio, and spending rate.
   - Clearly distinguishes confirmed deadline breaches from future forecast delays; provides recommended acceleration protocols.

8. **Project Risk Scoring Engine (0 - 100):**
   - Multi-indicator weighted scoring: Cost Escalation (30%), Schedule Delay (25%), Progress Deviation (20%), Milestone Slippage (15%), Expenditure Disparity (10%).
   - Classifies assets into **Low**, **Medium**, and **High Risk**.
   - Admin Calibration Tuner allows dynamic indicator weight recalibration across all projects.

9. **Early Warning Alert Notification Matrix:**
   - Automated detection for budget revisions &gt; 20%, physical progress lag &gt; 10%, deadline overruns, financial vs. physical disparity &gt; 20%, and composite risk breaches.
   - Full lifecycle workflow: `New` → `Under Review` → `Resolved` with audit resolution notes.

10. **Data Analytics & Printable Executive Reports:**
    - Sectoral and departmental capital utilization analysis.
    - One-click CSV export (`/api/analytics/export/csv`).
    - Dedicated print stylesheet for clean PDF generation and official physical submission.

11. **AI Project Intelligence Assistant:**
    - Live natural language query engine connected directly to the database (no fabricated AI text).
    - Answering portfolio queries: *"Which projects have highest risk?"*, *"Which projects are experiencing delays?"*, *"What are the major reasons for cost escalation?"*, *"Show projects with low physical progress"*, *"Which projects require immediate attention?"*, and specific project briefs.

12. **Historical Data Import Module:**
    - Downloadable CSV template (`/api/import/template`).
    - Drag-and-drop CSV validation parser.
    - Row-by-row error detection and valid preview table before database commitment.

13. **User & Role Management (Admin Console):**
    - Official user roster, role promotion/demotion, account activation toggle.
    - Live security audit logs tracking entity modifications, logins, and project creation.

14. **Profile & Security Settings:**
    - Profile credentials, security clearance level, and password change utility.

---

## 🔑 Demo Accounts (Evaluation Ready)

The system automatically initializes 4 evaluation accounts. The login screen includes quick-select buttons to auto-populate any account:

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Administrator** | `admin` | `Admin@123` | Full access, calibration weights, user management, project delete |
| **Government Monitoring Officer** | `gov_officer` | `Gov@123` | Portfolio analytics, reports export, alert resolution |
| **Project Manager** | `pm_sharma` | `Pm@123` | Project registration, milestone logging, progress updates |
| **Department Officer** | `dept_officer` | `Dept@123` | Department-scoped monitoring & field measurement logs |

---

## 📁 Single Unified Project Structure

```
Impact_AI/
├── run.py                             # Root Single-Command Application Launcher
├── package.json                       # Unified root scripts (start, build, dev)
├── requirements.txt                   # Complete Python dependencies
├── infrastructure_pm.db               # Relational SQLite database (FK enforced)
│
├── backend/                           # Backend Application
│   ├── main.py                        # FastAPI unified server (serves API + React SPA)
│   ├── config.py                      # System settings & risk weights
│   ├── database.py                    # SQLAlchemy engine & session maker
│   ├── models.py                      # 12 Relational database tables
│   ├── schemas.py                     # Pydantic validation schemas
│   ├── auth.py                        # Bcrypt & JWT verification
│   ├── seed_data.py                   # 10 realistic Indian infrastructure mega-projects
│   ├── ml/                            # Machine Learning & Analytics Engines
│   │   ├── saved_models/              # Persisted Joblib models
│   │   ├── cost_overrun_model.py      # Random Forest Regressor
│   │   ├── delay_prediction_model.py  # Gradient Boosting Regressor
│   │   ├── risk_engine.py             # 0-100 Multi-indicator engine
│   │   └── alert_detector.py          # Automated threshold alerts
│   └── routers/                       # RESTful API Endpoints
│       ├── auth.py
│       ├── projects.py
│       ├── predictions.py
│       ├── risk.py
│       ├── alerts.py
│       ├── analytics.py
│       ├── assistant.py
│       ├── data_import.py
│       └── users.py
│
├── frontend/                          # React Frontend Application
│   ├── dist/                          # Production bundle served directly by FastAPI
│   ├── src/
│   │   ├── components/                # Navbar, Sidebar, MetricCard, StatusBadge, ConfirmModal
│   │   ├── context/                   # AuthContext (JWT, session, RBAC)
│   │   ├── pages/                     # All 15 functional web pages
│   │   ├── api.js                     # Unified API client
│   │   ├── App.jsx                    # Root view controller
│   │   ├── main.jsx                   # React entry point
│   │   └── index.css                  # Tailwind CSS styling
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🛠️ Development Workflows

- **Run Unified Server (Single Port):**
  ```powershell
  python run.py
  # Serves both frontend and backend on http://127.0.0.1:8000/
  ```

- **Rebuild Frontend Bundle:**
  ```powershell
  npm run build
  # Or: cd frontend && npm run build
  ```

- **Frontend Hot-Reload Development Mode (Optional):**
  ```powershell
  npm run dev:frontend
  # Runs Vite dev server on http://127.0.0.1:5173/ with proxy to FastAPI on port 8000
  ```
