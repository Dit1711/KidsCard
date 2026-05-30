export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700">💳 KidsCard</h1>
          <p className="text-gray-500 mt-1 text-sm">Семейные финансы</p>
        </div>
        {children}
      </div>
    </div>
  );
}
