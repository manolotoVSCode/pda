export default function DonePage() {
  return (
    <div className="text-center space-y-4 py-12">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-slate-800">Evaluación completada</h1>
      <p className="text-slate-500 text-sm max-w-xs mx-auto">
        Gracias por tu tiempo. Tus respuestas han sido registradas correctamente.
        Puedes cerrar esta ventana.
      </p>
    </div>
  )
}
