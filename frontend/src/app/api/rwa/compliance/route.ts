import { NextRequest, NextResponse } from 'next/server';
import { rwaContractClient } from '@/lib/contract';

// POST /api/rwa/compliance - Update compliance status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, status, requirements } = body;

    if (!assetId || !status) {
      return NextResponse.json(
        { success: false, error: 'Asset ID and status are required' },
        { status: 400 }
      );
    }

    // Connect to contract and update compliance
    await rwaContractClient.connect();
    const txHash = await rwaContractClient.updateComplianceStatus(
      assetId,
      status,
      requirements || {}
    );

    return NextResponse.json({
      success: true,
      message: 'Compliance status updated',
      data: {
        transactionHash: txHash,
        assetId,
        status,
      },
    });
  } catch (error: any) {
    console.error('Compliance Update Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/rwa/compliance - Check compliance for asset
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get('assetId');
    const investorAddress = searchParams.get('investorAddress');

    if (!assetId || !investorAddress) {
      return NextResponse.json(
        { success: false, error: 'Asset ID and investor address are required' },
        { status: 400 }
      );
    }

    // Connect to contract and check compliance
    await rwaContractClient.connect();
    const compliance = await rwaContractClient.checkCompliance(
      assetId,
      investorAddress
    );

    return NextResponse.json({
      success: true,
      data: compliance,
    });
  } catch (error: any) {
    console.error('Compliance Check Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}