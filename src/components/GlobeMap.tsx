import React, { useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import type { WeatherData } from '../types/weather';

interface GlobeMapProps {
  lat: number;
  lon: number;
  weatherData: WeatherData;
}

export const GlobeMap: React.FC<GlobeMapProps> = ({ lat, lon, weatherData }) => {
  const globeRef = useRef<any>(null);

  // 1. Transição de câmera para o local
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng: lon, altitude: 1.6 }, 1800);

      const controls = globeRef.current.controls();
      controls.autoRotate = false;
      controls.enableZoom = true;
    }
  }, [lat, lon]);

  // 2. Adicionar Esfera de Nuvens Animada via Three.js
  useEffect(() => {
    if (!globeRef.current) return;

    const globe = globeRef.current;
    const CLOUDS_IMG_URL = '//unpkg.com/three-globe/example/img/earth-clouds.png';
    const CLOUDS_ALT = 0.005; // Altura ligeiramente acima da superfície
    const CLOUDS_ROTATION_SPEED = 0.0003;

    let animationFrameId: number;

    // Carrega a textura das nuvens
    new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture) => {
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(globe.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
        new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true, opacity: 0.8 })
      );

      globe.scene().add(clouds);

      // Animação de Rotação Contínua
      const rotateClouds = () => {
        clouds.rotation.y += CLOUDS_ROTATION_SPEED;
        animationFrameId = requestAnimationFrame(rotateClouds);
      };

      rotateClouds();
    });

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const markerData = [
    {
      lat,
      lng: lon,
      name: weatherData.name,
      temp: `${Math.round(weatherData.main.temp)}°C`,
      desc: weatherData.weather?.[0]?.description || '',
    },
  ];

  return (
    <div className="globe-viewport">
      <Globe
        ref={globeRef}
        
        // Texturas do Globo Terra
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Atmosfera
        showAtmosphere={true}
        atmosphereColor="#3a7bd5"
        atmosphereAltitude={0.15}
        
        // Anel do Radar Vermelho Neon (#e50914)
        ringsData={markerData}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng}
        ringColor={() => '#e50914'}
        ringMaxRadius={6}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1100}

        // Marcador HTML
        htmlElementsData={markerData}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          el.className = 'globe-marker-card';
          el.innerHTML = `
            <div className="marker-pin"></div>
            <div className="marker-popup">
              <span className="marker-city">${d.name}</span>
              <span className="marker-temp">${d.temp}</span>
            </div>
          `;
          return el;
        }}
      />
    </div>
  );
};