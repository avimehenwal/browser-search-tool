import React from "react";

type Props = {
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export default function Card({
  title,
  children,
  footer,
  className = "",
}: Props) {
  return (
    <div
      className={`border rounded-lg p-4 shadow-sm bg-background text-foreground ${className}`}
    >
      {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
      <div className="mt-2">{children}</div>
      {footer ? (
        <div className="mt-4 text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  );
}
