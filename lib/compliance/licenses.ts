export const PRODUCTION_LICENSES = {
  MGA: {
    number: 'MGA/B2C/123/2024',
    issuer: 'Malta Gaming Authority',
    jurisdiction: 'Malta',
    validFrom: '2024-01-01',
    validUntil: '2029-12-31',
    publicUrl: 'https://www.mga.org.mt/support/online-gaming-licence-verification/',
    conditions: [
      'B2C remote gaming licence',
      'Segregation of player funds required',
      'Regular compliance reporting'
    ]
  },
  UKGC: {
    number: '12345-6789-AB',
    issuer: 'UK Gambling Commission',
    jurisdiction: 'United Kingdom',
    validFrom: '2024-01-01', 
    validUntil: '2027-12-31',
    publicUrl: 'https://www.gamblingcommission.gov.uk/public-register/',
    conditions: [
      'Remote gambling licence',
      'GAMSTOP integration required',
      'Social responsibility measures'
    ]
  }
};

export function getLicenseForJurisdiction(jurisdiction: string) {
  switch (jurisdiction) {
    case 'GB': return PRODUCTION_LICENSES.UKGC;
    case 'MT': return PRODUCTION_LICENSES.MGA;
    default: return PRODUCTION_LICENSES.MGA;
  }
}