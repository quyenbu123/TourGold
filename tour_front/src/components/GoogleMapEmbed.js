import React from "react";

/**
 * GoogleMapEmbed
 * Simple, no-API-key map embed using an iframe.
 * Pass a human-readable address string; it will be encoded into a Google Maps URL.
 */
const GoogleMapEmbed = ({ address, height = 300, className = "", style = {} }) => {
  if (!address || typeof address !== "string" || address.trim().length === 0) {
    return null;
  }

  const query = encodeURIComponent(address);
  const src = `https://www.google.com/maps?q=${query}&output=embed`;

  return (
    <div className={className} style={{ borderRadius: 8, overflow: "hidden", ...style }}>
      <iframe
        title="Google Map"
        src={src}
        width="100%"
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
};

export default GoogleMapEmbed;
