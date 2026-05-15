import { TourStep } from '@/lib/tour-guide-manager';

/**
 * FIXED: Complete RWA Platform Tour Steps
 * Properly aligned with actual form field names and multi-step structure
 */

export const tourSteps: TourStep[] = [
  // =========================================
  // WELCOME & ONBOARDING
  // =========================================
  {
    id: 'welcome',
    title: 'Welcome to RWA Tokenization Platform',
    content: 'Learn to tokenize real-world assets with full regulatory compliance. This interactive guide will walk you through the complete workflow.',
    detailedContent: 'Real-World Asset (RWA) tokenization converts physical assets like real estate, commodities, or art into digital tokens on blockchain. This enables fractional ownership, 24/7 trading, and global accessibility while maintaining legal compliance through the ERC-3643 (T-REX) standard.',
    expertTip: 'This platform implements ERC-3643 for permissioned transfers. You can skip directly to "Issuance" if you\'re familiar with tokenization basics.',
    target: 'body',
    placement: 'auto',
    action: 'none',
    skippable: false,
  },

  // =========================================
  // WALLET CONNECTION
  // =========================================
  {
    id: 'wallet-connect',
    title: 'Step 1: Connect Your Wallet',
    content: 'Click "Connect Wallet" in the top right to link your Keplr or Leap wallet. This is required for all blockchain interactions.',
    detailedContent: 'Your wallet serves as your digital identity and signature authority. It stores your tokens, signs transactions, and proves ownership. Without connecting, you can only browse in read-only mode.',
    expertTip: 'Ensure you\'re on ZigChain Testnet (zig-test-2). Mainnet deployment requires proper KYC/AML compliance.',
    target: '[data-tour="wallet"]',
    placement: 'bottom',
    action: 'wallet-connect',
    requiredAction: true,
    validateAction: () => {
      // Check if wallet is connected by looking for wallet address display
      const walletButton = document.querySelector('[data-tour="wallet"]');
      const buttonText = walletButton?.textContent || '';
      return !buttonText.includes('Connect') && (buttonText.includes('zig') || buttonText.includes('...'));
    },
    skippable: false,
  },

  // =========================================
  // DASHBOARD OVERVIEW
  // =========================================
  {
    id: 'dashboard-stats',
    title: 'Dashboard Overview',
    content: 'View your portfolio metrics: Total Supply, Your Balance, Wallet ZIG balance for gas, and Compliance Status.',
    detailedContent: 'Total Supply shows all tokens minted across all your assets. Your Balance is tokens you currently own. Wallet ZIG is needed for transaction fees. Compliance Status must be "Verified" to trade tokens.',
    expertTip: 'Gas costs on ZigChain testnet are minimal. On mainnet, maintain sufficient ZIG for operations.',
    target: '[data-tour="stats"]',
    placement: 'bottom',
    action: 'none',
    prerequisites: ['wallet-connect'],
    skippable: true,
  },

  // =========================================
  // NAVIGATE TO ISSUANCE
  // =========================================
  {
    id: 'nav-to-issuance',
    title: 'Navigate to Issuance',
    content: 'Click "Issuance" in the navigation menu to start creating your security token.',
    detailedContent: 'Token issuance is where you define your asset, set compliance rules, and mint the initial tokens. This creates a new ERC-3643 compliant token contract on ZigChain.',
    expertTip: 'You can issue multiple asset types. Each gets its own dedicated smart contract with independent compliance rules.',
    target: '[data-tour="nav-issuance"]',
    placement: 'bottom',
    action: 'navigate',
    requiredAction: true,
    validateAction: () => {
      const path = window.location.pathname;
      return path === '/issuance' || path.includes('/issuance');
    },
    prerequisites: ['wallet-connect'],
    skippable: false,
  },

  // =========================================
  // FORM STEP 1: ASSET DETAILS
  // =========================================
  {
    id: 'form-step-1-intro',
    title: 'Issuance Form: 4 Steps',
    content: 'The issuance form has 4 steps: Asset Details → Valuation → Compliance → Tokenization. We\'ll guide you through each one.',
    detailedContent: 'You\'ll define what you\'re tokenizing, how much it\'s worth, who can trade it, and the token specifications. All fields are validated before submission.',
    expertTip: 'You can go back and edit previous steps before final submission. Data is saved in browser until you click "Create Token".',
    target: () => document.querySelector('form') || document.querySelector('[data-tour="issuance-form"]') || document.body,
    placement: 'top',
    action: 'none',
    prerequisites: ['nav-to-issuance'],
    skippable: true,
  },

  {
    id: 'asset-name',
    title: 'Enter Asset Name',
    content: 'Type a clear, descriptive name for your real-world asset (e.g., "Downtown Office Building" or "Gold Reserve Fund"). Minimum 3 characters.',
    detailedContent: 'This is the human-readable name that investors will see. Make it professional and descriptive. It appears in all documentation, transaction history, and investor portals.',
    expertTip: 'Best practice: Include location or unique identifier in the name for easy recognition.',
    target: () => {
      // React Hook Form name attribute
      return document.querySelector('input[name="assetDetails.name"]') ||
             document.querySelector('[placeholder*="Manhattan Luxury" i]') ||
             document.querySelector('label:has-text("Asset Name") + input');
    },
    placement: 'right',
    action: 'input',
    requiredAction: true,
    validateAction: () => {
      const input = document.querySelector('input[name="assetDetails.name"]') as HTMLInputElement;
      const value = input?.value || '';
      console.log('[Tour Debug] Asset name:', value, 'Length:', value.length);
      return value.length >= 3;
    },
    prerequisites: ['form-step-1-intro'],
    skippable: false,
  },

  {
    id: 'asset-symbol',
    title: 'Set Asset Symbol',
    content: 'Enter a SHORT ticker symbol (2-6 letters) like "DTOB" or "MLA". This is used for quick identification.',
    detailedContent: 'The asset symbol is like a stock ticker (AAPL, TSLA). Must be unique. Used internally for tracking and references. Different from the token symbol you\'ll set later.',
    expertTip: 'Convention: Use first letters of asset name. Check uniqueness before proceeding.',
    target: () => {
      return document.querySelector('input[name="assetDetails.symbol"]') ||
             document.querySelector('[placeholder*="MLA" i]');
    },
    placement: 'right',
    action: 'input',
    requiredAction: true,
    validateAction: () => {
      const input = document.querySelector('input[name="assetDetails.symbol"]') as HTMLInputElement;
      const value = input?.value || '';
      console.log('[Tour Debug] Asset symbol:', value, 'Length:', value.length);
      return value.length >= 2 && value.length <= 6;
    },
    prerequisites: ['asset-name'],
    skippable: false,
  },

  {
    id: 'asset-type',
    title: 'Select Asset Type',
    content: 'Choose the category that best describes your asset: Real Estate, Commodity, Equity, Debt, Art, or IP.',
    detailedContent: 'Asset type determines default compliance requirements and investor disclosures. Real Estate typically requires property appraisals. Commodities may require storage verification. Equities need corporate documentation.',
    expertTip: 'This affects regulatory classification. Consult legal counsel for complex assets.',
    target: () => {
      return document.querySelector('select[name="assetDetails.assetType"]') ||
             document.querySelector('[role="combobox"]') ||
             document.querySelector('label:has-text("Asset Type") + button');
    },
    placement: 'right',
    action: 'select',
    requiredAction: false, // Has default value
    prerequisites: ['asset-symbol'],
    skippable: true,
  },

  {
    id: 'asset-description',
    title: 'Describe Your Asset',
    content: 'Write a detailed description (minimum 10 characters). Include key features, location details, and unique characteristics.',
    detailedContent: 'This description appears in investor materials. Be thorough but concise. Include: Physical address, Size/quantity, Condition/quality, Legal status, Income potential (if applicable).',
    expertTip: 'More detail = more investor confidence. Link to external documentation if available.',
    target: () => {
      return document.querySelector('textarea[name="assetDetails.description"]');
    },
    placement: 'top',
    action: 'input',
    requiredAction: true,
    validateAction: () => {
      const textarea = document.querySelector('textarea[name="assetDetails.description"]') as HTMLTextAreaElement;
      const value = textarea?.value || '';
      console.log('[Tour Debug] Description length:', value.length);
      return value.length >= 10;
    },
    prerequisites: ['asset-type'],
    skippable: false,
  },

  {
    id: 'asset-location',
    title: 'Specify Location',
    content: 'Enter the geographic location of your asset (e.g., "New York, USA" or "London, UK").',
    detailedContent: 'Location affects legal jurisdiction, tax treatment, and investor eligibility. For digital/IP assets, use company headquarters or registration location.',
    expertTip: 'Some jurisdictions have specific tokenization regulations. Verify compliance before proceeding.',
    target: () => {
      return document.querySelector('input[name="assetDetails.location"]');
    },
    placement: 'right',
    action: 'input',
    requiredAction: true,
    validateAction: () => {
      const input = document.querySelector('input[name="assetDetails.location"]') as HTMLInputElement;
      const value = input?.value || '';
      console.log('[Tour Debug] Location:', value);
      return value.length >= 2;
    },
    prerequisites: ['asset-description'],
    skippable: false,
  },

  {
    id: 'form-step-1-next',
    title: 'Continue to Step 2: Valuation',
    content: 'Click "Next" at the bottom of the form to proceed to asset valuation.',
    detailedContent: 'The form validates all required fields before allowing you to continue. Fix any errors shown in red before clicking Next.',
    expertTip: 'You can come back and edit Step 1 later if needed.',
    target: () => {
      // Find Next button (likely at bottom of form)
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Next')) || buttons[buttons.length - 1];
    },
    placement: 'top',
    action: 'click',
    requiredAction: true,
    validateAction: () => {
      // Check if we're on step 2 (valuation fields are visible)
      const valuationField = document.querySelector('input[name="assetDetails.underlyingValue"]');
      console.log('[Tour Debug] Step 2 visible:', !!valuationField);
      return !!valuationField;
    },
    prerequisites: ['asset-location'],
    skippable: false,
  },

  // =========================================
  // FORM STEP 2: VALUATION
  // =========================================
  {
    id: 'underlying-value',
    title: 'Enter Asset Value (USD)',
    content: 'Input the total USD value of your underlying asset. Minimum $1,000. This determines the token price.',
    detailedContent: 'This should be the current market value or professional appraisal. For real estate, use recent appraisal. For commodities, use current market price × quantity. Affects token pricing and investor confidence.',
    expertTip: 'Professional appraisal recommended for assets > $100k. Include appraisal documentation in Step 4.',
    target: () => {
      return document.querySelector('input[name="assetDetails.underlyingValue"]');
    },
    placement: 'right',
    action: 'input',
    requiredAction: true,
    validateAction: () => {
      const input = document.querySelector('input[name="assetDetails.underlyingValue"]') as HTMLInputElement;
      const value = parseFloat(input?.value || '0');
      console.log('[Tour Debug] Underlying value:', value);
      return value >= 1000;
    },
    prerequisites: ['form-step-1-next'],
    skippable: false,
  },

  {
    id: 'total-supply',
    title: 'Define Total Token Supply',
    content: 'Enter how many tokens to create (minimum 1). More tokens = smaller per-token price and better divisibility.',
    detailedContent: 'Example: $1M asset with 1,000 tokens = $1,000/token. With 1,000,000 tokens = $1/token. Higher supply enables smaller minimum investments. Consider your target investor profile.',
    expertTip: 'Account for decimals later. With 6 decimals and 1M supply, actual max is 1,000,000.000000 tokens.',
    target: () => {
      return document.querySelector('input[name="assetDetails.totalSupply"]');
    },
    placement: 'right',
    action: 'input',
    requiredAction: true,
    validateAction: () => {
      const input = document.querySelector('input[name="assetDetails.totalSupply"]') as HTMLInputElement;
      const value = parseInt(input?.value || '0');
      console.log('[Tour Debug] Total supply:', value);
      return value >= 1;
    },
    prerequisites: ['underlying-value'],
    skippable: false,
  },

  {
    id: 'initial-price',
    title: 'Set Initial Token Price',
    content: 'Enter the initial price per token in USD (minimum $0.01). Auto-calculated based on value ÷ supply.',
    detailedContent: 'Token price = Underlying Value ÷ Total Supply. This is the initial offering price. Secondary market price may differ based on supply/demand.',
    expertTip: 'Price can be updated later with governance approval, but initial price sets the baseline.',
    target: () => {
      return document.querySelector('input[name="tokenDetails.initialPrice"]');
    },
    placement: 'right',
    action: 'input',
    requiredAction: true,
    validateAction: () => {
      const input = document.querySelector('input[name="tokenDetails.initialPrice"]') as HTMLInputElement;
      const value = parseFloat(input?.value || '0');
      console.log('[Tour Debug] Initial price:', value);
      return value >= 0.01;
    },
    prerequisites: ['total-supply'],
    skippable: false,
  },

  {
    id: 'form-step-2-next',
    title: 'Continue to Step 3: Compliance',
    content: 'Click "Next" to proceed to compliance configuration.',
    detailedContent: 'Valuation is locked once submitted. Ensure all values are accurate before proceeding.',
    expertTip: 'Double-check math: Token price should = Value ÷ Supply.',
    target: () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Next')) || null;
    },
    placement: 'top',
    action: 'click',
    requiredAction: true,
    validateAction: () => {
      // Check if compliance checkboxes are visible
      const kycCheckbox = document.querySelector('input[name="complianceRequirements.kycRequired"]');
      console.log('[Tour Debug] Step 3 (compliance) visible:', !!kycCheckbox);
      return !!kycCheckbox;
    },
    prerequisites: ['initial-price'],
    skippable: false,
  },

  // =========================================
  // FORM STEP 3: COMPLIANCE
  // =========================================
  {
    id: 'compliance-kyc',
    title: 'KYC Requirement',
    content: 'Toggle KYC (Know Your Customer) verification. Recommended: Keep enabled for security tokens.',
    detailedContent: 'KYC verifies investor identity. Required by most jurisdictions for security tokens. Disabling allows anonymous trading but may violate regulations.',
    expertTip: 'ERC-3643 enforces KYC at smart contract level. Non-KYC addresses cannot receive tokens.',
    target: () => {
      return document.querySelector('input[name="complianceRequirements.kycRequired"]');
    },
    placement: 'right',
    action: 'click',
    requiredAction: false, // Optional toggle
    prerequisites: ['form-step-2-next'],
    skippable: true,
  },

  {
    id: 'compliance-jurisdictions',
    title: 'Select Allowed Jurisdictions',
    content: 'Check all countries/regions where investors can legally purchase your token. Minimum one required.',
    detailedContent: 'Jurisdiction determines legal framework, tax treatment, and investor protection rules. Consult legal counsel for multi-jurisdiction offerings.',
    expertTip: 'More jurisdictions = larger investor pool but increased compliance complexity.',
    target: () => {
      return document.querySelector('input[name="complianceRequirements.jurisdiction"]') ||
             document.querySelector('label:has-text("Allowed Jurisdictions")');
    },
    placement: 'top',
    action: 'click',
    requiredAction: true,
    validateAction: () => {
      const checkboxes = document.querySelectorAll('input[name="complianceRequirements.jurisdiction"]:checked');
      console.log('[Tour Debug] Jurisdictions selected:', checkboxes.length);
      return checkboxes.length >= 1;
    },
    prerequisites: ['compliance-kyc'],
    skippable: false,
  },

  {
    id: 'form-step-3-next',
    title: 'Continue to Step 4: Token Details',
    content: 'Click "Next" to proceed to final token configuration.',
    detailedContent: 'Compliance rules are enforced at smart contract level and cannot be changed after deployment.',
    expertTip: 'Review all compliance settings carefully before proceeding.',
    target: () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.includes('Next')) || null;
    },
    placement: 'top',
    action: 'click',
    requiredAction: true,
    validateAction: () => {
      // Check if token details fields are visible
      const tokenNameField = document.querySelector('input[name="tokenDetails.tokenName"]');
      console.log('[Tour Debug] Step 4 (token details) visible:', !!tokenNameField);
      return !!tokenNameField;
    },
    prerequisites: ['compliance-jurisdictions'],
    skippable: false,
  },

  // =========================================
  // FORM STEP 4: TOKEN DETAILS
  // =========================================
  {
    id: 'token-name',
    title: 'Enter Token Name',
    content: 'Type the full name for your blockchain token (e.g., "Manhattan Luxury Apartments Token"). Minimum 3 characters.',
    detailedContent: 'Token name appears in wallets, explorers, and trading interfaces. Often same as asset name + "Token". Make it clear and professional.',
    expertTip: 'Standard format: "[Asset Name] Token" or "[Asset Name] Security Token".',
    target: () => {
      return document.querySelector('input[name="tokenDetails.tokenName"]');
    },
    placement: 'right',
    action: 'input',
    requiredAction: true,
    validateAction: () => {
      const input = document.querySelector('input[name="tokenDetails.tokenName"]') as HTMLInputElement;
      const value = input?.value || '';
      console.log('[Tour Debug] Token name:', value);
      return value.length >= 3;
    },
    prerequisites: ['form-step-3-next'],
    skippable: false,
  },

  {
    id: 'token-symbol',
    title: 'Set Token Symbol',
    content: 'Enter a 2-6 letter ticker for your TOKEN (e.g., "MLAT" for Manhattan Luxury Apartments Token).',
    detailedContent: 'This is the BLOCKCHAIN symbol that appears in wallets and exchanges. Different from asset symbol. Must be unique on-chain. Cannot be changed after deployment.',
    expertTip: 'Convention: Add "T" suffix to asset symbol (MLA → MLAT) to indicate token version.',
    target: () => {
      return document.querySelector('input[name="tokenDetails.tokenSymbol"]');
    },
    placement: 'right',
    action: 'input',
    requiredAction: true,
    validateAction: () => {
      const input = document.querySelector('input[name="tokenDetails.tokenSymbol"]') as HTMLInputElement;
      const value = input?.value || '';
      console.log('[Tour Debug] Token symbol:', value, 'Length:', value.length);
      return value.length >= 2 && value.length <= 6;
    },
    prerequisites: ['token-name'],
    skippable: false,
  },

  {
    id: 'token-decimals',
    title: 'Set Decimal Precision',
    content: 'Choose decimal places (0-18). Recommended: 6 for real estate, 18 for highly divisible assets.',
    detailedContent: 'Decimals enable fractional ownership. With 6 decimals, investors can own 0.000001 tokens. More decimals = more precision but slightly higher gas costs. Standard is 18 (like ETH), but 6-8 is common for RWA.',
    expertTip: 'Cannot change after deployment. Consider minimum investment amounts when choosing decimals.',
    target: () => {
      return document.querySelector('select[name="tokenDetails.decimals"]') ||
             document.querySelector('[role="combobox"]') ||
             document.querySelector('label:has-text("Decimals") + button');
    },
    placement: 'right',
    action: 'select',
    requiredAction: false, // Has default value
    prerequisites: ['token-symbol'],
    skippable: true,
  },

  {
    id: 'document-upload',
    title: 'Upload Supporting Documents',
    content: 'Upload legal documents, appraisals, ownership proof, etc. (PDF, DOC, JPEG, PNG up to 10MB). Minimum 1 document required.',
    detailedContent: 'Required documents typically include: Property deed/title, Professional appraisal, Legal opinions, Corporate resolutions, KYC/AML policies. More documentation = higher investor confidence.',
    expertTip: 'Hash of documents is stored on-chain for verification. Keep originals in secure storage.',
    target: () => {
      return document.querySelector('input[type="file"]') ||
             document.querySelector('#document-upload') ||
             document.querySelector('button:has-text("Select Files")');
    },
    placement: 'top',
    action: 'click',
    requiredAction: true,
    validateAction: () => {
      // Check if any files are shown in the upload list
      const fileList = document.querySelector('[class*="uploadedFiles"]') || 
                       document.querySelector('ul:has(li)');
      console.log('[Tour Debug] Files uploaded:', !!fileList);
      return !!fileList && fileList.children.length > 0;
    },
    prerequisites: ['token-decimals'],
    skippable: false,
  },

  // =========================================
  // FINAL SUBMISSION
  // =========================================
  {
    id: 'submit-issuance',
    title: 'Deploy Your Security Token',
    content: 'Click "Create Token" to deploy to ZigChain blockchain. You\'ll see a wallet popup requesting approval.',
    detailedContent: 'This submits your token contract for deployment. Keplr/Leap will popup requesting transaction signature. A small gas fee (~0.01 ZIG) will be charged. Wait for blockchain confirmation (~5-10 seconds). Transaction is irreversible once confirmed.',
    expertTip: 'Transaction hash will be shown. Save it for reference. You can view contract on explorer after deployment.',
    target: () => {
      return document.querySelector('button[type="submit"]') ||
             document.querySelector('button:has-text("Create Token")') ||
             document.querySelector('[data-action="submit-issuance"]');
    },
    placement: 'top',
    action: 'form-submit',
    requiredAction: true,
    validateAction: () => {
      // Check if transaction was submitted (form disabled or success message)
      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      const isDisabled = submitButton?.disabled;
      const successMessage = document.querySelector('[class*="success"]') || 
                            document.querySelector('[role="status"]');
      console.log('[Tour Debug] Submit disabled:', isDisabled, 'Success message:', !!successMessage);
      return !!(isDisabled || successMessage);
    },
    prerequisites: ['document-upload'],
    skippable: false,
  },

  // =========================================
  // POST-ISSUANCE NAVIGATION
  // =========================================
  {
    id: 'nav-to-assets',
    title: 'View Your Tokenized Assets',
    content: 'Click "Assets" in the navigation to see your portfolio of created tokens.',
    detailedContent: 'The Assets page displays all tokens you\'ve created or own. Each shows current value, total supply, tokenization progress, compliance status, and performance metrics.',
    expertTip: 'Assets page also shows secondary market activity and recent transactions.',
    target: '[data-tour="nav-assets"]',
    placement: 'bottom',
    action: 'navigate',
    requiredAction: false,
    validateAction: () => {
      const path = window.location.pathname;
      return path === '/assets' || path.includes('/assets');
    },
    prerequisites: ['submit-issuance'],
    skippable: true,
  },

  {
    id: 'nav-to-compliance',
    title: 'Configure Compliance Rules',
    content: 'Click "Compliance" to set up advanced KYC/AML requirements and transfer restrictions.',
    detailedContent: 'Unlike regular crypto, security tokens MUST enforce compliance. Here you configure: Transfer restrictions, Investor whitelists, Jurisdiction limits, KYC verification levels, Claim topics (credentials). Only verified addresses can trade your tokens.',
    expertTip: 'ERC-3643 enforces these rules at smart contract level. Non-compliant transfers automatically revert.',
    target: '[data-tour="nav-compliance"]',
    placement: 'bottom',
    action: 'navigate',
    requiredAction: false,
    validateAction: () => {
      const path = window.location.pathname;
      return path === '/compliance' || path.includes('/compliance');
    },
    prerequisites: ['submit-issuance'],
    skippable: true,
  },

  {
    id: 'nav-to-manage',
    title: 'Token Management & Operations',
    content: 'Click "Manage" to access token admin controls: transfers, minting, freezing, pausing.',
    detailedContent: 'Management panel provides: Transfer to verified investors, Mint additional tokens (if not capped), Freeze/unfreeze suspicious accounts, Pause contract in emergencies, Update identity claims, Manage operator roles.',
    expertTip: 'Role-based access control: Only token owner/agent has admin privileges. Delegate roles carefully.',
    target: '[data-tour="nav-manage"]',
    placement: 'bottom',
    action: 'navigate',
    requiredAction: false,
    validateAction: () => {
      const path = window.location.pathname;
      return path === '/transfer' || path.includes('/transfer');
    },
    prerequisites: ['submit-issuance'],
    skippable: true,
  },

  // =========================================
  // COMPLETION
  // =========================================
  {
    id: 'tour-complete',
    title: '🎉 Tour Complete!',
    content: 'Congratulations! You now understand the complete RWA tokenization workflow. Ready to tokenize real-world assets with full regulatory compliance!',
    detailedContent: 'You\'ve learned:\n✅ Wallet connection and identity\n✅ Multi-step token issuance process\n✅ Asset valuation and token economics\n✅ Compliance configuration (KYC/AML)\n✅ Token deployment to blockchain\n✅ Post-issuance management\n\nYou can now create compliant security tokens, configure compliance rules, transfer to verified investors, and manage your tokenized portfolio.',
    expertTip: 'Next steps for production:\n1. Deploy on mainnet with proper legal structure\n2. Integrate KYC provider (Persona, Onfido, etc.)\n3. Set up investor onboarding portal\n4. Configure secondary trading (if applicable)\n5. Implement ongoing compliance monitoring',
    target: 'body',
    placement: 'auto',
    action: 'none',
    skippable: false,
    prerequisites: ['submit-issuance'],
  },
];

/**
 * Tour pathways for different user experience levels
 */
export const tourPathways = {
  // Complete beginner flow - all steps
  beginner: tourSteps.map(s => s.id),
  
  // Intermediate - skip intros and optional steps
  intermediate: tourSteps.filter(s => 
    !['dashboard-stats', 'form-step-1-intro', 'asset-type', 'compliance-kyc', 'token-decimals'].includes(s.id)
  ).map(s => s.id),
  
  // Expert - only critical path
  expert: [
    'welcome',
    'wallet-connect',
    'nav-to-issuance',
    'asset-name',
    'asset-symbol',
    'asset-description',
    'asset-location',
    'form-step-1-next',
    'underlying-value',
    'total-supply',
    'form-step-2-next',
    'compliance-jurisdictions',
    'form-step-3-next',
    'token-name',
    'token-symbol',
    'document-upload',
    'submit-issuance',
    'tour-complete'
  ],
};
