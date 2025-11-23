"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextType {
  closeMenu: () => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(
  null
);

interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

const DropdownMenu = React.forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ children, trigger, align = "right", className }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLDivElement>(null);

    const closeMenu = React.useCallback(() => {
      setIsOpen(false);
    }, []);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("keydown", handleEscape);
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }, [isOpen]);

    return (
      <DropdownMenuContext.Provider value={{ closeMenu }}>
        <div ref={ref} className={cn("relative", className)}>
          <div
            ref={triggerRef}
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsOpen(!isOpen);
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            {trigger}
          </div>
          {isOpen && (
            <div
              ref={menuRef}
              className={cn(
                "absolute z-50 mt-2 min-w-[200px] rounded-md border bg-white dark:bg-gray-800 shadow-lg flex flex-col",
                align === "right" ? "right-0" : "left-0"
              )}
              role="menu"
            >
              {children}
            </div>
          )}
        </div>
      </DropdownMenuContext.Provider>
    );
  }
);

DropdownMenu.displayName = "DropdownMenu";

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  asChild?: boolean;
}

const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(({ children, onClick, className, asChild, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);

  const handleClick = () => {
    onClick?.();
    context?.closeMenu();
  };

  if (asChild && React.isValidElement(children)) {
    const originalOnClick = (children.props as any)?.onClick;
    return React.cloneElement(children, {
      ...props,
      onClick: (e: React.MouseEvent) => {
        originalOnClick?.(e);
        context?.closeMenu();
      },
      className: cn(
        "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none",
        className
      ),
    });
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={cn(
        "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none",
        className
      )}
      role="menuitem"
      {...props}
    >
      {children}
    </button>
  );
});

DropdownMenuItem.displayName = "DropdownMenuItem";

export { DropdownMenu, DropdownMenuItem };

