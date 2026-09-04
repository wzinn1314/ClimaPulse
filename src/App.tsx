import { useState, useEffect, useRef } from 'react';
import { getWeatherByCoords, searchLocations, getWeatherByCity, type GeoLocation } from './service/api';
import type { WeatherData } from './types/weather';
import { GlobeMap } from './components/GlobeMap';
import logoIcon from '/logo.svg';
import './App.css';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [citySearch, setCitySearch] = useState<string>('');
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: -23.5505, lon: -46.6333 });
  const [loading, setLoading] = useState<boolean>(true);
  const [flagUrl, setFlagUrl] = useState<string>('');
  const [locationType, setLocationType] = useState<string>('Cidade');
  const [isHudExpanded, setIsHudExpanded] = useState<boolean>(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Oculta sugestões ao clicar fora do input
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔍 Debounce da Busca Global na API do OpenWeather
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (citySearch.trim().length >= 2) {
        try {
          const res = await searchLocations(citySearch);
          setSuggestions(res.data);
          setShowDropdown(true);
        } catch {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [citySearch]);

  // Carrega Clima por Coordenadas Exatas (Vindo da Busca/Autocomplete)
  const fetchWeatherByLocation = async (loc: GeoLocation) => {
    setLoading(true);
    setShowDropdown(false);
    try {
      const res = await getWeatherByCoords(loc.lat, loc.lon);
      if (res.data) {
        setWeatherData(res.data);
        setCoords({ lat: loc.lat, lon: loc.lon });
        
        // Define o tipo e resolvedor de bandeira
        const type = loc.state ? 'Cidade' : 'País/Região';
        setLocationType(type);
        setFlagUrl(`https://flagcdn.com/w40/${loc.country.toLowerCase()}.png`);
      }
      setCitySearch(`${loc.name}${loc.state ? `, ${loc.state}` : ''} (${loc.country})`);
    } catch {
      alert('Erro ao carregar dados do local selecionado.');
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
            const res = await getWeatherByCoords(latitude, longitude);
            if (res.data) {
              setWeatherData(res.data);
              setCoords({ lat: latitude, lon: longitude });
              setFlagUrl(`https://flagcdn.com/w40/${res.data.sys?.country?.toLowerCase()}.png`);
              setLocationType('Cidade');
            }
          } catch {
            fetchDefaultCity();
          } finally {
            setLoading(false);
          }
        },
        () => fetchDefaultCity()
      );
    } else {
      fetchDefaultCity();
    }
  };

  const fetchDefaultCity = async () => {
    const res = await getWeatherByCity('São Paulo');
    if (res.data) {
      setWeatherData(res.data);
      setCoords({ lat: res.data.coord.lat, lon: res.data.coord.lon });
      setFlagUrl('https://flagcdn.com/w40/br.png');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserLocationWeather();
  }, []);

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
      <div className="globe-viewport">
        {weatherData && (
          <GlobeMap lat={coords.lat} lon={coords.lon} weatherData={weatherData} />
        )}
      </div>

      <header className="compact-header">
        <div className="brand">
          <img src={logoIcon} alt="ClimaPulse Logo" />
          <h1>CLIMA<span>PULSE</span></h1>
        </div>

        <div className="search-bar-wrapper" ref={searchContainerRef}>
          <div className="search-bar">
            <input
              type="text"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="Buscar qualquer cidade no mundo..."
            />

            <button className="geo-btn" onClick={loadUserLocationWeather} title="Localização Atual">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </button>
          </div>

          {/* 🌐 Autocomplete Dinâmico em Tempo Real */}
          {showDropdown && suggestions.length > 0 && (
            <ul className="search-suggestions">
              {suggestions.map((loc, idx) => (
                <li key={`${loc.lat}-${loc.lon}-${idx}`} onClick={() => fetchWeatherByLocation(loc)}>
                  <div className="suggestion-info">
                    <span className="suggestion-name">{loc.name}</span>
                    <span className="suggestion-sub">
                      {loc.state ? `${loc.state}, ` : ''}{loc.country}
                    </span>
                  </div>
                  <span className="badge badge-cidade">
                    {loc.state ? 'Cidade/UF' : 'País'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {weatherData && !loading && (
        <aside className={`weather-hud ${isHudExpanded ? 'expanded' : ''}`}>
          <div className="hud-header-toggle" onClick={() => setIsHudExpanded(!isHudExpanded)}>
            <div className="hud-main">
              {flagUrl && <img src={flagUrl} alt="Bandeira" className="country-flag" />}
              <div>
                <h2>{weatherData.name}</h2>
                <span className="hud-temp">{Math.round(weatherData.main.temp)}°C</span>
                <p className="hud-desc">
                  {weatherData.weather?.[0]?.description || ''}
                  <span className="location-type-badge">• {locationType}</span>
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}