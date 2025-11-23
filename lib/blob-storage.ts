import * as fs from "fs"
import * as path from "path"
import { put, head, list, del } from "@vercel/blob"

/**
 * Détecte si on est en environnement serverless (Vercel)
 * Vérifie la présence du token Blob Storage ou de la variable VERCEL
 */
const isServerless = (): boolean => {
  // Vérifier d'abord les indicateurs d'environnement Vercel
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return true
  }
  
  // Si on a le token Blob Storage, on est sur Vercel
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return true
  }
  
  // Vérifier les autres environnements serverless
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return true
  }
  
  return false
}

/**
 * Écrit un fichier
 * - En local : utilise le système de fichiers dans data/
 * - En production : utilise Vercel Blob Storage
 */
export const writeFile = async (
  fileName: string,
  data: string,
  subDir: string = ""
): Promise<void> => {
  const serverless = isServerless()
  console.log(`writeFile: isServerless=${serverless}, fileName=${fileName}, hasToken=${!!process.env.BLOB_READ_WRITE_TOKEN}`)
  
  if (serverless) {
    // Vérifier que le token est disponible
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const errorMsg = "BLOB_READ_WRITE_TOKEN is not set. Cannot write to blob storage."
      console.error(errorMsg)
      throw new Error(errorMsg)
    }
    
    // Utiliser Vercel Blob Storage en production
    // Note: Dans @vercel/blob v2.0.0, access ne peut être que 'public'
    // Les fichiers sont protégés par l'authentification Clerk
    const blobPath = subDir ? `${subDir}/${fileName}` : fileName
    console.log(`Writing blob: ${blobPath} (size: ${data.length} bytes)`)
    try {
      const result = await put(blobPath, data, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true, // Permettre l'écrasement des fichiers existants
      })
      console.log(`Successfully wrote blob: ${blobPath}`, { url: result.url })
    } catch (error) {
      console.error(`Error writing blob ${blobPath}:`, error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error("Write error details:", {
        blobPath,
        errorMessage,
        errorStack,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      })
      throw new Error(
        `Failed to write blob ${blobPath}: ${errorMessage}. Check that BLOB_READ_WRITE_TOKEN is correctly configured.`
      )
    }
  } else {
    // Utiliser le système de fichiers en local
    const dataDir = path.resolve(process.cwd(), "data", subDir)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    const filePath = path.join(dataDir, fileName)
    console.log(`Writing file: ${filePath} (size: ${data.length} bytes)`)
    fs.writeFileSync(filePath, data)
    console.log(`Successfully wrote file: ${filePath}`)
  }
}

/**
 * Lit un fichier
 * - En local : lit depuis data/
 * - En production : lit depuis Vercel Blob Storage
 */
export const readFile = async (
  fileName: string,
  subDir: string = ""
): Promise<string | null> => {
  if (isServerless()) {
    // Vérifier que le token est disponible
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn("BLOB_READ_WRITE_TOKEN is not set. Cannot read from blob storage. Returning null.")
      return null
    }
    
    // Utiliser Vercel Blob Storage en production
    const blobPath = subDir ? `${subDir}/${fileName}` : fileName
    try {
      // Utiliser head pour obtenir les métadonnées du blob (inclut l'URL)
      const blobMetadata = await head(blobPath)
      // Utiliser downloadUrl pour les blobs privés (URL signée)
      const downloadUrl = blobMetadata.downloadUrl || blobMetadata.url
      if (!downloadUrl) {
        console.warn(`No download URL found for blob: ${blobPath}`)
        return null
      }
      // Faire un fetch sur l'URL pour obtenir le contenu
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        console.warn(`Failed to fetch blob content: ${response.status} ${response.statusText}`)
        return null
      }
      return await response.text()
    } catch (error) {
      // Si le fichier n'existe pas, retourner null
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorString = errorMessage.toLowerCase()
      
      if (
        errorString.includes("404") ||
        errorString.includes("blobnotfound") ||
        errorString.includes("not found") ||
        errorString.includes("does not exist")
      ) {
        console.log(`Blob not found (expected): ${blobPath}`)
        return null
      }
      
      // Logger l'erreur pour le diagnostic
      console.error(`Error reading blob ${blobPath}:`, error)
      throw error
    }
  } else {
    // Utiliser le système de fichiers en local
    const dataDir = path.resolve(process.cwd(), "data", subDir)
    const filePath = path.join(dataDir, fileName)
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8")
    }
    return null
  }
}

/**
 * Liste les fichiers dans un répertoire
 * - En local : liste depuis data/
 * - En production : liste depuis Vercel Blob Storage
 */
export const listFiles = async (
  subDir: string = "",
  pattern?: string
): Promise<string[]> => {
  if (isServerless()) {
    // Utiliser Vercel Blob Storage en production
    const prefix = subDir ? `${subDir}/` : ""
    const { blobs } = await list({
      prefix,
    })
    
    let fileNames = blobs.map((blob) => {
      // Retirer le préfixe pour obtenir juste le nom du fichier
      const name = blob.pathname.replace(prefix, "")
      return name
    })

    // Filtrer par pattern si fourni
    if (pattern) {
      const regex = new RegExp(pattern)
      fileNames = fileNames.filter((name) => regex.test(name))
    }

    return fileNames
  } else {
    // Utiliser le système de fichiers en local
    const dataDir = path.resolve(process.cwd(), "data", subDir)
    if (!fs.existsSync(dataDir)) {
      return []
    }
    const files = fs.readdirSync(dataDir)
    
    // Filtrer par pattern si fourni
    if (pattern) {
      const regex = new RegExp(pattern)
      return files.filter((file) => regex.test(file))
    }
    
    return files
  }
}

/**
 * Vérifie si un fichier existe
 * - En local : vérifie dans data/
 * - En production : vérifie dans Vercel Blob Storage
 */
export const fileExists = async (
  fileName: string,
  subDir: string = ""
): Promise<boolean> => {
  if (isServerless()) {
    // Utiliser Vercel Blob Storage en production
    const blobPath = subDir ? `${subDir}/${fileName}` : fileName
    try {
      await head(blobPath)
      return true
    } catch (error) {
      return false
    }
  } else {
    // Utiliser le système de fichiers en local
    const dataDir = path.resolve(process.cwd(), "data", subDir)
    const filePath = path.join(dataDir, fileName)
    return fs.existsSync(filePath)
  }
}

/**
 * Supprime un fichier
 * - En local : supprime depuis data/
 * - En production : supprime depuis Vercel Blob Storage
 */
export const deleteFile = async (
  fileName: string,
  subDir: string = ""
): Promise<void> => {
  if (isServerless()) {
    // Utiliser Vercel Blob Storage en production
    const blobPath = subDir ? `${subDir}/${fileName}` : fileName
    await del(blobPath)
  } else {
    // Utiliser le système de fichiers en local
    const dataDir = path.resolve(process.cwd(), "data", subDir)
    const filePath = path.join(dataDir, fileName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
}

