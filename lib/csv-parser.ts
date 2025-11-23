// Fonctions de parsing CSV utilisables côté client

export interface CSVRow {
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

export interface DayData {
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

export interface ProcessedChunk {
  [day: string]: DayData
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

export const parseCSVChunk = (
  lines: string[],
  headers: string[]
): { rows: CSVRow[]; monthInfo: { month: string; year: number; monthIndex: number } | null } => {
  const rows: CSVRow[] = []
  let monthInfo: { month: string; year: number; monthIndex: number } | null = null

  for (const line of lines) {
    if (!line.trim()) continue
    
    const values = line.split(";")
    if (values.length < headers.length) continue

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ""
    })

    // Vérifier que la ligne a une date valide
    if (row.Date) {
      const date = parseDate(row.Date)
      if (date) {
        // Déterminer le mois à partir de la première date valide
        if (!monthInfo) {
          const year = date.getFullYear()
          const monthIndex = date.getMonth()
          const month = String(monthIndex + 1).padStart(2, "0")
          monthInfo = { month: `${year}-${month}`, year, monthIndex }
        }
        rows.push(row as CSVRow)
      }
    }
  }

  return { rows, monthInfo }
}

export const processRowsToChunk = (rows: CSVRow[]): ProcessedChunk => {
  const chunk: ProcessedChunk = {}

  for (const row of rows) {
    const date = parseDate(row.Date)
    if (!date) continue

    // Filtrer : garder uniquement les lignes à 00:00 et 00:30 de chaque heure
    const minutes = date.getMinutes()
    if (minutes !== 0 && minutes !== 30) continue

    const day = String(date.getDate()).padStart(2, "0")
    const hour = String(date.getHours()).padStart(2, "0")
    const timeSlot = `${hour}${minutes === 0 ? "00" : "30"}`

    if (!chunk[day]) {
      chunk[day] = {}
    }

    chunk[day][timeSlot] = {
      panels: {
        hotSensor: parseNumber(row.Tcapt),
        coldSensor: parseNumber(row.TcaptF),
      },
      tank: {
        solar: parseNumber(row.TbalS),
        additional: parseNumber(row.TbalA),
        origin: determineOrigin(row.SOL, row.APP),
        min: parseNumber(row.TconsECS),
        confort: parseNumber(row.TconsECS),
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
        confort: parseNumber(row.Tcons1),
      },
      thermometer: {
        outdoor: parseNumber(row.Text),
        indoor: parseNumber(row.TZ1),
      },
    }
  }

  return chunk
}

