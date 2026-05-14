"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

function Combobox({ children, items, ...props }: any) {
  return (
    <ComboboxPrimitive.Root data-slot="combobox" items={items} {...props}>
      {children}
    </ComboboxPrimitive.Root>
  );
}

function ComboboxTrigger({
  children,
  render: renderProp,
  className,
  ...props
}: any) {
  if (React.isValidElement(children) && !renderProp) {
    return (
      <ComboboxPrimitive.Trigger
        data-slot="combobox-trigger"
        render={children}
        className={cn(className)}
        {...props}
      />
    );
  }

  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      render={renderProp}
      className={cn(className)}
      {...props}
    />
  );
}

function ComboboxValue({ children, ...props }: any) {
  return (
    <ComboboxPrimitive.Value data-slot="combobox-value" {...props}>
      {children}
    </ComboboxPrimitive.Value>
  );
}

function ComboboxContent({
  className,
  side = "bottom",
  children,
  ...props
}: any) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        className="isolate z-50 outline-none"
        side={side}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "z-50 max-h-(--available-height) w-(--anchor-width) min-w-40 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl bg-popover p-1 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 duration-100 outline-none",
            className,
          )}
          {...props}
        >
          <ComboboxPrimitive.List
            data-slot="combobox-list"
            className="outline-none"
          >
            {children}
          </ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ children, className, ...props }: any) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(className)}
      {...props}
    >
      {children}
    </ComboboxPrimitive.List>
  );
}

function ComboboxGroup({ ...props }: any) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" {...props} />;
}

function ComboboxItem({ className, children, ...props }: any) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "group/combobox-item relative flex cursor-default items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        <ComboboxPrimitive.ItemIndicator>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
        </ComboboxPrimitive.ItemIndicator>
      </span>
    </ComboboxPrimitive.Item>
  );
}

export {
  Combobox,
  ComboboxContent,
  ComboboxGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
};
