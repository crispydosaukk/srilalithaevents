export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyA-CXsyKpvFtpidpOkhOiIQGfXFO3O5lKA';

let googleMapsPromise: Promise<any> | null = null;

export function loadGoogleMapsApi(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window not available'));
  }

  if ((window as any).google && (window as any).google.maps) {
    return Promise.resolve((window as any).google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any).google.maps));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if ((window as any).google && (window as any).google.maps) {
        resolve((window as any).google.maps);
      } else {
        reject(new Error('Google Maps SDK loaded but google.maps not found'));
      }
    };

    script.onerror = (err) => {
      console.warn('Google Maps Script load failed:', err);
      reject(err);
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export interface GeocodeResult {
  formattedAddress: string;
  lat: number;
  lng: number;
  postcode?: string;
  placeId?: string;
}

export async function geocodeAddress(input: string): Promise<GeocodeResult | null> {
  if (!input || !input.trim()) return null;
  const cleanInput = input.trim();

  // Try Google Maps Geocoder first if loaded
  try {
    const maps = await loadGoogleMapsApi();
    if (maps && maps.Geocoder) {
      const geocoder = new maps.Geocoder();

      const googleResult = await new Promise<GeocodeResult | null>((resolve) => {
        geocoder.geocode({ address: cleanInput, componentRestrictions: { country: 'GB' } }, (results: any[], status: string) => {
          if (status === 'OK' && results && results[0]) {
            const res = results[0];
            const lat = res.geometry.location.lat();
            const lng = res.geometry.location.lng();
            const formattedAddress = res.formatted_address;

            let postcode = '';
            if (res.address_components) {
              const postalObj = res.address_components.find((c: any) =>
                c.types.includes('postal_code')
              );
              if (postalObj) postcode = postalObj.long_name;
            }

            resolve({
              formattedAddress,
              lat,
              lng,
              postcode,
              placeId: res.place_id,
            });
          } else {
            resolve(null);
          }
        });
      });

      if (googleResult) return googleResult;
    }
  } catch (error) {
    console.warn('Google Maps Geocoding attempt:', error);
  }

  // Fallback 1: Free UK Postcodes.io API for any UK postcode (e.g. UB1 1AA, CR0 1AA, EC1A 1BB)
  try {
    const postcodeRegex = /([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/i;
    const match = cleanInput.match(postcodeRegex);
    const extractedPostcode = match ? match[0].replace(/\s+/g, '') : cleanInput.replace(/\s+/g, '');

    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(extractedPostcode)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 200 && data.result) {
        const p = data.result;
        const areaInfo = [p.admin_district, p.parish, p.region].filter(Boolean).join(', ');
        return {
          formattedAddress: `${p.postcode}${areaInfo ? ` (${areaInfo})` : ''}, UK`,
          lat: p.latitude,
          lng: p.longitude,
          postcode: p.postcode,
        };
      }
    }
  } catch (e) {
    console.warn('Postcodes.io fallback error:', e);
  }

  // Fallback 2: Free OpenStreetMap Nominatim for general addresses
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&q=${encodeURIComponent(cleanInput)}&limit=1`, {
      headers: { 'Accept-Language': 'en' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const item = data[0];
        return {
          formattedAddress: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      }
    }
  } catch (e) {
    console.warn('Nominatim fallback error:', e);
  }

  return null;
}

export async function reverseGeocodeCoords(lat: number, lng: number): Promise<GeocodeResult | null> {
  // Try Google Maps first
  try {
    const maps = await loadGoogleMapsApi();
    if (maps && maps.Geocoder) {
      const geocoder = new maps.Geocoder();

      const googleResult = await new Promise<GeocodeResult | null>((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
          if (status === 'OK' && results && results[0]) {
            const res = results[0];
            const formattedAddress = res.formatted_address;

            let postcode = '';
            if (res.address_components) {
              const postalObj = res.address_components.find((c: any) =>
                c.types.includes('postal_code')
              );
              if (postalObj) postcode = postalObj.long_name;
            }

            resolve({
              formattedAddress,
              lat,
              lng,
              postcode,
              placeId: res.place_id,
            });
          } else {
            resolve(null);
          }
        });
      });

      if (googleResult) return googleResult;
    }
  } catch (error) {
    console.warn('Google Maps reverse geocoding attempt:', error);
  }

  // Fallback 1: Postcodes.io reverse geocoding
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes?lat=${lat}&lon=${lng}&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 200 && data.result && data.result[0]) {
        const p = data.result[0];
        const areaInfo = [p.admin_district, p.parish, p.region].filter(Boolean).join(', ');
        return {
          formattedAddress: `${p.postcode}${areaInfo ? ` (${areaInfo})` : ''}, UK`,
          lat,
          lng,
          postcode: p.postcode,
        };
      }
    }
  } catch (e) {
    console.warn('Postcodes.io reverse geocode error:', e);
  }

  // Default coordinate string
  return {
    formattedAddress: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  };
}

export function getCurrentBrowserCoordinates(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location access was denied. Please allow location permissions in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
