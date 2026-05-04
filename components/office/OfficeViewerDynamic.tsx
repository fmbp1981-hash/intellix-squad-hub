import dynamic from 'next/dynamic'

export const OfficeViewerDynamic = dynamic(
  () => import('./OfficeViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <p className="text-gray-500 text-sm animate-pulse">Carregando escritório...</p>
      </div>
    ),
  }
)
