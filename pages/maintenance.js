export default function Maintenance() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50 text-blue-900 p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-blue-100 p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-2xl">🛠️</span>
        </div>
        <h1 className="text-3xl font-bold mb-3">We’ll be back soon</h1>
        <p className="text-blue-700 leading-relaxed">
          We’re doing a quick tune‑up to keep things running smoothly. Thanks for your patience!
        </p>
        <div className="mt-6 text-sm text-blue-700">
          Need to reach us?
          <div className="mt-1">
            <a className="underline hover:text-blue-600" href="mailto:washlabs.ca@gmail.com">washlabs.ca@gmail.com</a>
            <span className="mx-2">•</span>
            <a className="underline hover:text-blue-600" href="tel:+17828275010">+1 (782) 827-5010</a>
          </div>
        </div>
      </div>
    </main>
  );
}
