document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const productData = extractProductData();
    chrome.runtime.sendMessage({ 
      action: "fetchEcoScore",
      itemCode: generateProductCode(productData.name),
      productName: productData.name,
      description: productData.description
    });
  }, 1000);
});

function extractProductData() {
  // Try multiple selectors for product name
  const productName = 
    document.querySelector('h1.product-title')?.innerText ||
    document.querySelector('h1.title')?.innerText ||
    document.querySelector('h1')?.innerText ||
    'Unknown Product';
    
  // Try multiple selectors for description
  const description =
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
  
  console.log('Extracted product data:', {
    name: productName,
    description: description,
    price: price,
    brand: brand
  });
  
  return { 
    name: productName.trim(),
    description: description.trim(),
    price: price.trim(),
    brand: brand.trim()
  };
}

function generateProductCode(productName) {
  // Generate a consistent code for the product
  return productName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 32);
}
