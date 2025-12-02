(async function () {


    const DISTINCT_COLORS = [
        'rgba(170, 0, 0, 0.9)',
        'rgba(0, 100, 0, 0.9)',
        'rgba(0, 0, 128, 0.9)',
        'rgba(128, 0, 128, 0.9)',
        'rgba(230, 120, 0, 0.9)',
        'rgba(0, 128, 128, 0.9)',
        'rgba(128, 0, 0, 0.9)',
        'rgba(75, 0, 130, 0.9)',
        'rgba(139, 69, 19, 0.9)',
        'rgba(0, 0, 0, 0.9)',
        'rgba(100, 100, 100, 0.9)',
        'rgba(0, 200, 150, 0.9)',
        'rgba(210, 0, 210, 0.9)',
        'rgba(128, 128, 0, 0.9)',
        'rgba(180, 180, 0, 0.9)',
        'rgba(0, 150, 255, 0.9)',
        'rgba(190, 0, 90, 0.9)',
        'rgba(90, 130, 0, 0.9)',
        'rgba(255, 0, 0, 0.9)',
        'rgba(0, 200, 0, 0.9)'
    ];

    function parseCurrency(str) {
        if (!str) return 0;
        return parseFloat(
            str.replace(/\./g, '').replace(',', '.')
        ) || 0;
    }

    try {
        const response = await fetch('data/mic_income.csv');
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        const csvText = await response.text();

        const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        });

        if (parsed.errors.length) {
            console.error("Errors parsing CSV:", parsed.errors);
            throw new Error("Could not parse CSV file.");
        }

        const data = parsed.data;
        const yearlyTotals = {};

        const regions = parsed.meta.fields.filter(field =>
            field && field !== 'Totale complessivo'
        );

        for (const row of data) {
            const period = row[""];

            if (!period || !period.includes('_')) {
                continue;
            }

            const year = parseInt(period.split('_')[1], 10);

            if (isNaN(year) || year < 2014 || year > 2024) {
                continue;
            }

            if (!yearlyTotals[year]) {
                yearlyTotals[year] = {};
                for (const region of regions) {
                    yearlyTotals[year][region] = 0;
                }
            }

            for (const region of regions) {
                yearlyTotals[year][region] += parseCurrency(row[region]);
            }
        }

        const regionTotalIncomes = {};
        for (const region of regions) {
            regionTotalIncomes[region] = 0;
            for (const year in yearlyTotals) {
                regionTotalIncomes[region] += yearlyTotals[year][region];
            }
        }

        const sortedRegions = Object.entries(regionTotalIncomes)
            .sort(([, totalA], [, totalB]) => totalB - totalA)
            .slice(0, 5)
            .map(([name]) => name);

        const top5Regions = new Set(sortedRegions);
        const labels = Object.keys(yearlyTotals).sort();

        const datasets = regions.map((region, index) => {
            const dataForRegion = labels.map(year => yearlyTotals[year][region]);
            const color = DISTINCT_COLORS[index % DISTINCT_COLORS.length];

            const isHidden = !top5Regions.has(region);

            return {
                label: region,
                data: dataForRegion,
                borderColor: color,
                backgroundColor: color,
                fill: false,
                tension: 0.1,
                borderWidth: 2,
                pointRadius: 3,
                hidden: isHidden
            };
        });


        const ctx = document.getElementById('chart');
        if (!ctx) {
            throw new Error("Could not find canvas element with id 'chart'");
        }


        const chartTitle = 'Total Annual Income by Region (2014-2024)';

        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false,
                        text: chartTitle
                    },
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('it-IT', {
                                        style: 'currency',
                                        currency: 'EUR'
                                    }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Income'
                        },
                        ticks: {
                            callback: function (value) {
                                return '€' + new Intl.NumberFormat('it-IT').format(value);
                            }
                        }
                    }
                }
            }
        });

        const titleElement = document.querySelector('.chart-title');
        if (titleElement) {
            titleElement.textContent = chartTitle;
        } else {
            console.warn("Could not find element with id 'map-title' to set the chart title.");
        }


    } catch (error) {
        console.error("Failed to create chart:", error);
        const container = document.getElementById('chart')?.parentElement;
        if (container) {
            container.innerHTML = `<p style="color: red; text-align: center;">Could not load chart: ${error.message}</p>`;
        }
    }

})();