import { NextRequest, NextResponse } from 'next/server';
import { rwaContractClient } from '@/lib/contract';

/**
 * WARNING: This API route contains mock data and is NOT connected to the smart contract.
 * The actual asset data is managed client-side through TrexClient via shared contexts.
 * This route is deprecated and should either be:
 * 1. Removed entirely (assets are managed via TrexClient directly)
 * 2. Updated to use an indexer/subgraph for better performance
 * 3. Converted to a server-side caching layer
 */

// GET /api/rwa - List all RWA assets
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // In production, you would query from your database
    // For now, return mock data or connect to contract
    const mockAssets = [
      {
        id: '1',
        name: 'Manhattan Luxury Apartments',
        type: 'real-estate',
        value: 25000000,
        complianceStatus: 'compliant',
        tokenizedAmount: 12500000,
        totalSupply: 25000000,
        apy: 8.5,
        location: 'New York, USA',
        issuer: 'Goldman Sachs',
      },
      // Add more mock data...
    ];

    return NextResponse.json({
      success: true,
      data: mockAssets,
      pagination: {
        total: mockAssets.length,
        limit,
        offset,
        hasMore: offset + limit < mockAssets.length,
      },
    });
  } catch (error: any) {
    console.error('RWA API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/rwa - Create new RWA asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'symbol', 'totalSupply', 'underlyingValue'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Connect to contract and register asset
    await rwaContractClient.connect();
    
    const metadata = {
      description: body.description || '',
      asset_type: body.assetType || 'real-estate',
      underlying_value: body.underlyingValue,
      currency: body.currency || 'USD',
      location: body.location || '',
      kyc_required: body.kycRequired !== false,
      aml_required: body.amlRequired !== false,
      accredited_only: body.accreditedInvestorsOnly || false,
      jurisdiction: body.jurisdiction || ['us'],
      issuance_date: Date.now(),
    };

    const txHash = await rwaContractClient.registerAsset({
      name: body.name,
      symbol: body.symbol,
      totalSupply: body.totalSupply,
      decimals: body.decimals || 6,
      metadata,
    });

    return NextResponse.json({
      success: true,
      message: 'Asset created successfully',
      data: {
        transactionHash: txHash,
        assetId: `RWA-${Date.now()}`,
      },
    });
  } catch (error: any) {
    console.error('RWA Creation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/rwa - Update RWA asset
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, updates } = body;

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // In production, update asset in database
    // For now, return success

    return NextResponse.json({
      success: true,
      message: 'Asset updated successfully',
      data: { assetId, updates },
    });
  } catch (error: any) {
    console.error('RWA Update Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
