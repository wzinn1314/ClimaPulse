import axios from 'axios';

// Cole sua API Key aqui entre as aspas
const API_KEY = '7f18bcf7e9cb3ee5387a722fd1a363fb';

const api = axios.create({
  baseURL: 'https://api.openweathermap.org/data/2.5/',
});

// Busca por nome da cidade
export const getWeatherByCity = (city: string) => {
  return api.get('weather', {
    params: {
      q: city,
      units: 'metric',
      lang: 'pt_br',
      appid: API_KEY,
    },
  });
};

// Busca por coordenadas (Geolocalização)
export const getWeatherByCoords = (lat: number, lon: number) => {
  return api.get('weather', {
    params: {
      lat,
      lon,
      units: 'metric',
      lang: 'pt_br',
      appid: API_KEY,
    },
  });
};