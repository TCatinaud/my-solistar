import { useState } from 'react'
import axios from 'axios'
import { ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

const DataUpload = () => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setResult(null)
    } else {
      setFile(null)
      alert('Veuillez sélectionner un fichier CSV')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('/api/data/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setResult(response.data)
      setFile(null)
    } catch (error) {
      setResult({
        message: 'Erreur lors de l\'upload',
        error: error.response?.data?.error || error.message,
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Importer des données
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Importez vos données énergétiques à partir d'un fichier CSV
        </p>
      </div>

      {/* Format CSV */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Format du fichier CSV</h3>
        <p className="text-sm text-blue-700 mb-4">
          Votre fichier CSV doit contenir les colonnes suivantes :
        </p>
        <div className="bg-white rounded-md p-4 font-mono text-sm">
          <div className="text-gray-700">
            <strong>timestamp,category,value,unit,notes</strong>
          </div>
          <div className="text-gray-500 mt-2">
            2024-01-01 10:00:00,electricity,150.5,kWh,Consommation journalière
          </div>
          <div className="text-gray-500">
            2024-01-02 10:00:00,gas,75.2,m³,
          </div>
        </div>
        <p className="text-sm text-blue-600 mt-4">
          <strong>Remarques :</strong>
          <br />
          - Le champ <code className="bg-blue-100 px-1 rounded">notes</code> est optionnel
          <br />
          - Le format de date doit être : YYYY-MM-DD HH:MM:SS
        </p>
      </div>

      {/* Zone d'upload */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-center">
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
          >
            <div className="flex flex-col items-center space-y-4 border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-indigo-400 transition-colors">
              {file ? (
                <>
                  <DocumentTextIcon className="h-16 w-16 text-indigo-600" />
                  <span className="text-lg font-medium text-gray-900">{file.name}</span>
                  <span className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-16 w-16 text-gray-400" />
                  <span className="text-lg font-medium text-gray-900">
                    Cliquez pour sélectionner un fichier CSV
                  </span>
                  <span className="text-sm text-gray-500">ou glissez-déposez le fichier ici</span>
                </>
              )}
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          </label>
        </div>

        {file && (
          <div className="mt-6 flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => setFile(null)}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Import en cours...' : 'Importer'}
            </button>
          </div>
        )}
      </div>

      {/* Résultat */}
      {result && (
        <div className={`rounded-lg p-6 ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <h3 className={`text-lg font-medium mb-2 ${result.error ? 'text-red-900' : 'text-green-900'}`}>
            {result.error ? 'Erreur' : 'Succès'}
          </h3>
          <p className={`text-sm ${result.error ? 'text-red-700' : 'text-green-700'}`}>
            {result.message}
          </p>
          {result.imported !== undefined && (
            <p className="text-sm text-green-700 mt-2">
              <strong>{result.imported}</strong> ligne(s) importée(s)
            </p>
          )}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-800 mb-2">Erreurs détectées :</p>
              <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DataUpload

