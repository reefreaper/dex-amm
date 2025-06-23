
const Loading = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-800">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600">Loading blockchain data...</p>
    </div>
  )
}

export default Loading;
