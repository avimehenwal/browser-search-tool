import PrototypeShowcase from "../../../components/prototype/PrototypeShowcase";

export default function Page() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">shadcn Prototype</h1>
        <PrototypeShowcase />
      </div>
    </main>
  );
}
