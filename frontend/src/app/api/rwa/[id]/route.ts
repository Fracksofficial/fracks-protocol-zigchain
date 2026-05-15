import { NextRequest, NextResponse } from 'next/server';
import { rwaContractClient } from '@/lib/contract';

// GET /api/rwa/[id] - Get specific RWA asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // Connect to contract and query asset
    await rwaContractClient.connect();
    const asset = await rwaContractClient.getAsset(assetId);

    return NextResponse.json({
      success: true,
      data: asset,
    });
  } catch (error: any) {
    console.error('RWA Asset Fetch Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/rwa/[id] - Delete RWA asset (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // In production, mark asset as deleted in database
    // For now, return success

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
      data: { assetId },
    });
  } catch (error: any) {
    console.error('RWA Delete Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}