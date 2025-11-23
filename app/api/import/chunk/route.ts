import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { readFile, writeFile, fileExists } from "@/lib/blob-storage"

export const dynamic = "force-dynamic"

interface ProcessedData {
  _metadata?: {
    isComplete: boolean
    importedAt: string
  }
  [day: string]: any
}

interface ChunkData {
  fileName: string
  month: string
  year: number
  monthIndex: number
  chunkIndex: number
  isLastChunk: boolean
  data: Record<string, any> // Les données d'un ou plusieurs jours
  confirmReplace?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    }

    const body: ChunkData = await request.json()
    const { fileName, month, year, monthIndex, chunkIndex, isLastChunk, data, confirmReplace } = body

    // Pour le premier chunk, vérifier si le fichier existe
    if (chunkIndex === 0) {
      const exists = await fileExists(fileName, "solistar")
      if (exists && !confirmReplace) {
        return NextResponse.json(
          {
            success: false,
            message: "Le fichier existe déjà",
            fileExists: true,
            fileName,
            month,
          },
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      }

      // Initialiser le fichier avec les métadonnées
      // Fusionner les données en préservant la structure
      const initialData: ProcessedData = {
        _metadata: {
          isComplete: false,
          importedAt: new Date().toISOString(),
        },
      }
      
      // Ajouter les données du premier chunk
      for (const day in data) {
        if (day !== "_metadata") {
          initialData[day] = data[day]
        }
      }

      await writeFile(fileName, JSON.stringify(initialData, null, 2), "solistar")
      
      // Vérifier que le fichier a bien été écrit avant de retourner la réponse
      // Cette vérification est importante sur Vercel où le blob peut avoir un délai de propagation
      let fileVerified = false
      const maxVerificationAttempts = 10
      for (let attempt = 0; attempt < maxVerificationAttempts; attempt++) {
        const exists = await fileExists(fileName, "solistar")
        if (exists) {
          // Vérifier qu'on peut aussi le lire
          const content = await readFile(fileName, "solistar")
          if (content) {
            fileVerified = true
            break
          }
        }
        // Attendre un peu avant de réessayer (délai progressif)
        if (attempt < maxVerificationAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
        }
      }
      
      if (!fileVerified) {
        console.error(`Fichier ${fileName} non vérifié après ${maxVerificationAttempts} tentatives`)
        return NextResponse.json(
          {
            success: false,
            message: "Erreur lors de la vérification de la sauvegarde du fichier",
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: `Chunk ${chunkIndex + 1} reçu et vérifié`,
        chunkIndex,
      })
    }

    // Pour les chunks suivants, lire le fichier existant, fusionner et sauvegarder
    // Attendre que le fichier soit disponible (avec retry)
    let existingContent: string | null = null
    const maxReadAttempts = 10
    for (let attempt = 0; attempt < maxReadAttempts; attempt++) {
      existingContent = await readFile(fileName, "solistar")
      if (existingContent) {
        break
      }
      // Attendre avant de réessayer (délai progressif : 100ms, 200ms, 300ms, etc.)
      if (attempt < maxReadAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
      }
    }
    
    if (!existingContent) {
      console.error(`Fichier ${fileName} introuvable après ${maxReadAttempts} tentatives (chunk ${chunkIndex})`)
      return NextResponse.json(
        { 
          success: false, 
          message: `Fichier introuvable après ${maxReadAttempts} tentatives. Le chunk précédent n'a peut-être pas été sauvegardé. Veuillez recommencer l'import.`,
          chunkIndex,
        },
        { status: 400 }
      )
    }

    const existingData: ProcessedData = JSON.parse(existingContent)
    
    // Fusionner les nouvelles données de manière récursive pour préserver tous les créneaux horaires
    for (const day in data) {
      // Ignorer _metadata qui sera géré séparément
      if (day === "_metadata") continue
      
      if (!existingData[day]) {
        // Si le jour n'existe pas, l'ajouter complètement
        existingData[day] = data[day]
      } else {
        // Si le jour existe, fusionner les créneaux horaires
        const existingDay = existingData[day] as any
        const newDay = data[day] as any
        
        // Fusionner tous les créneaux horaires du jour
        Object.assign(existingDay, newDay)
      }
    }

    // Si c'est le dernier chunk, vérifier si le mois est complet
    if (isLastChunk) {
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
      let isComplete = true
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, "0")
        const dayData = existingData[dayStr]
        if (!dayData || (!dayData["0000"] && !dayData["0030"])) {
          isComplete = false
          break
        }
      }

      if (existingData._metadata) {
        existingData._metadata.isComplete = isComplete
      }
    }

    await writeFile(fileName, JSON.stringify(existingData, null, 2), "solistar")
    
    // Vérifier que le fichier a bien été écrit avant de retourner la réponse
    let fileVerified = false
    const maxVerificationAttempts = 10
    for (let attempt = 0; attempt < maxVerificationAttempts; attempt++) {
      const content = await readFile(fileName, "solistar")
      if (content) {
        // Vérifier que les données sont bien présentes (au moins une clé de jour)
        try {
          const parsed = JSON.parse(content)
          if (Object.keys(parsed).length > 1 || parsed._metadata) {
            fileVerified = true
            break
          }
        } catch {
          // Continue to retry
        }
      }
      // Attendre un peu avant de réessayer (délai progressif)
      if (attempt < maxVerificationAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
      }
    }
    
    if (!fileVerified) {
      console.error(`Fichier ${fileName} non vérifié après ${maxVerificationAttempts} tentatives (chunk ${chunkIndex})`)
      return NextResponse.json(
        {
          success: false,
          message: "Erreur lors de la vérification de la sauvegarde du fichier",
          chunkIndex,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1} traité et vérifié`,
      chunkIndex,
      isComplete: isLastChunk,
    })
  } catch (error) {
    console.error("Error processing chunk:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur lors du traitement du chunk",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
}

