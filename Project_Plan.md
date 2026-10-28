# Final Project Plan
## Milestone-Based Decentralized Crowdfunding Platform

---

## 1. Project Overview

A blockchain-based crowdfunding DApp where a Solidity smart contract — not a
company — holds and controls pledged funds. Backers pool ETH into a campaign
and into individual milestones; funds release to the creator only after the
largest contributor to that specific milestone approves the creator's proof
of work. Failed goals and stalled milestones both trigger automatic refunds.

**One-line pitch:** *"A smart contract replaces the crowdfunding company —
it enforces fairness automatically instead of asking backers to trust a
platform."*

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity (^0.8.19) |
| Contract Tooling | Remix IDE |
| Blockchain Network | Ethereum Sepolia Testnet |
| Wallet | MetaMask |
| Frontend | HTML, CSS, JavaScript (no React) |
| Blockchain Connector | ethers.js (via CDN) |
| Storage | IPFS (Pinata / Infura) |
| Code Editor | Google Antigravity |
| Currency | Sepolia test ETH (no real money) |

---

## 3. Deliverables Already Completed ✅

| # | File | Purpose |
|---|---|---|
| 1 | `MilestoneCrowdfunding.sol` | The smart contract — full backend logic |
| 2 | `index.html` | The frontend — connects via MetaMask + ethers.js |
| 3 | `Project_Report_Milestone_Crowdfunding.docx` | 20-page academic report (Certificate, Acknowledgment, Abstract, Chapters 1–10, References, Appendix) |
| 4 | Workflow diagrams | Full lifecycle flowchart (shown in chat) |
| 5 | Research references | 10 citable academic sources |
| 6 | Antigravity prompt | Ready-to-paste prompt to regenerate/tweak code in Antigravity |

---

## 4. Recommended Folder Structure

```
MilestoneCrowdfunding/
│
├── contract/
│   └── MilestoneCrowdfunding.sol
│
├── frontend/
│   └── index.html
│
├── report/
│   └── Project_Report_Milestone_Crowdfunding.docx
│
└── README.md   (optional — quick notes for yourself)
```

---

## 5. Step-by-Step Execution Plan

### Phase A — Setup
- [x] Create the blank project folder + `contract` and `frontend` subfolders
- [x] Open the folder in Antigravity (`File → Open Folder`)
- [x] Paste `MilestoneCrowdfunding.sol` into `contract/`
- [x] Paste `index.html` into `frontend/`

### Phase B — Deploy the Contract
- [ ] Open [remix.ethereum.org](https://remix.ethereum.org)
- [ ] Create a new file, paste in the contract code, compile it
- [ ] Switch MetaMask network to **Sepolia**
- [ ] Get free Sepolia test ETH from a public faucet
- [ ] In Remix, set Environment to **"Injected Provider — MetaMask"**
- [ ] Deploy the contract, confirm the transaction in MetaMask
- [ ] Copy the **deployed contract address**

### Phase C — Connect the Frontend
- [ ] Open `index.html` in Antigravity
- [ ] Paste the deployed contract address into `CONTRACT_ADDRESS`
- [ ] Save the file
- [ ] Open `index.html` in the browser (Live Server or double-click)

### Phase D — Test the Full Flow
- [ ] Connect MetaMask (Account 1 = Creator)
- [ ] Create a campaign, e.g. goal `10`, duration `30`, milestones `4,3,3`
- [ ] Switch to Account 2 (Backer A) → pledge `4` ETH
- [ ] Switch to Account 3 (Backer B) → pledge `6` ETH → goal reached
- [ ] Fund Milestone 0 with `4` ETH (from Account 2)
- [ ] Switch back to Account 1 (Creator) → submit proof (any test IPFS hash string)
- [ ] Switch to Account 2 (largest contributor to Milestone 0) → Approve → confirm funds arrive in Creator's wallet
- [ ] Try an unauthorized approval from Account 3 → confirm it correctly fails
- [ ] (Optional) Test a failed-goal campaign → confirm refund works
- [ ] (Optional) Test `claimStalledRefund` logic conceptually (30-day wait is long for a live demo — explain it instead of demoing it live)

### Phase E — Finish the Report
- [ ] Fill in `[Your Name]`, `[Roll Number]`, `[Guide's Name]`, `[HOD's Name]`, `[Department]`, `[Year]`
- [ ] Update the Testing chapter with your *actual* Remix/Sepolia results
- [ ] Take 2–3 screenshots of successful transactions and add them to the report (optional but impressive)

### Phase F — Presentation Prep
- [ ] Practice explaining the workflow diagram start to finish
- [ ] Practice the "largest contributor approves" explanation
- [ ] Practice the "no separate login — MetaMask is the login" explanation
- [ ] Have the live demo ready (3 MetaMask accounts pre-loaded with test ETH)

---

## 6. Quick Answers Cheat-Sheet (for teacher Q&A)

| If asked... | Say this |
|---|---|
| "Where's your backend?" | "The smart contract is the backend — it stores data and enforces logic on-chain, so no separate server is needed." |
| "Is this real money?" | "No — Sepolia test ETH, free from a faucet, with no real-world value." |
| "Who approves a milestone?" | "Whoever pledged the most toward that specific milestone — not a full vote, to keep it simple but still accountable." |
| "What if the creator disappears?" | "Already-released milestone funds stay with the creator; only the still-locked milestone becomes refundable, split proportionally among that milestone's backers." |
| "Why not React?" | "Kept the frontend lightweight with plain HTML/CSS/JS since the core complexity of this project is the smart contract logic, not the UI framework." |

---

## 7. Optional Future Enhancements (mention if asked "what's next?")
- Deploy to Ethereum mainnet
- Issue an NFT as proof-of-backing for each pledge
- Add a custom ERC-20 token as an alternative pledge currency
- Weighted multi-backer voting instead of single largest-contributor approval
- Mobile app version
