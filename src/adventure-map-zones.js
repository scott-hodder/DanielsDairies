export function getZoneState(completedCount) {
  var safeCount = Number.isFinite(completedCount) ? completedCount : 0;
  var clamped = Math.max(0, Math.min(12, Math.floor(safeCount)));
  var zone = 1;

  if (clamped >= 9) {
    zone = 4;
  } else if (clamped >= 6) {
    zone = 3;
  } else if (clamped >= 3) {
    zone = 2;
  }

  if (zone === 1) {
    return {
      zone: 1,
      roadStyle: 'dirt',
      envStyle: 'nature',
      density: 0.1,
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
