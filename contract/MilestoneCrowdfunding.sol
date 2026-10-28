// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MilestoneCrowdfunding
 * @notice A decentralized milestone-based crowdfunding platform smart contract.
 * Pledged funds are held securely in escrow and released sequentially to the creator
 * only upon milestone proof verification approved by that milestone's largest backer.
 * Failed goals and stalled milestones enable secure pull-based refunds for contributors.
 */
contract MilestoneCrowdfunding {
    // -------------------------------------------------------------
    // REENTRANCY GUARD (Self-contained, no external npm import needed)
    // -------------------------------------------------------------
    uint8 private _unlocked = 1;
    modifier nonReentrant() {
        require(_unlocked == 1, "REENTRANCY_GUARD: Reentrant call detected");
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    // -------------------------------------------------------------
    // STRUCTS & ENUMS
    // -------------------------------------------------------------
    enum CampaignState {
        Funding,
        GoalReached,
        Failed,
        Completed
    }

    enum MilestoneStatus {
        PendingFunding,
        Funded,
        ProofSubmitted,
        ApprovedAndReleased,
        Stalled
    }

    struct Milestone {
        string description;
        uint256 targetAmount;         // in Wei
        uint256 fundedAmount;         // in Wei
        string proofIpfsHash;         // IPFS CID containing proof documents / media
        address largestContributor;   // Backer with highest single cumulative stake
        uint256 highestContribution;  // Wei value of highest stake
        MilestoneStatus status;       // Current status of milestone
        uint64 proofTimestamp;        // Timestamp when proof was submitted
        uint64 milestoneStartTimestamp; // Timestamp when this milestone became active
    }

    struct Campaign {
        uint256 id;
        address payable creator;
        string title;
        string description;
        uint256 goal;                 // Total ETH target (sum of milestone targets) in Wei
        uint256 totalPledged;         // Total ETH pledged so far in Wei
        uint64 deadline;              // Unix timestamp for funding phase
        uint64 stalledTimeout;        // Inactivity timeout before milestone refund can be triggered
        uint32 currentMilestoneIndex; // Index of current active milestone
        uint32 milestoneCount;
        bool goalReached;
        bool closed;
    }

    // -------------------------------------------------------------
    // STATE VARIABLES & MAPPINGS
    // -------------------------------------------------------------
    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Milestone[]) internal campaignMilestones;

    // campaignId => milestoneIndex => contributor => amount in Wei
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public milestoneContributions;

    // campaignId => contributor => total amount pledged to campaign in Wei
    mapping(uint256 => mapping(address => uint256)) public totalCampaignContributions;

    // campaignId => contributor => has claimed failed goal refund
    mapping(uint256 => mapping(address => bool)) public campaignRefundClaimed;

    // campaignId => milestoneIndex => contributor => has claimed stalled refund
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public milestoneRefundClaimed;

    // -------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline,
        uint256 milestoneCount
    );

    event MilestoneFunded(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        address indexed contributor,
        uint256 amount,
        address newLargestContributor,
        uint256 newHighestContribution
    );

    event GoalReached(uint256 indexed campaignId, uint256 totalPledged);

    event ProofSubmitted(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        string proofIpfsHash,
        uint256 timestamp
    );

    event MilestoneApproved(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        address indexed approver,
        uint256 amountReleased
    );

    event FundsReleased(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        address indexed creator,
        uint256 amount
    );

    event FailedGoalRefundClaimed(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event StalledRefundClaimed(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        address indexed contributor,
        uint256 amount
    );

    // -------------------------------------------------------------
    // CAMPAIGN CREATION
    // -------------------------------------------------------------
    /**
     * @notice Creates a new crowdfunding campaign with discrete sequential milestones.
     * @param _title Title of the project
     * @param _description Detailed summary
     * @param _durationSeconds Duration of the initial funding window in seconds
     * @param _stalledTimeoutSeconds Inactivity grace period for milestones (min 60s for demo, typically 14-30 days)
     * @param _milestoneDescriptions Array of descriptions for each project milestone
     * @param _milestoneTargets Array of target funding amounts for each milestone (in Wei)
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _durationSeconds,
        uint256 _stalledTimeoutSeconds,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestoneTargets
    ) external returns (uint256 campaignId) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_durationSeconds >= 60, "Duration must be at least 60 seconds");
        require(_stalledTimeoutSeconds >= 60, "Stalled timeout must be at least 60 seconds");
        require(
            _milestoneDescriptions.length > 0 &&
            _milestoneDescriptions.length == _milestoneTargets.length,
            "Invalid milestone parameters"
        );

        campaignId = campaignCount++;
        Campaign storage c = campaigns[campaignId];
        c.id = campaignId;
        c.creator = payable(msg.sender);
        c.title = _title;
        c.description = _description;
        c.deadline = uint64(block.timestamp + _durationSeconds);
        c.stalledTimeout = uint64(_stalledTimeoutSeconds);
        c.milestoneCount = uint32(_milestoneTargets.length);

        uint256 totalGoal = 0;
        for (uint256 i = 0; i < _milestoneTargets.length; i++) {
            require(_milestoneTargets[i] > 0, "Milestone target must be > 0");
            totalGoal += _milestoneTargets[i];

            Milestone storage m = campaignMilestones[campaignId].push();
            m.description = _milestoneDescriptions[i];
            m.targetAmount = _milestoneTargets[i];
            m.status = MilestoneStatus.PendingFunding;
        }

        c.goal = totalGoal;

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _title,
            totalGoal,
            block.timestamp + _durationSeconds,
            _milestoneTargets.length
        );
    }

    // -------------------------------------------------------------
    // FUNDING & PLEDGING
    // -------------------------------------------------------------
    /**
     * @notice Pledges ETH directly toward a specific milestone of a campaign.
     * @param _campaignId Identifier of the campaign
     * @param _milestoneIndex Index of the milestone to fund
     */
    function fundMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external payable nonReentrant {
        require(_campaignId < campaignCount, "Campaign does not exist");
        Campaign storage c = campaigns[_campaignId];
        require(!c.closed, "Campaign is closed");
        require(!c.goalReached, "Campaign goal has already been reached");
        require(block.timestamp <= c.deadline, "Funding deadline has passed");
        require(msg.value > 0, "Pledge must be greater than zero");
        require(msg.sender != c.creator, "Creator cannot fund their own campaign");
        require(_milestoneIndex < c.milestoneCount, "Milestone index out of bounds");

        Milestone storage m = campaignMilestones[_campaignId][_milestoneIndex];
        require(m.status != MilestoneStatus.ProofSubmitted, "Milestone proof is pending review");
        require(m.status != MilestoneStatus.ApprovedAndReleased, "Milestone already approved and released");
        require(m.status != MilestoneStatus.Stalled, "Milestone is stalled and needs refund resolution");
        require(
            m.fundedAmount + msg.value <= m.targetAmount,
            "Pledge exceeds milestone target"
        );

        // State updates
        m.fundedAmount += msg.value;
        c.totalPledged += msg.value;
        milestoneContributions[_campaignId][_milestoneIndex][msg.sender] += msg.value;
        totalCampaignContributions[_campaignId][msg.sender] += msg.value;

        if (m.fundedAmount == m.targetAmount) {
            m.status = MilestoneStatus.Funded;
        }

        // Update largest contributor for this milestone
        uint256 userContribution = milestoneContributions[_campaignId][_milestoneIndex][msg.sender];
        if (userContribution > m.highestContribution) {
            m.highestContribution = userContribution;
            m.largestContributor = msg.sender;
        }

        emit MilestoneFunded(
            _campaignId,
            _milestoneIndex,
            msg.sender,
            msg.value,
            m.largestContributor,
            m.highestContribution
        );

        // Check if entire campaign goal is satisfied
        if (!c.goalReached && c.totalPledged >= c.goal) {
            c.goalReached = true;
            // Activate first milestone
            campaignMilestones[_campaignId][0].milestoneStartTimestamp = uint64(block.timestamp);
            emit GoalReached(_campaignId, c.totalPledged);
        }
    }

    // -------------------------------------------------------------
    // PROOF OF WORK SUBMISSION (Creator Only)
    // -------------------------------------------------------------
    /**
     * @notice Submits IPFS CID proof of completion for the active milestone.
     * @param _campaignId Identifier of the campaign
     * @param _milestoneIndex Index of the active milestone
     * @param _proofIpfsHash IPFS content hash (CID) pointing to proof files/deliverables
     */
    function submitProof(
        uint256 _campaignId,
        uint256 _milestoneIndex,
        string calldata _proofIpfsHash
    ) external {
        require(_campaignId < campaignCount, "Campaign does not exist");
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.creator, "Only campaign creator can submit proof");
        require(c.goalReached, "Goal not yet reached");
        require(_milestoneIndex == c.currentMilestoneIndex, "Can only submit proof for active milestone");
        require(bytes(_proofIpfsHash).length > 0, "Proof IPFS CID cannot be empty");

        Milestone storage m = campaignMilestones[_campaignId][_milestoneIndex];
        require(m.fundedAmount >= m.targetAmount, "Milestone target must be fully funded before proof is submitted");
        require(m.status == MilestoneStatus.Funded, "Milestone must be fully funded before proof can be submitted");
        require(m.status != MilestoneStatus.ApprovedAndReleased, "Milestone already approved");

        m.proofIpfsHash = _proofIpfsHash;
        m.status = MilestoneStatus.ProofSubmitted;
        m.proofTimestamp = uint64(block.timestamp);

        emit ProofSubmitted(_campaignId, _milestoneIndex, _proofIpfsHash, block.timestamp);
    }

    // -------------------------------------------------------------
    // MILESTONE APPROVAL (Largest Contributor Only)
    // -------------------------------------------------------------
    /**
     * @notice Approves proof of work and automatically transfers the milestone funds to the creator.
     * @dev Restricted strictly to the largest contributor of this specific milestone.
     * @param _campaignId Identifier of the campaign
     * @param _milestoneIndex Index of the milestone being approved
     */
    function approveMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external nonReentrant {
        require(_campaignId < campaignCount, "Campaign does not exist");
        Campaign storage c = campaigns[_campaignId];
        require(c.goalReached, "Campaign goal was not reached");
        require(_milestoneIndex == c.currentMilestoneIndex, "Can only approve currently active milestone");

        Milestone storage m = campaignMilestones[_campaignId][_milestoneIndex];
        require(m.status == MilestoneStatus.ProofSubmitted, "Proof not submitted or already handled");
        require(msg.sender == m.largestContributor, "Only the largest contributor of this milestone can approve");

        // Checks-Effects: Update state before external transfer
        m.status = MilestoneStatus.ApprovedAndReleased;

        // Advance to next milestone
        c.currentMilestoneIndex++;
        if (c.currentMilestoneIndex < c.milestoneCount) {
            campaignMilestones[_campaignId][c.currentMilestoneIndex].milestoneStartTimestamp = uint64(block.timestamp);
        } else {
            c.closed = true; // All milestones finished
        }

        uint256 releaseAmount = m.fundedAmount;

        emit MilestoneApproved(_campaignId, _milestoneIndex, msg.sender, releaseAmount);
        emit FundsReleased(_campaignId, _milestoneIndex, c.creator, releaseAmount);

        // Interaction: Safe low-level call to release milestone funds to creator
        (bool success, ) = c.creator.call{value: releaseAmount}("");
        require(success, "ETH transfer to creator failed");
    }

    // -------------------------------------------------------------
    // REFUND LOGIC (Pull-Over-Push Pattern)
    // -------------------------------------------------------------
    /**
     * @notice Allows contributors to claim a 100% refund if the campaign fails to reach its goal by deadline.
     * @param _campaignId Identifier of the failed campaign
     */
    function claimFailedGoalRefund(uint256 _campaignId) external nonReentrant {
        require(_campaignId < campaignCount, "Campaign does not exist");
        Campaign storage c = campaigns[_campaignId];
        require(block.timestamp > c.deadline, "Campaign funding window is still open");
        require(!c.goalReached, "Goal was successfully reached; no failed-goal refunds");
        require(!campaignRefundClaimed[_campaignId][msg.sender], "Refund already claimed");

        uint256 refundAmount = totalCampaignContributions[_campaignId][msg.sender];
        require(refundAmount > 0, "No contributed funds to refund");

        // Checks-Effects
        campaignRefundClaimed[_campaignId][msg.sender] = true;
        totalCampaignContributions[_campaignId][msg.sender] = 0;

        emit FailedGoalRefundClaimed(_campaignId, msg.sender, refundAmount);

        // Interaction
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund transfer failed");
    }

    /**
     * @notice Allows contributors to claim a refund for a specific milestone that has stalled.
     * A milestone is considered stalled if:
     * 1. The creator fails to submit proof within `stalledTimeout` after the milestone became active.
     * OR
     * 2. The creator submitted proof, but the approver became inactive for > `stalledTimeout`.
     * @param _campaignId Identifier of the campaign
     * @param _milestoneIndex Index of the stalled milestone
     */
    function claimStalledRefund(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external nonReentrant {
        require(_campaignId < campaignCount, "Campaign does not exist");
        Campaign storage c = campaigns[_campaignId];
        require(c.goalReached, "Goal was not reached; use claimFailedGoalRefund");
        require(_milestoneIndex >= c.currentMilestoneIndex, "Past milestones were already approved");
        require(_milestoneIndex < c.milestoneCount, "Invalid milestone index");

        Milestone storage m = campaignMilestones[_campaignId][_milestoneIndex];
        require(m.status != MilestoneStatus.ApprovedAndReleased, "Milestone was already approved");
        require(!milestoneRefundClaimed[_campaignId][_milestoneIndex][msg.sender], "Refund already claimed for this milestone");

        // Verify stall condition
        bool isStalled = false;
        if (m.status != MilestoneStatus.ProofSubmitted) {
            // Milestone started but creator never submitted proof within timeout
            if (m.milestoneStartTimestamp > 0 && block.timestamp > m.milestoneStartTimestamp + c.stalledTimeout) {
                isStalled = true;
            }
        } else {
            // Proof was submitted, but approver never acted within timeout
            if (block.timestamp > m.proofTimestamp + c.stalledTimeout) {
                isStalled = true;
            }
        }

        require(isStalled, "Milestone has not exceeded the stalled timeout");

        uint256 contribution = milestoneContributions[_campaignId][_milestoneIndex][msg.sender];
        require(contribution > 0, "No contribution to refund for this milestone");

        // Checks-Effects
        m.status = MilestoneStatus.Stalled;
        milestoneRefundClaimed[_campaignId][_milestoneIndex][msg.sender] = true;
        milestoneContributions[_campaignId][_milestoneIndex][msg.sender] = 0;

        emit StalledRefundClaimed(_campaignId, _milestoneIndex, msg.sender, contribution);

        // Interaction
        (bool success, ) = payable(msg.sender).call{value: contribution}("");
        require(success, "Refund transfer failed");
    }

    // -------------------------------------------------------------
    // GETTERS & VIEW HELPERS
    // -------------------------------------------------------------
    /**
     * @notice Returns comprehensive milestone information for a campaign.
     * @param _campaignId Identifier of the campaign
     */
    function getMilestones(uint256 _campaignId) external view returns (Milestone[] memory) {
        require(_campaignId < campaignCount, "Campaign does not exist");
        return campaignMilestones[_campaignId];
    }

    /**
     * @notice Returns single milestone details.
     */
    function getMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external view returns (Milestone memory) {
        require(_campaignId < campaignCount, "Campaign does not exist");
        require(_milestoneIndex < campaigns[_campaignId].milestoneCount, "Index out of bounds");
        return campaignMilestones[_campaignId][_milestoneIndex];
    }

    /**
     * @notice Checks the current status of a milestone.
     */
    function getMilestoneStatus(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external view returns (MilestoneStatus) {
        require(_campaignId < campaignCount, "Campaign does not exist");
        Campaign memory c = campaigns[_campaignId];
        Milestone memory m = campaignMilestones[_campaignId][_milestoneIndex];

        if (m.status == MilestoneStatus.ApprovedAndReleased) {
            return MilestoneStatus.ApprovedAndReleased;
        }

        if (c.goalReached) {
            if (m.status == MilestoneStatus.Stalled) {
                return MilestoneStatus.Stalled;
            }
            if (m.status == MilestoneStatus.ProofSubmitted) {
                if (block.timestamp > m.proofTimestamp + c.stalledTimeout) {
                    return MilestoneStatus.Stalled;
                }
                return MilestoneStatus.ProofSubmitted;
            }
            if (m.status == MilestoneStatus.PendingFunding) {
                if (m.milestoneStartTimestamp > 0 && block.timestamp > m.milestoneStartTimestamp + c.stalledTimeout) {
                    return MilestoneStatus.Stalled;
                }
                return MilestoneStatus.PendingFunding;
            }
            if (m.milestoneStartTimestamp > 0 && block.timestamp > m.milestoneStartTimestamp + c.stalledTimeout) {
                return MilestoneStatus.Stalled;
            }
            return MilestoneStatus.Funded;
        }

        if (m.fundedAmount >= m.targetAmount) {
            return MilestoneStatus.Funded;
        }

        return MilestoneStatus.PendingFunding;
    }

    /**
     * @notice Calculates campaign state for frontend rendering.
     */
    function getCampaignState(uint256 _campaignId) external view returns (CampaignState) {
        require(_campaignId < campaignCount, "Campaign does not exist");
        Campaign memory c = campaigns[_campaignId];

        if (c.closed) {
            return CampaignState.Completed;
        }
        if (c.goalReached) {
            return CampaignState.GoalReached;
        }
        if (block.timestamp > c.deadline && !c.goalReached) {
            return CampaignState.Failed;
        }
        return CampaignState.Funding;
    }
}
