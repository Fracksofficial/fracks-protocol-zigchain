import { NextRequest, NextResponse } from 'next/server';
import { rwaContractClient } from '@/lib/contract';

// POST /api/rwa/mint - Mint tokens for an asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, recipient, amount } = body;

    if (!assetId || !recipient || !amount) {
      return NextResponse.json(
        { success: false, error: 'Asset ID, recipient, and amount are required' },
        { status: 400 }
      );
    }

    // Connect to contract and mint tokens
    await rwaContractClient.connect();
    const txHash = await rwaContractClient.mintTokens(
      assetId,
      recipient,
      amount
    );

    return NextResponse.json({
      success: true,
      message: 'Tokens minted successfully',
      data: {
        transactionHash: txHash,
        assetId,
        recipient,
        amount,
      },
    });
  } catch (error: any) {
    console.error('Token Minting Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}