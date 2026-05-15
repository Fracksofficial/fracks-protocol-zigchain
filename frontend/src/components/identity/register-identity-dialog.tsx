'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

interface RegisterIdentityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: (country: string) => Promise<string>;
}

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
];

export function RegisterIdentityDialog({
  open,
  onOpenChange,
  onRegister,
}: RegisterIdentityDialogProps) {
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    setSubmitting(true);
    try {
      await onRegister(selectedCountry);
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Register Identity
          </DialogTitle>
          <DialogDescription>
            Select your country of residence to register your OnchainID in the Identity Registry.
            This is required for compliance verification.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="country">Country of Residence</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger id="country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Your country determines which securities regulations apply to you.
            </p>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">What happens next?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Your OnchainID is registered with your country</li>
              <li>You become visible to compliance validators</li>
              <li>Platform admin can add verification claims (KYC, AML)</li>
              <li>Once verified, you can trade security tokens</li>
            </ol>
          </div>

          <Button
            className="w-full"
            onClick={handleRegister}
            disabled={submitting}
          >
            {submitting ? 'Registering...' : 'Register Identity'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
