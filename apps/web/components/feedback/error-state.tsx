type ErrorStateProps = {
  title: string;
  description?: string;
};

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-8" role="alert">
      <p className="text-sm font-medium text-danger">{title}</p>
      {description ? <p className="max-w-sm text-sm leading-6 text-muted">{description}</p> : null}
    </div>
  );
}
