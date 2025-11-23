import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { scrapeHeatingData } from "@/scripts/scrape-heating"
import { readFile, writeFile } from "@/lib/blob-storage"

export const dynamic = "force-dynamic"

const CACHE_DURATION_MS = 10 * 60 * 1000 // 10 minutes

interface DataNowFile {
  date: string
  data?: any
  weather?: any
}

const isDataRecent = (date: string | undefined): boolean => {
  if (!date) return false
  const dataDate = new Date(date).getTime()
  const now = Date.now()
  const age = now - dataDate
  return age < CACHE_DURATION_MS
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get("force") === "true"

    // Lire le fichier data-now.json pour vérifier le cache
    if (!forceRefresh) {
      const cachedContent = await readFile("data-now.json")
      if (cachedContent) {
        try {
          const cachedData: DataNowFile = JSON.parse(cachedContent)
          if (cachedData.date && isDataRecent(cachedData.date) && cachedData.data) {
            // Retourner les données en cache
            return NextResponse.json(
              {
                date: cachedData.date,
                data: cachedData.data,
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "public, max-age=600",
                },
              }
            )
          }
        } catch (error) {
          console.error("Error parsing cached data:", error)
        }
      }
    }

    // Si pas de cache valide ou force refresh, récupérer de nouvelles données
    const id = process.env.SOLISTAR_ID
    const password = process.env.SOLISTAR_PASSWORD

    if (!id || !password) {
      return NextResponse.json(
        { error: "Identifiants manquants dans les variables d'environnement" },
        { status: 500 }
      )
    }

    const newData = await scrapeHeatingData(id, password)

    // Lire le fichier existant pour préserver les données météo si elles existent
    let existingData: Partial<DataNowFile> = {}
    const existingContent = await readFile("data-now.json")
    if (existingContent) {
      try {
        existingData = JSON.parse(existingContent)
      } catch (error) {
        console.error("Error parsing existing data:", error)
      }
    }

    // Sauvegarder les nouvelles données en préservant les données météo
    const dataToSave: DataNowFile = {
      date: newData.date.toISOString(),
      data: newData.data,
      weather: existingData.weather, // Préserver les données météo
    }

    await writeFile("data-now.json", JSON.stringify(dataToSave, null, 2))

    return NextResponse.json(
      {
        date: newData.date.toISOString(),
        data: newData.data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    )
  } catch (error) {
    console.error("Error in heating API route:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des données",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
