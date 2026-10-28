# MilestoneX: Milestone-Based Decentralized Crowdfunding Platform

[![Solidity](https://img.shields.io/badge/Solidity-^0.8.19-363636?logo=solidity)](https://soliditylang.org/)
[![Network](https://img.shields.io/badge/Network-Ethereum_Sepolia-blue)](https://sepolia.etherscan.io/)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5_|_CSS3_|_JavaScript-orange)](https://developer.mozilla.org/)
[![Web3](https://img.shields.io/badge/Web3-ethers.js_v5.7.2-purple)](https://docs.ethers.org/v5/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An autonomous, trust-minimized crowdfunding platform powered by an Ethereum smart contract. Pledged funds are locked securely in on-chain escrow and released in sequential stages to the creator **only after the largest contributor to each milestone reviews and approves the creator's proof of work**. If a funding goal fails or a milestone stalls, contributors safely retrieve their ETH via secure pull-based refunds.

---

## 📁 Repository Structure

```
d:/my work/blockchain project/
│
├── contract/
│   └── MilestoneCrowdfunding.sol    # Smart contract (escrow, milestones, pull refunds)
│
├── frontend/
│   ├── index.html                   # Responsive Web3 interface (Glassmorphism Dark Mode)
│   ├── style.css                    # Design system tokens, micro-animations, layout
│   ├── app.js                       # Ethers.js integration, role-aware action handlers
│   └── contractConfig.js            # Deployed contract address & ABI configuration
│
├── report/                          # Academic documentation & viva defense notes
│
├── LICENSE                          # MIT License (auto-detected by GitHub)
├── Project_Plan.md                  # Project milestones and execution roadmap
└── README.md                        # Quickstart, Remix deployment & testing guide
```

---

## ⚡ Core Innovations & Architecture

1. **Autonomous Smart Contract Escrow**:
   - Replaces centralized platforms (Kickstarter, GoFundMe) that take 5–10% cuts and hold unilateral control over backer funds.
   - Pledged ETH is held directly by the verifiable Solidity contract code.

2. **Milestone-Phased Fund Release**:
   - The creator does not receive a lump sum upfront.
   - Funding releases sequentially (Milestone 1 → Milestone 2 → Milestone 3).

3. **Largest-Contributor Approval Governance**:
   - The backer with the largest financial stake in a specific milestone is granted exclusive on-chain authority to verify the creator's IPFS proof of work and release the escrowed funds for that stage.

4. **Pull-Over-Push Security Pattern**:
   - Mitigates Denial-of-Service (DoS) and gas exhaustion vulnerabilities. Backers invoke `claimFailedGoalRefund()` or `claimStalledRefund()` to pull their funds safely.

5. **Self-Contained Reentrancy Protection**:
   - Uses a state mutex lock on all external payable/fund-transferring calls without relying on external npm imports, enabling frictionless Remix compilation.

---

## 🚀 Step-by-Step Deployment & Setup Guide

### Step 1: Deploy Contract via Remix IDE

1. Open [Remix Ethereum IDE](https://remix.ethereum.org) in your browser.
2. In the File Explorer, create a file named `MilestoneCrowdfunding.sol`.
3. Copy and paste the contents of [`contract/MilestoneCrowdfunding.sol`](./contract/MilestoneCrowdfunding.sol).
4. Go to the **Solidity Compiler** tab on the left sidebar:
   - Compiler version: `0.8.19` (or any `^0.8.19` compatible version).
   - Click **Compile MilestoneCrowdfunding.sol**.
5. Switch your MetaMask wallet network to **Sepolia Testnet**.
   - Need free test ETH? Claim from [Google Cloud Web3 Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/).
6. Go to the **Deploy & Run Transactions** tab in Remix:
   - Environment: Select **"Injected Provider - MetaMask"**.
   - Ensure the contract selected is `MilestoneCrowdfunding`.
   - Click **Deploy** and confirm the transaction in MetaMask.
7. Once confirmed, copy the **Deployed Contract Address** from Remix under "Deployed Contracts".

---

### Step 2: Configure the Frontend

Set the deployed address in [`frontend/contractConfig.js`](./frontend/contractConfig.js) by replacing the zero address in the `CONTRACT_ADDRESS` constant:
```javascript
const CONTRACT_ADDRESS = "0xYourDeployedContractAddressHere";
```
Save the file and reload the frontend. The contract address is configuration, not your MetaMask wallet address.

---

### Step 3: Run the Frontend Locally

Open the frontend through a local web server (not `file://`):

**Option 1: Using Python (Pre-installed on most systems)**
```bash
cd "d:/my work/blockchain project/frontend"
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Option 2: Using Node / npx serve**
```bash
cd "d:/my work/blockchain project/frontend"
npx serve .
```

**Option 3: VS Code / Antigravity Live Server Extension**
Right click `frontend/index.html` and click **"Open with Live Server"**.

---

## 🧪 Testing & Viva Demonstration Walkthrough

To perform a complete live demo for evaluators, prepare **3 MetaMask accounts**:
- **Account 1**: Project Creator
- **Account 2**: Backer A (Primary Backer / Largest Contributor)
- **Account 3**: Backer B (Secondary Backer)

### Test Flow:

1. **Create Campaign (Account 1 - Creator)**:
   - Connect Account 1.
   - Click **"+ Create Campaign"** (or click **"✨ Fill Demo Campaign Preset"**).
   - Title: `Decentralized Neural Cloud`
   - Milestones:
     - Phase 1: `0.01 ETH`
     - Phase 2: `0.02 ETH`
   - Total Goal: `0.03 ETH`. Duration: `1440 minutes`. Timeout: `300 seconds`.
   - Submit and confirm in MetaMask.

2. **Fund Milestone 1 (Account 2 - Backer A)**:
   - Switch MetaMask to **Account 2**.
   - Open campaign details.
   - Enter `0.01 ETH` under Milestone 1 and click **"Pledge to Milestone 1"**.
   - Confirm transaction. Account 2 is now the **Largest Contributor** for Milestone 1.

3. **Complete Funding (Account 3 - Backer B)**:
   - Switch MetaMask to **Account 3**.
   - Open campaign details.
   - Enter `0.02 ETH` under Milestone 2 and click **"Pledge to Milestone 2"**.
   - Once total pledges reach `0.03 ETH`, the contract status transitions to `Goal Reached`, no further campaign funding is accepted, and Milestone 1 becomes active.

4. **Submit Proof of Work Only After a Milestone Is Fully Funded (Account 1 - Creator)**:
   - The creator can only submit proof once the active milestone has reached its full target amount.
   - This protects the escrow model by ensuring that each milestone is fully backed before its work is reviewed.

5. **Submit Proof of Work (Account 1 - Creator)**:
   - Switch back to **Account 1**.
   - Open campaign details. The interface detects you are the Creator and shows the **"Submit Proof of Work"** field on Milestone 1.
   - Enter any IPFS CID (e.g. `QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco` or `ipfs://test-proof-v1`).
   - Click **"Submit Proof of Work"** and confirm.

6. **Approve & Release Funds (Account 2 - Largest Backer)**:
   - Switch back to **Account 2**.
   - Open campaign details. Notice that Account 2 sees:
     `⭐ You are the Largest Contributor! Review the proof above. Approving will automatically release 0.01 ETH to creator.`
   - Click **"✔ Approve Milestone & Release Funds"** and confirm.
   - Milestone 1 marks **Approved & Released**, and `0.01 ETH` is transferred directly into Account 1's wallet!

7. **Unauthorized Approval Check (Account 3 - Backer B)**:
   - If Account 3 attempts to approve Milestone 1, the smart contract reverts with:
     `"Only the largest contributor of this milestone can approve"`.

8. **Refund Demonstrations**:
   - **Failed Goal**: If a campaign deadline passes without reaching the goal, any backer can click **"Claim 100% Failed Campaign Refund"**.
   - **Stalled Milestone**: If a milestone remains unreviewed past `stalledTimeout`, eligible backers can pull a milestone refund via `claimStalledRefund`.

---

## 🎓 Teacher & Viva Q&A Cheat-Sheet

| Question | Recommended Answer |
|---|---|
| **"Where is your backend database?"** | "The Ethereum Sepolia blockchain is our decentralized database and state machine. The Solidity smart contract enforces all business logic on-chain with zero centralized server dependencies." |
| **"Why is the approval given to the largest contributor instead of an all-backer DAO vote?"** | "In milestone crowdfunding, all-backer weighted DAO voting suffers from voter apathy and high collective gas costs. Assigning verification authority to the largest financial stakeholder directly aligns economic incentives with project success while keeping gas overhead minimal." |
| **"How are DoS refund attacks prevented?"** | "We utilize the **Pull-over-Push** design pattern. The contract does not iterate through arrays to push ETH to backers. Instead, state is updated and individual backers invoke a pull withdrawal (`claimFailedGoalRefund`), isolating gas costs and eliminating receiver revert vulnerabilities." |
| **"What happens if the creator disappears after Milestone 1?"** | "Milestone 1 funds were already earned and delivered. Milestones 2 and 3 remain locked in escrow. If the creator fails to submit proof within the configured timeout, Milestone 2 & 3 backers invoke `claimStalledRefund()` to recover their ETH." |
| **"Why plain HTML/CSS/JS instead of React/Next.js?"** | "This minimizes build tool dependencies, ensures fast client loading, and proves the core Web3 capabilities using vanilla ES modules and Ethers.js." |

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE). GitHub will automatically detect and display the MIT license badge for this repository.
