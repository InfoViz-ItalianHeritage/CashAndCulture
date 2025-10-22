const FILE_PATH = "data/open_coesione.csv"; // Assuming it's in the same folder
const FIN_COL = "FINANZ_TOTALE_PUBBLICO";
const SELECTED_YEARS = [2016, 2017, 2018, 2019, 2022];
const REGION_MAP = {
    "TRENTINO-ALTO ADIGE": "TRENTINO-ALTO ADIGE/SÜDTIROL",
    "TRENTINO ALTO ADIGE": "TRENTINO-ALTO ADIGE/SÜDTIROL",
    "VALLE D’AOSTA": "VALLE D'AOSTA",
    "FRIULI VENEZIA GIULIA": "FRIULI-VENEZIA GIULIA",
};
const TO_DROP = ["PAESI EUROPEI", "AMBITO NAZIONALE"];

/**
 * Executes the main data loading process using PapaParse.
 */
function generateHeatmap() {
    console.log("Starting data load with PapaParse...");
    // Check for PapaParse library presence
    if (typeof Papa === 'undefined') {
        console.error("PapaParse library not loaded. Ensure the script tag is present in your HTML.");
        document.getElementById('heatmap').innerHTML = `<p style="color:red;">Library Error: PapaParse is required but not loaded.</p>`;
        return;
    }

    Papa.parse(FILE_PATH, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            if (results.errors.length) {
                console.error("PapaParse Errors:", results.errors);
                document.getElementById('heatmap').innerHTML = `<p style="color:red;">Error parsing data. Check console for details.</p>`;
                return;
            }
            console.log(`Successfully loaded ${results.data.length} rows.`);
            processAndPlot(results.data);
        },
        error: function (err, file, inputElem, reason) {
            console.error("File loading error:", reason, err);
            document.getElementById('heatmap').innerHTML = `<p style="color:red;">File loading error. Is the CSV path correct and are you running on a web server?</p>`;
        }
    });
}

/**
 * Performs all data cleaning, aggregation, and plotting.
 * @param {Array<Object>} rawData - The array of row objects from PapaParse.
 */
function processAndPlot(rawData) {

    // 1. Initial Cleaning and Expansion (Exploding/Mapping)
    let processedData = rawData.flatMap(row => {
        // --- Convert Funding to Numeric (handling IT/EU format: . for thousands, , for decimal) ---
        let fundingString = String(row[FIN_COL] || '0');
        let funding = parseFloat(
            fundingString
                .replace(/[^\d,.\-]/g, '')
                .replace(/\./g, '')         // Remove thousand separators
                .replace(/,/g, '.')         // Use dot as decimal separator
        ) || 0;

        // --- Extract Year ---
        let year;
        try {
            const date = row['OC_DATA_INIZIO_PROGETTO'] ? new Date(row['OC_DATA_INIZIO_PROGETTO']) : null;
            year = date && !isNaN(date) ? date.getFullYear() : null;
        } catch {
            year = null;
        }

        // --- Initial Filters ---
        if (!row['DEN_PROVINCIA'] || row['DEN_PROVINCIA'].trim() === "" || !year || !SELECTED_YEARS.includes(year)) {
            return [];
        }

        // --- Handle Multi-Region (Explode Logic) ---
        const regionsRaw = (row['DEN_REGIONE'] || '').split(':::').map(r => r.trim());
        const numRegions = regionsRaw.length;
        const perRegionFunding = funding / numRegions;

        return regionsRaw.map(region => {
            const normalizedRegion = REGION_MAP[region] || region;

            // --- Final Filter for Region Drops ---
            if (TO_DROP.includes(normalizedRegion)) {
                return null;
            }

            return {
                REGION: normalizedRegion,
                YEAR: year,
                FUNDING: perRegionFunding
            };
        }).filter(item => item !== null);

    });

    if (processedData.length === 0) {
        console.error("Processed data is empty. Check input data and filters.");
        document.getElementById('heatmap').innerHTML = `<p style="color:red;">No data remained after processing and filtering.</p>`;
        return;
    }

    // 2. Aggregate Funding (Group By Region x Year)
    const aggregated = processedData.reduce((acc, row) => {
        const key = `${row.REGION}_${row.YEAR}`;
        acc.data[key] = (acc.data[key] || 0) + row.FUNDING;
        acc.regions.add(row.REGION);
        acc.years.add(row.YEAR);
        return acc;
    }, { data: {}, regions: new Set(), years: new Set() });

    let regions = Array.from(aggregated.regions);
    const years = Array.from(aggregated.years).sort();

    // MODIFICATION 1: Custom Y-Axis Sorting (A at Top, Veneto at Bottom)
    regions.sort((a, b) => a.localeCompare(b)); // Sort alphabetically A-Z

    // Separate Veneto and the rest
    const veneto = regions.filter(r => r === 'VENETO');
    const otherRegions = regions.filter(r => r !== 'VENETO');

    // Combine: A-Z regions, then Veneto (so Veneto is the true last element in the alphabetical list)
    regions = otherRegions.concat(veneto);

    // REVERSE for Plotly: Plotly's Y-axis starts at the bottom.
    // Reversing puts 'A' regions at the end of the array, placing them at the TOP of the chart.
    regions.reverse();
    console.log("Regions sorted and reversed for A-at-Top display.");

    // 3. Pivot Data (Create Z-matrix)
    const zData = regions.map(region =>
        years.map(year => aggregated.data[`${region}_${year}`] || 0)
    );

    // 4. Calculate Annotations (Top Region Share per Year)
    const annotText = zData.map(row => Array(years.length).fill(""));
    years.forEach((year, colIndex) => {
        let total = 0;
        let maxFunding = -1;
        let maxRowIndex = -1;

        zData.forEach((r, rowIndex) => {
            const value = r[colIndex];
            total += value;
            if (value > maxFunding) {
                maxFunding = value;
                maxRowIndex = rowIndex;
            }
        });

        if (total > 0 && maxRowIndex !== -1) {
            const share = (maxFunding / total) * 100;
            annotText[maxRowIndex][colIndex] = `<b>${share.toFixed(1)}%</b>`;
        }
    });

    // 5. Plot Heatmap using Plotly.js
    const allFundings = zData.flat().filter(v => v > 0);
    const minVal = allFundings.length > 0 ? Math.min(...allFundings) : 1;
    const maxVal = allFundings.length > 0 ? Math.max(...allFundings) : 1000;

    // Log Scale Setup
    const logMin = Math.log10(minVal);
    const logMax = Math.log10(maxVal);

    // MODIFICATION 3a: Map 0 funding values to Z_ZERO_VALUE (outside log range)
    const Z_ZERO_VALUE = logMin - 0.1;
    const zLogData = zData.map(row =>
        row.map(val => val > 0 ? Math.log10(val) : Z_ZERO_VALUE)
    );

    // MODIFICATION 3b: Custom colorscale to enforce white for Z_ZERO_VALUE
    const customColorscale = [
        [0, 'white'],         // 0% of the scale is white
        [0.00001, 'white'],   // Small buffer to ensure white for all zero values
        // Start the blue gradient from the calculated logMin point
        [(logMin - Z_ZERO_VALUE) / (logMax - Z_ZERO_VALUE), 'rgb(247,251,255)'],
        [1, 'rgb(8,48,107)']  // Darkest blue for logMax
    ];

    const dataPlotly = [{
        z: zLogData,
        x: years,
        y: regions,
        type: 'heatmap',
        colorscale: customColorscale,
        zmin: Z_ZERO_VALUE, // Set zmin to include the zero-value log point
        zmax: logMax,

        // Combine funding value and annotation share for hover/text
        text: zData.map((row, rIdx) =>
            row.map((val, cIdx) => {
                const fundingFmt = val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
                const annot = annotText[rIdx][cIdx];
                return `${fundingFmt}<br>${annot}`;
            })
        ),
        hovertemplate: '%{text}<extra></extra>',

        // Custom colorbar ticks to display original funding values (not log values)
        colorbar: {
            title: { text: 'Total Public Funding (€)', side: 'right' },
            tickvals: [logMin, logMin + (logMax - logMin) / 2, logMax],
            ticktext: [minVal, Math.pow(10, logMin + (logMax - logMin) / 2), maxVal].map(v => v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })),
        }
    }];

    const layout = {
        title: 'fig.4.2: Total Public Funding per Region (Top 5 Years)<br>(top region per year shown as share of yearly total)',

        // MODIFICATION 2: Set axis types to 'category' for equal spacing and sorted display
        xaxis: {
            title: 'Year',
            tickvals: years,
            ticktext: years,
            type: 'category' // Ensures equal spacing between years
        },
        yaxis: {
            title: 'Region',
            automargin: true,
            type: 'category' // Ensures regions are displayed in the custom sorted order
        },
        autosize: true,
        height: 600,
        margin: { l: 200, r: 50, b: 50, t: 80 }
    };

    // Check for Plotly library presence before plotting
    if (typeof Plotly === 'undefined') {
        console.error("Plotly library not loaded. Ensure the script tag is present in your HTML.");
        document.getElementById('heatmap').innerHTML = `<p style="color:red;">Library Error: Plotly is required but not loaded.</p>`;
        return;
    }

    Plotly.newPlot('heatmap', dataPlotly, layout);
    console.log("Heatmap rendered successfully with all requested modifications.");
}

generateHeatmap();