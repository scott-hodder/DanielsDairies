export function getZoneState(childLevel) {
  var safeLevel = Number.isFinite(childLevel) ? childLevel : 1;
  var clampedLevel = Math.max(1, Math.min(20, Math.floor(safeLevel)));
  var zone = 1;

  if (clampedLevel >= 10) {
    zone = 4; // Level 10+ = Metropolis
  } else if (clampedLevel >= 7) {
    zone = 3; // Level 7-9 = City
  } else if (clampedLevel >= 4) {
    zone = 2; // Level 4-6 = Village
  } else {
    zone = 1; // Level 1-3 = Nature
  }

  if (zone === 1) {
    return {
      zone: 1,
      roadStyle: 'dirt',
      envStyle: 'nature',
      density: 0.1,
      backgroundImage: '/images/zones/zone1.webp',
      unlockedLayers: {
        trees: true,
        fences: false,
        houses: false,
        shops: false,
        skyline: false,
        streetLights: false,
        roadSigns: false
      }
    };
  }

  if (zone === 2) {
    return {
      zone: 2,
      roadStyle: 'packed',
      envStyle: 'village',
      density: 0.35,
      backgroundImage: '/images/zones/zone2.webp',
      unlockedLayers: {
        trees: true,
        fences: true,
        houses: true,
        shops: false,
        skyline: false,
        streetLights: false,
        roadSigns: true
      }
    };
  }

  if (zone === 3) {
    return {
      zone: 3,
      roadStyle: 'paved',
      envStyle: 'city',
      density: 0.65,
      backgroundImage: '/images/zones/zone3.webp',
      unlockedLayers: {
        trees: true,
        fences: true,
        houses: true,
        shops: true,
        skyline: false,
        streetLights: true,
        roadSigns: true
      }
    };
  }

  return {
    zone: 4,
    roadStyle: 'multi_lane',
    envStyle: 'metropolis',
    density: 1.0,
    backgroundImage: '/images/zones/zone4.webp',
    unlockedLayers: {
      trees: true,
      fences: true,
      houses: true,
      shops: true,
      skyline: true,
      streetLights: true,
      roadSigns: true
    }
  };
}
