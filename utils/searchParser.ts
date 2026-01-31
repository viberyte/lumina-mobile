// Extract city from search query - ONLY supported cities
export function extractCityFromQuery(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  // NYC boroughs (only the ones you support)
  if (lowerQuery.match(/\b(manhattan|midtown|downtown|uptown|east village|west village|soho|tribeca)\b/)) {
    return 'Manhattan';
  }
  if (lowerQuery.match(/\b(brooklyn|williamsburg|bushwick|park slope|dumbo|bed-stuy)\b/)) {
    return 'Brooklyn';
  }
  if (lowerQuery.match(/\b(queens|astoria|long island city|lic|flushing)\b/)) {
    return 'Queens';
  }
  
  // Other supported cities
  if (lowerQuery.match(/\b(philly|philadelphia)\b/)) {
    return 'Philadelphia';
  }
  if (lowerQuery.match(/\b(dc|washington)\b/)) {
    return 'Washington DC';
  }
  if (lowerQuery.match(/\b(newark|jersey city|hoboken)\b/)) {
    return 'Newark';
  }
  
  // NOT FOUND = use user's selected city
  return null;
}

// Clean city name from query for better search
export function stripCityFromQuery(query: string): string {
  return query
    .replace(/\b(in |at )?manhattan\b/gi, '')
    .replace(/\b(in |at )?brooklyn\b/gi, '')
    .replace(/\b(in |at )?queens\b/gi, '')
    .replace(/\b(in |at )?philly\b/gi, '')
    .replace(/\b(in |at )?philadelphia\b/gi, '')
    .replace(/\b(in |at )?(dc|washington)\b/gi, '')
    .replace(/\b(in |at )?(newark|jersey city|hoboken)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}
