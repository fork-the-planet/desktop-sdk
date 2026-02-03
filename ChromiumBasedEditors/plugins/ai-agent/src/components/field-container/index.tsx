import { useDirection } from "@/hooks/useDirection";
import { cn } from "@/lib/utils";

type FieldContainerProps = {
  children: React.ReactNode;
  header: string;
  error?: string;
};

const FieldContainer = ({ children, header, error }: FieldContainerProps) => {
  const { isRTL } = useDirection();

  return (
    <div className={cn("flex flex-col gap-[4px]", isRTL ? "items-end" : "")}>
      <p
        className={cn(
          "select-none text-[14px] leading-[20px] text-[var(--field-container-header-color)]",
          isRTL ? "text-end" : ""
        )}
      >
        {header}
      </p>
      {children}
      {error && (
        <p
          className={cn(
            "text-[var(--field-container-error-color)]",
            isRTL ? "text-end" : ""
          )}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export { FieldContainer };
