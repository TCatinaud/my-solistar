import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

export const dynamic = "force-dynamic"

interface CSVRow {
  Date: string
  Tcapt: string
  TcaptF: string
  TbalS: string
  TbalA: string
  TpoeleB: string
  TdepC: string
  TretC: string
  Text: string
  TZ1: string
  SOL: string
  APP: string
  TconsECS: string
  chdr1: string
  Tcons1: string
}

interface DayData {
  [timeSlot: string]: {
    panels: {
      hotSensor: number
      coldSensor: number
    }
    tank: {
      solar: number
      additional: number
      origin: string
      min: number
      confort: number
    }
    boiler: {
      active: boolean
      temperature: number
    }
    radiator: {
      inlet: number
      outlet: number
      origin: string
      min: number
      confort: number
    }
    thermometer: {
      outdoor: number
      indoor: number
    }
  }
}

interface ProcessedData {
  _metadata?: {
    isComplete: boolean
    importedAt: string
  }
  [day: string]: DayData | { isComplete?: boolean; importedAt?: string } | undefined
}

const parseCSV = (csvContent: string): CSVRow[] => {
  const lines = csvContent.split("\n").filter((line) => line.trim())
  
  // Ignorer la première ligne "SolisConfrt..."
  // La deuxième ligne contient les headers
  if (lines.length < 2) {
    throw new Error("Le fichier CSV est invalide : pas assez de lignes")
  }

  const headers = lines[1].split(";").map((h) => h.trim())
  const requiredColumns = [
    "Date",
    "Tcapt",
    "TcaptF",
    "TbalS",
    "TbalA",
    "TpoeleB",
    "TdepC",
    "TretC",
    "Text",
    "TZ1",
    "SOL",
    "APP",
    "TconsECS",
    "chdr1",
    "Tcons1",
  ]

  // Vérifier que toutes les colonnes requises sont présentes
  const missingColumns = requiredColumns.filter(
    (col) => !headers.includes(col)
  )
  if (missingColumns.length > 0) {
    throw new Error(
      `Colonnes manquantes dans le CSV : ${missingColumns.join(", ")}`
    )
  }

  const rows: CSVRow[] = []
  for (let i = 2; i < lines.length; i++) {
    const values = lines[i].split(";")
    if (values.length < headers.length) continue

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ""
    })

    // Vérifier que la ligne a une date valide
    if (row.Date) {
      rows.push(row as CSVRow)
    }
  }

  return rows
}

const parseDate = (dateStr: string): Date | null => {
  // Format: "01/11/25 00:00"
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/)
  if (!match) return null

  const [, day, month, year, hour, minute] = match
  // Convertir l'année à 2 chiffres en année complète (assumer 2000-2099)
  const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year)
  
  return new Date(
    fullYear,
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute)
  )
}

const parseNumber = (value: string): number => {
  if (!value || value === "dsc" || value.trim() === "") return 0
  const num = parseFloat(value.replace(",", "."))
  return isNaN(num) ? 0 : num
}

const parseBoilerActive = (value: string): boolean => {
  const num = parseNumber(value)
  return num === 100 // 100 = active, 0 = inactive
}

const determineOrigin = (sol: string, app: string): string => {
  const solValue = parseInt(sol) || 0
  const appValue = parseInt(app) || 0
  
  if (solValue === 1) return "solar"
  if (appValue === 1) return "gas"
  return "off"
}

const filterAndGroupData = (rows: CSVRow[]): ProcessedData => {
  const grouped: ProcessedData = {}

  for (const row of rows) {
    const date = parseDate(row.Date)
    if (!date) continue

    // Filtrer : garder uniquement les lignes à 00:00 et 00:30 de chaque heure
    const minutes = date.getMinutes()
    if (minutes !== 0 && minutes !== 30) continue

    const day = String(date.getDate()).padStart(2, "0")
    const hour = String(date.getHours()).padStart(2, "0")
    const timeSlot = `${hour}${minutes === 0 ? "00" : "30"}`

    if (!grouped[day]) {
      grouped[day] = {}
    }

    const dayData = grouped[day] as DayData
    dayData[timeSlot] = {
      panels: {
        hotSensor: parseNumber(row.Tcapt),
        coldSensor: parseNumber(row.TcaptF),
      },
      tank: {
        solar: parseNumber(row.TbalS),
        additional: parseNumber(row.TbalA),
        origin: determineOrigin(row.SOL, row.APP),
        min: parseNumber(row.TconsECS),
        confort: parseNumber(row.TconsECS), // Utiliser TconsECS pour les deux (à ajuster si nécessaire)
      },
      boiler: {
        active: parseBoilerActive(row.chdr1),
        temperature: parseNumber(row.TpoeleB),
      },
      radiator: {
        inlet: parseNumber(row.TdepC),
        outlet: parseNumber(row.TretC),
        origin: determineOrigin(row.SOL, row.APP),
        min: parseNumber(row.Tcons1),
        confort: parseNumber(row.Tcons1), // Utiliser Tcons1 pour les deux (à ajuster si nécessaire)
      },
      thermometer: {
        outdoor: parseNumber(row.Text),
        indoor: parseNumber(row.TZ1),
      },
    }
  }

  return grouped
}

const getMonthFromData = (rows: CSVRow[]): { month: string; year: number; monthIndex: number } | null => {
  for (const row of rows) {
    const date = parseDate(row.Date)
    if (date) {
      const year = date.getFullYear()
      const monthIndex = date.getMonth()
      const month = String(monthIndex + 1).padStart(2, "0")
      return { month: `${year}-${month}`, year, monthIndex }
    }
  }
  return null
}

const checkMonthComplete = (processedData: ProcessedData, year: number, monthIndex: number): boolean => {
  // Obtenir le nombre de jours dans le mois
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  
  // Vérifier que tous les jours sont présents (ignorer _metadata)
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, "0")
    const dayData = processedData[dayStr] as DayData | undefined
    // Vérifier que c'est bien un DayData et pas _metadata
    if (!dayData || !dayData["0000"] && !dayData["0030"]) {
      return false
    }
  }
  
  return true
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const confirmReplace = formData.get("confirmReplace") === "true"

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    // Lire le contenu du fichier
    const csvContent = await file.text()

    // Parser le CSV
    const rows = parseCSV(csvContent)

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Aucune donnée valide trouvée dans le CSV" },
        { status: 400 }
      )
    }

    // Déterminer le mois
    const monthInfo = getMonthFromData(rows)
    if (!monthInfo) {
      return NextResponse.json(
        { success: false, message: "Impossible de déterminer le mois à partir des données" },
        { status: 400 }
      )
    }

    const { month, year, monthIndex } = monthInfo

    // Vérifier si le fichier existe déjà
    const dataDir = path.resolve(process.cwd(), "data", "solistar")
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const fileName = `${month}-solistar.json`
    const filePath = path.resolve(dataDir, fileName)
    const fileExists = fs.existsSync(filePath)

    if (fileExists && !confirmReplace) {
      return NextResponse.json(
        {
          success: false,
          message: "Le fichier existe déjà",
          fileExists: true,
          fileName,
          month,
        },
        { status: 200 }
      )
    }

    // Transformer les données
    const processedData = filterAndGroupData(rows)

    // Vérifier si le mois est complet
    const isComplete = checkMonthComplete(processedData, year, monthIndex)

    // Ajouter les métadonnées
    processedData._metadata = {
      isComplete,
      importedAt: new Date().toISOString(),
    }

    // Sauvegarder le fichier JSON
    fs.writeFileSync(filePath, JSON.stringify(processedData, null, 2))

    return NextResponse.json({
      success: true,
      message: `Fichier ${fileName} importé avec succès`,
      fileName,
      month,
    })
  } catch (error) {
    console.error("Error importing CSV:", error)
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'import du fichier",
      },
      { status: 500 }
    )
  }
}

