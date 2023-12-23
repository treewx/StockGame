document.addEventListener('DOMContentLoaded', () => {
    const tickerForm = document.getElementById('tickerForm');
    const tickerInput = document.getElementById('tickerInput');
    
    const passButton = document.getElementById('passButton');
    passButton.addEventListener('click', () => {
        loadNextStockInSet();
    });
    const clearSetsButton = document.getElementById('clearSetsButton');
    clearSetsButton.addEventListener('click', function(event) {
        event.preventDefault(); // Prevent default action if it's an anchor tag
        clearAllSets();
    });

    const scoreDisplay = document.getElementById('currentScore');
    const companyNameElement = document.getElementById('companyName');
    const financialMetricElement = document.getElementById('financialMetric');
    const answerButtons = document.querySelectorAll('.answerButton');
    const metrics = ['RevenueTTM', 'MarketCapitalization', 'EBITDA', 'PERatio', 'ReturnOnEquityTTM', 'ProfitMargin'];
    const permanentSets = {
        "Dow Jones": ["MMM", "AXP", "AMGN", "AAPL", "BA", "CAT", "CVX", "CSCO", "KO", "DIS", "DOW", "GS", "HD", "HON", "IBM", "INTC", "JNJ", "JPM", "MCD", "MRK", "MSFT", "NKE", "PG", "CRM", "TRV", "UNH", "VZ", "V", "WBA", "WMT"],
        "FAANG": ["META", "AMZN", "AAPL", "NFLX", "NVDA", "GOOGL"],
        "Top 10": ["AAPL", "MSFT", "GOOG", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "LLY", "V"]
    };
      
    let stocksData = {}; // This object will store the data fetched from the API
    let currentScore = 0;
    let currentStock = null;
    let currentMetric = null;
    let currentSet = null;
    let currentMetricsIndex = {}; // Tracks the index of the current metric for each ticker
    let currentAttempts = 0;
    let topScores = {}; // Object to hold top scores for each set
    const savedTopScores = localStorage.getItem('topScores');
    if (savedTopScores) {
        topScores = JSON.parse(savedTopScores);
    }
    
    let setsData = { ...permanentSets }; // Start with permanent sets
    
    const savedSetsData = localStorage.getItem('setsData');
    if (savedSetsData) {
        const savedSets = JSON.parse(savedSetsData);
        setsData = { ...setsData, ...savedSets }; // Combine with saved sets
    }

    Object.keys(setsData).forEach(setName => addSetLink(setName));

    tickerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const tickers = tickerInput.value.trim().split(',').map(t => t.trim()).slice(0, 5);
        let setName = 'Set ' + (Object.keys(setsData).length + 1);
        while (setsData[setName]) {
            setName = 'Set ' + (Object.keys(setsData).length + 1);
        }
        setsData[setName] = tickers;
        addSetLink(setName);
        tickerInput.value = '';
        localStorage.setItem('setsData', JSON.stringify(setsData));
    
        // Load the first stock of the new set
        loadSet(setName);
    });
    
    
    
    function addSetLink(setName) {
    const setsLinksDiv = document.getElementById('setsLinks');
    const setLink = document.createElement('div');

    const linkButton = document.createElement('button');
    linkButton.textContent = setName + (setsData[setName] && setsData[setName].length > 0 ? ` (${setsData[setName][0]})` : '');
    linkButton.addEventListener('click', () => loadSet(setName));
    setLink.appendChild(linkButton);

    if (topScores[setName] !== undefined) {
        const scoreDisplay = document.createElement('p');
        scoreDisplay.textContent = `Top score: ${topScores[setName]}`;
        scoreDisplay.className = 'top-score-display'; // Add a class for CSS styling
        setLink.appendChild(scoreDisplay);
    }

    setsLinksDiv.appendChild(setLink);
}

   
    function updateSetLinksDisplay() {
        const setsLinksDiv = document.getElementById('setsLinks');
        setsLinksDiv.innerHTML = ''; // Clear existing links
        Object.keys(setsData).forEach(setName => addSetLink(setName));
    }    

    function clearAllSets() {
        // Keep only the permanent sets
        setsData = { ...permanentSets };
    
        // Update the sets stored in localStorage
        localStorage.setItem('setsData', JSON.stringify(setsData));
    
        // Update the display of set links
        const setsLinksDiv = document.getElementById('setsLinks');
        setsLinksDiv.innerHTML = ''; // Clear existing links
        Object.keys(setsData).forEach(setName => addSetLink(setName)); // Add back links for permanent sets
    }
    

    answerButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            checkAnswer(event.target.textContent);
        });
    });
    
    const ALPHA_VANTAGE_API_KEY = '6QE0V2GEOGEIN5J9'; // Replace with your API key

    function loadSet(setName) {
        currentSet = setName;
        setsData[setName].forEach(ticker => {
            if (currentMetricsIndex[ticker] === undefined) {
                currentMetricsIndex[ticker] = 0; // Initialize the index for each ticker
            }
        });
        if (setsData[setName].length > 0) {
            loadStock(setsData[setName][0]); // Load the first stock in the set
        }
    }
    
    

    // Modify the loadStock function to use the Alpha Vantage API
    function loadStock(ticker) {
    console.log(`Loading stock: ${ticker}`);
    currentStock = ticker;
    fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`)
    .then(response => response.json())
    .then(data => {
        console.log("API response for", ticker, ":", data); // This line is for debugging purposes. You can remove it later.

        if (data.Note) {
            alert('API request limit reached or an error occurred.');
            return;
        }
        if (!data.Symbol) {
            alert('Stock not found.');
            return;
        }
        processStockData(data);
    })
    .catch(error => {
        console.error('Error:', error); // This line logs the error to the console.
        alert('Error fetching data:', error); // This line shows the error to the user.
    });

    // After loading a stock, update the score display to show the current set
    scoreDisplay.textContent = `${currentSet}: ${currentScore}`;

    }

    function processStockData(stockData) {
        currentStock = stockData.Symbol;
        currentMetric = metrics[currentMetricsIndex[currentStock]];
    
         currentMetric = metrics[Math.floor(Math.random() * metrics.length)];
    
        if (!stocksData[currentStock]) {
            stocksData[currentStock] = {};
        }
    
        metrics.forEach(metric => {
            if (stockData[metric] !== undefined) {
                stocksData[currentStock][metric] = parseFloat(stockData[metric]);
            }
        });
        console.log(`Data for ${currentStock}:`, stocksData[currentStock]);

        updateGameBoard();
    }
    
    

    function updateGameBoard() {
        companyNameElement.textContent = currentStock;
        financialMetricElement.textContent = currentMetric;
    
        // Reset and hide answer buttons initially
        answerButtons.forEach(button => {
            button.textContent = '';
            button.style.display = 'none';  // Hide the button
        });
    
        setAnswerOptions(); // Then set the new answer options
    }
    
    

    function setAnswerOptions() {
        const nextButton = document.getElementById('nextButton');
    
        if (stocksData[currentStock] && stocksData[currentStock][currentMetric]) {
            const correctValue = stocksData[currentStock][currentMetric];
            let options = generateRandomOptions(correctValue, currentMetric);
            options.push(correctValue);
            options.sort(() => Math.random() - 0.5);
    
            const validOptions = options.every(option => isFinite(option));
    
            if (!validOptions) {
                answerButtons.forEach(button => {
                    button.style.display = 'none'; // Hide answer buttons
                });
                nextButton.style.display = 'inline-block'; // Show 'Next' button
                console.log(`Invalid data for ${currentMetric} of ${currentStock}`);
            } else {
                answerButtons.forEach((button, index) => {
                    button.textContent = formatAnswer(options[index], currentMetric);
                    button.style.display = 'inline-block'; // Show answer buttons
                });
                nextButton.style.display = 'none'; // Hide 'Next' button
            }
        } else {
            console.log(`Data not available for ${currentMetric} on ${currentStock}`);
        }
    }
    
    function formatAnswer(value, metric) {
        switch (metric) {
            case 'MarketCapitalization':
            case 'RevenueTTM':
            case 'EBITDA':
                return `$${(value / 1e9).toFixed(2)} B`; // Format in billions for these absolute value metrics
            case 'PERatio':
            case 'ReturnOnEquityTTM':
            case 'ProfitMargin':
                return value.toFixed(2); // Just a numerical value for ratios
            default:
                return value.toString(); // Default format
        }
    }
    
     
    function generateRandomOptions(correctValue, metric) {
    let options = new Set();
    let variationFactor = getVariationFactor(metric, correctValue);

    while (options.size < 2) {
        let randomValue = correctValue + (Math.random() - 0.5) * variationFactor;
        options.add(parseFloat(randomValue.toFixed(2))); // Round to two decimal places
    }

    return Array.from(options);
}

function getVariationFactor(metric, correctValue) {
    // Adjust the variation based on the metric
    switch (metric) {
        case 'MarketCapitalization':
            return correctValue * 0.4; // Example: 40% variation for Market Capitalization
        case 'RevenueTTM':
            return correctValue * 0.15; // Example: 15% variation for Revenue
        case 'EBITDA':
            return correctValue * 1.0; // Example: 100%? variation for EBITDA
        case 'PERatio':
            return 30; // Fixed variation of 30 for PE Ratio
        case 'ReturnOnEquityTTM':
            return 3; // Fixed variation of 3 for Return on Equity
        case 'ProfitMargin':
            return 1; // Fixed variation of 1 for Profit Margin
        default:
            return correctValue * 0.2; // Default variation for other metrics
    }
}

    
function checkAnswer(selectedValue) {
    if (stocksData[currentStock] && stocksData[currentStock][currentMetric]) {
        let correctValue = stocksData[currentStock][currentMetric];

        if (!isFinite(correctValue) || selectedValue === 'No data') {
            // Treat any selection as correct when there's no valid data
            currentScore += 2; // Award full points
            alert('Correct! Moving to next question.');
            currentAttempts = 0;
            loadNextStockInSet();
            return;
        }

        // Adjust the comparison logic based on the metric type
        let selectedNumber;
        if (currentMetric === 'MarketCapitalization' || currentMetric === 'RevenueTTM' || currentMetric === 'EBITDA') {
            correctValue = correctValue / 1e9; // Convert to billions
            selectedNumber = parseFloat(selectedValue.slice(1, -2)); // Extract the number
        } else {
            selectedNumber = parseFloat(selectedValue);
        }

        // Scoring based on attempts
        if (selectedNumber.toFixed(2) === correctValue.toFixed(2)) {
            // Correct answer
            if (currentAttempts === 0) {
                currentScore += 2; // 2 points for first attempt
            } else if (currentAttempts === 1) {
                currentScore += 1; // 1 point for second attempt
            }
            // No points for third attempt or later
            currentAttempts = 0;
            alert('Correct!');
            loadNextStockInSet(); // Load the next stock
        } else {
            // Incorrect answer
            currentAttempts++;
            if (currentAttempts < 3) {
                alert('Incorrect! Try again.');
            } else {
                alert('Incorrect! Moving to next question.');
                currentAttempts = 0;
                loadNextStockInSet(); // Load the next stock
            }
        }
        scoreDisplay.textContent = `${currentSet} - Score: ${currentScore}`;
        updateGameBoard();
    } else {
        console.log(`Data not available for ${currentMetric} on ${currentStock}`);
    }
}

    

    function loadNextStockInSet() {
        if (currentSet && setsData[currentSet]) {
            const currentSetTickers = setsData[currentSet];
            let tickerIndex = currentSetTickers.indexOf(currentStock);
    
            if (currentMetricsIndex[currentStock] < metrics.length - 1) {
                currentMetricsIndex[currentStock]++;
                currentMetric = metrics[currentMetricsIndex[currentStock]];
                updateGameBoard();
            } else if (tickerIndex < currentSetTickers.length - 1) {
                currentMetricsIndex[currentStock] = 0;
                currentMetric = metrics[0];
                loadStock(currentSetTickers[tickerIndex + 1]);
            } else {
                // End of the set
                let retry = confirm(`End of ${currentSet}. Final Score: ${currentScore}. Do you want to try again?`);
            if (!topScores[currentSet] || currentScore > topScores[currentSet]) {
                topScores[currentSet] = currentScore; // Update top score if it's higher
                localStorage.setItem('topScores', JSON.stringify(topScores)); // Save to localStorage
                updateSetLinksDisplay(); // Update the display of set links with scores
            }

                if (retry) {
                    // Reset metrics index for each ticker and restart the set
                    setsData[currentSet].forEach(ticker => {
                        currentMetricsIndex[ticker] = 0;
                    });
                    currentScore = 0; // Reset score if needed
                    loadStock(setsData[currentSet][0]); // Start from the first stock again
                }
            }
        }
    }
    
    
    

    
});
