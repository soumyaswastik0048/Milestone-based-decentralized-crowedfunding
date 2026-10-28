# Academic Project Report
## Milestone-Based Decentralized Crowdfunding Platform

---

### CERTIFICATE

This is to certify that the project entitled **"Milestone-Based Decentralized Crowdfunding Platform"** submitted by **[Your Name]** (Roll No: **[Roll Number]**) in partial fulfillment of the requirements for the award of the degree of **Bachelor of Technology / Master of Computer Applications** in **[Department / Specialization]** is an authentic record of academic work carried out under my supervision and guidance.

**Project Guide:**  
Name: `[Guide's Name]`  
Designation: `[Assistant Professor / Associate Professor]`  
Department of `[Department]`  

**Head of Department:**  
Name: `[HOD's Name]`  
Department of `[Department]`  

---

### DECLARATION

I hereby declare that the project work entitled **"Milestone-Based Decentralized Crowdfunding Platform"** submitted to the Department of `[Department]`, `[College / University Name]`, is a record of an original work done by me under the supervision of `[Guide's Name]`. The results embodied in this report have not been submitted to any other university or institute for the award of any degree or diploma.

Date: `[Date]`  
Place: `[City]`  

**[Your Name]**  
Roll No: `[Roll Number]`

---

### ACKNOWLEDGMENTS

I would like to express my deepest gratitude to my project guide, **[Guide's Name]**, for their invaluable guidance, encouragement, and insightful feedback throughout this work. I am also thankful to **[HOD's Name]**, Head of the Department, and all faculty members of the Department of `[Department]` for providing necessary infrastructural and laboratory facilities.

Finally, I extend my heartfelt thanks to my parents and peers for their continuous support and motivation.

---

### ABSTRACT

Traditional centralized crowdfunding platforms (such as Kickstarter, Indiegogo, and GoFundMe) suffer from inherent structural vulnerabilities: high intermediary fee extractions (5% to 10%), single points of failure, lack of financial accountability, and risk of creator exit scams where creators collect lump-sum capital upfront and fail to deliver Promised outcomes.

This project presents **MilestoneX**, an autonomous decentralized crowdfunding platform designed on the Ethereum blockchain. Implemented in Solidity (^0.8.19) and deployed on the Ethereum Sepolia Testnet, the system eliminates intermediaries by locking contributed capital in an autonomous escrow contract. Funds are released sequentially in discrete milestone stages only when the largest financial contributor to a milestone verifies and approves the creator’s cryptographic proof of work (stored on the InterPlanetary File System, IPFS). Furthermore, to guarantee security against Denial of Service (DoS) and gas-limit exhaustion, the platform implements a Pull-over-Push refund architecture, allowing contributors to reclaim their funds if campaign targets fail or if milestone progress stalls. The frontend is engineered with responsive vanilla JavaScript and Ethers.js, delivering an intuitive Web3 interface that interacts with MetaMask without relying on heavy third-party application servers.

**Keywords:** Ethereum, Smart Contracts, Decentralized Escrow, Solidity, Milestone Crowdfunding, IPFS, Web3, MetaMask.

---

## TABLE OF CONTENTS

1. [Chapter 1: Introduction](#chapter-1-introduction)
2. [Chapter 2: Literature Survey](#chapter-2-literature-survey)
3. [Chapter 3: Problem Definition & Objectives](#chapter-3-problem-definition--objectives)
4. [Chapter 4: System Architecture & Design](#chapter-4-system-architecture--design)
5. [Chapter 5: Smart Contract Design & Implementation](#chapter-5-smart-contract-design--implementation)
6. [Chapter 6: Decentralized Storage & Frontend Interface](#chapter-6-decentralized-storage--frontend-interface)
7. [Chapter 7: Security Analysis & Vulnerability Mitigations](#chapter-7-security-analysis--vulnerability-mitigations)
8. [Chapter 8: Testing, Verification & Results](#chapter-8-testing-verification--results)
9. [Chapter 9: Limitations & Future Enhancements](#chapter-9-limitations--future-enhancements)
10. [Chapter 10: Conclusion](#chapter-10-conclusion)
11. [References](#references)
12. [Appendix: Smart Contract Source Code](#appendix-smart-contract-source-code)

---

## Chapter 1: Introduction

Crowdfunding has revolutionized entrepreneurial finance, allowing innovators, artists, and engineers to source capital directly from global communities. However, centralized crowdfunding platforms operate as trusted third parties that introduce several major frictions:
1. **Capital Rent-Seeking:** Centralized brokers levy fees ranging from 5% to 10% of total funds raised, plus additional payment processor fees (3%).
2. **All-or-Nothing Without Accountability:** While platforms like Kickstarter enforce "All-or-Nothing" funding targets, once a project reaches its goal, the entire sum is transferred to the creator's bank account. Backers retain zero technical recourse if the creator defaults or underperforms.
3. **Information Asymmetry & Exit Scams:** Studies indicate that up to 9% of funded Kickstarter campaigns fail to deliver rewards, with backers having no mechanism to recover remaining capital.

The advent of programmable blockchains, initiated by Ethereum, enables trust-minimized applications where program code replaces human discretion. By modeling a crowdfunding escrow as a deterministic state machine, conditional fund disbursement can be cryptographically enforced.

---

## Chapter 2: Literature Survey

1. **N. Szabo (1996), "Smart Contracts: Building Blocks for Digital Markets"**: Foundational theory on replacing legal contracts with executable code.
2. **V. Buterin (2014), "Ethereum: A Next-Generation Smart Contract and Decentralized Application Platform"**: Introduction of the Ethereum Virtual Machine (EVM) for turing-complete decentralized logic.
3. **A. Mollick (2014), "The Dynamics of Crowdfunding: An Exploratory Study", Journal of Business Venturing**: Demonstrates that delivery delays and defaults are prevalent in reward-based crowdfunding due to lack of post-campaign governance.
4. **J. Cai et al. (2020), "Decentralized Crowdfunding Systems: A Survey", IEEE Access**: Compares DAO voting schemes versus automated milestones, noting that multi-backer DAO voting often suffers from severe voter apathy.
5. **OpenZeppelin Security Guidelines (2023)**: Highlights the Pull-over-Push pattern and Reentrancy protection as non-negotiable requirements for contracts holding public Ether.

---

## Chapter 3: Problem Definition & Objectives

### 3.1 Problem Definition
To engineer an autonomous, decentralized crowdfunding platform where:
- Contributed funds are held in verifiable smart contract escrow.
- Capital is released sequentially in discrete milestone tranches.
- Verification authority is granted directly to the most invested stakeholder (largest contributor) to overcome voting apathy while preserving accountability.
- Failed campaigns and stalled milestones support secure, autonomous refunds.

### 3.2 Key Objectives
1. Implement a robust Solidity smart contract (`MilestoneCrowdfunding.sol`) with multi-campaign support.
2. Eliminate DoS and reentrancy vectors using the Pull-over-Push pattern and reentrancy guards.
3. Integrate decentralized IPFS content hashing for immutable proof of work deliverables.
4. Build a lightweight, responsive Web3 interface using Ethers.js and MetaMask.
5. Validate the system on the Ethereum Sepolia Testnet across multiple simulated backer profiles.

---

## Chapter 4: System Architecture & Design

### 4.1 High-Level Architecture
The system consists of three primary tiers:
- **EVM Blockchain Tier:** Ethereum Sepolia testnet running `MilestoneCrowdfunding.sol`.
- **Decentralized Storage Tier:** IPFS nodes storing proof documents and deliverables referenced by CID.
- **Client Presentation Tier:** HTML5/CSS3/JavaScript interface communicating with the EVM via MetaMask provider (`window.ethereum`) and Ethers.js.

### 4.2 Lifecycle State Transitions

```
[ Funding Phase ] 
       │
       ├── (Deadline passes & Total Pledged < Goal) ──> [ FAILED ] ──> claimFailedGoalRefund()
       │
       └── (Total Pledged >= Goal) ──> [ GOAL REACHED ]
                                              │
                                              ▼
                                    [ Milestone 0 Active ]
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
         Creator submits IPFS Proof                           Timeout Exceeded (Stalled)
                    │                                                   │
                    ▼                                                   ▼
       Largest Backer Approves                               claimStalledRefund()
                    │
                    ▼
          Funds Released to Creator
                    │
                    ▼
         Advance to Milestone 1 ...
```

---

## Chapter 5: Smart Contract Design & Implementation

### 5.1 Escrow State & Data Structures
The contract tracks campaigns and milestones through clean, storage-optimized structs:
- `Milestone`: Contains target amount, funded amount, IPFS proof hash, largest contributor address, highest contribution tally, and approval/release flags.
- `Campaign`: Contains creator address, title, description, aggregate goal, total pledged, deadline, stalled timeout duration, and milestone tracking indices.

### 5.2 The "Largest Contributor" Governance Model
To prevent DAO voter fatigue, verification authority is automatically tracked:
```solidity
uint256 userContribution = milestoneContributions[_campaignId][_milestoneIndex][msg.sender];
if (userContribution > m.highestContribution) {
    m.highestContribution = userContribution;
    m.largestContributor = msg.sender;
}
```
This ensures the entity with the highest financial exposure on that specific phase holds the power to inspect deliverables and authorize payment release.

### 5.3 Pull-over-Push Refund Security
Rather than looping over contributors to send refunds (which risks out-of-gas errors or malicious reverts), the contract uses the pull pattern:
- The contract updates internal balance states (`campaignRefundClaimed` / `milestoneRefundClaimed`).
- The contributor initiates `claimFailedGoalRefund()` or `claimStalledRefund()`.
- Reentrancy guards (`nonReentrant`) prevent recursive reentry before state variables are zeroed.

---

## Chapter 6: Decentralized Storage & Frontend Interface

### 6.1 Decentralized Storage (IPFS)
When a creator completes a milestone, they upload project assets (source code archives, test logs, design schematics, or video demonstrations) to IPFS. The resulting Content Identifier (CID) is immutably stored on the blockchain, providing a tamper-proof audit trail.

### 6.2 Frontend Web3 Integration
The frontend utilizes modern browser ES Modules:
- **MetaMask Provider Detection:** Monitors `accountsChanged` and `chainChanged` events.
- **Sepolia Network Enforcement:** Automatically requests network switching to Chain ID `11155111` (`0xaa36a7`).
- **Role-Aware UI:** Dynamically adapts buttons based on connected address:
  - Creator addresses are presented with "Submit Proof" fields.
  - Largest contributor addresses see the "Approve & Release" verification panel.
  - General backers are provided with "Pledge" and "Claim Refund" capabilities.

---

## Chapter 7: Security Analysis & Vulnerability Mitigations

| Vulnerability Threat | Centralized Platform Risk | MilestoneX Mitigation |
|---|---|---|
| **Creator Exit Scam** | High (Lump-sum upfront payout) | Funds locked in escrow; unlocked sequentially only upon milestone review |
| **Reentrancy Attack** | N/A | Mutex lock `nonReentrant` modifier on all ETH transfers |
| **Gas Limit Exhaustion DoS** | N/A | Pull-over-Push withdrawal pattern instead of loop payouts |
| **Platform Censorship / Seizure** | High (Accounts can be frozen) | Fully autonomous smart contract with no administrative backdoor |
| **Creator Self-Approval** | N/A | `require(msg.sender != c.creator)` prevents creator from funding or approving own milestone |

---

## Chapter 8: Testing, Verification & Results

### 8.1 Test Environment
- **Network:** Ethereum Sepolia Testnet
- **Solidity Version:** 0.8.19
- **Tools:** Remix IDE, MetaMask, Ethers.js v5.7.2
- **Test Accounts:** 3 separate Sepolia addresses (Creator, Backer A, Backer B)

### 8.2 Test Cases & Results

| Test Case | Expected Behavior | Observed Result | Status |
|---|---|---|---|
| **TC-01: Campaign Creation** | Generates campaign with calculated goal = sum(milestones) | Campaign initialized; event emitted | Passed ✅ |
| **TC-02: Direct Milestone Funding** | Pledges update milestone and total pledged | Milestone funded; largest backer updated | Passed ✅ |
| **TC-03: Goal Reached Trigger** | Total pledges >= goal activates Milestone 0 | Status transitions to `Goal Reached` | Passed ✅ |
| **TC-04: Proof Submission** | Only creator can submit IPFS CID on active milestone | Creator succeeds; non-creator reverts | Passed ✅ |
| **TC-05: Milestone Approval** | Only largest backer can approve; releases ETH to creator | ETH transferred; milestone status approved | Passed ✅ |
| **TC-06: Unauthorized Approval** | Non-largest backer attempts approval | Reverts: `"Only largest contributor can approve"` | Passed ✅ |
| **TC-07: Failed Goal Refund** | Contributors pull refund if goal unmet after deadline | Backer receives 100% of pledge | Passed ✅ |
| **TC-08: Stalled Milestone Refund** | Contributors pull refund if creator or approver stalls | Stalled milestone funds safely refunded | Passed ✅ |

---

## Chapter 9: Limitations & Future Enhancements

1. **Collusion Vectors:** If a creator uses an unassociated wallet to fund a milestone, they could become the largest contributor. Future iterations could integrate decentralized identity (DID) or proof-of-humanity protocols (e.g., Worldcoin or Gitcoin Passport).
2. **ERC-20 Stablecoin Support:** Volatility in ETH price during long campaigns can impact milestone budgets. Supporting USDC or DAI would stabilize funding targets.
3. **Multi-Sig & Weighted Quorum Fallback:** In the event of largest-backer key loss, a fallback weighted vote among secondary backers could unlock stuck milestones.

---

## Chapter 10: Conclusion

The Milestone-Based Decentralized Crowdfunding Platform demonstrates how blockchain technology and smart contracts can eliminate predatory intermediary fees while introducing genuine post-funding accountability. By holding funds in algorithmic escrow and linking disbursements to cryptographic milestone verification by key stakeholders, the platform establishes a transparent, trust-minimized paradigm for decentralized capital formation.

---

## References

1. Szabo, N. (1996). "Smart Contracts: Building Blocks for Digital Markets." *Extropy: The Journal of Transhumanist Thought*, 16.
2. Buterin, V. (2014). "Ethereum: A Next-Generation Smart Contract and Decentralized Application Platform." *Ethereum White Paper*.
3. Mollick, E. (2014). "The Dynamics of Crowdfunding: An Exploratory Study." *Journal of Business Venturing*, 29(1), 1-16.
4. Cai, J., et al. (2020). "Decentralized Crowdfunding Systems: A Survey." *IEEE Access*, 8, 142100-142115.
5. Antonopoulos, A. M., & Wood, G. (2018). *Mastering Ethereum: Building Smart Contracts and DApps*. O'Reilly Media.
6. OpenZeppelin Contracts Documentation (2023). "ReentrancyGuard & PullPayment Patterns."
7. Benet, J. (2014). "IPFS - Content Addressed, Versioned, P2P File System." *arXiv preprint arXiv:1407.3561*.
8. Ethereum Improvement Proposals (EIPs). "EIP-155: Simple Replay Attack Protection."

---

## Appendix: Smart Contract Source Code

*(Refer to [`contract/MilestoneCrowdfunding.sol`](../contract/MilestoneCrowdfunding.sol) for the complete, annotated smart contract implementation).*
