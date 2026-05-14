type Item = { id: number; title: string; desc?: string };

export function ListView({ items }: { items: Item[] }) {
  if (!items.length) return <p className="text-sm text-gray-500">No results</p>;
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li
          key={it.id}
          className="p-3 border rounded flex items-center justify-between"
        >
          <div>
            <div className="font-medium">{it.title}</div>
            <div className="text-sm text-gray-600">{it.desc}</div>
          </div>
          <div className="text-sm text-gray-500">ID {it.id}</div>
        </li>
      ))}
    </ul>
  );
}

export function GridView({ items }: { items: Item[] }) {
  if (!items.length) return <p className="text-sm text-gray-500">No results</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((it) => (
        <div key={it.id} className="border rounded p-4 bg-white">
          <div className="font-medium mb-1">{it.title}</div>
          <div className="text-sm text-gray-600">{it.desc}</div>
        </div>
      ))}
    </div>
  );
}
