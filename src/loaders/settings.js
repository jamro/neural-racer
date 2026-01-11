

export const getAutoEvolveSetting = () => {
  return localStorage.getItem('autoEvolve') === 'true';
}

export const setAutoEvolveSetting = (autoEvolve) => {
  localStorage.setItem('autoEvolve', autoEvolve);
}

export const getSimulationSpeedSetting = () => {
  return localStorage.getItem('simulationSpeed') || 1;
}

export const setSimulationSpeedSetting = (simulationSpeed) => {
  localStorage.setItem('simulationSpeed', simulationSpeed);
}