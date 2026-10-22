export function FinishLine() {
  return (
    <div aria-hidden="true" className="grid h-full w-full grid-cols-2 grid-rows-6 overflow-hidden rounded-sm">
      {Array.from({ length: 12 }, (_, index) => {
        const dark = index % 2 === Math.floor(index / 2) % 2;
        return <span key={index} className={dark ? "bg-black" : "bg-white"} />;
      })}
    </div>
  );
}
