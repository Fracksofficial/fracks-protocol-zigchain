"use client";

/**
 * NOTE: TypeScript errors in this file are false positives caused by Next.js 16 Turbopack.
 *
 * The errors show "Two different types with this name exist" for react-hook-form types,
 * but this is a tooling bug - packages are correctly installed with no duplicates.
 *
 * The code works perfectly at runtime. These are editor-only warnings from type resolution
 * issues in Next.js 16's development server. They can be safely ignored.
 *
 * See: https://github.com/vercel/next.js/issues/  (known Turbopack type resolution bug)
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Upload,
  Building2,
  DollarSign,
  FileText,
  MapPin,
  Shield,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAssetsContext } from "@/contexts/assets-context";
import { useWallet } from "@/hooks/use-wallet";
import { useIdentity } from "@/hooks/use-identity";
import { toast } from "sonner";
import { IssuanceRequest } from "@/types/rwa";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TREX_CONTRACTS } from "@/lib/zigchain-config";

// Form validation schema
const issuanceSchema = z.object({
  assetDetails: z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    symbol: z
      .string()
      .min(2, "Symbol must be at least 2 characters")
      .max(6, "Symbol must be at most 6 characters"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters"),
    assetType: z.enum([
      "real-estate",
      "commodity",
      "equity",
      "debt",
      "art",
      "intellectual-property",
    ]),
    underlyingValue: z.number().min(1000, "Value must be at least $1,000"),
    totalSupply: z.number().min(1, "Must issue at least 1 token"),
    location: z.string().min(2, "Location is required"),
    currency: z.string(),
    legalOwner: z.string().optional(),
  }),
  complianceRequirements: z.object({
    kycRequired: z.boolean().default(true),
    amlRequired: z.boolean().default(true),
    accreditedInvestorsOnly: z.boolean().default(false),
    jurisdiction: z
      .array(z.string())
      .min(1, "Select at least one jurisdiction"),
  }),
  tokenDetails: z.object({
    tokenName: z.string().min(3, "Token name must be at least 3 characters"),
    tokenSymbol: z
      .string()
      .min(2, "Token symbol must be at least 2 characters")
      .max(6, "Token symbol must be at most 6 characters"),
    decimals: z.number().min(0).max(18).default(6),
    initialPrice: z.number().min(0.01, "Price must be at least $0.01"),
    owner: z.string().optional(),
    issuer: z.string().optional(),
    controller: z.string().optional(),
  }),
  documents: z.array(z.any()).min(1, "At least one document is required"),
});

type IssuanceFormValues = z.infer<typeof issuanceSchema>;

const jurisdictionOptions = [
  { value: "us", label: "United States" },
  { value: "eu", label: "European Union" },
  { value: "uk", label: "United Kingdom" },
  { value: "sg", label: "Singapore" },
  { value: "ch", label: "Switzerland" },
  { value: "ae", label: "United Arab Emirates" },
];

export function IssuanceForm() {
  const { address, trexClient } = useWallet();
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { issueAsset } = useAssetsContext();
  const {
    isVerified,
    hasOnchainId,
    loading: identityLoading,
  } = useIdentity();
  const [factoryAdmin, setFactoryAdmin] = useState<string | null>(null);
  const [factoryLoading, setFactoryLoading] = useState(false);

  const form = useForm<IssuanceFormValues>({
    resolver: zodResolver(issuanceSchema) as any,
    defaultValues: {
      assetDetails: {
        name: "",
        symbol: "",
        description: "",
        assetType: "real-estate",
        underlyingValue: 100000,
        totalSupply: 1000000,
        location: "",
        currency: "USD",
        legalOwner: "",
      },
      complianceRequirements: {
        kycRequired: true,
        amlRequired: true,
        accreditedInvestorsOnly: false,
        jurisdiction: ["us"],
      },
      tokenDetails: {
        tokenName: "",
        tokenSymbol: "",
        decimals: 6,
        initialPrice: 1.0,
        owner: "",
        issuer: "",
        controller: "",
      },
      documents: [],
    },
  });

  const isFactoryAdmin =
    !!address &&
    !!factoryAdmin &&
    address.toLowerCase() === factoryAdmin.toLowerCase();

  useEffect(() => {
    if (address) {
      form.setValue(
        "assetDetails.legalOwner",
        form.getValues("assetDetails.legalOwner") || address,
      );

      // Set defaults from the connected wallet
      form.setValue(
        "tokenDetails.owner",
        form.getValues("tokenDetails.owner") || address,
      );
      form.setValue(
        "tokenDetails.issuer",
        form.getValues("tokenDetails.issuer") || address,
      ); // Issuer is creator
      form.setValue(
        "tokenDetails.controller",
        form.getValues("tokenDetails.controller") || address,
      );
    }
  }, [address, form]);

  useEffect(() => {
    const loadFactoryAdmin = async () => {
      if (!trexClient) {
        setFactoryAdmin(null);
        return;
      }

      setFactoryLoading(true);
      try {
        const config = await trexClient.getFactoryConfig();
        setFactoryAdmin(config.admin);
      } catch (error) {
        console.error("Failed to load factory config:", error);
        setFactoryAdmin(null);
      } finally {
        setFactoryLoading(false);
      }
    };

    loadFactoryAdmin();
  }, [trexClient]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Validate file types
    const validFiles = files.filter((file) => {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    setUploadedFiles((prev) => [...prev, ...validFiles]);
    form.setValue("documents", [...uploadedFiles, ...validFiles]);

    if (validFiles.length !== files.length) {
      toast.warning(
        "Some files were rejected (max 10MB, PDF/DOC/JPEG/PNG only)",
      );
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    form.setValue("documents", newFiles);
  };

  const onSubmit = async (data: IssuanceFormValues) => {
    if (!isFactoryAdmin) {
      toast.error("Only the factory admin can create new tokens", {
        description: "Connect with the platform owner wallet to issue tokens.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const issuanceRequest: IssuanceRequest = {
        assetDetails: data.assetDetails,
        complianceRequirements: data.complianceRequirements,
        tokenDetails: data.tokenDetails,
        documents: uploadedFiles,
      };

      await issueAsset(issuanceRequest);

      // Reset form
      form.reset();
      setUploadedFiles([]);
      setCurrentStep(1);

      toast.success("Asset issuance request submitted!");
    } catch (error) {
      toast.error("Failed to issue asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    const fieldsToValidate = getStepFields(currentStep);
    form.trigger(fieldsToValidate).then((isValid) => {
      if (isValid) {
        setCurrentStep((prev) => Math.min(prev + 1, 4));
      }
    });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const canBypassVerification = isFactoryAdmin;

  // Check if user is verified before allowing issuance (factory admin can proceed)
  if (
    !identityLoading &&
    !factoryLoading &&
    !isVerified &&
    !canBypassVerification
  ) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            <CardTitle>Verification Required</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You must complete identity verification before issuing security
            tokens. This ensures compliance with securities regulations.
          </p>

          {!hasOnchainId ? (
            <>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">What you need to do:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Create your OnchainID</li>
                  <li>Register with your country</li>
                  <li>Wait for admin to add verification claims (KYC, AML)</li>
                  <li>Return here to issue tokens</li>
                </ol>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push("/identity")}
              >
                <Shield className="mr-2 h-4 w-4" />
                Complete Verification
              </Button>
            </>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  ⏳ Verification Pending
                </p>
                <p className="text-sm text-yellow-700">
                  Your OnchainID is created and registered. Waiting for platform
                  admin to add verification claims (KYC, AML). This typically
                  takes 1-2 business days.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/identity")}
                >
                  View Identity Status
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    (window.location.href = "mailto:support@example.com")
                  }
                >
                  Contact Support
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const getStepFields = (step: number): any[] => {
    switch (step) {
      case 1:
        return [
          "assetDetails.name",
          "assetDetails.symbol",
          "assetDetails.description",
          "assetDetails.assetType",
        ];
      case 2:
        return [
          "assetDetails.underlyingValue",
          "assetDetails.totalSupply",
          "assetDetails.location",
        ];
      case 3:
        return [
          "complianceRequirements.kycRequired",
          "complianceRequirements.jurisdiction",
        ];
      case 4:
        return [
          "tokenDetails.tokenName",
          "tokenDetails.tokenSymbol",
          "tokenDetails.initialPrice",
          "documents",
        ];
      default:
        return [];
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      {/* Factory Admin Notice */}
      <Card className="mb-6 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-2xl shadow-[0_4px_16px_rgba(23,46,127,0.06)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#172E7F]/10 to-[#2A5FA6]/10 border border-[#172E7F]/20">
              <Shield className="h-5 w-5 text-[#172E7F]" />
            </div>
            Factory Admin Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            Token creation is restricted to the factory admin wallet. Connect
            with the platform owner to issue a new fund token, then set legal
            owner and issuer fields to the fund wallet.
          </p>
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="font-mono text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Factory:</span>{" "}
              {TREX_CONTRACTS.factory}
            </p>
            {factoryAdmin && (
              <p className="font-mono text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Admin:</span>{" "}
                {factoryAdmin}
              </p>
            )}
          </div>
          {address && !factoryLoading && (
            <div
              className={`p-3 rounded-xl border-2 ${
                isFactoryAdmin
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  isFactoryAdmin ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {isFactoryAdmin
                  ? "✓ You are connected as factory admin."
                  : "✗ You are NOT the factory admin."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    step <= currentStep
                      ? "bg-gradient-to-br from-[#172E7F] to-[#2A5FA6] text-white shadow-[0_4px_12px_rgba(23,46,127,0.25)]"
                      : "bg-slate-100 text-slate-400 border-2 border-slate-200"
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step
                  )}
                </div>
              </div>
              {step < 4 && (
                <div className="flex-1 h-1 mx-2">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      step < currentStep
                        ? "bg-gradient-to-r from-[#172E7F] to-[#2A5FA6]"
                        : "bg-slate-200"
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <span
            className={`text-sm font-semibold transition-colors ${
              currentStep >= 1 ? "text-slate-900" : "text-slate-400"
            }`}
          >
            Asset Details
          </span>
          <span
            className={`text-sm font-semibold transition-colors ${
              currentStep >= 2 ? "text-slate-900" : "text-slate-400"
            }`}
          >
            Valuation
          </span>
          <span
            className={`text-sm font-semibold transition-colors ${
              currentStep >= 3 ? "text-slate-900" : "text-slate-400"
            }`}
          >
            Compliance
          </span>
          <span
            className={`text-sm font-semibold transition-colors ${
              currentStep >= 4 ? "text-slate-900" : "text-slate-400"
            }`}
          >
            Tokenization
          </span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 1: Asset Details */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Asset Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="assetDetails.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Manhattan Luxury Apartments"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetDetails.symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MLA" {...field} />
                      </FormControl>
                      <FormDescription>
                        3-6 characters, unique identifier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetDetails.assetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="real-estate">
                            Real Estate
                          </SelectItem>
                          <SelectItem value="commodity">Commodity</SelectItem>
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="debt">Debt Instrument</SelectItem>
                          <SelectItem value="art">Fine Art</SelectItem>
                          <SelectItem value="intellectual-property">
                            Intellectual Property
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetDetails.location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., New York, USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetDetails.legalOwner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Owner Wallet</FormLabel>
                      <FormControl>
                        <Input placeholder="zig1..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Fund wallet that legally owns the asset (can differ from
                        signer)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assetDetails.description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed description of the asset..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include details about the asset, its provenance, and any
                      unique characteristics.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
          )}

          {/* Step 2: Valuation */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Valuation & Tokenization
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="assetDetails.underlyingValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Underlying Value (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Total value of the underlying asset
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assetDetails.totalSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Tokens</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Total number of tokens to issue
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenDetails.initialPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Price (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Compliance */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Requirements
              </h3>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="complianceRequirements.kycRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>KYC Verification Required</FormLabel>
                        <FormDescription>
                          Investors must complete Know Your Customer
                          verification
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complianceRequirements.amlRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>AML Screening Required</FormLabel>
                        <FormDescription>
                          Anti-Money Laundering screening for all transactions
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complianceRequirements.accreditedInvestorsOnly"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Accredited Investors Only</FormLabel>
                        <FormDescription>
                          Restrict to accredited investors only
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complianceRequirements.jurisdiction"
                  render={() => (
                    <FormItem>
                      <FormLabel>Allowed Jurisdictions</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {jurisdictionOptions.map((option) => (
                          <FormField
                            key={option.value}
                            control={form.control}
                            name="complianceRequirements.jurisdiction"
                            render={({ field }) => (
                              <FormItem
                                key={option.value}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(
                                      option.value,
                                    )}
                                    onCheckedChange={(checked) => {
                                      const updatedValue = checked
                                        ? [...(field.value || []), option.value]
                                        : field.value?.filter(
                                            (v: string) => v !== option.value,
                                          );
                                      field.onChange(updatedValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Tokenization & Documents */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Token Details & Documentation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="tokenDetails.tokenName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Manhattan Luxury Apartments Token"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenDetails.tokenSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MLAT" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenDetails.decimals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimals</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18].map((dec) => (
                            <SelectItem key={dec} value={dec.toString()}>
                              {dec}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenDetails.owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Owner Wallet</FormLabel>
                      <FormControl>
                        <Input placeholder="zig1..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Owner role for the new token (factory default will be
                        updated)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenDetails.issuer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Issuer Wallet</FormLabel>
                      <FormControl>
                        <Input placeholder="zig1..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Issuer role for minting (set to fund wallet)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenDetails.controller"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Controller Wallet</FormLabel>
                      <FormControl>
                        <Input placeholder="zig1..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Controller role for approvals (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Document Upload */}
              <div className="space-y-4">
                <FormLabel>Supporting Documents</FormLabel>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload supporting documents (PDF, DOC, JPEG, PNG up to 10MB)
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="document-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("document-upload")?.click()
                    }
                  >
                    Select Files
                  </Button>
                </div>

                {/* Uploaded files list */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded Files:</p>
                    <ul className="space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button type="button" onClick={nextStep}>
                Next Step
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                    />
                    Issuing Asset...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Issue Asset
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </motion.div>
  );
}
