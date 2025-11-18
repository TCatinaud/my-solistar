import * as fs from "fs"
import * as path from "path"
import { put, head, list, del } from "@vercel/blob"

/**
 * Détecte si on est en environnement serverless (Vercel)
 * Vérifie la présence du token Blob Storage ou de la variable VERCEL
 */
const isServerless = (): boolean => {
  // Si on a le token Blob Storage, on est sur Vercel
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return true
  }
  // Sinon, vérifier les autres indicateurs
  return !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
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
  if (isServerless()) {
    // Utiliser Vercel Blob Storage en production
    // Note: Dans @vercel/blob v2.0.0, access ne peut être que 'public'
    // Les fichiers sont protégés par l'authentification Clerk
    const blobPath = subDir ? `${subDir}/${fileName}` : fileName
    await put(blobPath, data, {
      access: "public",
      addRandomSuffix: false,
    })
  } else {
    // Utiliser le système de fichiers en local
    const dataDir = path.resolve(process.cwd(), "data", subDir)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    const filePath = path.join(dataDir, fileName)
    fs.writeFileSync(filePath, data)
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
    // Utiliser Vercel Blob Storage en production
    const blobPath = subDir ? `${subDir}/${fileName}` : fileName
    try {
      // Utiliser head pour obtenir les métadonnées du blob (inclut l'URL)
      const blobMetadata = await head(blobPath)
      // Utiliser downloadUrl pour les blobs privés (URL signée)
      const downloadUrl = blobMetadata.downloadUrl || blobMetadata.url
      // Faire un fetch sur l'URL pour obtenir le contenu
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        return null
      }
      return await response.text()
    } catch (error) {
      // Si le fichier n'existe pas, retourner null
      if (error instanceof Error && (error.message.includes("404") || error.message.includes("BlobNotFound"))) {
        return null
      }
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

