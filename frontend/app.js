// =============================================================================
// MilestoneX — Real DApp Logic (Plain Script, No ES Modules)
// Reads config from window.CONTRACT_CONFIG set by contractConfig.js
// =============================================================================

// ---------------------------------------------------------------------------
// Pull config from window (set by contractConfig.js which loads first)
// ---------------------------------------------------------------------------
const DEFAULT_CONTRACT_ADDRESS = window.CONTRACT_CONFIG.DEFAULT_CONTRACT_ADDRESS;
const APP_CONTRACT_ABI         = window.CONTRACT_CONFIG.CONTRACT_ABI;
const APP_SEPOLIA_CHAIN_ID     = window.CONTRACT_CONFIG.SEPOLIA_CHAIN_ID;
const APP_SEPOLIA_HEX_CHAIN_ID = window.CONTRACT_CONFIG.SEPOLIA_HEX_CHAIN_ID;
const APP_SEPOLIA_NETWORK_PARAMS = window.CONTRACT_CONFIG.SEPOLIA_NETWORK_PARAMS;

// ---------------------------------------------------------------------------
// Application State
// ---------------------------------------------------------------------------
let provider         = null;
let signer           = null;
let contract         = null;
let userAddress      = null;
let currentChainId   = null;
let allCampaigns     = [];
let currentFilter    = 'all';
let activeCampaignId = null;

// Configure the deployed contract address in contractConfig.js.
const activeContractAddress = DEFAULT_CONTRACT_ADDRESS;

// ---------------------------------------------------------------------------
// DOM References (populated on DOMContentLoaded)
// ---------------------------------------------------------------------------
let connectWalletBtn, walletAddressText, walletBalanceDisplay,
    networkBadge, networkDot, networkNameSpan,
    networkWarningBar, switchNetworkBtn,
    campaignsGrid, createCampaignModal, campaignDetailsModal,
    openCreateModalBtn, closeCreateModalBtn, closeDetailsModalBtn,
    createCampaignForm, addMilestoneRowBtn, milestonesContainer,
    totalCampaignsStat, totalPledgedStat, refreshBtn,
    txOverlay, txOverlayMessage, txOverlayHash;

// ---------------------------------------------------------------------------
// INIT — called once DOM is ready
// ---------------------------------------------------------------------------
function init() {
  // Grab DOM references
  connectWalletBtn      = document.getElementById('connect-wallet-btn');
  walletAddressText     = document.getElementById('wallet-address-text');
  walletBalanceDisplay  = document.getElementById('wallet-balance-display');
  networkBadge          = document.getElementById('network-badge');
  networkDot            = document.getElementById('network-dot');
  networkNameSpan       = document.getElementById('network-name');
  networkWarningBar     = document.getElementById('network-warning-bar');
  switchNetworkBtn      = document.getElementById('switch-network-btn');
  campaignsGrid         = document.getElementById('campaigns-grid');
  createCampaignModal   = document.getElementById('create-campaign-modal');
  campaignDetailsModal  = document.getElementById('campaign-details-modal');
  openCreateModalBtn    = document.getElementById('open-create-modal-btn');
  closeCreateModalBtn   = document.getElementById('close-create-modal-btn');
  closeDetailsModalBtn  = document.getElementById('close-details-modal-btn');
  createCampaignForm    = document.getElementById('create-campaign-form');
  addMilestoneRowBtn    = document.getElementById('add-milestone-row-btn');
  milestonesContainer   = document.getElementById('milestones-input-container');
  totalCampaignsStat    = document.getElementById('stat-total-campaigns');
  totalPledgedStat      = document.getElementById('stat-total-pledged');
  refreshBtn            = document.getElementById('refresh-btn');
  txOverlay             = document.getElementById('tx-overlay');
  txOverlayMessage      = document.getElementById('tx-overlay-message');
  txOverlayHash         = document.getElementById('tx-overlay-hash');

  bindUIEvents();
  initHeroEmpty();
  showNotConnectedState();

  // Try silent reconnect if MetaMask is already authorized.
  tryAutoConnect();

  // If MetaMask is installed, trigger the normal popup flow right away.
  const eth = getEthereumProvider();
  if (eth && !userAddress) {
    setTimeout(() => {
      if (!document.hidden) {
        connectWallet();
      }
    }, 500);
  }
}

// Run init when DOM is ready (defer handles this, but double-check)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init(); // DOM already ready
}

// ---------------------------------------------------------------------------
// METAMASK DETECTION — robust, waits for late injection
// ---------------------------------------------------------------------------
function getEthereumProvider() {
  if (typeof window === 'undefined') return null;

  // Multiple wallet providers (e.g. MetaMask + Coinbase) — prefer MetaMask
  if (window.ethereum && window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
    const mm = window.ethereum.providers.find(p => p.isMetaMask);
    if (mm) return mm;
  }
  // Single provider
  if (window.ethereum) return window.ethereum;
  return null;
}

async function tryAutoConnect() {
  // MetaMask may not be injected yet — wait a tick
  await new Promise(r => setTimeout(r, 100));

  const eth = getEthereumProvider();
  if (!eth) return;

  try {
    provider = new ethers.providers.Web3Provider(eth, 'any');
    const accounts = await eth.request({ method: 'eth_accounts' }); // read-only, no popup
    if (accounts && accounts.length > 0) {
      await setupWallet(accounts[0]);
    }
  } catch (e) {
    console.warn('Auto-connect check:', e.message);
  }

  // Listen for account / network changes
  eth.on('accountsChanged', (accounts) => {
    if (!accounts || accounts.length === 0) {
      handleDisconnect();
    } else {
      setupWallet(accounts[0]);
    }
  });

  eth.on('chainChanged', () => window.location.reload());
}

// ---------------------------------------------------------------------------
// UI EVENT BINDINGS
// ---------------------------------------------------------------------------
function bindUIEvents() {
  // --- Wallet ---
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', connectWallet);
  }

  // --- Network ---
  if (networkBadge)     networkBadge.addEventListener('click', switchOrAddSepolia);
  if (switchNetworkBtn) switchNetworkBtn.addEventListener('click', switchOrAddSepolia);

  // --- Modals ---
  if (openCreateModalBtn) {
    openCreateModalBtn.addEventListener('click', () => {
      if (!userAddress) {
        showToast('Connect Wallet First', 'Click "Connect MetaMask" in the top-right corner.', 'warning');
        return;
      }
      if (!isOnSepolia()) {
        showToast('Wrong Network', 'Switch to Sepolia Testnet first.', 'warning');
        return;
      }
      createCampaignModal.classList.add('open');
    });
  }

  if (closeCreateModalBtn) {
    closeCreateModalBtn.addEventListener('click', () => createCampaignModal.classList.remove('open'));
  }
  if (closeDetailsModalBtn) {
    closeDetailsModalBtn.addEventListener('click', () => {
      campaignDetailsModal.classList.remove('open');
      activeCampaignId = null;
    });
  }

  // Close on backdrop click
  [createCampaignModal, campaignDetailsModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }
  });

  // --- Form ---
  if (createCampaignForm) createCampaignForm.addEventListener('submit', handleCreateCampaign);

  // --- Milestone rows ---
  if (addMilestoneRowBtn) addMilestoneRowBtn.addEventListener('click', () => addMilestoneRow());

  // --- Filter buttons ---
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderCampaigns();
    });
  });

  // --- Refresh ---
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadCampaigns());
}

function initContract() {
  const isZero =
    !activeContractAddress ||
    activeContractAddress === '0x0000000000000000000000000000000000000000';
  if (isZero) return;
  try {
    contract = new ethers.Contract(activeContractAddress, APP_CONTRACT_ABI, signer || provider);
    console.log('Contract initialized at:', activeContractAddress);
  } catch (err) {
    console.error('Contract init error:', err);
  }
}

// ---------------------------------------------------------------------------
// WALLET & NETWORK
// ---------------------------------------------------------------------------
async function connectWallet() {
  console.log('connectWallet() called');

  const eth = getEthereumProvider();
  if (!eth) {
    showToast(
      'MetaMask Not Found',
      'Open this site in your real Chrome browser with MetaMask installed and unlocked. The embedded preview here cannot access the browser extension.',
      'error'
    );
    return;
  }

  // Show MetaMask is responding
  showTxOverlay('Opening MetaMask — approve the connection request...');

  try {
    const accounts = await eth.request({ method: 'eth_requestAccounts' });
    hideTxOverlay();

    if (accounts && accounts.length > 0) {
      provider = new ethers.providers.Web3Provider(eth, 'any');
      await setupWallet(accounts[0]);
      showToast('Wallet Connected! 🦊', `Connected: ${truncateAddress(accounts[0])}`, 'success');
    }
  } catch (err) {
    hideTxOverlay();
    console.error('connectWallet error:', err);
    if (err.code === 4001) {
      showToast('Rejected', 'You rejected the MetaMask connection.', 'error');
    } else if (err.code === -32002) {
      showToast('Pending Request', 'MetaMask is already open — click the MetaMask icon in your browser toolbar.', 'warning');
    } else {
      showToast('Connection Failed', err.message || 'Could not connect.', 'error');
    }
  }
}

async function setupWallet(account) {
  userAddress = account;
  const eth = getEthereumProvider();

  if (!provider && eth) {
    provider = new ethers.providers.Web3Provider(eth, 'any');
  }
  signer = provider.getSigner();

  // Read network
  try {
    const network = await provider.getNetwork();
    currentChainId = network.chainId;
    updateNetworkUI();
  } catch (e) {
    console.warn('Network read error:', e.message);
  }

  // Read real balance
  try {
    const balWei = await provider.getBalance(userAddress);
    const balEth = parseFloat(ethers.utils.formatEther(balWei)).toFixed(4);
    updateWalletUI(account, `${balEth} ETH`);
  } catch {
    updateWalletUI(account, '— ETH');
  }

  initContract();
  loadCampaigns();
}

function handleDisconnect() {
  userAddress = null;
  signer = null;
  contract = null;
  updateWalletUI(null);
  updateNetworkUI();
  showNotConnectedState();
}

function isOnSepolia() {
  return currentChainId === APP_SEPOLIA_CHAIN_ID;
}

function updateNetworkUI() {
  if (!networkDot || !networkNameSpan || !networkWarningBar) return;

  if (!currentChainId) {
    networkDot.style.background = '#64748b';
    networkDot.style.boxShadow  = 'none';
    networkNameSpan.textContent = 'Not Connected';
    networkWarningBar.style.display = 'none';
    return;
  }

  if (currentChainId === APP_SEPOLIA_CHAIN_ID) {
    networkDot.style.background = '#10b981';
    networkDot.style.boxShadow  = '0 0 6px #10b981';
    networkNameSpan.textContent = 'Sepolia Testnet';
    networkWarningBar.style.display = 'none';
  } else {
    networkDot.style.background = '#f43f5e';
    networkDot.style.boxShadow  = '0 0 6px #f43f5e';
    networkNameSpan.textContent = 'Wrong Network';
    networkWarningBar.style.display = 'block';
  }
}

function updateWalletUI(addr, balance) {
  if (!connectWalletBtn) return;
  if (addr) {
    walletAddressText.textContent = truncateAddress(addr);
    walletAddressText.title       = addr;
    if (balance) {
      walletBalanceDisplay.textContent    = balance;
      walletBalanceDisplay.style.display  = 'inline-block';
    }
    connectWalletBtn.style.borderColor = 'var(--accent-emerald)';
  } else {
    walletAddressText.textContent      = 'Connect MetaMask';
    walletBalanceDisplay.style.display = 'none';
    connectWalletBtn.style.borderColor = 'var(--border-glow)';
  }
}

async function switchOrAddSepolia() {
  const eth = getEthereumProvider();
  if (!eth) return;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: APP_SEPOLIA_HEX_CHAIN_ID }]
    });
  } catch (err) {
    if (err.code === 4902) {
      try {
        await eth.request({ method: 'wallet_addEthereumChain', params: [APP_SEPOLIA_NETWORK_PARAMS] });
      } catch {
        showToast('Network Error', 'Could not add Sepolia to MetaMask.', 'error');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// DATA LOADING
// ---------------------------------------------------------------------------
function initHeroEmpty() {
  if (totalCampaignsStat) totalCampaignsStat.textContent = '—';
  if (totalPledgedStat)   totalPledgedStat.textContent   = '— ETH';
}

function showNotConnectedState() {
  if (!campaignsGrid) return;
  const eth = getEthereumProvider();
  const isEmbeddedBrowser = !eth;

  campaignsGrid.innerHTML = `
    <div class="empty-state">
      <div style="font-size:3rem; margin-bottom:0.8rem;">🦊</div>
      <h3 style="color:var(--accent-primary);">Connect Your Wallet</h3>
      <p style="margin-top:0.5rem; max-width:380px;">
        ${isEmbeddedBrowser
          ? 'Open this site in your real Chrome browser with MetaMask installed and unlocked. The embedded preview here cannot access the browser extension.'
          : 'Connect MetaMask to view live campaigns from the Sepolia testnet smart contract.'}
      </p>
      <button class="btn btn-primary" style="margin-top:1.2rem;"
        onclick="document.getElementById('connect-wallet-btn').click()">
        🦊 Connect MetaMask
      </button>
    </div>
  `;
}

async function loadCampaigns() {
  if (!userAddress) { showNotConnectedState(); return; }

  if (!isOnSepolia()) {
    campaignsGrid.innerHTML = `
      <div class="empty-state">
        <div style="font-size:2.5rem; margin-bottom:0.8rem;">⚠️</div>
        <h3 style="color:var(--accent-amber);">Switch to Sepolia</h3>
        <p>MilestoneX only works on Sepolia testnet. Click the warning banner above to switch.</p>
      </div>
    `;
    return;
  }

  if (!contract) {
    campaignsGrid.innerHTML = `
      <div class="empty-state">
        <div style="font-size:2.5rem; margin-bottom:0.8rem;">⚙️</div>
        <h3 style="color:var(--accent-amber);">Contract Not Set</h3>
        <p>Set the deployed Sepolia contract address in <code>frontend/contractConfig.js</code> and reload the page.</p>
      </div>
    `;
    return;
  }

  campaignsGrid.innerHTML = `
    <div class="empty-state">
      <div class="tx-spinner" style="margin:0 auto 1rem;"></div>
      <p>Loading campaigns from Sepolia...</p>
    </div>
  `;

  try {
    const countBN = await contract.campaignCount();
    const count   = countBN.toNumber();
    allCampaigns  = [];
    let totalPledgedWei = ethers.BigNumber.from(0);

    for (let i = 0; i < count; i++) {
      const c         = await contract.campaigns(i);
      const milestones = await contract.getMilestones(i);
      const state      = await contract.getCampaignState(i);

      let userPledge = ethers.BigNumber.from(0);
      try {
        userPledge = await contract.totalCampaignContributions(i, userAddress);
      } catch (_) {}

      allCampaigns.push({
        id: c.id.toNumber(),
        creator: c.creator,
        title: c.title,
        description: c.description,
        goalWei: c.goal,
        goalEth: ethers.utils.formatEther(c.goal),
        totalPledgedWei: c.totalPledged,
        totalPledgedEth: ethers.utils.formatEther(c.totalPledged),
        deadline: Number(c.deadline),
        stalledTimeout: Number(c.stalledTimeout),
        currentMilestoneIndex: Number(c.currentMilestoneIndex),
        milestoneCount: Number(c.milestoneCount),
        goalReached: c.goalReached,
        closed: c.closed,
        state: Number(state),
        milestones: milestones,
        userPledge: userPledge
      });

      totalPledgedWei = totalPledgedWei.add(c.totalPledged);
    }

    if (totalCampaignsStat) totalCampaignsStat.textContent = count;
    if (totalPledgedStat) {
      totalPledgedStat.textContent =
        parseFloat(ethers.utils.formatEther(totalPledgedWei)).toFixed(4) + ' ETH';
    }

    renderCampaigns();

    // Refresh open details modal
    if (activeCampaignId !== null) {
      const updated = allCampaigns.find(c => c.id === activeCampaignId);
      if (updated) renderDetailsModal(updated);
    }
  } catch (err) {
    console.error('loadCampaigns error:', err);
    campaignsGrid.innerHTML = `
      <div class="empty-state">
        <div style="font-size:2.5rem; margin-bottom:0.8rem;">⚠️</div>
        <h3 style="color:var(--accent-rose);">Could Not Read Contract</h3>
        <p>${escapeHTML(parseContractError(err))}</p>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.4rem;">
          Check the contract address is correct and deployed on Sepolia.
        </p>
        <button class="btn btn-secondary" style="margin-top:1rem;" onclick="loadCampaigns()">
          ↻ Try Again
        </button>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// RENDER: CAMPAIGNS GRID
// ---------------------------------------------------------------------------
function renderCampaigns() {
  if (!campaignsGrid) return;
  const now = Math.floor(Date.now() / 1000);

  let filtered = allCampaigns;
  if (currentFilter === 'created' && userAddress) {
    filtered = allCampaigns.filter(c => c.creator.toLowerCase() === userAddress.toLowerCase());
  } else if (currentFilter === 'backed' && userAddress) {
    filtered = allCampaigns.filter(c => c.userPledge && c.userPledge.gt(0));
  }

  if (filtered.length === 0) {
    campaignsGrid.innerHTML = `
      <div class="empty-state">
        <div style="font-size:2.5rem; margin-bottom:0.6rem;">📭</div>
        <h3>${currentFilter === 'all' ? 'No Campaigns Yet' : 'None in this Filter'}</h3>
        <p>${currentFilter === 'all'
          ? 'Create the first campaign — it will be live on Sepolia!'
          : 'No campaigns match this filter for your wallet.'}</p>
        ${currentFilter === 'all'
          ? `<button class="btn btn-primary" style="margin-top:1rem;"
               onclick="document.getElementById('open-create-modal-btn').click()">
               + Create Campaign
             </button>` : ''}
      </div>
    `;
    return;
  }

  campaignsGrid.innerHTML = filtered.map(c => {
    const pct       = Math.min(100, (parseFloat(c.totalPledgedEth) / parseFloat(c.goalEth) * 100)).toFixed(1);
    const isExpired = now > c.deadline;
    const timeLeft  = getRemainingTime(c.deadline);

    let badgeClass = 'badge-funding';
    let stateLabel = '🟡 Funding Active';
    if (c.closed)      { badgeClass = 'badge-completed'; stateLabel = '✅ Completed'; }
    else if (c.goalReached) { badgeClass = 'badge-reached'; stateLabel = '🎯 Goal Reached'; }
    else if (isExpired)     { badgeClass = 'badge-failed';  stateLabel = '❌ Goal Failed'; }

    return `
      <div class="campaign-card">
        <div>
          <div class="campaign-card-header">
            <span class="campaign-badge ${badgeClass}">${stateLabel}</span>
            <span class="campaign-id">#${c.id}</span>
          </div>
          <h3 class="campaign-title">${escapeHTML(c.title)}</h3>
          <p class="campaign-description">${escapeHTML(c.description)}</p>

          <div class="progress-container">
            <div class="progress-info">
              <span class="progress-raised">${parseFloat(c.totalPledgedEth).toFixed(4)} ETH Raised</span>
              <span class="progress-goal">${pct}% of ${parseFloat(c.goalEth).toFixed(4)} ETH</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%;"></div>
            </div>
          </div>

          <div class="campaign-meta-row">
            <div class="meta-item">
              <span class="meta-label">Milestones</span>
              <span class="meta-value">${c.currentMilestoneIndex} / ${c.milestoneCount} Complete</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Time Remaining</span>
              <span class="meta-value">${timeLeft}</span>
            </div>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-primary" onclick="viewCampaignDetails(${c.id})">
            View Details &amp; Milestones
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// RENDER: CAMPAIGN DETAILS MODAL
// ---------------------------------------------------------------------------
function viewCampaignDetails(campaignId) {
  const campaign = allCampaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  activeCampaignId = campaignId;
  renderDetailsModal(campaign);
  campaignDetailsModal.classList.add('open');
}
window.viewCampaignDetails = viewCampaignDetails; // expose for inline onclick

function renderDetailsModal(campaign) {
  document.getElementById('modal-campaign-title').textContent = campaign.title;
  document.getElementById('modal-campaign-desc').textContent  = campaign.description;
  document.getElementById('modal-creator-address').textContent =
    'Creator: ' + truncateAddress(campaign.creator);
  document.getElementById('modal-goal-raised').textContent =
    parseFloat(campaign.totalPledgedEth).toFixed(4) + ' / ' +
    parseFloat(campaign.goalEth).toFixed(4) + ' ETH';

  // Role banner
  const roleBannerContainer = document.getElementById('modal-role-banner-container');
  let roleBannerHtml = '';
  if (userAddress && userAddress.toLowerCase() === campaign.creator.toLowerCase()) {
    roleBannerHtml = `
      <div class="user-role-banner role-creator">
        <span>👑 <strong>Creator View:</strong> You created this campaign.
          Submit proof for the active milestone when your work is done.</span>
      </div>
    `;
  }
  roleBannerContainer.innerHTML = roleBannerHtml;

  renderMilestonesList(campaign);

  // Failed-goal refund
  const now = Math.floor(Date.now() / 1000);
  const failedRefundSection = document.getElementById('failed-refund-section');
  const isFailedGoal = !campaign.goalReached && now > campaign.deadline;
  const userHasPledge = campaign.userPledge && campaign.userPledge.gt(0);
  if (isFailedGoal && userHasPledge) {
    failedRefundSection.style.display = 'block';
    const btn = document.getElementById('claim-failed-refund-btn');
    const cloned = btn.cloneNode(true); // remove old listeners
    btn.parentNode.replaceChild(cloned, btn);
    cloned.addEventListener('click', () => handleClaimFailedRefund(campaign.id));
  } else {
    failedRefundSection.style.display = 'none';
  }
}

function renderMilestonesList(campaign) {
  const container = document.getElementById('modal-milestones-timeline');
  if (!container) return;
  const now = Math.floor(Date.now() / 1000);

  container.innerHTML = campaign.milestones.map((m, idx) => {
    const targetEth = ethers.utils.formatEther(m.targetAmount);
    const fundedEth = ethers.utils.formatEther(m.fundedAmount);
    const pct = Math.min(100, (parseFloat(fundedEth) / parseFloat(targetEth) * 100)).toFixed(0);

    const isCompleted    = m.status === 3;
    const isCurrentActive =
      idx === campaign.currentMilestoneIndex && campaign.goalReached && !isCompleted;

    let itemClass = 'milestone-item';
    if (isCompleted)     itemClass += ' completed-milestone';
    else if (isCurrentActive) itemClass += ' active-milestone';

    let statusText = 'Awaiting prior milestones';
    if (isCompleted)           statusText = '✅ Approved & Funds Released';
    else if (m.status === 2)   statusText = '🔍 Proof Submitted — Awaiting Approval';
    else if (isCurrentActive)  statusText = '⚙️ Active — Work in Progress';
    else if (!campaign.goalReached) statusText = 'Target: ' + parseFloat(targetEth).toFixed(4) + ' ETH';

    const isCreator = userAddress &&
      userAddress.toLowerCase() === campaign.creator.toLowerCase();
    const isLargestBacker = userAddress &&
      m.largestContributor !== ethers.constants.AddressZero &&
      userAddress.toLowerCase() === m.largestContributor.toLowerCase();

    // Stall detection
    let isStalled   = false;
    const proofTime = Number(m.proofTimestamp);
    const startTime = Number(m.milestoneStartTimestamp);
    if (campaign.goalReached && !isCompleted) {
      if (m.status !== 2 && startTime > 0 && now > startTime + campaign.stalledTimeout) {
        isStalled = true;
      } else if (m.status === 2 && proofTime > 0 && now > proofTime + campaign.stalledTimeout) {
        isStalled = true;
      }
    }

    const fundingOpen = !campaign.goalReached &&
      now <= campaign.deadline && parseFloat(fundedEth) < parseFloat(targetEth);

    return `
      <div class="${itemClass}">
        <div class="milestone-header">
          <div class="milestone-title-badge">
            <span class="milestone-index-badge">${idx + 1}</span>
            <strong>${escapeHTML(m.description)}</strong>
          </div>
          <span class="milestone-target-text">
            ${parseFloat(fundedEth).toFixed(4)} / ${parseFloat(targetEth).toFixed(4)} ETH
          </span>
        </div>

        <div class="progress-track" style="margin-bottom:0.8rem;">
          <div class="progress-fill" style="width:${pct}%;"></div>
        </div>

        <div class="milestone-details-grid">
          <div>
            <span class="meta-label">Status</span>:
            <strong>${statusText}</strong>
          </div>
          <div>
            <span class="meta-label">Largest Backer</span>:
            ${m.largestContributor !== ethers.constants.AddressZero
              ? '<span title="' + m.largestContributor + '">' +
                truncateAddress(m.largestContributor) + ' (' +
                parseFloat(ethers.utils.formatEther(m.highestContribution)).toFixed(4) + ' ETH)</span>'
              : 'None yet'}
          </div>
          ${m.proofIpfsHash && m.proofIpfsHash.length > 0 ? `
            <div style="grid-column:1/-1;">
              <span class="meta-label">Proof of Work (IPFS CID)</span>:
              <a href="https://ipfs.io/ipfs/${m.proofIpfsHash}" target="_blank"
                style="color:var(--accent-cyan); font-family:var(--font-mono); word-break:break-all;">
                ${m.proofIpfsHash} ↗
              </a>
            </div>
          ` : ''}
        </div>

        <div class="milestone-actions">

          ${fundingOpen ? `
            <div style="display:flex; gap:0.5rem; align-items:center; width:100%; flex-wrap:wrap;">
              <input type="number" step="0.0001" min="0.0001"
                placeholder="Amount in ETH"
                id="pledge-input-${campaign.id}-${idx}"
                class="form-control" style="max-width:160px; padding:0.45rem 0.8rem;">
              <button class="btn btn-primary"
                onclick="handleFundMilestone(${campaign.id}, ${idx})">
                💰 Pledge to Milestone ${idx + 1}
              </button>
            </div>
          ` : ''}

          ${isCreator && isCurrentActive && m.status !== 2 ? `
            <div style="display:flex; gap:0.5rem; align-items:center; width:100%; flex-wrap:wrap;">
              <input type="text"
                placeholder="IPFS CID  e.g. QmXoypiz..."
                id="proof-input-${campaign.id}-${idx}"
                class="form-control" style="flex:1; padding:0.45rem 0.8rem;">
              <button class="btn btn-success"
                onclick="handleSubmitProof(${campaign.id}, ${idx})">
                📁 Submit Proof of Work
              </button>
            </div>
          ` : ''}

          ${isLargestBacker && isCurrentActive && m.status === 2 && !isCompleted ? `
            <div style="width:100%; background:rgba(16,185,129,0.12); padding:0.85rem;
              border-radius:var(--radius-sm); border:1px solid rgba(16,185,129,0.3);">
              <p style="font-size:0.84rem; color:#a7f3d0; margin-bottom:0.6rem;">
                ⭐ <strong>You are the Largest Contributor!</strong>
                Approving releases <strong>${parseFloat(fundedEth).toFixed(4)} ETH</strong>
                to the creator.
              </p>
              <button class="btn btn-success"
                onclick="handleApproveMilestone(${campaign.id}, ${idx})">
                ✔ Approve &amp; Release Funds
              </button>
            </div>
          ` : ''}

          ${isStalled && !isCompleted ? `
            <div style="width:100%; background:rgba(244,63,94,0.1); padding:0.85rem;
              border-radius:var(--radius-sm); border:1px solid rgba(244,63,94,0.3);">
              <p style="font-size:0.84rem; color:#fda4af; margin-bottom:0.5rem;">
                ⚠️ Milestone stalled past the inactivity timeout. Eligible backers can reclaim funds.
              </p>
              <button class="btn btn-danger"
                onclick="handleClaimStalledRefund(${campaign.id}, ${idx})">
                Claim Stalled Refund
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// GUARD: require wallet + Sepolia + contract before any tx
// ---------------------------------------------------------------------------
function requireLiveSession() {
  if (!userAddress) {
    showToast('Connect Wallet', 'Click "Connect MetaMask" first.', 'warning');
    return false;
  }
  if (!isOnSepolia()) {
    showToast('Wrong Network', 'Switch to Sepolia Testnet.', 'warning');
    return false;
  }
  if (!contract) {
    showToast('Contract Not Set', 'Set the deployed contract address in frontend/contractConfig.js and reload the page.', 'warning');
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------

// 1. Create Campaign
async function handleCreateCampaign(e) {
  e.preventDefault();
  if (!requireLiveSession()) return;

  const title          = document.getElementById('campaign-title-input').value.trim();
  const description    = document.getElementById('campaign-desc-input').value.trim();
  const durationMins   = parseInt(document.getElementById('campaign-duration-input').value);
  const timeoutSeconds = parseInt(document.getElementById('campaign-timeout-input').value);

  const descInputs   = document.querySelectorAll('.milestone-desc-input');
  const targetInputs = document.querySelectorAll('.milestone-target-input');

  if (descInputs.length === 0) {
    showToast('No Milestones', 'Add at least one milestone.', 'error');
    return;
  }

  const milestoneDescs   = [];
  const milestoneTargets = [];
  for (let i = 0; i < descInputs.length; i++) {
    const d = descInputs[i].value.trim();
    const t = targetInputs[i].value.trim();
    if (!d || !t || parseFloat(t) <= 0) {
      showToast('Validation Error', 'Fill description and ETH target for milestone ' + (i+1) + '.', 'error');
      return;
    }
    milestoneDescs.push(d);
    milestoneTargets.push(ethers.utils.parseEther(t));
  }

  const submitLabel = document.getElementById('submit-create-label');
  try {
    showTxOverlay('Waiting for MetaMask confirmation...');
    if (submitLabel) submitLabel.textContent = '⏳ Deploying...';

    const tx = await contract.createCampaign(
      title, description, durationMins * 60, timeoutSeconds, milestoneDescs, milestoneTargets
    );

    txOverlayMessage.textContent = 'Transaction mining on Sepolia...';
    txOverlayHash.textContent    = 'Tx: ' + tx.hash;

    await tx.wait();
    hideTxOverlay();

    showToast('Campaign Launched! 🚀', 'Now live on Sepolia testnet.', 'success');
    createCampaignModal.classList.remove('open');
    createCampaignForm.reset();
    resetMilestoneRows();
    await loadCampaigns();
  } catch (err) {
    hideTxOverlay();
    showToast('Transaction Failed', parseContractError(err), 'error');
    console.error('createCampaign error:', err);
  } finally {
    if (submitLabel) submitLabel.textContent = '🚀 Deploy Campaign to Escrow';
  }
}

// 2. Fund Milestone
function handleFundMilestone(campaignId, milestoneIndex) {
  if (!requireLiveSession()) return;
  const input     = document.getElementById('pledge-input-' + campaignId + '-' + milestoneIndex);
  const ethAmount = input ? input.value.trim() : '';
  if (!ethAmount || parseFloat(ethAmount) <= 0) {
    showToast('Invalid Amount', 'Enter a valid ETH amount to pledge.', 'error');
    return;
  }
  (async () => {
    try {
      const valueWei = ethers.utils.parseEther(ethAmount);
      showTxOverlay('Waiting for MetaMask confirmation...');
      const tx = await contract.fundMilestone(campaignId, milestoneIndex, { value: valueWei });
      txOverlayMessage.textContent = 'Transaction mining on Sepolia...';
      txOverlayHash.textContent    = 'Tx: ' + tx.hash;
      await tx.wait();
      hideTxOverlay();
      showToast('Pledge Confirmed! 🎉', ethAmount + ' ETH pledged to Milestone ' + (milestoneIndex + 1) + '.', 'success');
      await loadCampaigns();
    } catch (err) {
      hideTxOverlay();
      showToast('Pledge Failed', parseContractError(err), 'error');
      console.error('fundMilestone error:', err);
    }
  })();
}
window.handleFundMilestone = handleFundMilestone;

// 3. Submit Proof
function handleSubmitProof(campaignId, milestoneIndex) {
  if (!requireLiveSession()) return;
  const input = document.getElementById('proof-input-' + campaignId + '-' + milestoneIndex);
  const cid   = input ? input.value.trim() : '';
  if (!cid) {
    showToast('Missing IPFS CID', 'Enter an IPFS CID as proof of work.', 'error');
    return;
  }
  (async () => {
    try {
      showTxOverlay('Waiting for MetaMask confirmation...');
      const tx = await contract.submitProof(campaignId, milestoneIndex, cid);
      txOverlayMessage.textContent = 'Transaction mining on Sepolia...';
      txOverlayHash.textContent    = 'Tx: ' + tx.hash;
      await tx.wait();
      hideTxOverlay();
      showToast('Proof Submitted! 📁', 'IPFS proof stored on-chain.', 'success');
      await loadCampaigns();
    } catch (err) {
      hideTxOverlay();
      showToast('Submission Failed', parseContractError(err), 'error');
      console.error('submitProof error:', err);
    }
  })();
}
window.handleSubmitProof = handleSubmitProof;

// 4. Approve Milestone
function handleApproveMilestone(campaignId, milestoneIndex) {
  if (!requireLiveSession()) return;
  const campaign = allCampaigns.find(c => c.id === campaignId);
  const m        = campaign ? campaign.milestones[milestoneIndex] : null;
  const rel      = m ? parseFloat(ethers.utils.formatEther(m.fundedAmount)).toFixed(4) : '?';

  if (!confirm(
    'Approve Milestone ' + (milestoneIndex + 1) + '?\n\n' +
    'This will release ' + rel + ' ETH to the creator. This is irreversible.'
  )) return;

  (async () => {
    try {
      showTxOverlay('Waiting for MetaMask confirmation...');
      const tx = await contract.approveMilestone(campaignId, milestoneIndex);
      txOverlayMessage.textContent = 'Releasing funds on Sepolia...';
      txOverlayHash.textContent    = 'Tx: ' + tx.hash;
      await tx.wait();
      hideTxOverlay();
      showToast('Milestone Approved! 💰', 'Funds released to creator!', 'success');
      await loadCampaigns();
    } catch (err) {
      hideTxOverlay();
      showToast('Approval Failed', parseContractError(err), 'error');
      console.error('approveMilestone error:', err);
    }
  })();
}
window.handleApproveMilestone = handleApproveMilestone;

// 5. Claim Stalled Refund
function handleClaimStalledRefund(campaignId, milestoneIndex) {
  if (!requireLiveSession()) return;
  (async () => {
    try {
      showTxOverlay('Claiming refund — waiting for MetaMask...');
      const tx = await contract.claimStalledRefund(campaignId, milestoneIndex);
      txOverlayMessage.textContent = 'Refund processing on Sepolia...';
      txOverlayHash.textContent    = 'Tx: ' + tx.hash;
      await tx.wait();
      hideTxOverlay();
      showToast('Refund Claimed! 💸', 'ETH returned to your wallet.', 'success');
      await loadCampaigns();
    } catch (err) {
      hideTxOverlay();
      showToast('Claim Failed', parseContractError(err), 'error');
      console.error('claimStalledRefund error:', err);
    }
  })();
}
window.handleClaimStalledRefund = handleClaimStalledRefund;

// 6. Claim Failed-Goal Refund
async function handleClaimFailedRefund(campaignId) {
  if (!requireLiveSession()) return;
  try {
    showTxOverlay('Claiming refund — waiting for MetaMask...');
    const tx = await contract.claimFailedGoalRefund(campaignId);
    txOverlayMessage.textContent = 'Refund processing on Sepolia...';
    txOverlayHash.textContent    = 'Tx: ' + tx.hash;
    await tx.wait();
    hideTxOverlay();
    showToast('Refund Claimed! 💸', 'ETH pledge returned to your wallet.', 'success');
    await loadCampaigns();
  } catch (err) {
    hideTxOverlay();
    showToast('Claim Failed', parseContractError(err), 'error');
    console.error('claimFailedGoalRefund error:', err);
  }
}

// ---------------------------------------------------------------------------
// MILESTONE ROWS
// ---------------------------------------------------------------------------
function addMilestoneRow(desc, target) {
  desc   = desc   || '';
  target = target || '';
  const rowCount = milestonesContainer.querySelectorAll('.milestone-input-row').length;
  const row = document.createElement('div');
  row.className = 'milestone-input-row';
  row.innerHTML =
    '<input type="text" placeholder="Milestone ' + (rowCount + 1) + ' Deliverable"' +
      ' class="form-control milestone-desc-input" value="' + desc + '" required>' +
    '<input type="number" step="0.001" min="0.001" placeholder="Target ETH"' +
      ' class="form-control milestone-target-input" value="' + target + '" required>' +
    '<button type="button" class="btn-remove-row" title="Remove"' +
      ' onclick="this.parentElement.remove()">&#10005;</button>';
  milestonesContainer.appendChild(row);
}

function resetMilestoneRows() {
  if (milestonesContainer) {
    milestonesContainer.innerHTML = '';
    addMilestoneRow();
    addMilestoneRow();
  }
}

// ---------------------------------------------------------------------------
// TX OVERLAY
// ---------------------------------------------------------------------------
function showTxOverlay(message) {
  if (!txOverlay) return;
  txOverlayMessage.textContent = message || 'Waiting for MetaMask confirmation...';
  txOverlayHash.textContent    = '';
  txOverlay.style.display      = 'flex';
}
function hideTxOverlay() {
  if (txOverlay) txOverlay.style.display = 'none';
}

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------
function truncateAddress(addr) {
  if (!addr || addr.length < 10) return addr || '';
  return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

function getRemainingTime(deadlineSec) {
  const now  = Math.floor(Date.now() / 1000);
  const diff = deadlineSec - now;
  if (diff <= 0) return 'Ended';
  const days  = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins  = Math.floor((diff % 3600) / 60);
  if (days > 0)  return days + 'd ' + hours + 'h left';
  if (hours > 0) return hours + 'h ' + mins + 'm left';
  return mins + 'm left';
}

function parseContractError(err) {
  if (err && err.error && err.error.data && err.error.data.message) return err.error.data.message;
  if (err && err.data && err.data.message) return err.data.message;
  if (err && err.reason) return err.reason;
  const msg = (err && err.message) ? err.message : '';
  const m1  = msg.match(/reverted with reason string '([^']+)'/);
  if (m1) return m1[1];
  const m2  = msg.match(/execution reverted: ([^"]+)/);
  if (m2) return m2[1];
  if (err && err.code === 4001) return 'Transaction rejected by user.';
  return msg || 'Transaction failed.';
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function showToast(title, message, type) {
  type = type || 'info';
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML =
    '<div>' +
      '<div class="toast-title">' + title + '</div>' +
      '<div class="toast-message">' + escapeHTML(message) + '</div>' +
    '</div>';
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(function() { toast.remove(); }, 300);
  }, 5000);
}

// Expose loadCampaigns globally (used in inline onclick in error states)
window.loadCampaigns = loadCampaigns;
