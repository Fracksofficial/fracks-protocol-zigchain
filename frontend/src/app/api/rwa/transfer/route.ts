import { NextRequest, NextResponse } from 'next/server';
import { rwaContractClient } from '@/lib/contract';

// POST /api/rwa/transfer - Transfer tokens
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, from, to, amount } = body;

    if (!assetId || !from || !to || !amount) {
      return NextResponse.json(
        { success: false, error: 'All transfer parameters are required' },
        { status: 400 }
      );
    }

    // Note: In production, you'd need proper authentication for 'from'
    // For demo, we assume the caller is authorized

    // Connect to contract and transfer tokens
    await rwaContractClient.connect();
    const txHash = await rwaContractClient.transferTokens(
      assetId,
      to,
      amount
    );

    return NextResponse.json({
      success: true,
      message: 'Tokens transferred successfully',
      data: {
        transactionHash: txHash,
        assetId,
        from,
        to,
        amount,
      },
    });
  } catch (error: any) {
    console.error('Token Transfer Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}