import { NextResponse } from "next/server"
import { scrapeHeatingData } from "@/scripts/scrape-heating"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const id = process.env.SOLISTAR_ID
    const password = process.env.SOLISTAR_PASSWORD

    if (!id || !password) {
      return NextResponse.json(
        { error: "Identifiants manquants dans les variables d'environnement" },
        { status: 500 }
      )
    }

    const data = await scrapeHeatingData(id, password)

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
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
