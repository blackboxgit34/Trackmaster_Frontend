"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface FuelDeclarationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HIDE_KEY = 'hideFuelDeclarationUntil';

const FuelDeclarationDialog = ({ open, onOpenChange }: FuelDeclarationDialogProps) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    if (dontShowAgain) {
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const hideUntil = Date.now() + twentyFourHours;
      localStorage.setItem(HIDE_KEY, String(hideUntil));
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            Declaration
          </DialogTitle>
          <DialogDescription className="pt-4 text-left text-foreground space-y-3">
            <p>
              1. Fuel Graphical Report is more accurate than tabular report. So always verify fuel filling and theft report through Graphical Report.
            </p>
            <p>
              2. Tank Fuel Level may vary with tyre pressure, load in the vehicle and vehicle standing position. Also vary with atmospheric temperature changes.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox id="dont-show-again" checked={dontShowAgain} onCheckedChange={(checked) => setDontShowAgain(!!checked)} />
          <Label htmlFor="dont-show-again" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Don't show again for 24 hours
          </Label>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full">I Understand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FuelDeclarationDialog;