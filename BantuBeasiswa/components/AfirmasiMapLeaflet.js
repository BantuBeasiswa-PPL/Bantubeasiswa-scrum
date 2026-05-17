'use client';
import { useEffect, useRef } from 'react';

// Mapping nama GeoJSON (English) → nama DB (Indonesia)
const GEO_TO_DB = {
  'Special Region of Aceh'          : 'Aceh',
  'North Sumatera'                  : 'Sumatera Utara',
  'West Sumatera'                   : 'Sumatera Barat',
  'Riau'                            : 'Riau',
  'Riau Islands'                    : 'Kepulauan Riau',
  'Jambi'                           : 'Jambi',
  'South Sumatera'                  : 'Sumatera Selatan',
  'Bangka-Belitung Islands'         : 'Kepulauan Bangka Belitung',
  'Bengkulu'                        : 'Bengkulu',
  'Lampung'                         : 'Lampung',
  'Banten'                          : 'Banten',
  'Jakarta Special Capital Region'  : 'DKI Jakarta',
  'West Jawa'                       : 'Jawa Barat',
  'Central Jawa'                    : 'Jawa Tengah',
  'Special Region of Yogyakarta'    : 'DI Yogyakarta',
  'East Java'                       : 'Jawa Timur',
  'Bali'                            : 'Bali',
  'West Nusa Tenggara'              : 'Nusa Tenggara Barat',
  'East Nusa Tenggara'              : 'Nusa Tenggara Timur',
  'West Kalimantan'                 : 'Kalimantan Barat',
  'Central Kalimantan'              : 'Kalimantan Tengah',
  'South Kalimantan'                : 'Kalimantan Selatan',
  'East Kalimantan'                 : 'Kalimantan Timur',
  'North Kalimantan'                : 'Kalimantan Utara',
  'North Sulawesi'                  : 'Sulawesi Utara',
  'Gorontalo'                       : 'Gorontalo',
  'Central Sulawesi'                : 'Sulawesi Tengah',
  'West Sulawesi'                   : 'Sulawesi Barat',
  'South Sulawesi'                  : 'Sulawesi Selatan',
  'Southeast Sulawesi'              : 'Sulawesi Tenggara',
  'Maluku'                          : 'Maluku',
  'North Maluku'                    : 'Maluku Utara',
  'Special Region of West Papua'    : 'Papua Barat',
  'Papua'                           : 'Papua',
};

/**
 * Komponen peta Indonesia interaktif menggunakan Leaflet.
 * Warna provinsi berdasarkan status isAfirmasi.
 * Klik provinsi untuk toggle status.
 *
 * Props:
 *   provinsiList  – array { provinsiId, nama, isAfirmasi }
 *   onToggle      – fn(provinsiId, newVal)
 *   saving        – provinsiId yang sedang disimpan
 */
export default function AfirmasiMapLeaflet({ provinsiList, onToggle, saving }) {
  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const geoLayerRef  = useRef(null);

  // Build lookup: nama DB → { provinsiId, isAfirmasi }
  const buildLookup = () => {
    const m = {};
    provinsiList.forEach((p) => { m[p.nama] = p; });
    return m;
  };

  // Warna berdasarkan status
  const getColor = (dbNama, lookup) => {
    const p = lookup[dbNama];
    if (!p)           return '#e5e7eb';   // abu – tidak ada di DB
    if (p.isAfirmasi) return '#0056b3';   // biru – afirmasi aktif
    return '#93c5fd';                     // biru muda – ada di DB tapi tidak aktif
  };

  // Style tiap feature
  const featureStyle = (feature, lookup) => {
    const geoName = feature.properties.state;
    const dbNama  = GEO_TO_DB[geoName];
    return {
      fillColor  : getColor(dbNama, lookup),
      fillOpacity: 0.75,
      color      : '#ffffff',
      weight     : 1.2,
    };
  };

  // Inisialisasi peta (sekali saja)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mapInstance.current) return;

    // Dynamic import Leaflet (hanya client-side)
    import('leaflet').then((L) => {
      // Fix icon path Leaflet di Next.js
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl      : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl    : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        center         : [-2.5, 118],
        zoom           : 5,
        zoomControl    : true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom     : 18,
      }).addTo(map);

      mapInstance.current = map;
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update GeoJSON layer setiap kali provinsiList berubah
  useEffect(() => {
    if (!mapInstance.current || typeof window === 'undefined') return;
    if (provinsiList.length === 0) return;

    const lookup = buildLookup();

    import('leaflet').then((L) => {
      // Hapus layer lama
      if (geoLayerRef.current) {
        geoLayerRef.current.remove();
        geoLayerRef.current = null;
      }

      // Fetch GeoJSON
      fetch('/indonesia-provinces.geojson')
        .then((r) => r.json())
        .then((geo) => {
          const layer = L.geoJSON(geo, {
            style: (f) => featureStyle(f, lookup),
            onEachFeature: (feature, layer) => {
              const geoName = feature.properties.state;
              const dbNama  = GEO_TO_DB[geoName];
              const prov    = lookup[dbNama];

              // Tooltip
              layer.bindTooltip(
                `<div style="font-size:13px;font-weight:700">${dbNama || geoName}</div>
                 <div style="font-size:11px;color:${prov?.isAfirmasi ? '#0056b3' : '#6b7280'}">
                   ${prov ? (prov.isAfirmasi ? '✅ Afirmasi Aktif' : '⭕ Non-Afirmasi') : '— Tidak ada di DB'}
                 </div>`,
                { sticky: true, opacity: 0.95 }
              );

              // Hover effect
              layer.on('mouseover', () => {
                layer.setStyle({ fillOpacity: 0.95, weight: 2.5 });
              });
              layer.on('mouseout', () => {
                layer.setStyle(featureStyle(feature, lookup));
              });

              // Click to toggle
              layer.on('click', () => {
                if (!prov || saving === prov.provinsiId) return;
                onToggle(prov.provinsiId, !prov.isAfirmasi);
              });

              // Cursor
              if (prov) {
                layer.getElement && layer.on('add', () => {
                  const el = layer.getElement?.();
                  if (el) el.style.cursor = 'pointer';
                });
              }
            },
          }).addTo(mapInstance.current);

          geoLayerRef.current = layer;
        })
        .catch(console.error);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinsiList, saving]);

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Legenda */}
      <div style={{
        display    : 'flex',
        gap        : 16,
        marginBottom: 12,
        fontSize   : 12,
        color      : '#374151',
        flexWrap   : 'wrap',
        alignItems : 'center',
      }}>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:14, borderRadius:3, background:'#0056b3', display:'inline-block' }} />
          Afirmasi Aktif
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:14, borderRadius:3, background:'#93c5fd', display:'inline-block' }} />
          Ada di DB, Belum Aktif
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:14, borderRadius:3, background:'#e5e7eb', display:'inline-block', border:'1px solid #d1d5db' }} />
          Tidak Ada di DB
        </span>
        <span style={{ marginLeft:'auto', fontSize:11, color:'#9ca3af' }}>
          💡 Klik wilayah di peta untuk toggle status afirmasi
        </span>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        style={{
          width       : '100%',
          height      : '420px',
          borderRadius: 8,
          overflow    : 'hidden',
          border      : '1px solid #e5e7eb',
        }}
      />
    </>
  );
}
