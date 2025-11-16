"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(
  undefined
);

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const Select = ({ value, onValueChange, disabled, children }: SelectProps) => {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (open) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  return (
    <SelectContext.Provider
      value={{ value, onValueChange, open, onOpenChange: setOpen, disabled }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (!context.disabled) {
          context.onOpenChange(!context.open);
        }
      }}
      disabled={context.disabled}
      {...props}
    >
      {children}
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({
  placeholder,
}: {
  placeholder?: string;
}) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  return <span>{context.value || placeholder}</span>;
};

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within Select");

  if (!context.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md top-full mt-1",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      <div className="p-1 max-h-[300px] overflow-auto">{children}</div>
    </div>
  );
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within Select");

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        context.value === value && "bg-accent",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        context.onValueChange(value);
        context.onOpenChange(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
});
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };

