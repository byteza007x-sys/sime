"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import {
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  PencilLine,
  X,
} from "lucide-react";

interface LocationCaptureProps {
  buttonLabel: string;
  readyLabel: string;
  deniedLabel: string;
  siteLat?: number | null;
  siteLong?: number | null;
  maxDistanceKm?: number;
  siteLabel: string;
  currentLabel: string;
  distanceLabel: string;
  withinRangeLabel: string;
  outsideRangeLabel: string;
  noSiteLocationLabel: string;
  mapTitle: string;
  accuracyLabel: string;
  openMapLabel: string;
  manualButtonLabel?: string;
  manualTitleLabel?: string;
  latitudeLabel?: string;
  longitudeLabel?: string;
  saveManualLabel?: string;
  invalidCoordinateLabel?: string;
  secureContextLabel?: string;
}

interface CapturedLocation {
  lat: number;
  long: number;
  accuracy: number;
}

const EARTH_RADIUS_KM = 6371;

const isFiniteCoordinate = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (
  latA: number,
  longA: number,
  latB: number,
  longB: number,
) => {
  const latDistance = toRadians(latB - latA);
  const longDistance = toRadians(longB - longA);
  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(longDistance / 2) *
      Math.sin(longDistance / 2);

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatCoordinate = (value: number) => value.toFixed(6);

const formatDistance = (distanceKm: number) =>
  distanceKm < 1
    ? `${Math.round(distanceKm * 1000).toLocaleString()} m`
    : `${distanceKm.toFixed(2)} km`;

const createMapUrl = (
  markerLat: number,
  markerLong: number,
  siteLat: number | null,
  siteLong: number | null,
) => {
  const latValues = [markerLat, siteLat].filter(isFiniteCoordinate);
  const longValues = [markerLong, siteLong].filter(isFiniteCoordinate);
  const minLat = Math.min(...latValues);
  const maxLat = Math.max(...latValues);
  const minLong = Math.min(...longValues);
  const maxLong = Math.max(...longValues);
  const latPadding = Math.max(0.01, (maxLat - minLat) * 0.8);
  const longPadding = Math.max(0.01, (maxLong - minLong) * 0.8);
  const bbox = [
    minLong - longPadding,
    minLat - latPadding,
    maxLong + longPadding,
    maxLat + latPadding,
  ].join("%2C");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${markerLat}%2C${markerLong}`;
};

const createOpenMapUrl = (lat: number, long: number) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${long}#map=16/${lat}/${long}`;

export default function LocationCapture({
  buttonLabel,
  readyLabel,
  deniedLabel,
  siteLat,
  siteLong,
  maxDistanceKm = 10,
  siteLabel,
  currentLabel,
  distanceLabel,
  withinRangeLabel,
  outsideRangeLabel,
  noSiteLocationLabel,
  mapTitle,
  accuracyLabel,
  openMapLabel,
  manualButtonLabel = "Edit GPS",
  manualTitleLabel = "Edit GPS location",
  latitudeLabel = "Latitude",
  longitudeLabel = "Longitude",
  saveManualLabel = "Save GPS",
  invalidCoordinateLabel = "Invalid GPS coordinates",
  secureContextLabel = "GPS may require HTTPS on mobile browsers. You can enter coordinates manually.",
}: LocationCaptureProps) {
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLong, setManualLong] = useState("");
  const [manualAccuracy, setManualAccuracy] = useState("");
  const validSiteLat = isFiniteCoordinate(siteLat) ? siteLat : null;
  const validSiteLong = isFiniteCoordinate(siteLong) ? siteLong : null;
  const hasSiteLocation = validSiteLat !== null && validSiteLong !== null;
  const mapLat = location?.lat ?? validSiteLat;
  const mapLong = location?.long ?? validSiteLong;
  const distanceKm =
    location && hasSiteLocation
      ? calculateDistanceKm(location.lat, location.long, validSiteLat, validSiteLong)
      : null;
  const isWithinRange = distanceKm === null ? null : distanceKm <= maxDistanceKm;
  const rangeTone =
    isWithinRange === null
      ? "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      : isWithinRange
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200";
  const mapSrc = useMemo(() => {
    if (!isFiniteCoordinate(mapLat) || !isFiniteCoordinate(mapLong)) return null;

    return createMapUrl(
      mapLat,
      mapLong,
      validSiteLat,
      validSiteLong,
    );
  }, [mapLat, mapLong, validSiteLat, validSiteLong]);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setStatus(deniedLabel);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const captured = {
          lat: position.coords.latitude,
          long: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setLocation(captured);
        setStatus(readyLabel);
        setLoading(false);
      },
      () => {
        setStatus(deniedLabel);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  };

  const openManualEditor = () => {
    setManualLat(String(location?.lat ?? validSiteLat ?? ""));
    setManualLong(String(location?.long ?? validSiteLong ?? ""));
    setManualAccuracy(String(location?.accuracy ?? ""));
    setManualOpen(true);
  };

  const saveManualLocation = () => {
    const nextLat = Number(manualLat);
    const nextLong = Number(manualLong);
    const nextAccuracy = manualAccuracy.trim() ? Number(manualAccuracy) : 0;

    if (
      !Number.isFinite(nextLat) ||
      !Number.isFinite(nextLong) ||
      nextLat < -90 ||
      nextLat > 90 ||
      nextLong < -180 ||
      nextLong > 180 ||
      !Number.isFinite(nextAccuracy) ||
      nextAccuracy < 0
    ) {
      setStatus(invalidCoordinateLabel);
      return;
    }

    setLocation({
      lat: nextLat,
      long: nextLong,
      accuracy: nextAccuracy,
    });
    setStatus(readyLabel);
    setManualOpen(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <input type="hidden" name="gpsLat" value={location?.lat ?? ""} />
      <input type="hidden" name="gpsLong" value={location?.long ?? ""} />
      <input type="hidden" name="gpsAccuracy" value={location?.accuracy ?? ""} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2 sm:flex sm:items-center">
          <button
            type="button"
            onClick={captureLocation}
            className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <LocateFixed size={16} />
            )}
            {buttonLabel}
          </button>
          <button
            type="button"
            onClick={openManualEditor}
            className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <PencilLine size={16} />
            {manualButtonLabel}
          </button>
        </div>
        {status ? (
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {status}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <LocationStat
          icon={<Navigation size={16} />}
          label={currentLabel}
          value={
            location
              ? `${formatCoordinate(location.lat)}, ${formatCoordinate(location.long)}`
              : "-"
          }
          detail={
            location
              ? `${accuracyLabel} ${Math.round(location.accuracy).toLocaleString()} m`
              : ""
          }
        />
        <LocationStat
          icon={<MapPin size={16} />}
          label={siteLabel}
          value={
            hasSiteLocation
              ? `${formatCoordinate(validSiteLat)}, ${formatCoordinate(validSiteLong)}`
              : "-"
          }
          detail={hasSiteLocation ? "" : noSiteLocationLabel}
        />
        <div className={`rounded-xl border p-3 ${rangeTone}`}>
          <p className="flex items-center gap-2 text-xs font-bold uppercase">
            <MapPin size={16} />
            {distanceLabel}
          </p>
          <p className="mt-2 text-sm font-bold">
            {distanceKm === null ? "-" : formatDistance(distanceKm)}
          </p>
          {isWithinRange !== null ? (
            <p className="mt-1 text-xs font-semibold">
              {isWithinRange ? withinRangeLabel : outsideRangeLabel}
            </p>
          ) : null}
        </div>
      </div>

      {mapSrc && isFiniteCoordinate(mapLat) && isFiniteCoordinate(mapLong) ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
            <p className="text-sm font-bold">{mapTitle}</p>
            <a
              href={createOpenMapUrl(mapLat, mapLong)}
              target="_blank"
              rel="noreferrer"
              className="interactive-button inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300"
            >
              {openMapLabel}
              <ExternalLink size={13} />
            </a>
          </div>
          <iframe
            title={mapTitle}
            src={mapSrc}
            className="h-64 w-full border-0 sm:h-72"
            loading="lazy"
          />
        </div>
      ) : null}

      {typeof window !== "undefined" && !window.isSecureContext ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {secureContextLabel}
        </p>
      ) : null}

      {manualOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setManualOpen(false);
              }}
            >
              <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{manualTitleLabel}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {secureContextLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualOpen(false)}
                    className="interactive-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    aria-label="Close"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">
                      {latitudeLabel}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={manualLat}
                      onChange={(event) => setManualLat(event.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">
                      {longitudeLabel}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={manualLong}
                      onChange={(event) => setManualLong(event.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-bold text-slate-500">
                      {accuracyLabel}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={manualAccuracy}
                      onChange={(event) => setManualAccuracy(event.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="0"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={saveManualLocation}
                  className="interactive-button mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800"
                >
                  {saveManualLabel}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function LocationStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-bold">{value}</p>
      {detail ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      ) : null}
    </div>
  );
}
