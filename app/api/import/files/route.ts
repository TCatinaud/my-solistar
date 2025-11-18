import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { readFile, listFiles, deleteFile, fileExists } from "@/lib/blob-storage"

export const dynamic = "force-dynamic"

interface FileMetadata {
  fileName: string
  month: string
  monthLabel: string
  isComplete: boolean
  importedAt: string
}

const monthNames = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
]

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Lister les fichiers
    // En local : liste depuis data/solistar/
    // En production : liste depuis Vercel Blob Storage
    const files = await listFiles("solistar", "-solistar\\.json$")
    const solistarFiles = files.filter((file) => file.endsWith("-solistar.json"))

    const fileList: FileMetadata[] = []

    for (const fileName of solistarFiles) {
      const fileContent = await readFile(fileName, "solistar")
      
      if (!fileContent) {
        continue
      }
      
      try {
        const data = JSON.parse(fileContent)
        const metadata = data._metadata || {}
        
        // Extraire le mois du nom de fichier (format: YYYY-MM-solistar.json)
        const match = fileName.match(/(\d{4})-(\d{2})-solistar\.json/)
        if (!match) continue

        const [, year, month] = match
        const monthIndex = parseInt(month) - 1
        const monthLabel = `${monthNames[monthIndex]} ${year}`

        fileList.push({
          fileName,
          month: `${year}-${month}`,
          monthLabel,
          isComplete: metadata.isComplete || false,
          importedAt: metadata.importedAt || new Date().toISOString(),
        })
      } catch (error) {
        console.error(`Error reading file ${fileName}:`, error)
        // Si le fichier n'a pas de métadonnées, utiliser la date actuelle
        const match = fileName.match(/(\d{4})-(\d{2})-solistar\.json/)
        if (match) {
          const [, year, month] = match
          const monthIndex = parseInt(month) - 1
          const monthLabel = `${monthNames[monthIndex]} ${year}`

          fileList.push({
            fileName,
            month: `${year}-${month}`,
            monthLabel,
            isComplete: false,
            importedAt: new Date().toISOString(),
          })
        }
      }
    }

    // Trier par mois (plus récent en premier)
    fileList.sort((a, b) => b.month.localeCompare(a.month))

    return NextResponse.json({ files: fileList })
  } catch (error) {
    console.error("Error listing files:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de la liste des fichiers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get("fileName")

    if (!fileName) {
      return NextResponse.json(
        { success: false, message: "Nom de fichier manquant" },
        { status: 400 }
      )
    }

    // Vérifier que le fichier se termine par -solistar.json
    if (!fileName.endsWith("-solistar.json")) {
      return NextResponse.json(
        { success: false, message: "Fichier invalide" },
        { status: 400 }
      )
    }

    // Vérifier que le fichier existe
    const exists = await fileExists(fileName, "solistar")
    if (!exists) {
      return NextResponse.json(
        { success: false, message: "Fichier introuvable" },
        { status: 404 }
      )
    }

    // Supprimer le fichier
    // En local : supprime depuis data/solistar/
    // En production : supprime depuis Vercel Blob Storage
    await deleteFile(fileName, "solistar")

    return NextResponse.json({
      success: true,
      message: `Fichier ${fileName} supprimé avec succès`,
    })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erreur lors de la suppression du fichier",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

