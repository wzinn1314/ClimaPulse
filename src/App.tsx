import { useState, useEffect } from 'react';
import { getWeatherByCity, getWeatherByCoords } from './service/api';
import type { WeatherData } from './types/weather';
import { GlobeMap } from './components/GlobeMap';
import logoIcon from '/logo.svg'; // Usa a logo da pasta public
import './App.css';


const countryNames: Record<string, boolean> = {
  BR: true, BRA: true, BRASIL: true, BRAZIL: true,
  US: true, USA: true, 'ESTADOS UNIDOS': true,
  AR: true, ARGENTINA: true, PT: true, PORTUGAL: true,
  ES: true, ESPANHA: true, FR: true, FRANÇA: true,
  IT: true, ITÁLIA: true, DE: true, ALEMANHA: true,
  JP: true, JAPÃO: true, CN: true, CHINA: true,
  RU: true, RÚSSIA: true, CA: true, CANADÁ: true,
  MX: true, MÉXICO: true, CL: true, CHILE: true,
  UY: true, URUGUAI: true, PY: true, PARAGUAI: true,
  CO: true, COLÔMBIA: true,
};

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [citySearch, setCitySearch] = useState<string>('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: -23.5505, lon: -46.6333 });
  const [loading, setLoading] = useState<boolean>(true);
  const [flagUrl, setFlagUrl] = useState<string>('');
  const [locationType, setLocationType] = useState<string>('Cidade');

  // Controle dos 2 segundos da Splash Screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const detectLocationType = (query: string, data: WeatherData): string => {
    const cleanQuery = query.trim().toUpperCase();
    const parts = cleanQuery.split(',').map((p) => p.trim());
    const countryCode = data.sys?.country?.toUpperCase();

    if (
      countryNames[cleanQuery] ||
      cleanQuery === countryCode ||
      (parts.length === 1 && countryNames[parts[0]])
    ) {
      return 'País';
    }


    return 'Cidade';
  };

  const resolveFlag = (query: string, countryCode?: string) => {
    const parts = query.split(',').map((p) => p.trim().toUpperCase());
    
    

    const cityNameFormatted = parts[0].toLowerCase().replace(/\s+/g, '-');
    if (countryCode === 'BR') {
      return `https://raw.githubusercontent.com/felipefdl/cidades-brasileiras-flags/master/png/${cityNameFormatted}.png`;
    }

    return countryCode ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png` : '';
  };

  const fetchByCity = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await getWeatherByCity(query);
      if (response.data) {
        const type = detectLocationType(query, response.data);
        setLocationType(type);

        if (type === 'País') {
          const cCode = response.data.sys?.country?.toLowerCase();
          setFlagUrl(`https://flagcdn.com/w40/${cCode}.png`);
        } else {
          setFlagUrl(resolveFlag(query, response.data.sys?.country));
        }

        setWeatherData(response.data);
        if (response.data.coord) {
          setCoords({ lat: response.data.coord.lat, lon: response.data.coord.lon });
        }
      }
      setCitySearch('');
    } catch {
      alert('Local não encontrado. Tente no formato: Cidade, Estado, País');
    } finally {
      setLoading(false);
    }
  };

  const loadUserLocationWeather = () => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await getWeatherByCoords(latitude, longitude);
            if (response.data) {
              setWeatherData(response.data);
              setCoords({ lat: latitude, lon: longitude });
              setFlagUrl(`https://flagcdn.com/w40/${response.data.sys?.country?.toLowerCase()}.png`);
              setLocationType('Cidade');
            }
          } catch {
            fetchByCity('São Paulo, SP, BR');
          } finally {
            setLoading(false);
          }
        },
        () => fetchByCity('São Paulo, SP, BR')
      );
    } else {
      fetchByCity('São Paulo, SP, BR');
    }
  };

  useEffect(() => {
    loadUserLocationWeather();
  }, []);

  const formatTime = (timestamp?: number, timezoneOffset: number = 0) => {
    if (!timestamp) return '--:--';
    const date = new Date((timestamp + timezoneOffset) * 1000);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  
  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <img src={logoIcon} alt="ClimaPulse Logo" className="splash-logo" />
          <h1 className="splash-title">Seja bem-vindo ao <span>CLIMAPULSE</span></h1>
          <p className="splash-subtitle">Carregando dados meteorológicos...</p>
          <div className="splash-loader"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="globe-app-container">
      
      {weatherData && (
        <GlobeMap
          lat={coords.lat}
          lon={coords.lon}
          weatherData={weatherData}
        />
      )}

      
      <header className="compact-header">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={logoIcon} alt="ClimaPulse Logo" style={{ width: '24px', height: '24px' }} />
          <h1>CLIMA<span>PULSE</span></h1>
        </div>

        <div className="search-bar">
          <input
            type="text"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchByCity(citySearch)}
            placeholder="Cidade, Estado ou País..."
          />
          
          <button onClick={() => fetchByCity(citySearch)} title="Buscar">
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button className="geo-btn" onClick={loadUserLocationWeather} title="Localização Atual">
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </button>
        </div>
      </header>

      
      {weatherData && !loading && (
        <aside className="weather-hud">
          <div className="hud-main">
            {flagUrl && (
              <img
                src={flagUrl}
                alt="Bandeira do local"
                className="country-flag"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://flagcdn.com/w40/${weatherData.sys?.country?.toLowerCase()}.png`;
                }}
              />
            )}
            <div>
              <h2>{weatherData.name}</h2>
              <span className="hud-temp">{Math.round(weatherData.main.temp)}°C</span>
              
              <p className="hud-desc">
                {weatherData.weather?.[0]?.description || ''}
                <span className="location-type-badge">• {locationType}</span>
              </p>
            </div>
          </div>

          <div className="hud-stats-grid">
            <div className="stat-item">
              <span>Mín / Máx</span>
              <strong>{Math.round(weatherData.main.temp_min)}°C / {Math.round(weatherData.main.temp_max)}°C</strong>
            </div>

            <div className="stat-item">
              <span>Sensação</span>
              <strong>{Math.round(weatherData.main.feels_like)}°C</strong>
            </div>

            <div className="stat-item">
              <span>Umidade</span>
              <strong>{weatherData.main.humidity}%</strong>
            </div>

            <div className="stat-item">
              <span>Vento</span>
              <strong>{weatherData.wind.speed} km/h</strong>
            </div>

            <div className="stat-item">
              <span>Pressão</span>
              <strong>{weatherData.main.pressure} hPa</strong>
            </div>

            <div className="stat-item">
              <span>Nebulosidade</span>
              <strong>{weatherData.clouds?.all || 0}%</strong>
            </div>

            <div className="stat-item">
              <span>Visibilidade</span>
              <strong>{((weatherData.visibility || 0) / 1000).toFixed(1)} km</strong>
            </div>

            <div className="stat-item">
              <span>Nascer do Sol</span>
              <strong>{formatTime(weatherData.sys?.sunrise, weatherData.timezone)}</strong>
            </div>

            <div className="stat-item">
              <span>Pôr do Sol</span>
              <strong>{formatTime(weatherData.sys?.sunset, weatherData.timezone)}</strong>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}