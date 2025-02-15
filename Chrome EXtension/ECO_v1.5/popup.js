// Add error handling for button click
document.getElementById('analyze').addEventListener('click', async (e) => {
  e.preventDefault();
  console.log('Analyze button clicked');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }
    console.log('Executing script on tab:', tab.id);
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: analyzeProduct
    });
    
    if (!results || !results[0]?.result) {
      throw new Error('Failed to analyze product');
    }
    
    const productData = results[0].result;
    // Process the product data
      const response = await chrome.runtime.sendMessage({ 
        action: 'fetchEcoScore', 
        itemCode: productData.name,
        productName: productData.name
      });

      // Safely update UI elements
      const mainScore = document.getElementById('main-score');
      const mainProduct = document.getElementById('main-product');
      const alternatives = document.getElementById('alternatives');
      
      if (mainScore && response?.score) {
        mainScore.textContent = response.score;
      }
      
      if (mainProduct && response?.details) {
const detailsHtml = `
  <div class="detail-item">Carbon: ${response.details.carbon || 0} kg CO2</div>
  <div class="detail-item">Water: ${response.details.water || 0} liters</div>
  <div class="detail-item">Energy: ${response.details.energy || 0} kWh</div>
  <div class="detail-item">Toxicity: ${response.details.toxicity || 0}</div>
  <div class="detail-item">Recyclability: ${response.details.recyclability || 0}%</div>
`;

        mainProduct.innerHTML = detailsHtml;
      }
      
      if (alternatives && response?.alternatives) {
        const alternativesHtml = (response.alternatives || []).map(alt => `
          <div class="product-card">
            <div class="product-name">${alt.name || 'Unknown'}</div>
            <div class="product-details">
            Eco-Score: <span class="eco-score">${alt.score || 0}</span>
            <span class="improvement">${calculateImprovement(response.score, alt.score)}</span>

            </div>
          </div>
        `).join('');
        alternatives.innerHTML = alternativesHtml;
      }

  } catch (error) {
    console.error('Error in analysis process:', error);
    const resultElement = document.getElementById('result');
    if (resultElement) {
      let errorDetails = '';
      if (error.message.includes('Failed to analyze product')) {
        errorDetails = 'Could not extract product information from the page.';
      } else if (error.message.includes('No active tab found')) {
        errorDetails = 'No active tab available for analysis.';
      } else if (error.message.includes('Service Unavailable')) {
        errorDetails = 'Eco-score services are currently unavailable. Using local calculation.';
      } else {
        errorDetails = 'An unexpected error occurred. Please try again.';
      }
      
      resultElement.innerHTML = `
        <div class="error">
          <h3>Analysis Failed</h3>
          <p>${errorDetails}</p>
          <p>Technical details: ${error.message}</p>
        </div>
      `;
    }
  }
});

function calculateImprovement(baseScore, altScore) {
  if (!baseScore || !altScore || baseScore === 0) return '';
  
  const improvement = ((altScore - baseScore) / baseScore * 100);
  if (isNaN(improvement) || !isFinite(improvement)) return '';
  
  const rounded = Math.round(improvement);
  return `(${rounded > 0 ? '+' : ''}${rounded}%)`;
}

function analyzeProduct() {
  try {
    // Try multiple selectors for product name
    const productName = 
      document.querySelector('h1.product-title')?.innerText ||
      document.querySelector('h1.title')?.innerText ||
      document.querySelector('h1')?.innerText ||
      'Unknown Product';
      
    // Try multiple selectors for description
    const productDescription =
      document.querySelector('.product-description')?.innerText ||
      document.querySelector('.description')?.innerText ||
      document.querySelector('#productDescription')?.innerText ||
      '';
      
    // Try multiple selectors for price
    const price =
      document.querySelector('.price')?.innerText ||
      document.querySelector('.product-price')?.innerText ||
      document.querySelector('[itemprop="price"]')?.innerText ||
      'N/A';
      
    // Try multiple selectors for brand
    const brand =
      document.querySelector('.brand')?.innerText ||
      document.querySelector('[itemprop="brand"]')?.innerText ||
      document.querySelector('.product-brand')?.innerText ||
      'Unknown';
    
    if (!productName || productName === 'Unknown Product') {
      throw new Error('Could not find product name on the page');
    }
    
    console.log('Analyzed product:', {
      name: productName,
      description: productDescription,
      price: price,
      brand: brand
    });
    
    return { 
      name: productName.trim(),
      description: productDescription.trim(),
      price: price.trim(),
      brand: brand.trim()
    };
  } catch (error) {
    console.error('Error in analyzeProduct:', error);
    return { 
      name: 'Error', 
      description: error.message,
      price: 'N/A',
      brand: 'Unknown'
    };
  }
}
