# Deduction Defender Prototype

This prototype implements the problem statement shown in the image as a RocketRide AI workflow.

## Business problem

Consumer brand finance teams lose a meaningful percentage of revenue to retailer chargebacks and unauthorized deductions. The workflow below helps to:

- review payment remittances and deduction claims
- compare deductions against retailer contracts and promotion agreements
- identify invalid deductions and attach supporting proof
- auto-dispute invalid charges
- flag high-value deductions for analyst approval
- classify valid deductions for write-off or escalation

## RocketRide pipelines included

- `deduction_defender_chat.pipe` — conversational review workflow for analysts
- `deduction_defender_upload.pipe` — document-based review workflow for remittance and agreement files

## Setup

1. Copy `env.example` to `.env` and add your values.
2. Install the Python client:
   `pip install rocketride`
3. Run the validation script:
   `python check.py`
4. Connect the pipeline to your RocketRide server with your API key.

## Notes

This is a working prototype focused on logic and pipeline structure rather than a full production-grade billing system.
