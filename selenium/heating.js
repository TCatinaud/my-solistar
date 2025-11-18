const { By, Builder, Browser } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const fs = require("node:fs");
const path = require("path");
const assert = require("assert");
const ua =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0";

const params = {};

process.argv.slice(2).map((arg) => {
  const paramArg = arg.split("=");

  if (paramArg.length > 1) {
    params[paramArg[0]] = paramArg[1];
  }
});

if (!params.id || !params.pwd) {
  console.log("CMD line should contain `id` and `pwd` arguments.");
  return;
}

const formatData = (data) =>
  Number(data.replace(": ", "").replace(" °C", "").replace(",", "."));

const originEquivalent = {
  Arrêt: "off",
  Solaire: "solar",
  "Solaire + appoint": "gas",
};

(async () => {
  let driver;
  let serverData;

  try {
    const options = new chrome.Options().addArguments([
      "--headless",
      `user-agent="${ua}"`,
    ]);

    driver = await new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(options)
      .build();
    await driver.get("https://my.solisart.fr/");

    const title = await driver.getTitle();
    assert.equal("SolisArt, le Soleil partout avec vous !", title);

    await driver.manage().setTimeouts({ implicit: 500 });

    const idBox = await driver.findElement(By.name("id"));
    const mdpBox = await driver.findElement(By.name("pass"));
    const submitButton = await driver.findElement(By.name("connexion"));

    await idBox.sendKeys(params.id);
    await mdpBox.sendKeys(params.pwd);
    await submitButton.click();

    await driver.manage().setTimeouts({ implicit: 500 });

    // Get parameters area
    const areaBox = await driver.findElement(By.css("#td-parametrage-mode"));
    const activeArea = await areaBox.findElement(By.css(".ui-state-active"));
    const activeAreaText = await activeArea.getText();
    const areaConfort = await driver.findElement(
      By.css("#input-parametrage-confort")
    );
    const areaConfortText = await areaConfort.getText();
    const areaMin = await driver.findElement(
      By.css("#input-parametrage-reduit")
    );
    const areaMinText = await areaMin.getText();

    // Get parameters area
    const ecsButton = await driver.findElement(
      By.css("#header-parametrage-ecs")
    );
    await ecsButton.click();
    await driver.manage().setTimeouts({ implicit: 500 });

    /* Why this is fucking doesn’t work?
    const ecsBox = await driver.findElement(
      By.css("#radio-parametrage-ecs-mode")
    );
    const activeEcs = await ecsBox.findElement(By.css(".ui-state-active"));
    const activeEcsText = await activeEcs.getText();
    const ecsConfort = await driver.findElement(
      By.css("#input-parametrage-ecs-confort")
    );
    const ecsConfortText = await ecsConfort.getText();
    */
    const activeEcsScript = await driver.executeScript(`
      return document.querySelector("#radio-parametrage-ecs-mode .ui-state-active").textContent;
    `);
    const ecsConfortScript = await driver.executeScript(`
      return document.querySelector("#input-parametrage-ecs-confort").textContent;
    `);
    const ecsMinScript = await driver.executeScript(`
      return document.querySelector("#input-parametrage-ecs-reduit").textContent;
    `);

    // Click on Visualization tab
    const visualizationInput = await driver.findElement(
      By.xpath("//label[@for='input-pages-visualisation']")
    );
    const actions = driver.actions({ async: true });
    await actions.move({ origin: visualizationInput }).click().perform();

    // Get datas
    const t1 = await driver.findElement(By.css("#temp-valeur-1"));
    const t1Text = await t1.getText();
    const t2 = await driver.findElement(By.css("#temp-valeur-2"));
    const t2Text = await t2.getText();
    const t3 = await driver.findElement(By.css("#temp-valeur-3"));
    const t3Text = await t3.getText();
    const t4 = await driver.findElement(By.css("#temp-valeur-4"));
    const t4Text = await t4.getText();
    const t6 = await driver.findElement(By.css("#temp-valeur-6"));
    const t6Text = await t6.getText();
    const t7 = await driver.findElement(By.css("#temp-valeur-7"));
    const t7Text = await t7.getText();
    const t8 = await driver.findElement(By.css("#temp-valeur-8"));
    const t8Text = await t8.getText();
    const t9 = await driver.findElement(By.css("#temp-valeur-9"));
    const t9Text = await t9.getText();
    const t11 = await driver.findElement(By.css("#temp-valeur-11"));
    const t11Text = await t11.getText();

    serverData = {
      date: new Date(),
      data: {
        panels: {
          hotSensor: formatData(t1Text),
          coldSensor: formatData(t2Text),
        },
        tank: {
          solar: formatData(t3Text),
          additional: formatData(t4Text),
          origin: originEquivalent[activeEcsScript],
          min: formatData(ecsMinScript),
          confort: formatData(ecsConfortScript),
        },
        boiler: formatData(t6Text),
        radiator: {
          inlet: formatData(t8Text),
          outlet: formatData(t7Text),
          origin: originEquivalent[activeAreaText],
          min: formatData(areaMinText),
          confort: formatData(areaConfortText),
        },
        thermometer: {
          outdoor: formatData(t9Text),
          indoor: formatData(t11Text),
        },
      },
    };

    fs.writeFile(
      path.resolve(__dirname, "../public/data/live/heating.json"),
      JSON.stringify(serverData),
      (err) => {
        if (err) {
          console.error(err);
        }
      }
    );
  } catch (e) {
    console.log(e);
  } finally {
    await driver.quit();
  }

  return serverData;
})();
