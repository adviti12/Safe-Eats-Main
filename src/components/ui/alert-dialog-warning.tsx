
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface AllergenWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warnings: string[];
}

export function AllergenWarningDialog({
  open,
  onOpenChange,
  warnings,
}: AllergenWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-red-300 shadow-lg animate-pulse-slow max-w-md mx-auto">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center animate-bounce">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-red-600 text-xl">
            Allergen Alert!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center mt-2 mb-4">
            This product contains allergens that may be harmful to you:
          </AlertDialogDescription>
          <div className="bg-red-50 rounded-lg p-3 my-2 border border-red-200">
            <ul className="space-y-2">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start text-red-600">
                  <span className="inline-block w-5 h-5 bg-red-200 rounded-full text-center text-red-700 mr-2 flex-shrink-0 font-bold">
                    !
                  </span>
                  <span className="font-medium">{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white">
            I Understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
