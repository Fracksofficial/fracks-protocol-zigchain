"use client";

import { apiFetch } from "@/lib/backend";

export type KycStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export interface KycApplication {
  id: string;
  walletAddress: string;
  email?: string | null;
  fullName: string;
  dateOfBirth?: string | null;
  nationality: string;
  country: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  phoneNumber?: string | null;
  idDocumentUrl?: string | null;
  proofOfAddressUrl?: string | null;
  selfieUrl?: string | null;
  status: KycStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
  onchainIdAddress?: string | null;
  onchainIdCreated?: boolean;
  notes?: string | null;
  riskScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKycApplicationPayload {
  walletAddress: string;
  email?: string;
  fullName: string;
  dateOfBirth?: string;
  nationality: string;
  country: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  phoneNumber?: string;
  idDocumentUrl?: string;
  proofOfAddressUrl?: string;
  selfieUrl?: string;
}

export async function createKycApplication(
  payload: CreateKycApplicationPayload
): Promise<KycApplication> {
  return apiFetch<KycApplication>("/kyc/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getKycApplicationByWallet(
  walletAddress: string
): Promise<KycApplication | null> {
  try {
    return await apiFetch<KycApplication>(
      `/kyc/applications/wallet/${walletAddress}`
    );
  } catch {
    return null;
  }
}

export async function listKycApplications(params?: {
  status?: KycStatus;
  limit?: number;
  offset?: number;
}): Promise<KycApplication[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  const qs = search.toString();
  return apiFetch<KycApplication[]>(`/kyc/applications${qs ? `?${qs}` : ""}`);
}

export async function approveKycApplication(
  id: string,
  payload: { reviewedBy: string; notes?: string; onchainIdAddress?: string }
): Promise<KycApplication> {
  return apiFetch<KycApplication>(`/kyc/applications/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function rejectKycApplication(
  id: string,
  payload: { reviewedBy: string; rejectionReason: string; notes?: string }
): Promise<KycApplication> {
  return apiFetch<KycApplication>(`/kyc/applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
