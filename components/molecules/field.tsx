import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useId } from "react";

type FieldProps = React.ComponentProps<"input"> & {
  label: string;
};

const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, id, className, ...props }, ref) => {
    const randomId = useId();
    const inputId = id || `field-${randomId}`;

    return (
      <div className="space-y-2">
        <label htmlFor={inputId} className="font-medium leading-none">
          {label}
        </label>
        <Input id={inputId} ref={ref} className={cn(className)} {...props} />
      </div>
    );
  }
);

Field.displayName = "Field";

export { Field };
