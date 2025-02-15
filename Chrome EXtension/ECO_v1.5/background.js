chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchEcoScore") {
    (async () => {
      try {
        // Check if Gemini API key is available
        if (!GEMINI_API_KEY) {
          throw new Error('Gemini API key not configured');
        }

        // Calculate eco-score and get alternatives
        let ecoResponse;
        try {
          // First try to get carbon footprint from Gemini
          const carbonFootprint = await calculateCarbonFootprint(request.productName, request.description);
          console.log('Calculated carbon footprint:', carbonFootprint);
          
          // Calculate other environmental factors using fallback methods
          const productHash = request.productName.split('').reduce((acc, char, idx) => 
            acc + char.charCodeAt(0) * (idx + 1), 0);
            
          const dynamicValues = {
            carbonFootprint: carbonFootprint,
            waterUsage: 1 + (productHash % 500) / 50,
            energyConsumption: 0.1 + (productHash % 300) / 150,
            toxicity: 1 + (productHash % 100) / 25
          };

          const ecoScore = calculateLocalEcoScore(request.productName, dynamicValues);
          console.log('Calculated eco score:', ecoScore);

          const alternatives = await generateAlternatives(request.productName);
          console.log('Generated alternatives:', alternatives);

          ecoResponse = {
            json: async () => ({
              eco_score: ecoScore,
              alternatives: alternatives,
              carbonFootprint: carbonFootprint,
              waterUsage: dynamicValues.waterUsage,
              energyConsumption: dynamicValues.energyConsumption,
              toxicity: dynamicValues.toxicity
            })
          };
        } catch (error) {
          console.warn("Gemini API failed, using local calculation");
          const productHash = request.productName.split('').reduce((acc, char, idx) => 
            acc + char.charCodeAt(0) * (idx + 1), 0);
            
          const dynamicValues = {
            carbonFootprint: 2 + (productHash % 100) / 10,
            waterUsage: 1 + (productHash % 500) / 50,
            energyConsumption: 0.1 + (productHash % 300) / 150,
            toxicity: 1 + (productHash % 100) / 25
          };

          const ecoScore = calculateLocalEcoScore(request.productName, dynamicValues);
          const alternatives = await generateAlternatives(request.productName);

          ecoResponse = {
            json: async () => ({
              eco_score: ecoScore,
              alternatives: alternatives,
              carbonFootprint: dynamicValues.carbonFootprint,
              waterUsage: dynamicValues.waterUsage,
              energyConsumption: dynamicValues.energyConsumption,
              toxicity: dynamicValues.toxicity
            })
          };
        }
        
        const ecoData = await ecoResponse.json();
        console.log('Final eco data:', ecoData);

        sendResponse({
          score: ecoData.eco_score,
          alternatives: ecoData.alternatives.map(alt => ({
            name: alt.name,
            score: alt.score,
            improvement: ((alt.score - ecoData.eco_score) / ecoData.eco_score * 100).toFixed(1) + '%'
          })),
          details: {
            carbon: ecoData.carbonFootprint,
            water: ecoData.waterUsage,
            energy: ecoData.energyConsumption,
            toxicity: ecoData.toxicity
          }
        });
      } catch (error) {
        console.error("Error in eco-score calculation:", error);
        sendResponse({ 
          score: "Service Unavailable", 
          alternatives: ["Using local calculation"],
          details: {
            carbon: 0,
            water: 0,
            energy: 0,
            toxicity: 0
          }
        });
      }
    })();
    return true;
  }
});

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GEMINI_API_KEY = 'API KEY HERE';

function calculateLocalEcoScore(productName, values) {
  const category = detectProductCategory(productName);
  const categoryWeights = {
    electronics: { carbon: 50, water: 20, energy: 60, toxicity: 40, recyclability: 30 },
    clothing: { carbon: 30, water: 50, energy: 20, toxicity: 30, recyclability: 40 },
    food: { carbon: 40, water: 60, energy: 30, toxicity: 20, recyclability: 10 },
    furniture: { carbon: 35, water: 25, energy: 40, toxicity: 30, recyclability: 50 }
  };
  
  const weights = categoryWeights[category] || 
    { carbon: 40, water: 30, energy: 20, toxicity: 10 };
    
  const maxCarbon = category === 'electronics' ? 10 : 
        category === 'clothing' ? 5 : 
        category === 'furniture' ? 8 : 3;
  const maxWater = category === 'food' ? 100 : 
       category === 'clothing' ? 50 : 
       category === 'furniture' ? 30 : 20;
  const maxEnergy = category === 'electronics' ? 50 : 
        category === 'food' ? 10 : 
        category === 'furniture' ? 20 : 5;
  const maxToxicity = 10;
  const maxRecyclability = 100;

  const normalizedCarbon = Math.min(1, values.carbonFootprint / maxCarbon);
  const normalizedWater = Math.min(1, values.waterUsage / maxWater);
  const normalizedEnergy = Math.min(1, values.energyConsumption / maxEnergy);
  const normalizedToxicity = Math.min(1, values.toxicity / maxToxicity);
  const normalizedRecyclability = Math.min(1, (values.recyclability || 0) / maxRecyclability);

  return Math.max(0, 100 - 
    (normalizedCarbon * weights.carbon + 
     normalizedWater * weights.water + 
     normalizedEnergy * weights.energy + 
     normalizedToxicity * weights.toxicity -
     normalizedRecyclability * weights.recyclability));
}

function detectProductCategory(productName) {
  if (!productName || typeof productName !== 'string') {
    return 'other';
  }
  const categories = {
    electronics: ['phone', 'laptop', 'tv', 'camera'],
    clothing: ['shirt', 'dress', 'pants', 'jacket'],
    food: ['coffee', 'tea', 'chocolate', 'snack']
  };
  
  const lowerName = productName.toLowerCase();
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }
  return 'other';
}

async function calculateCarbonFootprint(productName, description) {
  try {
    const prompt = `Calculate the carbon footprint in kg CO2 for this product:
    Name: ${productName}
    Description: ${description}
    
    Return only the numeric value without any units or explanations.`;
    
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) throw new Error('Gemini API request failed');
    
    const data = await response.json();
    const carbonFootprint = parseFloat(data.candidates[0].content.parts[0].text);
    
    if (isNaN(carbonFootprint)) throw new Error('Invalid carbon footprint value');
    
    return carbonFootprint;
  } catch (error) {
    console.error('Error calculating carbon footprint:', error);
    throw error; // Let the calling function handle the fallback
  }
}

async function generateAlternatives(productName) {
  if (!productName || typeof productName !== 'string') {
    return [];
  }

  try {
    const prompt = `Suggest 3 eco-friendly and sustainable alternatives for ${productName}. 
    For each alternative, provide: 
    1. Product name
    2. Brief description of why it's more sustainable
    3. Estimated eco-score improvement (as a percentage)`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) throw new Error('Failed to fetch suggestions from Gemini API');

    const data = await response.json();
    const suggestions = data.candidates[0].content.parts[0].text.split('\n').filter(line => line.trim() !== '');
    
    const alternatives = [];
    for (let i = 0; i < suggestions.length; i += 3) {
      const name = suggestions[i].replace(/^\d+\.\s*/, '');
      const description = suggestions[i+1];
      const improvement = suggestions[i+2].match(/\d+/)?.[0] || '10';
      
      alternatives.push({
        name: name,
        description: description,
        score: Math.min(100, 50 + Number(improvement)), // Base score of 50 + improvement
        improvement: `${improvement}%`
      });
    }
    
    return alternatives;

  } catch (error) {
    console.error('Error fetching alternatives:', error);
    const improvements = {
      electronics: [25, 15, 30],
      clothing: [20, 10, 25],
      food: [15, 10, 20],
      other: [10, 5, 15]
    };
    
    const category = detectProductCategory(productName);
    const [imp1, imp2, imp3] = improvements[category] || improvements.other;

    const alternatives = [
      { 
        name: `Eco-friendly ${productName}`,
        score: Math.min(100, 50 + imp1 + Math.random() * 5)
      },
      {
        name: `Sustainable ${productName}`,
        score: Math.min(100, 50 + imp2 + Math.random() * 3)
      },
      {
        name: `Green ${productName}`,
        score: Math.min(100, 50 + imp3 + Math.random() * 7)
      }
    ];
    
    return alternatives.sort((a, b) => b.score - a.score);
  }
}
