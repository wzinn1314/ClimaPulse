import React, { useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';
import type { WeatherData } from '../types/weather';

interface GlobeMapProps {
  lat: number;
  lon: number;
  weatherData: WeatherData;
}

export const GlobeMap: React.FC<GlobeMapProps> = ({ lat, lon, weatherData }) => {
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng: lon, altitude: 1.8 }, 1600);
    }
  }, [lat, lon]);

  const markerData = [
    {
      lat,
      lng: lon,
      name: `${weatherData.name}: ${Math.round(weatherData.main.temp)}°C`,
    },
  ];

  return (
    <div className="globe-viewport">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        atmosphereColor="#e50914"
        atmosphereAltitude={0.18}
        
        ringsData={markerData}
        ringColor={() => '#e50914'}
        ringMaxRadius={6}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1200}

        labelsData={markerData}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => d.name}
        labelSize={1.5}
        labelDotRadius={0.4}
        labelColor={() => '#ffffff'}
        labelResolution={2}
      />
    </div>
  );
};