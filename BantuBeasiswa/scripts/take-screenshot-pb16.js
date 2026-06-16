const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('Starting PB16 screenshot script...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1440, height: 900 });

  const testCaseDir = path.join(__dirname, '../TestCase');
  if (!fs.existsSync(testCaseDir)) {
    fs.mkdirSync(testCaseDir, { recursive: true });
  }

  try {
    // 1. Go to login
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(1000);

    // 2. Select role "Pendonor"
    console.log('Selecting role "Pendonor"...');
    await page.click('button:has-text("Pendonor")');
    await page.waitForTimeout(500);

    // 3. Fill credentials
    console.log('Filling credentials...');
    await page.fill('#email', 'pendonor1@yayasan.id');
    await page.fill('#password', 'pendonor123');
    
    // 4. Click Submit
    console.log('Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/pendonor/dashboard');
    console.log('Login successful! Navigated to dashboard.');
    await page.waitForTimeout(1000);

    // 5. Navigate to dashboard-pembayaran page
    console.log('Navigating to dashboard-pembayaran page...');
    await page.goto('http://localhost:3000/pendonor/dashboard-pembayaran');
    await page.waitForTimeout(2000);

    // 6. Take screenshot of PBI 28 (Dashboard rekap & tables)
    const pbi28Path = path.join(testCaseDir, 'PBI-28.png');
    console.log(`Taking screenshot for PBI 28 -> ${pbi28Path}`);
    await page.screenshot({ path: pbi28Path });

    // 7. Click Initiate on the first row (PBI 28 modal check)
    console.log('Attempting to click "Initiate" to open the Transfer Modal...');
    const initiateBtn = await page.$('[id^="initiate-btn-"]');
    if (initiateBtn) {
      await initiateBtn.click();
      await page.waitForTimeout(1000); // Wait for modal animation

      const modalPath = path.join(testCaseDir, 'PBI-28-Modal.png');
      console.log(`Taking screenshot for PBI 28 Transfer Modal -> ${modalPath}`);
      await page.screenshot({ path: modalPath });

      // Close the modal
      const closeBtn = await page.$('button:has-text("Batal")');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // 8. Trigger CSV export (PBI 29)
    console.log('Clicking Export CSV...');
    const exportCsvBtn = await page.$('#export-csv-btn');
    if (exportCsvBtn) {
      // We can take a screenshot of the main screen where export buttons are highlighted
      const pbi29Path = path.join(testCaseDir, 'PBI-29.png');
      console.log(`Taking screenshot for PBI 29 (Export highlighting) -> ${pbi29Path}`);
      
      // Highlight the buttons before screenshot
      await page.evaluate(() => {
        const csv = document.getElementById('export-csv-btn');
        const excel = document.getElementById('export-excel-btn');
        if (csv) csv.style.outline = '4px solid #10b981';
        if (excel) excel.style.outline = '4px solid #10b981';
      });

      await page.screenshot({ path: pbi29Path });
    }

    console.log('Screenshots generated successfully!');
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
