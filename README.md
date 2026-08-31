# Deduction Defender

A RocketRide-powered AI prototype for retail deduction review and dispute management.

## Problem statement

Consumer brand finance teams lose a meaningful share of revenue to retailer chargebacks and unauthorized deductions. These deductions often appear as reductions to payments after merchandise has already been shipped, sold, or reconciled. In practice, the finance team must manually review remittance files, promotion agreements, shipment data, and retailer compliance manuals to determine whether each deduction is valid, invalid, or needs analyst review.

The image highlights a concrete business pain point:

- For consumer brand finance teams, losing 1–2% of revenue to retailer chargebacks and unauthorized deductions is common.
- These deductions are often hidden inside payment remittances, promotion contracts, and shipment records.
- The review process is high-volume and repetitive, making it expensive and slow when handled manually.
- Each deduction must be compared against the actual retailer agreement, policy terms, and evidence attached to the shipment or promotion.
- Some deductions are legitimate, but many are invalid or unsupported.
- Companies must decide whether to dispute the deduction, accept it, or escalate it for specialist approval.

This problem is especially difficult because the finance team is often balancing several information sources at once:

- retailer payment remittance files
- promotional allowance agreements
- shipment and fulfillment records
- compliance manuals and contract terms
- historical deduction records and proof documents

A wrong decision can either cause revenue leakage or create unnecessary disputes. The result is a slow manual process with a high risk of missed recoveries and excessive analyst effort.

## Why this project matters

The goal of Deduction Defender is to automate the early-stage review of deductions by:

- identifying deduction type and amount
- checking whether the deduction matches the retailer agreement or policy
- comparing against shipment and remittance evidence
- flagging invalid deductions that should be disputed
- recommending valid deductions for write-off or approval
- escalating high-value or borderline cases to human analysts

This helps finance teams recover revenue faster, reduce manual effort, and improve consistency in review decisions.

## Dashboard behavior

The overview page is designed to update after every review action. When a new deduction is analyzed or a new evidence file is uploaded, the dashboard recalculates a live snapshot of the review queue:

- total cases analyzed increases
- potentially invalid cases increase when the AI result indicates a dispute-worthy deduction
- analyst-review count updates for borderline or unsupported cases
- potential recovery value increases based on the deduced claim value
- the review queue is re-ordered with the newest case first

This keeps the overview card set synchronized with the latest AI decision instead of showing stale demo values.

## Project goals

This prototype demonstrates how an AI workflow can support the deduction review process by combining:

- retailer deduction data
- remittance context
- contract and promotion policy context
- shipment evidence
- Gemini-powered reasoning for analysis and recommendation

The app is designed to behave like an analyst assistant, not a fully production-grade financial system.

## Solution approach

This project uses RocketRide pipelines to create an AI review workflow:

1. A user enters a deduction question or uploads relevant evidence.
2. The pipeline sends the content through a prompt layer that gives the model precise instructions.
3. Gemini analyzes the deduction in relation to contract, remittance, and shipment evidence.
4. The output classifies the deduction as:
   - valid
   - invalid
   - needs analyst review
5. The response includes an explanation, supporting evidence, and recommended next action.

## RocketRide pipelines included

- `deduction_defender_chat.pipe` — conversational analyst workflow for reviewing specific deduction cases
- `deduction_defender_upload.pipe` — file-based workflow for uploaded remittance or agreement content

## Sample evidence bundle

The project includes several sample input files in the `sample/` folder for live testing and demo review:

- `sample/promotion_agreement_1.txt`
- `sample/promotion_agreement_2.txt`
- `sample/retailer_policy_note.txt`
- `sample/retailer_policy_note_2.txt`
- `sample/retailer_remittance_1.txt`
- `sample/retailer_remittance_2.txt`
- `sample/shipment_record_1.txt`
- `sample/shipment_record_2.txt`
- `sample/sample_case_summary.md`

These examples cover unsupported markdown claims, weak proof-of-delivery cases, policy violations, and retailer shortfall review scenarios.

## Tech stack

- Frontend: React
- Backend: FastAPI
- AI orchestration: RocketRide pipelines
- LLM: Gemini

## Project folder structure

```text
DeductionDefender/
├── README.md
├── check.py
├── deduction_defender_chat.pipe
├── deduction_defender_upload.pipe
├── env.example
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
└── .gitignore
```

## Setup

### 1. Backend configuration

Create a `.env` file in the backend folder based on the example:

```bash
cd Projects/DeductionDefender/backend
copy .env.example .env
```

Then fill in your values:

```env
ROCKETRIDE_URI=https://api.rocketride.ai
ROCKETRIDE_APIKEY=your_rocketride_api_key
ROCKETRIDE_GEMINI_KEY=your_gemini_api_key
```

### 2. Create and activate the backend virtual environment

From the cloned project root:

```powershell
cd DeductionDefender/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

After activation, your terminal prompt should show the virtual environment name, such as `(.venv)`.

### 3. Install backend dependencies

```powershell
pip install -r requirements.txt
```

### 4. Install frontend dependencies

```powershell
cd DeductionDefender/frontend
npm install
```

### 5. Run the backend

From the backend folder, with the virtual environment still active:

```powershell
cd DeductionDefender/backend
.\.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001
```

This starts the FastAPI server on:

```text
http://localhost:8001
```

If the app is already running, check it with:

```powershell
curl http://localhost:8001/health
```

### 6. Run the frontend

Open a new terminal and run:

```powershell
cd DeductionDefender/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Then open:

```text
http://localhost:5173
```

> If port 5173 is already in use, Vite will automatically switch to the next available port, such as 5174.

### 7. Test the project

Use the sample evidence files under `sample/` to validate the upload flow and overview updates. Uploading a file triggers the backend pipeline, and the overview cards refresh automatically with the latest review result.

## Architecture overview

The project follows a simple but practical architecture for finance workflow automation:

```mermaid
flowchart LR
    A[React Frontend] --> B[FastAPI Backend]
    B --> C[RocketRide Pipelines]
    C --> D[Gemini LLM]
    D --> E[Decision Output]
    C --> F[Remittance / Contracts / Shipment Data]
    E --> G[Finance Analyst Review]
```

The architecture diagrams are available in the separate folder:

- [architectures/deduction_defender_system_architecture.jpg](architectures/deduction_defender_system_architecture.jpg)
- [architectures/rocketride_pipeline_architecture.jpg](architectures/rocketride_pipeline_architecture.jpg)

## Production-style summary

This prototype is designed to demonstrate a business-ready decision workflow for deduction operations. It supports the core operations a finance team needs:

- review deduction claims quickly
- compare documentation with remittance and contract data
- prepare a case for dispute or write-off
- escalate exceptions for human validation
- reduce manual review time and improve recovery rates

The result is a lightweight, AI-enabled operations dashboard that mirrors how a modern accounts-receivable or retail finance team might review deductions before escalation.

## Validation

The project includes a validation script:

```bash
python check.py
```

This checks that the RocketRide pipeline files are valid JSON and match the required structure.

## Troubleshooting

### Pipeline is already running

This message usually indicates a stale or active RocketRide task rather than a frontend issue. In practice, it can happen when:

- the RocketRide staging server is temporarily unavailable
- the previous pipeline call has not completed cleanly
- the client is retrying while another task is still active

If this happens, check the backend health and retry the upload after a short wait. If the RocketRide service remains unavailable, the app will still keep the frontend responsive but will show the service-level error instead of a broken UI.

## Important note

This is a prototype for product demonstration and technical validation. It is not a full production finance system, regulatory workflow, or enterprise compliance engine. It is meant to show how AI and RocketRide can help solve the deduction review problem in a realistic, operationally meaningful way.
