// components/TrackingMapModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { Researcher, LocationPoint } from '../types';
import { getResearcherRoute } from '../services/api';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';

declare const L: any; // Using Leaflet from CDN

interface TrackingMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    researcher: Researcher | null;
}

const TrackingMapModal: React.FC<TrackingMapModalProps> = ({ isOpen, onClose, researcher }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [routePoints, setRoutePoints] = useState<LocationPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const routeLayerRef = useRef<any>(null);

    const fetchRoute = async () => {
        if (!researcher) return;
        setIsLoading(true);
        try {
            const points = await getResearcherRoute(researcher.id, date);
            setRoutePoints(points);
        } catch (e) {
            console.error(e);
            alert('Falha ao buscar rota.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && researcher) {
            fetchRoute();
        } else {
            setRoutePoints([]); // Clear points on close
        }
    }, [isOpen, researcher, date]);

    useEffect(() => {
        if (isOpen && mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([-15.78, -47.92], 4); // Brazil center
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapRef.current);
        }
        
        // This is a fix for Leaflet rendering issue in modals
        if (isOpen && mapRef.current) {
            setTimeout(() => {
                mapRef.current.invalidateSize();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (mapRef.current) {
            if (routeLayerRef.current) {
                mapRef.current.removeLayer(routeLayerRef.current);
            }

            if (routePoints.length > 0) {
                const latLngs = routePoints.map(p => [p.latitude, p.longitude]);
                const polyline = L.polyline(latLngs, { color: 'blue' });

                const startMarker = L.marker(latLngs[0]).bindPopup(`Início: ${new Date(routePoints[0].timestamp).toLocaleTimeString()}`);
                const endMarker = L.marker(latLngs[latLngs.length - 1]).bindPopup(`Fim: ${new Date(routePoints[routePoints.length - 1].timestamp).toLocaleTimeString()}`);
                
                const markers = routePoints.map(p => 
                    L.circleMarker([p.latitude, p.longitude], { radius: 3, color: 'red' }).bindTooltip(new Date(p.timestamp).toLocaleTimeString())
                );

                routeLayerRef.current = L.layerGroup([polyline, startMarker, endMarker, ...markers]).addTo(mapRef.current);

                mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
            }
        }
    }, [routePoints]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Rastreamento de ${researcher?.name || ''}`}>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <label htmlFor="route-date" className="font-medium">Selecione a Data:</label>
                    <input
                        id="route-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="input-style"
                    />
                </div>

                <div className="relative w-full h-[50vh] bg-gray-200 dark:bg-dark-background rounded-md overflow-hidden">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
                           <LoadingSpinner text="Buscando rota" />
                        </div>
                    )}
                    <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }}/>
                    {!isLoading && routePoints.length === 0 && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                            <p className="p-2 bg-white/80 dark:bg-black/80 rounded-md">Nenhum dado de localização encontrado para esta data.</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default TrackingMapModal;
