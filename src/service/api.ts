import axios from 'axios';

const API_KEY = '7f18bcf7e9cb3ee5387a722fd1a363fb';

const api = axios.create({
  baseURL: 'https://api.openweathermap.org/',
});

export interface GeoLocation {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

// 🔍 Busca dinamicamente qualquer cidade/estado/país no mundo todo
export const searchLocations = (query: string) => {
  return api.get<GeoLocation[]>('geo/1.0/direct', {
    params: {
      q: query,
      limit: 5,
      appid: API_KEY,
    },
  });
};

// Busca clima por nome
export const getWeatherByCity = (city: string) => {
  return api.get('data/2.5/weather', {
    params: {
      q: city,
      units: 'metric',
      lang: 'pt_br',
      appid: API_KEY,
    },
  });
};

// Busca clima por coordenadas (Preciso para a busca via Autocomplete)
export const getWeatherByCoords = (lat: number, lon: number) => {
  return api.get('data/2.5/weather', {
    params: {
      lat,
      lon,
      units: 'metric',
      lang: 'pt_br',
      appid: API_KEY,
    },
  });
};