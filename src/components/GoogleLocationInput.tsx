'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  loadGoogleMapsApi,
  geocodeAddress,
  reverseGeocodeCoords,
  getCurrentBrowserCoordinates,
} from '@/lib/googleMaps';

interface LocationCoords {
  lat: number;
  lng: number;
  postcode?: string;
}

interface GoogleLocationInputProps {
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onChange: (address: string, coords?: LocationCoords) => void;
  onCoordinatesChange?: (coords: LocationCoords | null) => void;
  showCoordinatesBadge?: boolean;
  allowCurrentLocation?: boolean;
  helperNote?: string;
}

export default function GoogleLocationInput({
  value,
  placeholder = 'Enter address or UK postcode...',
  required = false,
  disabled = false,
  className = '',
  onChange,
  onCoordinatesChange,
  showCoordinatesBadge = false,
  allowCurrentLocation = true,
  helperNote,
}: GoogleLocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocatingCurrent, setIsLocatingCurrent] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccessNote, setLocationSuccessNote] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<LocationCoords | null>(null);

  // Initialize Google Maps Places Autocomplete
  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsApi()
      .then((maps) => {
        if (!isMounted || !inputRef.current || !maps.places) return;

        try {
          const autocomplete = new maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'gb' },
            fields: ['formatted_address', 'geometry', 'address_components', 'name'],
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) {
              return;
            }

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const formattedAddress = place.formatted_address || place.name || '';

            let postcode = '';
            if (place.address_components) {
              const postalObj = place.address_components.find((c: any) =>
                c.types.includes('postal_code')
              );
              if (postalObj) postcode = postalObj.long_name;
            }

            const coords: LocationCoords = { lat, lng, postcode };
            setCurrentCoords(coords);
            onChange(formattedAddress, coords);
            if (onCoordinatesChange) onCoordinatesChange(coords);
          });

          autocompleteRef.current = autocomplete;
          setIsApiLoaded(true);
        } catch (e) {
          console.warn('Google Places Autocomplete init warning:', e);
        }
      })
      .catch((err) => {
        console.warn('Google Maps loader warning:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle manual postcode / address search if user typed without clicking autocomplete
  const handleManualSearch = async () => {
    if (!value || isGeocoding) return;
    setLocationError(null);

    // Check if user entered an Indian pincode (6-digit numeric)
    const trimmedVal = value.trim();
    if (/^\d{6}$/.test(trimmedVal)) {
      setCurrentCoords(null);
      if (onCoordinatesChange) onCoordinatesChange(null);
      setLocationError('The entered number appears to be an Indian pincode. Sri Lalitha provides catering in London & across the UK. Please enter a valid UK postcode (e.g. EC1A 1BB, UB1 1AA) or UK venue address.');
      return;
    }

    setIsGeocoding(true);
    const result = await geocodeAddress(value);
    setIsGeocoding(false);

    if (result) {
      const coords = { lat: result.lat, lng: result.lng, postcode: result.postcode };
      setCurrentCoords(coords);
      onChange(result.formattedAddress || value, coords);
      if (onCoordinatesChange) onCoordinatesChange(coords);
    } else {
      setCurrentCoords(null);
      if (onCoordinatesChange) onCoordinatesChange(null);
      setLocationError('Could not find this address in the UK. Please enter a valid UK postcode (e.g. EC1A 1BB, CR0 1AA) or select from dropdown suggestions.');
      setTimeout(() => setLocationError(null), 6000);
    }
  };

  // Handle Current Location Geolocation
  const handleUseCurrentLocation = async () => {
    setLocationError(null);
    setLocationSuccessNote(null);
    setIsLocatingCurrent(true);

    try {
      const coords = await getCurrentBrowserCoordinates();

      // Guard: Check if browser GPS is outside the UK (approx. lat 49 to 61, lng -8 to 2)
      if (coords.lat < 49 || coords.lat > 61 || coords.lng < -8 || coords.lng > 2) {
        setLocationError('Your current location is outside the UK. Sri Lalitha caters across the United Kingdom — please enter your UK event venue address manually.');
        setIsLocatingCurrent(false);
        return;
      }

      const geocoded = await reverseGeocodeCoords(coords.lat, coords.lng);

      if (geocoded) {
        const resolvedAddress = geocoded.formattedAddress || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
        const locCoords: LocationCoords = {
          lat: geocoded.lat,
          lng: geocoded.lng,
          postcode: geocoded.postcode,
        };

        setCurrentCoords(locCoords);
        onChange(resolvedAddress, locCoords);
        if (onCoordinatesChange) onCoordinatesChange(locCoords);
        setLocationSuccessNote(geocoded.postcode ? `📍 Located near ${geocoded.postcode}` : '📍 Current location detected');
        setTimeout(() => setLocationSuccessNote(null), 6000);
      }
    } catch (err: any) {
      console.warn('Geolocation error:', err);
      setLocationError(err?.message || 'Could not fetch your current location. Please type your address manually.');
      setTimeout(() => setLocationError(null), 6000);
    } finally {
      setIsLocatingCurrent(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute left-3 text-gray-400 pointer-events-none flex items-center">
          <Icon name="MapPinIcon" size={16} className="text-[#C8860A]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val);
          }}
          onBlur={() => {
            // Auto geocode on blur if coords not present yet
            if (value && value.length >= 3 && !currentCoords) {
              handleManualSearch();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleManualSearch();
            }
          }}
          className={`pl-9 pr-24 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C8860A]/30 focus:border-[#C8860A] transition-all bg-white text-gray-900 w-full ${className}`}
        />

        {/* Action icons on right */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {isGeocoding && (
            <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#C8860A] border-t-transparent mr-1" />
          )}

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('', undefined);
                setCurrentCoords(null);
                setLocationSuccessNote(null);
                setLocationError(null);
                if (onCoordinatesChange) onCoordinatesChange(null);
                if (inputRef.current) inputRef.current.focus();
              }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
              title="Clear location"
            >
              <Icon name="XMarkIcon" size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={handleManualSearch}
            disabled={isGeocoding || !value}
            className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors cursor-pointer"
            title="Locate & verify postcode"
          >
            Locate
          </button>
        </div>
      </div>

      {/* Quick Current Location Action Bar */}
      {allowCurrentLocation && (
        <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingCurrent || disabled}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8860A] hover:text-[#9e6302] bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Automatically detect your current location via GPS"
          >
            {isLocatingCurrent ? (
              <>
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-[#C8860A] border-t-transparent" />
                <span>Fetching GPS Location...</span>
              </>
            ) : (
              <>
                <Icon name="MapPinIcon" size={13} className="text-[#C8860A]" />
                <span>Use Current Location</span>
              </>
            )}
          </button>

          {locationSuccessNote && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {locationSuccessNote}
            </span>
          )}

          {locationError && (
            <span className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
              ⚠️ {locationError}
            </span>
          )}
        </div>
      )}

      {/* Optional Coordinates Badge */}
      {showCoordinatesBadge && currentCoords && (
        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1 px-1 font-mono">
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            GPS Coordinates
          </span>
          <span>Lat: {currentCoords.lat.toFixed(4)}, Lng: {currentCoords.lng.toFixed(4)}</span>
        </div>
      )}

      {helperNote && (
        <p className="text-[11px] text-gray-400 mt-1">{helperNote}</p>
      )}
    </div>
  );
}
