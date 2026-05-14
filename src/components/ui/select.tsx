"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Select as SelectPrimitive } from "@base-ui/react/select";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

function Select({ children, items, ...props }: any) {
  return (
    <SelectPrimitive.Root data-slot="select" items={items} {...props}>
      {children}
    </SelectPrimitive.Root>
  );
}

function SelectTrigger({
  children,
  render: renderProp,
  className,
  ...props
}: any) {
  // When a single element child is provided and no explicit `render` prop,
  // forward it to the primitive to avoid nested native buttons.
  if (React.isValidElement(children) && !renderProp) {
    return (
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        render={children}
        className={cn(className)}
        {...props}
      />
    );
  }

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      render={renderProp}
      className={cn(className)}
      {...props}
    />
  );
}

function SelectValue({ children, ...props }: any) {
  return (
    <SelectPrimitive.Value data-slot="select-value" {...props}>
      {children}
    </SelectPrimitive.Value>
  );
}

function SelectContent({
  className,
  side = "bottom",
  alignItemWithTrigger = true,
  ...props
}: any) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="isolate z-50 outline-none"
        side={side}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "z-50 max-h-(--available-height) w-(--anchor-width) min-w-40 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl bg-popover p-1 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 duration-100 outline-none",
            className,
          )}
          {...props}
        />
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectGroup({ ...props }: any) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectItem({ className, children, ...props }: any) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "group/select-item relative flex cursor-default items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
};
