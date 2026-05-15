import { TourStep } from '@/lib/tour-guide-professional';

/**
 * PROFESSIONAL RWA PLATFORM TOUR
 * Following Nielsen Norman Group Guidelines
 * 
 * All steps are NON-BLOCKING:
 * - Users can skip any step
 * - Navigation buttons always enabled
 * - Hints provided but never enforced
 * - Brief, helpful microcontent
 */

export const professionalTourSteps: TourStep[] = [
  // =========================================
  // WELCOME
  // =========================================
  {
    id: 'welcome',
    title: 'Welcome to RWA Tokenization',
    content: 'Tokenize real-world assets with full regulatory compliance. Skip or follow along at your own pace.',
    detailedContent: 'This platform converts physical assets (real estate, commodities, art) into digital tokens using ERC-3643 standard. You maintain full control—skip, revisit, or explore freely.',
    expertTip: 'ERC-3643 (T-REX) provides permissioned transfers with on-chain compliance. Built on ZigChain for low costs.',
    target: 'body',
    placement: 'auto',
    skippable: true,
  },

  // =========================================
  // WALLET CONNECTION
  // =========================================
  {
    id: 'connect-wallet',
    title: 'Connect Your Wallet',
    content: 'Click "Connect Wallet" to get started. MetaMask or Keplr recommended.',
    detailedContent: 'Your wallet stores tokens and signs transactions. We support MetaMask, Keplr, and other Ethereum-compatible wallets. Connection is secure—only you control your assets.',
    expertTip: 'ZigChain testnet: Use testnet ZIG for gas. Mainnet: Ensure sufficient ZIG balance before operations.',
    target: '[data-tour="connect-wallet"]',
    placement: 'bottom',
    hint: 'Click "Connect Wallet" button to proceed',
    checkCompletion: () => {
      // Optional hint - never blocks
      const walletBtn = document.querySelector('[data-tour="connect-wallet"]');
      return !walletBtn?.textContent?.includes('Connect');
    },
    skippable: true,
  },

  // =========================================
  // DASHBOARD
  // =========================================
  {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    content: 'View your portfolio: Total Supply, Balance, Gas (ZIG), and Compliance Status.',
    detailedContent: 'Total Supply: All tokens minted. Your Balance: Tokens you own. Wallet ZIG: Gas for transactions. Compliance: Must be "Verified" to trade.',
    expertTip: 'Gas costs are minimal on testnet. Mainnet requires ZIG for all contract interactions.',
    target: '[data-tour="stats"]',
    placement: 'bottom',
    skippable: true,
  },

  // =========================================
  // NAVIGATION TO ISSUANCE
  // =========================================
  {
    id: 'nav-issuance',
    title: 'Start Token Issuance',
    content: 'Click "Issuance" to create your security token.',
    detailedContent: 'Token issuance defines your asset, sets compliance rules, and mints tokens. Each asset gets its own ERC-3643 smart contract.',
    expertTip: 'You can issue multiple assets with independent compliance rules.',
    target: '[data-tour="nav-issuance"]',
    placement: 'bottom',
    hint: 'Click "Issuance" in the navigation menu',
    checkCompletion: () => {
      return window.location.pathname.includes('/issuance');
    },
    skippable: true,
  },

  // =========================================
  // ISSUANCE FORM INTRODUCTION
  // =========================================
  {
    id: 'issuance-intro',
    title: 'Issuance Form: 4 Steps',
    content: 'Complete 4 steps: Asset Details → Valuation → Compliance → Tokenization.',
    detailedContent: 'Define what you\'re tokenizing, its value, who can trade, and token specifications. You can go back and edit at any time.',
    expertTip: 'Data is saved locally until you submit. No blockchain transaction until final "Create Token".',
    target: () => document.querySelector('form') || document.querySelector('[data-tour="issuance-form"]') || document.body,
    placement: 'top',
    skippable: true,
  },

  // =========================================
  // STEP 1: ASSET DETAILS
  // =========================================
  {
    id: 'asset-name',
    title: 'Asset Name',
    content: 'Enter a descriptive name for your asset (e.g., "Downtown Office Building").',
    detailedContent: 'This is the full legal name of the asset you\'re tokenizing. It appears in all documentation and on the blockchain.',
    expertTip: 'Use clear, professional naming. This is visible to investors and regulators.',
    target: () => document.querySelector('input[name="assetName"]') || document.querySelector('input[placeholder*="name" i]'),
    placement: 'bottom',
    hint: 'Recommended: 3+ words, descriptive (e.g., "Manhattan Office Complex")',
    checkCompletion: () => {
      const input = document.querySelector<HTMLInputElement>('input[name="assetName"]');
      return input ? input.value.trim().length >= 5 : false;
    },
    skippable: true,
  },

  {
    id: 'asset-type',
    title: 'Asset Type',
    content: 'Select your asset category: Real Estate, Commodities, Art, or Other.',
    detailedContent: 'Asset type determines applicable regulations and compliance requirements. Choose the category that best fits your tokenized asset.',
    expertTip: 'Different jurisdictions have varying rules per asset type. Consult legal counsel for securities classification.',
    target: () => document.querySelector('select[name="assetType"]') || document.querySelector('[data-tour="asset-type"]'),
    placement: 'bottom',
    skippable: true,
  },

  {
    id: 'asset-description',
    title: 'Asset Description',
    content: 'Provide a detailed description of the asset.',
    detailedContent: 'Include key details: location, size, condition, unique features. This helps investors understand what they\'re buying.',
    expertTip: 'Good descriptions improve investor confidence. Include verifiable facts, avoid marketing hype.',
    target: () => document.querySelector('textarea[name="description"]') || document.querySelector('textarea'),
    placement: 'bottom',
    hint: 'Recommended: 50+ characters, include key details',
    checkCompletion: () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="description"]');
      return textarea ? textarea.value.trim().length >= 20 : false;
    },
    skippable: true,
  },

  {
    id: 'asset-documents',
    title: 'Upload Documents',
    content: 'Upload appraisals, legal docs, photos (optional but recommended).',
    detailedContent: 'Supporting documents build trust. Common uploads: property deed, appraisal report, inspection reports, photos. Stored securely.',
    expertTip: 'IPFS or encrypted storage recommended for sensitive documents. Never expose private data on public blockchain.',
    target: () => document.querySelector('input[type="file"]') || document.querySelector('[data-tour="documents"]'),
    placement: 'top',
    skippable: true,
  },

  // =========================================
  // STEP 2: VALUATION
  // =========================================
  {
    id: 'asset-value',
    title: 'Asset Valuation',
    content: 'Enter the total asset value in USD.',
    detailedContent: 'This is the fair market value of your asset. Professional appraisal recommended. Determines token pricing.',
    expertTip: 'Use third-party appraisal for credibility. Over/undervaluation can trigger regulatory scrutiny.',
    target: () => document.querySelector('input[name="assetValue"]') || document.querySelector('input[type="number"]'),
    placement: 'bottom',
    hint: 'Enter value in USD (e.g., 1000000 for $1M)',
    checkCompletion: () => {
      const input = document.querySelector<HTMLInputElement>('input[name="assetValue"]');
      return input ? parseFloat(input.value) > 0 : false;
    },
    skippable: true,
  },

  {
    id: 'token-supply',
    title: 'Total Token Supply',
    content: 'Set how many tokens to mint (determines fractional ownership).',
    detailedContent: 'Example: $1M asset ÷ 1000 tokens = $1000 per token. More tokens = smaller fractions, lower price per unit.',
    expertTip: 'Consider investor psychology: 1000 tokens at $1000 vs 1,000,000 at $1. Both represent same value.',
    target: () => document.querySelector('input[name="totalSupply"]') || document.querySelector('input[placeholder*="supply" i]'),
    placement: 'bottom',
    hint: 'Common values: 1000, 10000, 100000',
    checkCompletion: () => {
      const input = document.querySelector<HTMLInputElement>('input[name="totalSupply"]');
      return input ? parseFloat(input.value) > 0 : false;
    },
    skippable: true,
  },

  // =========================================
  // STEP 3: COMPLIANCE
  // =========================================
  {
    id: 'compliance-intro',
    title: 'Compliance Rules',
    content: 'Set who can trade your tokens (KYC, country restrictions, investor limits).',
    detailedContent: 'ERC-3643 enforces rules at smart contract level. Configure KYC requirements, geographic restrictions, and transfer limits.',
    expertTip: 'Compliance rules are immutable post-deployment. Plan carefully. Use Trusted Issuers Registry for KYC providers.',
    target: () => document.querySelector('[data-tour="compliance"]') || document.body,
    placement: 'auto',
    skippable: true,
  },

  {
    id: 'kyc-required',
    title: 'KYC Requirement',
    content: 'Enable KYC to restrict trading to verified investors only.',
    detailedContent: 'Know Your Customer (KYC) verifies investor identity. Required for most security tokens. Enforced on-chain via Identity Registry.',
    expertTip: 'Integrate with KYC provider (e.g., Synaps, Fractal ID). Claim topics define verification levels.',
    target: () => document.querySelector('input[name="kycRequired"]') || document.querySelector('[data-tour="kyc"]'),
    placement: 'bottom',
    skippable: true,
  },

  {
    id: 'country-restrictions',
    title: 'Country Restrictions',
    content: 'Block or allow specific countries based on regulations.',
    detailedContent: 'Example: US securities laws require registration or exemption. You might restrict US investors or comply with Reg D, Reg S.',
    expertTip: 'Consult legal counsel. Each country has different securities laws. ERC-3643 enforces at transfer time.',
    target: () => document.querySelector('[data-tour="countries"]') || document.querySelector('select[multiple]'),
    placement: 'bottom',
    skippable: true,
  },

  {
    id: 'transfer-limits',
    title: 'Transfer Limits',
    content: 'Set daily transfer limits per investor (anti-money laundering).',
    detailedContent: 'Example: Max 1000 tokens per day per address. Prevents wash trading and rapid dumping. AML best practice.',
    expertTip: 'Balance liquidity vs security. Too restrictive = poor user experience. Too loose = regulatory risk.',
    target: () => document.querySelector('input[name="transferLimit"]') || document.querySelector('[data-tour="limits"]'),
    placement: 'bottom',
    skippable: true,
  },

  // =========================================
  // STEP 4: TOKENIZATION
  // =========================================
  {
    id: 'token-name',
    title: 'Token Name',
    content: 'Enter your token\'s full name (e.g., "Downtown Office Building Token").',
    detailedContent: 'This appears in wallets and explorers. Should match or relate to asset name for clarity.',
    expertTip: 'Standard format: "[Asset Name] Token" or "[Asset Name] Security Token".',
    target: () => document.querySelector('input[name="tokenName"]') || document.querySelector('input[placeholder*="token name" i]'),
    placement: 'bottom',
    hint: 'Recommended: Include "Token" in name for clarity',
    checkCompletion: () => {
      const input = document.querySelector<HTMLInputElement>('input[name="tokenName"]');
      return input ? input.value.trim().length >= 3 : false;
    },
    skippable: true,
  },

  {
    id: 'token-symbol',
    title: 'Token Symbol',
    content: 'Enter a trading symbol (e.g., PROP, EST, REIT). 2-5 characters, uppercase.',
    detailedContent: 'Token ticker for exchanges and wallets. Common examples: PROP (property), EST (estate), REIT (real estate investment trust).',
    expertTip: 'Check existing tokens to avoid confusion. Symbols are not unique on-chain but should be distinctive.',
    target: () => document.querySelector('input[name="symbol"]') || document.querySelector('input[placeholder*="symbol" i]'),
    placement: 'bottom',
    hint: 'Best practice: 3-4 uppercase letters (e.g., PROP, REIT)',
    checkCompletion: () => {
      const input = document.querySelector<HTMLInputElement>('input[name="symbol"]');
      return input ? input.value.trim().length >= 2 && input.value.trim().length <= 5 : false;
    },
    skippable: true,
  },

  {
    id: 'token-decimals',
    title: 'Token Decimals',
    content: 'Set decimal places (18 is standard for Ethereum-compatible tokens).',
    detailedContent: 'Decimals allow fractional tokens. 18 decimals = 1.000000000000000000 (same as ETH). Lower decimals = whole numbers only.',
    expertTip: 'Use 18 unless you have specific reason. Reduces confusion with other tokens and DeFi integrations.',
    target: () => document.querySelector('input[name="decimals"]') || document.querySelector('[data-tour="decimals"]'),
    placement: 'bottom',
    skippable: true,
  },

  // =========================================
  // SUBMISSION
  // =========================================
  {
    id: 'review-submit',
    title: 'Review and Submit',
    content: 'Review all details before creating your token on the blockchain.',
    detailedContent: 'Double-check all fields. Blockchain deployment is permanent—you cannot change token name, symbol, or supply after creation.',
    expertTip: 'Deployment costs gas (ZIG). Testnet: free. Mainnet: ~0.01-0.1 ZIG depending on network congestion.',
    target: () => document.querySelector('button[type="submit"]') || document.querySelector('[data-tour="submit"]'),
    placement: 'top',
    hint: 'Click "Create Token" when ready',
    checkCompletion: () => false, // Never auto-complete submission
    skippable: true,
  },

  // =========================================
  // POST-ISSUANCE
  // =========================================
  {
    id: 'token-created',
    title: 'Token Created Successfully!',
    content: 'Your security token is now live on ZigChain. View it on the Tokens page.',
    detailedContent: 'Your ERC-3643 compliant token is deployed. You can now manage compliance, add agents, and distribute tokens to verified investors.',
    expertTip: 'Next steps: Configure Trusted Issuers, set up Claim Topics, add Compliance Agents for ongoing management.',
    target: '[data-tour="nav-tokens"]',
    placement: 'bottom',
    skippable: true,
  },

  // =========================================
  // TOKENS PAGE
  // =========================================
  {
    id: 'nav-tokens',
    title: 'View Your Tokens',
    content: 'Click "Tokens" to see all your security tokens.',
    detailedContent: 'Tokens page shows all your issued tokens, their status, supply, and compliance metrics.',
    expertTip: 'You can manage each token independently: update compliance, mint more tokens (if allowed), or freeze transfers.',
    target: '[data-tour="nav-tokens"]',
    placement: 'bottom',
    skippable: true,
  },

  {
    id: 'token-list',
    title: 'Your Token Portfolio',
    content: 'All your issued tokens appear here with key metrics.',
    detailedContent: 'Each card shows: Token name, symbol, total supply, your balance, compliance status, and management options.',
    expertTip: 'Click any token to see detailed analytics, holder list, and transfer history.',
    target: () => document.querySelector('[data-tour="token-card"]') || document.querySelector('.token-card'),
    placement: 'bottom',
    skippable: true,
  },

  // =========================================
  // TRANSFERS
  // =========================================
  {
    id: 'nav-transfer',
    title: 'Transfer Tokens',
    content: 'Click "Transfer" to send tokens to verified investors.',
    detailedContent: 'Transfers are validated against compliance rules. Recipient must pass KYC, country checks, and transfer limits.',
    expertTip: 'Failed transfers show specific reason: KYC not verified, country blocked, limit exceeded, etc.',
    target: '[data-tour="nav-transfer"]',
    placement: 'bottom',
    skippable: true,
  },

  {
    id: 'transfer-form',
    title: 'Transfer Form',
    content: 'Enter recipient address, select token, and specify amount.',
    detailedContent: 'The form validates recipient compliance before allowing transfer. On-chain validation happens at transaction time.',
    expertTip: 'Use "Check Eligibility" feature to verify recipient before sending. Saves gas on failed transfers.',
    target: () => document.querySelector('[data-tour="transfer-form"]') || document.querySelector('form'),
    placement: 'top',
    skippable: true,
  },

  // =========================================
  // COMPLETION
  // =========================================
  {
    id: 'tour-complete',
    title: 'Tour Complete! 🎉',
    content: 'You\'re ready to tokenize real-world assets with full regulatory compliance.',
    detailedContent: 'You\'ve learned token issuance, compliance setup, and transfers. Explore the platform—you can replay this tour anytime from settings.',
    expertTip: 'Join our community: Discord for support, GitHub for code, docs for deep dives into ERC-3643 standard.',
    target: 'body',
    placement: 'auto',
    skippable: false,
  },
];
