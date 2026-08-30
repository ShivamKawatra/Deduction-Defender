# Sample Deduction Defense Test Case

## Case
A retailer has submitted a deduction package for a promotional marketing claim and a damaged carton chargeback.

## Observations
- Promotion agreement does not include markdown support.
- Display fee was not pre-approved in writing.
- Damaged carton claim has no supporting inspection photo or receipt exception.
- Remittance shows deduction amount of $38,550.

## Expected Result
The system should classify the deduction as invalid or requiring analyst review. It should recommend a dispute package and provide evidence references from the agreement, shipment records, and policy notes.

## Suggested Decision
- Dispute unauthorized markdown support
- Dispute unsupported damage claim
- Escalate display fee deduction for analyst review if additional proof exists
- Submit evidence bundle with contract and shipment references
