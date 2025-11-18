import puppeteer, { type Browser, type Page } from "puppeteer-core"
import chromium from "@sparticuz/chromium"
import * as fs from "fs"
import * as path from "path"

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

type HeatingData = {
  date: Date
  data: {
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

const formatData = (data: string): number => {
  return Number(
    data.replace(": ", "").replace(" °C", "").replace(",", ".").trim()
  )
}

const originEquivalent: Record<string, string> = {
  Arrêt: "off",
  Solaire: "solar",
  "Solaire + appoint": "gas",
}

export const scrapeHeatingData = async (
  id: string,
  password: string
): Promise<HeatingData> => {
  let browser: Browser | null = null

  try {
    // Utiliser Chromium optimisé pour serverless sur Vercel, ou Chrome local en développement
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
    
    let executablePath: string
    let args: string[]

    if (isServerless) {
      // Sur Vercel/AWS Lambda, utiliser @sparticuz/chromium
      executablePath = await chromium.executablePath()
      args = chromium.args
    } else {
      // En développement local, utiliser Chrome installé localement
      if (process.platform === "win32") {
        executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      } else if (process.platform === "darwin") {
        executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      } else {
        executablePath = "/usr/bin/google-chrome-stable"
      }
      args = ["--no-sandbox", "--disable-setuid-sandbox"]
    }

    browser = await puppeteer.launch({
      args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath,
      headless: true,
    })

    const page: Page = await browser.newPage()
    await page.setUserAgent(USER_AGENT)

    // Navigate to login page
    await page.goto("https://my.solisart.fr/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    })

    // Verify page title
    const title = await page.title()
    if (title !== "SolisArt, le Soleil partout avec vous !") {
      throw new Error(`Page title mismatch: ${title}`)
    }

    // Fill login form
    await page.type('input[name="id"]', id)
    await page.type('input[name="pass"]', password)
    await page.click('input[name="connexion"]')

    // Wait for navigation after login
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Get parameters area
    const areaBox = await page.$("#td-parametrage-mode")
    const activeArea = await areaBox?.$(".ui-state-active")
    const activeAreaText = (await page.evaluate((el) => el?.textContent || "", activeArea)) || ""

    const areaConfort = await page.$("#input-parametrage-confort")
    const areaConfortText = (await page.evaluate((el) => el?.textContent || "", areaConfort)) || ""

    const areaMin = await page.$("#input-parametrage-reduit")
    const areaMinText = (await page.evaluate((el) => el?.textContent || "", areaMin)) || ""

    // Click on ECS button to get ECS parameters
    const ecsButton = await page.$("#header-parametrage-ecs")
    if (ecsButton) {
      await ecsButton.click()
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Get ECS parameters using evaluate
    const activeEcsScript = await page.evaluate(() => {
      const element = document.querySelector(
        "#td-parametrage-ecs-mode .ui-state-active"
      )
      return element?.textContent || ""
    })

    const ecsConfortScript = await page.evaluate(() => {
      const element = document.querySelector("#input-parametrage-ecs-confort")
      return element?.textContent || ""
    })

    const ecsMinScript = await page.evaluate(() => {
      const element = document.querySelector("#input-parametrage-ecs-reduit")
      return element?.textContent || ""
    })

    // Click on Visualization tab
    const visualizationInput = await page.$("label[for='input-pages-visualisation']")
    if (visualizationInput) {
      await visualizationInput.click()
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Get temperature values
    const t1 = await page.$("#temp-valeur-1")
    const t1Text = (await page.evaluate((el) => el?.textContent || "", t1)) || ""

    const t2 = await page.$("#temp-valeur-2")
    const t2Text = (await page.evaluate((el) => el?.textContent || "", t2)) || ""

    const t3 = await page.$("#temp-valeur-3")
    const t3Text = (await page.evaluate((el) => el?.textContent || "", t3)) || ""

    const t4 = await page.$("#temp-valeur-4")
    const t4Text = (await page.evaluate((el) => el?.textContent || "", t4)) || ""

    const t6 = await page.$("#temp-valeur-6")
    const t6Text = (await page.evaluate((el) => el?.textContent || "", t6)) || ""

    const t7 = await page.$("#temp-valeur-7")
    const t7Text = (await page.evaluate((el) => el?.textContent || "", t7)) || ""

    const t8 = await page.$("#temp-valeur-8")
    const t8Text = (await page.evaluate((el) => el?.textContent || "", t8)) || ""

    const t9 = await page.$("#temp-valeur-9")
    const t9Text = (await page.evaluate((el) => el?.textContent || "", t9)) || ""

    const t11 = await page.$("#temp-valeur-11")
    const t11Text = (await page.evaluate((el) => el?.textContent || "", t11)) || ""

    const boilerActive = await page.$("#chaudiere-1-label")
    const boilerActiveText = (await page.evaluate((el) => el?.textContent || "", boilerActive)) || ""

    const serverData: HeatingData = {
      date: new Date(),
      data: {
        panels: {
          hotSensor: formatData(t1Text),
          coldSensor: formatData(t2Text),
        },
        tank: {
          solar: formatData(t3Text),
          additional: formatData(t4Text),
          origin: originEquivalent[activeEcsScript] || activeEcsScript,
          min: formatData(ecsMinScript),
          confort: formatData(ecsConfortScript),
        },
        boiler: {
          active: boilerActiveText === "On",
          temperature: formatData(t6Text),
        },
        radiator: {
          inlet: formatData(t8Text),
          outlet: formatData(t7Text),
          origin: originEquivalent[activeAreaText] || activeAreaText,
          min: formatData(areaMinText),
          confort: formatData(areaConfortText),
        },
        thermometer: {
          outdoor: formatData(t9Text),
          indoor: formatData(t11Text),
        },
      },
    }

    // Save to data directory if it exists
    const dataDir = path.resolve(process.cwd(), "data")
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const filePath = path.resolve(dataDir, `heating.json`)
    fs.writeFileSync(filePath, JSON.stringify(serverData, null, 2))

    return serverData
  } catch (error) {
    console.error("Error scraping heating data:", error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
