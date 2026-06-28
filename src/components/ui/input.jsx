import { cn } from "@/lib/utils";

function Input({ className, type, value, ...props }) {
  const isControlled = value !== undefined || props.onChange !== undefined;
  const inputProps = {};
  if (isControlled) {
    inputProps.value = value === undefined ? "" : value;
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-zinc-400 dark:placeholder:text-zinc-500 selection:bg-primary selection:text-primary-foreground bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-zinc-300 dark:border-zinc-700 flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...inputProps}
      {...props}
    />
  );
}

export { Input };
