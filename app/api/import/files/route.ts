import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

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
    const dataDir = path.resolve(process.cwd(), "data", "solistar")
    
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ files: [] })
    }

    const files = fs.readdirSync(dataDir)
    const solistarFiles = files.filter((file) => file.endsWith("-solistar.json"))

    const fileList: FileMetadata[] = []

    for (const fileName of solistarFiles) {
      const filePath = path.resolve(dataDir, fileName)
      const fileContent = fs.readFileSync(filePath, "utf-8")
      
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
          importedAt: metadata.importedAt || fs.statSync(filePath).mtime.toISOString(),
        })
      } catch (error) {
        console.error(`Error reading file ${fileName}:`, error)
        // Si le fichier n'a pas de métadonnées, utiliser les infos du système de fichiers
        const match = fileName.match(/(\d{4})-(\d{2})-solistar\.json/)
        if (match) {
          const [, year, month] = match
          const monthIndex = parseInt(month) - 1
          const monthLabel = `${monthNames[monthIndex]} ${year}`
          const stats = fs.statSync(filePath)

          fileList.push({
            fileName,
            month: `${year}-${month}`,
            monthLabel,
            isComplete: false,
            importedAt: stats.mtime.toISOString(),
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

    const dataDir = path.resolve(process.cwd(), "data", "solistar")
    const filePath = path.resolve(dataDir, fileName)

    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: "Fichier introuvable" },
        { status: 404 }
      )
    }

    // Supprimer le fichier
    fs.unlinkSync(filePath)

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

