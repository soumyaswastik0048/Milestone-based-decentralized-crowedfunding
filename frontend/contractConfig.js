// MilestoneCrowdfunding Contract Configuration & ABI

const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_HEX_CHAIN_ID = "0xaa36a7";
const SEPOLIA_NETWORK_PARAMS = {
  chainId: "0xaa36a7",
  chainName: "Sepolia Test Network",
  nativeCurrency: {
    name: "Sepolia ETH",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["https://rpc.sepolia.org", "https://ethereum-sepolia.publicnode.com"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"]
};

// ---------------------------------------------------------------------------------
// 1. CONTRACT ADDRESS: Paste the address from Remix after deploying to Sepolia!
// ---------------------------------------------------------------------------------
const CONTRACT_ADDRESS = "0xd8f93152c5008714eba559Af26CED9fe54b5fbcb";

// ---------------------------------------------------------------------------------
// 2. CONTRACT ABI (Compiled directly from contract/MilestoneCrowdfunding.sol)
// ---------------------------------------------------------------------------------
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "title", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "goal", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "milestoneCount", "type": "uint256" }
    ],
    "name": "CampaignCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "contributor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "FailedGoalRefundClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "FundsReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "totalPledged", "type": "uint256" }
    ],
    "name": "GoalReached",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "approver", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amountReleased", "type": "uint256" }
    ],
    "name": "MilestoneApproved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "contributor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "newLargestContributor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "newHighestContribution", "type": "uint256" }
    ],
    "name": "MilestoneFunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "proofIpfsHash", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ProofSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "campaignId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "milestoneIndex", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "contributor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "StalledRefundClaimed",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" }
    ],
    "name": "approveMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "campaignCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "campaignRefundClaimed",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "campaigns",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "address payable", "name": "creator", "type": "address" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "uint256", "name": "goal", "type": "uint256" },
      { "internalType": "uint256", "name": "totalPledged", "type": "uint256" },
      { "internalType": "uint64", "name": "deadline", "type": "uint64" },
      { "internalType": "uint64", "name": "stalledTimeout", "type": "uint64" },
      { "internalType": "uint32", "name": "currentMilestoneIndex", "type": "uint32" },
      { "internalType": "uint32", "name": "milestoneCount", "type": "uint32" },
      { "internalType": "bool", "name": "goalReached", "type": "bool" },
      { "internalType": "bool", "name": "closed", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_campaignId", "type": "uint256" }],
    "name": "claimFailedGoalRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" }
    ],
    "name": "claimStalledRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_title", "type": "string" },
      { "internalType": "string", "name": "_description", "type": "string" },
      { "internalType": "uint256", "name": "_durationSeconds", "type": "uint256" },
      { "internalType": "uint256", "name": "_stalledTimeoutSeconds", "type": "uint256" },
      { "internalType": "string[]", "name": "_milestoneDescriptions", "type": "string[]" },
      { "internalType": "uint256[]", "name": "_milestoneTargets", "type": "uint256[]" }
    ],
    "name": "createCampaign",
    "outputs": [{ "internalType": "uint256", "name": "campaignId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" }
    ],
    "name": "fundMilestone",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_campaignId", "type": "uint256" }],
    "name": "getCampaignState",
    "outputs": [{ "internalType": "enum MilestoneCrowdfunding.CampaignState", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" }
    ],
    "name": "getMilestone",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "uint256", "name": "targetAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "fundedAmount", "type": "uint256" },
          { "internalType": "string", "name": "proofIpfsHash", "type": "string" },
          { "internalType": "address", "name": "largestContributor", "type": "address" },
          { "internalType": "uint256", "name": "highestContribution", "type": "uint256" },
          { "internalType": "enum MilestoneCrowdfunding.MilestoneStatus", "name": "status", "type": "uint8" },
          { "internalType": "uint64", "name": "proofTimestamp", "type": "uint64" },
          { "internalType": "uint64", "name": "milestoneStartTimestamp", "type": "uint64" }
        ],
        "internalType": "struct MilestoneCrowdfunding.Milestone",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" }
    ],
    "name": "getMilestoneStatus",
    "outputs": [{ "internalType": "enum MilestoneCrowdfunding.MilestoneStatus", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_campaignId", "type": "uint256" }],
    "name": "getMilestones",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "uint256", "name": "targetAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "fundedAmount", "type": "uint256" },
          { "internalType": "string", "name": "proofIpfsHash", "type": "string" },
          { "internalType": "address", "name": "largestContributor", "type": "address" },
          { "internalType": "uint256", "name": "highestContribution", "type": "uint256" },
          { "internalType": "enum MilestoneCrowdfunding.MilestoneStatus", "name": "status", "type": "uint8" },
          { "internalType": "uint64", "name": "proofTimestamp", "type": "uint64" },
          { "internalType": "uint64", "name": "milestoneStartTimestamp", "type": "uint64" }
        ],
        "internalType": "struct MilestoneCrowdfunding.Milestone[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "milestoneContributions",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "milestoneRefundClaimed",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_campaignId", "type": "uint256" },
      { "internalType": "uint256", "name": "_milestoneIndex", "type": "uint256" },
      { "internalType": "string", "name": "_proofIpfsHash", "type": "string" }
    ],
    "name": "submitProof",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "totalCampaignContributions",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Expose config globally so plain scripts can access it
window.CONTRACT_CONFIG = {
  DEFAULT_CONTRACT_ADDRESS: CONTRACT_ADDRESS,
  SEPOLIA_CHAIN_ID: SEPOLIA_CHAIN_ID,
  SEPOLIA_HEX_CHAIN_ID: SEPOLIA_HEX_CHAIN_ID,
  SEPOLIA_NETWORK_PARAMS: SEPOLIA_NETWORK_PARAMS,
  CONTRACT_ABI: CONTRACT_ABI
};
