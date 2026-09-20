import { useState, useEffect, useRef } from 'react';
import { getWeatherByCoords, searchLocations, type GeoLocation } from './service/api';
import type { WeatherData } from './types/weather';
import { GlobeMap } from './components/GlobeMap';
import logoIcon from '/logo.svg';
import './App.css';

const countries = new Intl.DisplayNames(['pt-BR'], { type: 'region' });
const countryName = (code: string) => code ? countries.of(code) || code : '';
const locationName = (loc: GeoLocation) => loc.local_names?.pt || loc.name;
const locationLabel = (loc: GeoLocation) => [locationName(loc), loc.state, countryName(loc.country)].filter(Boolean).join(', ');
const defaultLocation: GeoLocation = { name: 'São Paulo', state: 'São Paulo', country: 'BR', lat: -23.5505, lon: -46.6333 };
const localTime = (timestamp: number, offset: number) => new Date((timestamp + offset) * 1000).toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [citySearch, setCitySearch] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [isHudExpanded, setIsHudExpanded] = useState(true);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const weatherRequest = useRef(0);
  const searchRequest = useRef(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      // Keep the layout above the on-screen keyboard, without disabling zoom.
      if (!viewport || viewport.scale === 1) {
        document.documentElement.style.setProperty('--app-height', `${viewport?.height ?? window.innerHeight}px`);
      }
    };
    resize();
    viewport?.addEventListener('resize', resize);
    window.addEventListener('resize', resize);
    return () => {
      viewport?.removeEventListener('resize', resize);
      window.removeEventListener('resize', resize);
      document.documentElement.style.removeProperty('--app-height');
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++searchRequest.current;
    if (query.trim().length < 2) {
      setSearching(false);
      return () => controller.abort();
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await searchLocations(query.trim(), controller.signal);
        if (controller.signal.aborted || request !== searchRequest.current) return;
        setSuggestions(data.filter((loc, index) => data.findIndex(other => other.lat === loc.lat && other.lon === loc.lon) === index));
      } catch {
        if (!controller.signal.aborted && request === searchRequest.current) setSearchError('Não foi possível buscar. Tente novamente.');
      } finally {
        if (!controller.signal.aborted && request === searchRequest.current) setSearching(false);
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const fetchWeather = async (loc: GeoLocation, request: number, useWeatherName = false) => {
    try {
      const { data } = await getWeatherByCoords(loc.lat, loc.lon);
      if (request !== weatherRequest.current) return;
      const resolved = useWeatherName ? { ...loc, name: data.name || 'Localização atual', country: data.sys.country || loc.country } : loc;
      setWeatherData(data);
      setSelectedLocation(resolved);
      setCitySearch(locationLabel(resolved));
    } catch {
      if (request === weatherRequest.current) setNotice('Não foi possível carregar o clima. Tente selecionar o local novamente.');
    } finally {
      if (request === weatherRequest.current) setLoading(false);
    }
  };

  const clearSearch = () => {
    searchInputRef.current?.blur();
    ++searchRequest.current;
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setSearching(false);
    setActiveIndex(-1);
  };

  const selectLocation = (loc: GeoLocation) => {
    clearSearch();
    setCitySearch(locationLabel(loc));
    setLoading(true);
    setNotice('');
    void fetchWeather(loc, ++weatherRequest.current);
  };

  const loadUserLocationWeather = () => {
    const request = ++weatherRequest.current;
    clearSearch();
    setLoading(true);
    setNotice('');
    const fallback = () => {
      if (request !== weatherRequest.current) return;
      setNotice('Localização indisponível. Exibindo São Paulo; você pode buscar outra cidade.');
      void fetchWeather(defaultLocation, request);
    };
    if (!navigator.geolocation) { fallback(); return; }
    navigator.geolocation.getCurrentPosition(position => {
      if (request !== weatherRequest.current) return;
      void fetchWeather({ name: 'Localização atual', country: '', lat: position.coords.latitude, lon: position.coords.longitude }, request, true);
    }, fallback, { timeout: 10000, maximumAge: 60000 });
  };

  useEffect(() => {
    const requestTracker = weatherRequest;
    loadUserLocationWeather();
    return () => { ++requestTracker.current; };
  }, []);

  if (showSplash) return <div className="splash-screen"><div className="splash-content">
    <img src={logoIcon} alt="ClimaPulse" className="splash-logo" />
    <h1 className="splash-title">Seja bem-vindo ao <span>CLIMAPULSE</span></h1>
    <p className="splash-subtitle">Carregando dados meteorológicos...</p><div className="splash-loader" />
  </div></div>;

  const stats = weatherData ? [
    ['Sensação térmica', `${Math.round(weatherData.main.feels_like)} °C`],
    ['Umidade', `${weatherData.main.humidity}%`],
    ['Vento', `${(weatherData.wind.speed * 3.6).toFixed(1)} km/h`],
    ['Pressão', `${weatherData.main.pressure} hPa`],
    ['Visibilidade', `${(weatherData.visibility / 1000).toLocaleString('pt-BR')} km`],
    ['Nuvens', `${weatherData.clouds.all}%`],
    ...(weatherData.wind.gust != null ? [['Rajadas', `${(weatherData.wind.gust * 3.6).toFixed(1)} km/h`]] : []),
    ...(weatherData.rain?.['1h'] != null ? [['Chuva (1 h)', `${weatherData.rain['1h']} mm`]] : []),
    ...(weatherData.snow?.['1h'] != null ? [['Neve (1 h)', `${weatherData.snow['1h']} mm`]] : []),
    ...(weatherData.sys.sunrise ? [['Nascer do sol', localTime(weatherData.sys.sunrise, weatherData.timezone)]] : []),
    ...(weatherData.sys.sunset ? [['Pôr do sol', localTime(weatherData.sys.sunset, weatherData.timezone)]] : []),
  ] : [];

  return <div className="globe-app-container">
    <div className="globe-viewport">{weatherData && selectedLocation && <GlobeMap lat={selectedLocation.lat} lon={selectedLocation.lon} weatherData={weatherData} locationName={locationName(selectedLocation)} />}</div>
    <header className="compact-header">
      <div className="brand"><img src={logoIcon} alt="ClimaPulse" /><h1>CLIMA<span>PULSE</span></h1></div>
      <div className="search-bar-wrapper" ref={searchContainerRef}>
        <div className="search-bar">
          <input ref={searchInputRef} autoComplete="off" enterKeyHint="search" type="text" role="combobox" aria-label="Buscar cidade" aria-autocomplete="list" aria-expanded={showDropdown && query.trim().length >= 2} aria-controls="location-results" aria-activedescendant={activeIndex >= 0 ? `location-${activeIndex}` : undefined}
            value={citySearch} onChange={event => {
              ++searchRequest.current;
              setCitySearch(event.target.value); setQuery(event.target.value); setSuggestions([]); setSearchError(''); setActiveIndex(-1); setSearching(event.target.value.trim().length >= 2); setShowDropdown(true);
            }} onFocus={() => setShowDropdown(true)} onKeyDown={event => {
              if (event.key === 'Escape') { setShowDropdown(false); setActiveIndex(-1); searchInputRef.current?.blur(); }
              if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
                event.preventDefault(); setShowDropdown(true);
                setActiveIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length);
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                if (showDropdown && activeIndex >= 0 && suggestions[activeIndex]) selectLocation(suggestions[activeIndex]);
                else setShowDropdown(true);
              }
            }} placeholder="Cidade ou cidade, código do país" />
          <button className="geo-btn" onClick={loadUserLocationWeather} title="Usar minha localização" aria-label="Usar minha localização">◎</button>
        </div>
        {showDropdown && query.trim().length >= 2 && <div className="search-suggestions">
          <p className="search-hint" role="status">{searching ? 'Buscando localizações...' : searchError || (suggestions.length ? 'Selecione a cidade e confira o estado e o país.' : 'Nenhum local encontrado. Tente cidade, código do país (ex.: Natal, BR).')}</p>
          <ul id="location-results" role="listbox" aria-label="Localizações">
            {suggestions.map((loc, index) => <li id={`location-${index}`} role="option" aria-selected={index === activeIndex} key={`${loc.lat}-${loc.lon}`} onMouseDown={event => event.preventDefault()} onClick={() => selectLocation(loc)}>
              <div className="suggestion-info"><span className="suggestion-name">{locationName(loc)}</span>
                <span className="suggestion-sub">{[loc.state, loc.country ? `${countryName(loc.country)} (${loc.country})` : ''].filter(Boolean).join(' • ')}</span>
                <span className="suggestion-sub">Lat. {loc.lat.toFixed(4)} • Lon. {loc.lon.toFixed(4)}</span>
              </div>
            </li>)}
          </ul>
        </div>}
      </div>
    </header>
    {(loading || notice) && <p className="app-notice" role="status">{loading ? 'Carregando clima da localização...' : notice}</p>}
    {weatherData && selectedLocation && <aside className={`weather-hud ${isHudExpanded ? 'expanded' : ''}`} aria-busy={loading}>
      <button className="hud-header-toggle" aria-expanded={isHudExpanded} aria-controls="weather-details" onClick={() => setIsHudExpanded(!isHudExpanded)}>
        <div className="hud-main">{selectedLocation.country && <img src={`https://flagcdn.com/w40/${selectedLocation.country.toLowerCase()}.png`} alt={countryName(selectedLocation.country)} className="country-flag" />}
          <div><h2>{locationName(selectedLocation)}</h2><p className="location-context">{[selectedLocation.state, selectedLocation.country ? countryName(selectedLocation.country) : ''].filter(Boolean).join(' • ')}</p>
            <span className="hud-temp">{Math.round(weatherData.main.temp)} °C</span><p className="hud-desc">{weatherData.weather[0]?.description}</p></div>
        </div><span aria-hidden="true">{isHudExpanded ? '−' : '+'}</span>
      </button>
      {isHudExpanded && <div id="weather-details">
        <p className="location-context">Lat. {selectedLocation.lat.toFixed(4)} • Lon. {selectedLocation.lon.toFixed(4)}</p>
        <dl className="hud-stats-grid">{stats.map(([label, value]) => <div className="stat-item" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className="location-context">Atualizado às {localTime(weatherData.dt, weatherData.timezone)} (horário do local)</p>
      </div>}
    </aside>}
  </div>;
}
